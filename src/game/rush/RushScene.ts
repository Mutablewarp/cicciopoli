/**
 * Level 6 "CICCIO'S RUSH" (scene key 'rush', init data { level: 6 }). Loads the rush art lazily
 * (a pack that will not load = back to the menu with ERRORE GRAFICA, like the other levels;
 * placeholders only for single keys missing from a loaded pack), builds the view + session and
 * owns the app lifecycle: pause / resume (app hidden, HUD button, Esc / P), rotation and resize,
 * menu, clean shutdown of every listener, timer, tween and object.
 */
import Phaser from 'phaser';
import type { ArtPack, Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';
import { registerArtPack } from '../../art/register';
import { RUSH } from '../../art/rush/keys';
import { installRushDebug, uninstallRushDebug } from './debug';
import { PIXEL_FONT } from './overlay';
import { ensureRushArt } from './placeholders';
import { ensureSceneArt } from './sceneArt';
import { RushSession } from './session';
import { RushView } from './view';

const ART = import.meta.glob('../../art/rush.ts');
const LOADING = 'Carico il truck di Ciccio…';

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export class RushScene extends Phaser.Scene {
  private svc!: Services;
  private session: RushSession | null = null;
  private paused = false;
  private cleanups: Array<() => void> = [];
  /** bumped by every create() and teardown(): a boot() that sees another value is stale */
  private gen = 0;

  constructor() {
    super({ key: 'rush' });
  }

  init(): void {
    this.session = null;
    this.paused = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#141418');
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
    if (!this.textures.exists(RUSH.truck)) {
      ui.setLoading(0.3, LOADING);
      await nextFrame();
      try {
        const mod = (await ART['../../art/rush.ts']()) as { buildRushArt: () => ArtPack };
        if (stale()) return; // left meanwhile: teardown cleared the loading screen, keep it down
        ui.setLoading(0.6, LOADING);
        await nextFrame();
        if (stale()) return;
        registerArtPack(this, mod.buildRushArt());
      } catch (err) {
        console.error('[cicciopoli] rush art failed', err);
        if (stale()) return;
        ui.setLoading(null);
        ui.banner('ERRORE GRAFICA', { tone: 'danger', ms: 2000 });
        this.svc.app.toMenu();
        return;
      }
    }
    // canvas text needs the pixel font loaded before it is measured
    await document.fonts?.load(`16px ${PIXEL_FONT}`).catch(() => undefined);
    if (stale() || this.session) return;
    const missing = ensureRushArt(this);
    if (missing.length > 0) console.warn('[cicciopoli] rush placeholders for', missing.join(', '));
    ensureSceneArt(this);
    const view = new RushView(this, this.svc.viewport);
    const session = new RushSession(this, this.svc, view, () => this.toMenu());
    this.session = session;
    installRushDebug(this, session, view, this.svc.save);
    ui.setLoading(null);
    session.setup();
  }

  override update(_time: number, delta: number): void {
    const s = this.session;
    if (!s) return;
    if (s.state === 'run' && this.svc.input.consume('pause')) {
      this.pause();
      return;
    }
    s.update(Math.min(delta, 50)); // a long hitch must not teleport the truck through traffic
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    const s = this.session;
    if (!s || this.paused || s.state !== 'run' || !this.sys.isActive()) return;
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
    uninstallRushDebug();
  }
}
