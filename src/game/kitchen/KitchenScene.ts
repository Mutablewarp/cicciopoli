/**
 * Level 7 "CICCIO'S KITCHEN" (scene key 'kitchen', init data { level: 7 }). Loads the kitchen art
 * lazily (stand-ins for a pack that fails or lacks a key: the level always runs), builds the view +
 * session and owns the app lifecycle: pause / resume (app hidden, HUD button, Esc / P), rotation
 * and resize, menu, clean shutdown of every listener, timer, tween and object.
 */
import Phaser from 'phaser';
import type { ArtPack, Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';
import { registerArtPack } from '../../art/register';
import { KITCHEN } from '../../art/kitchen/keys';
import { KITCHEN_SHIFT } from '../../config/kitchen';
import { loadBrandLogo } from './brand';
import { installKitchenDebug, uninstallKitchenDebug } from './debug';
import { ensureKitchenArt } from './placeholders';
import { KitchenSession } from './session';
import { KitchenView } from './view';

const ART = import.meta.glob('../../art/kitchen.ts');
const LOADING = 'Accendo la piastra di Ciccio…';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class KitchenScene extends Phaser.Scene {
  private svc!: Services;
  private session: KitchenSession | null = null;
  private paused = false;
  private cleanups: Array<() => void> = [];
  /** bumped by every create() and teardown(): a boot() that sees another value is stale */
  private gen = 0;

  constructor() {
    super({ key: 'kitchen' });
  }

  init(): void {
    this.session = null;
    this.paused = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#141416');
    this.cameras.main.setRoundPixels(true);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
    this.svc.ui.setControls(null);
    this.listen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    void this.boot(++this.gen);
  }

  private listen(): void {
    const game = this.game.events;
    const onViewport = (): void => this.session?.layout();
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

  private async boot(gen: number): Promise<void> {
    const { ui } = this.svc;
    // the scene may be stopped (menu) while the art loads; when cached this runs inside create()
    const stale = (): boolean => gen !== this.gen;
    if (!this.textures.exists(KITCHEN.worktop)) {
      ui.setLoading(0.3, LOADING);
      await nextFrame();
      try {
        const mod = (await ART['../../art/kitchen.ts']()) as { buildKitchenArt: () => ArtPack };
        if (stale()) return; // left meanwhile: teardown cleared the loading screen, keep it down
        ui.setLoading(0.6, LOADING);
        await nextFrame();
        if (stale()) return;
        registerArtPack(this, mod.buildKitchenArt());
      } catch (err) {
        // the level still runs, on stand-ins
        console.error('[cicciopoli] kitchen art failed', err);
        if (stale()) return;
      }
    }
    if (stale() || this.session) return;
    const missing = ensureKitchenArt(this);
    if (missing.length > 0) console.warn('[cicciopoli] kitchen placeholders for', missing.join(', '));
    // the owner's original face logo for the hi-res brand textures (missing: the pixel disc stays)
    const logo = await loadBrandLogo(this);
    if (!logo) console.warn('[cicciopoli] kitchen: no brand logo, pixel stand-ins');
    if (stale() || this.session) return;
    let session: KitchenSession | null = null;
    const view = new KitchenView(this, this.svc.viewport, () => session?.calm ?? false);
    session = new KitchenSession(this, this.svc, view, () => this.paused, () => this.toMenu());
    this.session = session;
    installKitchenDebug(this, session, view);
    ui.setLoading(null);
    session.setup();
  }

  override update(_time: number, delta: number): void {
    const s = this.session;
    if (!s) return;
    if (s.state === 'play' && this.svc.input.consume('pause')) {
      this.pause();
      return;
    }
    s.update(Math.min(delta, KITCHEN_SHIFT.maxStepMs));
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    const s = this.session;
    if (!s || this.paused || s.state !== 'play' || !this.sys.isActive()) return;
    this.paused = true;
    this.svc.audio.sfx('pause');
    this.scene.pause();
    this.svc.ui.showPause(
      {
        onResume: () => this.resume(),
        onRestart: () => {
          this.resume();
          this.session?.retry();
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
    this.svc.ui.setLoading(null); // a cancelled boot must not leave the loading screen up
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.session?.destroy();
    this.session = null;
    this.paused = false;
    uninstallKitchenDebug();
  }
}
