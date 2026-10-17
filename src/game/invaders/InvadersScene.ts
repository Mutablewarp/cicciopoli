/**
 * Level 3 "CICCIO'S INVADERS" (scene key 'invaders', init data { level: 3 }). Loads the
 * space art lazily, runs the Battle + Story, frames the fixed playfield for any screen and
 * owns the app lifecycle: pause / resume, rotation, restart, menu, clean shutdown.
 */
import Phaser from 'phaser';
import type { ArtPack, Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';
import { registerArtPack } from '../../art/register';
import { SPACE } from '../../art/space/keys';
import { Battle } from './battle';
import { installInvadersDebug, uninstallInvadersDebug } from './debug';
import { computeFraming } from './framing';
import { HudLink } from './hudLink';
import { Story } from './story';

const ART = import.meta.glob('../../art/space.ts');

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class InvadersScene extends Phaser.Scene {
  private svc!: Services;
  private battle: Battle | null = null;
  private hud: HudLink | null = null;
  private paused = false;
  private cleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'invaders' });
  }

  init(): void {
    this.battle = null;
    this.hud = null;
    this.paused = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#070a1e');
    this.cameras.main.setRoundPixels(true);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
    this.listen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    void this.boot();
  }

  private listen(): void {
    const game = this.game.events;
    const onViewport = (): void => this.applyViewport();
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
    const { ui } = this.svc;
    if (!this.textures.exists(SPACE.jet)) {
      ui.setLoading(0.3, 'Accendo i motori del jet…');
      await nextFrame();
      try {
        const mod = (await ART['../../art/space.ts']()) as { buildSpaceArt: () => ArtPack };
        ui.setLoading(0.6, 'Accendo i motori del jet…');
        await nextFrame();
        registerArtPack(this, mod.buildSpaceArt());
      } catch (err) {
        console.error('[cicciopoli] space art failed', err);
        ui.setLoading(null);
        ui.banner('ERRORE GRAFICA', { tone: 'danger', ms: 2000 });
        this.svc.app.toMenu();
        return;
      }
    }
    // the scene may have been stopped (menu / restart) while the art was loading
    if (!this.sys.isActive() || this.battle) return;
    const battle = new Battle(this, this.svc);
    const story = new Story(battle, {
      restart: () => this.restartLevel(),
      toMenu: () => this.toMenu(),
      next: () => this.svc.app.startLevel(4),
    });
    this.battle = battle;
    this.hud = new HudLink(ui);
    this.applyViewport();
    installInvadersDebug(this, battle, story);
    ui.setLoading(null);
    ui.showHud(true);
    this.svc.audio.music('invaders');
    this.svc.input.reset();
    story.intro();
  }

  override update(_time: number, delta: number): void {
    const { battle, hud } = this;
    if (!battle || !hud) return;
    if (this.svc.input.consume('pause')) {
      this.pause();
      return;
    }
    battle.update(Math.min(delta, 50)); // a long hitch must not teleport bombs through the jet
    hud.push({ hearts: battle.hearts, score: battle.score, timeMs: battle.timeMs, progress: battle.progress(), charges: battle.charges });
  }

  /** Zoom-to-fit + centre the play band between the HUD and the touch controls. */
  private applyViewport(): void {
    const cam = this.cameras.main;
    cam.setSize(this.scale.width, this.scale.height);
    const f = computeFraming(this.svc.viewport);
    cam.setZoom(f.zoom);
    cam.centerOn(f.centerX, f.centerY);
    const w = cam.width / f.zoom;
    const h = cam.height / f.zoom;
    this.battle?.backdrop.layout({ x: f.centerX - w / 2, y: f.centerY - h / 2, w, h });
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    const b = this.battle;
    if (this.paused || !b || b.phase === 'over' || b.phase === 'won' || !this.sys.isActive()) return;
    this.paused = true;
    this.svc.audio.sfx('pause');
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
    this.scene.resume();
  }

  private restartLevel(): void {
    this.svc.ui.hideOverlays();
    this.svc.input.reset();
    this.paused = false;
    this.scene.restart({ level: 3 });
  }

  private toMenu(): void {
    this.paused = false;
    this.svc.app.toMenu();
  }

  private teardown(): void {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.battle = null;
    this.hud = null;
    this.paused = false;
    uninstallInvadersDebug();
  }
}
