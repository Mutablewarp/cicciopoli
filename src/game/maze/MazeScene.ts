/**
 * Level 4 · CICCIO-MAN (scene key 'maze', init data { level: 4 }). Loads the maze art lazily,
 * fits the whole board in the view (integer device-pixel zoom when it costs little), and owns
 * the app lifecycle: pause / resume, rotation, restart, menu, clean shutdown.
 */
import Phaser from 'phaser';
import type { ArtPack, Services } from '../../contracts';
import { SERVICES_KEY } from '../../contracts';
import { registerArtPack } from '../../art/register';
import { MAZE_ART } from '../../art/maze/keys';
import { nextLevel } from '../rules';
import { MAZE_H, MAZE_W } from './layout';
import { MazeRun } from './run';
import { installMazeDebug, uninstallMazeDebug } from './debug';

const ART = import.meta.glob('../../art/maze.ts');

/** Integer zoom when it keeps at least this share of the best fractional fit. */
const INTEGER_ZOOM_KEEP = 0.75;
/** World px of breathing room around the board. */
const MARGIN = 2;
/**
 * Landscape: the touch cross-pad overlays a bottom corner, so the bottom inset only matters
 * when the board would reach it; with this much CSS width free on each side it cannot.
 */
const LANDSCAPE_SIDE_CSS = 200;

export function fitZoom(availW: number, availH: number): number {
  const z = Math.min(availW / (MAZE_W + MARGIN * 2), availH / (MAZE_H + MARGIN * 2));
  const zi = Math.floor(z);
  return zi >= 1 && zi / z >= INTEGER_ZOOM_KEEP ? zi : Math.max(0.25, z);
}

export class MazeScene extends Phaser.Scene {
  private svc!: Services;
  private run: MazeRun | null = null;
  private paused = false;
  private pendingPause = false;
  /** Bumped on shutdown: a boot that resumes after the scene stopped/restarted bails out. */
  private bootToken = 0;
  private cleanups: Array<() => void> = [];

  constructor() {
    super({ key: 'maze' });
  }

  init(): void {
    this.run = null;
    this.paused = false;
    this.pendingPause = false;
  }

  create(): void {
    this.svc = this.registry.get(SERVICES_KEY) as Services;
    this.cameras.main.setBackgroundColor('#0e0c0c');
    this.cameras.main.setRoundPixels(true);
    this.svc.input.reset();
    this.svc.ui.showHud(false);
    this.listen();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
    void this.boot();
  }

  private listen(): void {
    const game = this.game.events;
    const onViewport = (): void => this.fit();
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
    const token = this.bootToken;
    if (!this.textures.exists(MAZE_ART.board)) {
      this.svc.ui.setLoading(0.3, 'Friggo i nuggets…');
      await new Promise<void>((r) => requestAnimationFrame(() => r()));
      try {
        const load = ART['../../art/maze.ts'];
        const mod = (await load()) as { buildMazeArt?: () => ArtPack };
        if (mod.buildMazeArt) registerArtPack(this, mod.buildMazeArt());
      } catch (err) {
        console.error('[cicciopoli] maze art failed', err);
      }
      this.svc.ui.setLoading(0.9, 'Friggo i nuggets…');
    }
    // the scene may have been stopped (menu / restart) while the art was loading;
    // (sys.isActive() is false during create(), so it cannot be used here)
    if (token !== this.bootToken || this.run) return;
    if (!this.textures.exists(MAZE_ART.board)) {
      this.svc.ui.setLoading(null);
      this.svc.app.toMenu();
      return;
    }
    this.run = new MazeRun(this, this.svc, {
      restart: () => this.restartLevel(),
      toMenu: () => this.toMenu(),
      next: () => {
        const next = nextLevel(4);
        if (next) this.svc.app.startLevel(next);
      },
    });
    installMazeDebug(this.run);
    this.fit();
    this.svc.ui.setLoading(null);
    this.svc.ui.showHud(true);
    this.svc.ui.setControls({ level: 4, mode: 'maze', fire: 'hidden', club: 'hidden', down: 'hidden', jumpLabel: 'SALTA' });
    this.svc.audio.music('maze');
    this.svc.input.reset();
    this.svc.ui.banner('CICCIO-MAN', { tone: 'info', sub: 'LIVELLO 4', ms: 1600 });
    if (this.pendingPause) this.pause();
  }

  /** Centres the board in the free band between the HUD and the bottom controls. */
  private fit(): void {
    const run = this.run;
    if (!run) return;
    const vp = this.svc.viewport;
    const cam = this.cameras.main;
    const W = this.scale.width;
    const H = this.scale.height;
    cam.setSize(W, H);
    const top = vp.insetTop * vp.dpr;
    let availH = Math.max(64, H - top - vp.insetBottom * vp.dpr);
    let left0 = 0;
    let availW = W;
    if (!vp.portrait) {
      const full = Math.max(64, H - top);
      const pad = LANDSCAPE_SIDE_CSS * vp.dpr;
      if ((W - MAZE_W * fitZoom(W, full)) / 2 >= pad) availH = full;
      else if (W - pad > H * 0.6) {
        // narrow landscape: the cross-pad owns the left column, the board takes the rest at full height
        availH = full;
        left0 = pad;
        availW = W - pad;
      }
    }
    const z = fitZoom(availW, availH);
    cam.setZoom(z);
    const sx = Math.round(left0 + (availW - MAZE_W * z) / 2);
    const sy = Math.round(top + (availH - MAZE_H * z) / 2);
    // Phaser zooms around the camera centre: scroll = visible top-left - half size * (1 - 1/z)
    const left = -sx / z;
    const topW = -sy / z;
    cam.setScroll(left - (W / 2) * (1 - 1 / z), topW - (H / 2) * (1 - 1 / z));
    run.board.layout({ x: left, y: topW, w: W / z, h: H / z });
  }

  override update(time: number, delta: number): void {
    const run = this.run;
    if (!run) return;
    if (this.svc.input.consume('pause')) {
      this.pause();
      return;
    }
    run.update(Math.min(delta, 50), time);
  }

  /* ---------------------------------------------------------------- pause */

  private pause(): void {
    if (!this.run) {
      this.pendingPause = true;
      return;
    }
    const phase = this.run.phase;
    if (this.paused || phase === 'won' || phase === 'over' || !this.sys.isActive()) return;
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
    this.scene.restart({ level: 4 });
  }

  private toMenu(): void {
    this.paused = false;
    this.svc.app.toMenu();
  }

  private teardown(): void {
    this.bootToken++;
    this.svc?.ui.setLoading(null); // a cancelled boot must not leave the loading screen up
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.run = null;
    this.paused = false;
    uninstallMazeDebug();
  }
}
