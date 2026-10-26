/**
 * Level 8 "CICCIO'S GOLDEN TICKET" (scene key 'cartoon', init data { level: 8 }). Builds the view +
 * session (the art is drawn per boss at texture scale k, the hero once) and owns the app lifecycle:
 * pause / resume (app hidden, HUD button, Esc / P, the phone turned mid-fight), rotation and resize, menu, clean shutdown of every
 * listener, timer, tween and object.
 */
import Phaser from 'phaser';
import type { Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';
import { installCartoonDebug, uninstallCartoonDebug } from './debug';
import { CartoonSession } from './session';
import { CartoonView } from './view';
import { CT_VIEW } from '../../config/cartoon';

export class CartoonScene extends Phaser.Scene {
  private svc!: Services;
  private session: CartoonSession | null = null;
  private view: CartoonView | null = null;
  private paused = false;
  private cleanups: Array<() => void> = [];
  /** bumped by every create() and teardown(): a boot() that sees another value is stale */
  private gen = 0;

  constructor() {
    super({ key: 'cartoon' });
  }

  init(): void {
    this.session = null;
    this.view = null;
    this.paused = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor(CT_VIEW.background);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
    this.svc.ui.setControls(null);
    this.listen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    this.boot(++this.gen);
  }

  private listen(): void {
    const game = this.game.events;
    const v = this.svc.viewport;
    let seen = { w: v.cssW, h: v.cssH, portrait: v.portrait };
    const onViewport = (): void => {
      // the phone turned (or the window changed a lot) mid-fight: pause, no hit while the player re-grips
      // (not during the title card: the stage settles its HUD / controls bands there)
      const d = CT_VIEW.pauseOnResize;
      const big = v.portrait !== seen.portrait || Math.abs(v.cssW - seen.w) > seen.w * d || Math.abs(v.cssH - seen.h) > seen.h * d;
      if (big && this.session?.round?.state === 'fight') this.pause();
      seen = { w: v.cssW, h: v.cssH, portrait: v.portrait };
      this.session?.layout();
    };
    const onHidden = (): void => this.pause();
    game.on('viewport-changed', onViewport);
    game.on('app-hidden', onHidden);
    window.addEventListener('orientationchange', onHidden);
    this.scale.on(Phaser.Scale.Events.RESIZE, onViewport);
    this.svc.ui.onPauseButton(() => (this.paused ? this.resume() : this.pause()));
    this.cleanups.push(
      () => game.off('viewport-changed', onViewport),
      () => game.off('app-hidden', onHidden),
      () => window.removeEventListener('orientationchange', onHidden),
      () => this.scale.off(Phaser.Scale.Events.RESIZE, onViewport),
      () => this.svc.ui.onPauseButton(() => undefined),
    );
  }

  private boot(gen: number): void {
    if (gen !== this.gen || this.session) return;
    let session: CartoonSession | null = null;
    const view = new CartoonView(this, this.svc.viewport, () => session?.calm ?? false);
    session = new CartoonSession(this, this.svc, view, () => this.toMenu());
    this.view = view;
    this.session = session;
    installCartoonDebug(this, session, view);
    this.svc.ui.setLoading(null);
    session.showMap();
  }

  /** The fight is on (title card or fighting): pause is allowed. */
  private get fighting(): boolean {
    const r = this.session?.round;
    return this.session?.state === 'round' && (r?.state === 'intro' || r?.state === 'fight');
  }

  override update(_time: number, delta: number): void {
    const s = this.session;
    if (!s) return;
    if (this.svc.input.consume('pause') && this.fighting) {
      this.pause();
      return;
    }
    s.update(delta);
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    if (!this.session || this.paused || !this.fighting || !this.sys.isActive()) return;
    this.paused = true;
    this.svc.audio.sfx('pause');
    this.scene.pause();
    this.svc.ui.showPause(
      {
        onResume: () => this.resume(),
        onRestart: () => {
          const id = this.session?.round?.def.id;
          this.resume();
          if (id) void this.session?.play(id);
        },
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

  private toMenu(): void {
    this.paused = false;
    this.svc.app.toMenu();
  }

  private teardown(): void {
    this.gen++;
    this.svc.ui.setLoading(null); // a cancelled load must not leave the loading screen up
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.session?.destroy();
    this.session = null;
    this.view?.destroy();
    this.view = null;
    this.paused = false;
    uninstallCartoonDebug();
  }
}
