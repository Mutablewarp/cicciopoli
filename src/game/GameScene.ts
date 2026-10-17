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
import { Interactions } from './interactions';
import { getLevel } from './levels';
import { LevelRun } from './run';
import { loadThemeArt } from './themeLoader';
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
  private cleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'game' });
  }

  init(data: GameSceneData): void {
    this.levelId = data?.level === 2 ? 2 : 1;
    this.run = null;
    this.ix = null;
    this.flow = null;
    this.paused = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#60ccf0');
    this.cameras.main.setRoundPixels(true);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
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
    // a restart reuses the registered art: no loading screen flash
    if (!this.textures.exists(theme.tileset)) this.svc.ui.setLoading(0.2, theme.loadingText);
    const missing = await loadThemeArt(this, theme, this.svc.ui);
    // the scene may have been stopped (menu / restart) while the art was loading
    if (!this.sys.isActive() || this.run) return;
    if (missing.length > 0 && debugEnabled()) console.warn('[cicciopoli] placeholders for', missing.join(', '));
    const ciccio = ((this.registry.get(BASE_PACKS_KEY) as CiccioArtPack[] | undefined) ?? []).find((p) => p.name === 'ciccio');
    // def.id, not the requested id: a level without a map falls back to level 1 consistently
    const run = new LevelRun(this, this.svc, def.id, def, theme, ciccio?.anchors ?? []);
    const ix = new Interactions(run, () => flow.gameOver());
    const flow = new Flow(run, ix, {
      restart: () => this.restartLevel(),
      toMenu: () => this.toMenu(),
      next: () => this.svc.app.startLevel(2),
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
    this.svc.input.reset();
    this.svc.ui.banner(def.name, { tone: 'info', sub: `LIVELLO ${def.id}`, ms: 1800 });
  }

  override update(time: number, delta: number): void {
    const { run, ix, flow } = this;
    if (!run || !ix || !flow) return;
    if (this.svc.input.consume('pause')) {
      this.pause();
      return;
    }
    const dt = Math.min(delta, 50); // a long hitch must not teleport timers / camera
    ix.tick(dt);
    run.update(dt, time);
    flow.update(dt);
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    if (this.paused || !this.run || this.run.phase !== 'play' || !this.sys.isActive()) return;
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
    this.physics.world.resume();
    this.scene.restart({ level: this.levelId });
  }

  private toMenu(): void {
    this.paused = false;
    this.svc.app.toMenu();
  }

  private teardown(): void {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.run = null;
    this.ix = null;
    this.flow = null;
    this.paused = false;
    uninstallDebug();
  }
}
