/**
 * The level scene (key 'game', init data { level }). Loads the theme art lazily, builds a
 * LevelRun, and owns the app-facing lifecycle: pause / resume, rotation, restart, menu,
 * and a clean shutdown that removes every listener it added.
 */
import Phaser from 'phaser';
import type { CiccioArtPack, LevelId, Services } from '../contracts';
import { SERVICES_KEY } from '../contracts';
import { BASE_PACKS_KEY } from './BootScene';
import { debugEnabled, installDebug, uninstallDebug } from './debug';
import { Flow } from './flow';
import { RefreshMeter } from './frameRate';
import { Interactions } from './interactions';
import { getLevel } from './levels';
import { nextLevel } from './rules';
import { LevelRun } from './run';
import { heroPackKey, loadThemeArt, needsArt } from './themeLoader';
import { getTheme } from './themes';

export interface GameSceneData {
  level?: LevelId;
}

export class GameScene extends Phaser.Scene {
  private svc!: Services;
  private levelId: LevelId = 1;
  private run: LevelRun | null = null;
  private ix: Interactions | null = null;
  private flow: Flow | null = null;
  private paused = false;
  /** pause asked while it could not open (loading, respawn fade): opens on the next play frame */
  private pendingPause = false;
  private meter = new RefreshMeter(60);
  private cleanups: Array<() => void> = [];
  /**
   * Counts boots (and shutdowns): a boot that finds the number changed was cancelled while its
   * art loaded (menu, restart, another level) and must not build or touch the loading screen.
   * Never reset by init(), which runs again on every restart.
   */
  private bootGen = 0;

  constructor() {
    super({ key: 'game' });
  }

  init(data: GameSceneData): void {
    this.levelId = data?.level === 2 || data?.level === 5 ? data.level : 1;
    this.run = null;
    this.ix = null;
    this.flow = null;
    this.paused = false;
    this.pendingPause = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#60ccf0');
    this.cameras.main.setRoundPixels(true);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
    this.meter = new RefreshMeter(this.physics.world.fps);
    this.listen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    void this.boot();
  }

  /** Every external listener goes through here so shutdown can remove it. */
  private listen(): void {
    const game = this.game.events;
    const onViewport = (): void => this.run?.applyViewport();
    const onHidden = (): void => this.pause();
    game.on('viewport-changed', onViewport);
    game.on('app-hidden', onHidden);
    this.scale.on(Phaser.Scale.Events.RESIZE, onViewport);
    this.svc.ui.onPauseButton(() => (this.paused ? this.resume() : this.pause()));
    this.cleanups.push(
      () => game.off('viewport-changed', onViewport),
      () => game.off('app-hidden', onHidden),
      () => this.scale.off(Phaser.Scale.Events.RESIZE, onViewport),
      () => this.svc.ui.onPauseButton(() => undefined),
    );
  }

  private async boot(): Promise<void> {
    const def = getLevel(this.levelId);
    const theme = getTheme(def.theme);
    const gen = ++this.bootGen;
    const alive = (): boolean => gen === this.bootGen;
    // a restart reuses the registered art: no loading screen flash
    if (needsArt(this, theme)) this.svc.ui.setLoading(0.2, theme.loadingText);
    const load = await loadThemeArt(this, theme, this.svc.ui, { alive });
    // the scene may have been stopped (menu / restart / another level) while the art was loading
    if (!alive()) return;
    if (load.failed.length > 0) return this.artFailed();
    if (load.missing.length > 0 && debugEnabled()) console.warn('[cicciopoli] placeholders for', load.missing.join(', '));
    // the hero's per-frame anchors: Ciccio's from the base packs, the rage form's from its lazy pack
    const heroPack =
      def.hero === 'hulk'
        ? (this.registry.get(heroPackKey('hulk')) as CiccioArtPack | undefined)
        : ((this.registry.get(BASE_PACKS_KEY) as CiccioArtPack[] | undefined) ?? []).find((p) => p.name === 'ciccio');
    // def.id, not the requested id: a level without a map falls back to level 1 consistently
    const run = new LevelRun(this, this.svc, def.id, def, theme, heroPack?.anchors ?? []);
    const ix = new Interactions(run, () => flow.gameOver());
    const flow = new Flow(run, ix, {
      restart: () => this.restartLevel(),
      toMenu: () => this.toMenu(),
      next: () => {
        const next = nextLevel(def.id);
        if (next) this.svc.app.startLevel(next);
      },
    });
    this.run = run;
    this.ix = ix;
    this.flow = flow;
    const onStep = (dt: number): void => run.onStep(dt);
    this.physics.world.on(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep);
    this.cleanups.push(() => this.physics.world?.off(Phaser.Physics.Arcade.Events.WORLD_STEP, onStep));
    installDebug(run, ix, flow);
    this.svc.ui.setLoading(null);
    this.svc.ui.showHud(true);
    this.svc.audio.music(theme.music);
    if (this.svc.input.consume('pause')) this.pendingPause = true; // Esc / P while loading
    this.svc.input.reset();
    run.banner(def.name, { tone: 'info', sub: def.subtitle ?? `LIVELLO ${def.id}`, ms: 1800 });
  }

  /** A level pack could not be built: say so and go back to the menu (a retry builds it again). */
  private artFailed(): void {
    this.svc.ui.setLoading(null);
    this.svc.ui.banner('ERRORE GRAFICA', { tone: 'danger', ms: 2000 });
    this.toMenu();
  }

  override update(time: number, delta: number): void {
    const { run, ix, flow } = this;
    if (!run || !ix || !flow) return;
    const hz = this.meter.sample(delta);
    if (hz !== null) this.physics.world.setFPS(hz);
    if (this.svc.input.consume('pause')) this.pause();
    if (this.pendingPause && run.phase === 'play') this.pause();
    if (this.paused) return;
    const dt = Math.min(delta, 50); // a long hitch must not teleport timers / camera
    ix.tick(dt);
    run.update(dt, time);
    flow.update(dt);
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    if (this.paused || !this.sys.isActive()) return;
    const phase = this.run?.phase;
    if (phase === 'won' || phase === 'over') return;
    if (phase !== 'play') {
      this.pendingPause = true; // still loading or mid-respawn: honoured as soon as play resumes
      return;
    }
    this.pendingPause = false;
    this.paused = true;
    this.svc.audio.sfx('pause');
    this.physics.world.pause();
    this.scene.pause();
    this.svc.ui.showPause(
      {
        onResume: () => this.resume(),
        onRestart: () => this.restartLevel(),
        onMenu: () => this.toMenu(),
        onToggleMute: () => {
          const muted = !this.svc.audio.muted;
          this.svc.audio.setMuted(muted);
          this.svc.save.setMuted(muted);
          return muted;
        },
      },
      this.svc.audio.muted,
    );
  }

  private resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.svc.ui.hideOverlays();
    this.svc.input.reset();
    this.physics.world.resume();
    this.scene.resume();
  }

  private restartLevel(): void {
    this.svc.ui.hideOverlays();
    this.svc.input.reset();
    this.paused = false;
    this.pendingPause = false;
    this.physics.world.resume();
    this.scene.restart({ level: this.levelId });
  }

  private toMenu(): void {
    this.paused = false;
    this.pendingPause = false;
    this.svc.app.toMenu();
  }

  private teardown(): void {
    this.bootGen++;
    this.svc.ui.setLoading(null); // a cancelled boot must not leave the loading screen up
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.run = null;
    this.ix = null;
    this.flow = null;
    this.paused = false;
    this.pendingPause = false;
    uninstallDebug();
  }
}
