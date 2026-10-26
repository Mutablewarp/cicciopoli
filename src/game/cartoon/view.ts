/**
 * Camera + frame of level 8: one camera on the arena (framing.ts), the cinema around it (dark
 * surround with film sprocket holes, an ink + gold frame on the arena edge, covers for any art that
 * bleeds outside the arena) and the film layer on top. Fights on a phone push in and follow the action
 * (eased; held upright a lot, sideways a little), with edge arrows for the hazards (and the boss) outside the
 * view; title cards and knockouts see the whole arena, the finale its golden ticket as big as it fits. The
 * canvas backing store is capped at CT_VIEW.dprCap device px per CSS px while the level runs (restored on destroy).
 */
import type Phaser from 'phaser';
import type { ViewportInfo } from '../../contracts';
import { ARENA, type Box, type Vec } from './api';
import { EdgeArrows } from './arrows';
import { DEPTH } from './depths';
import { Film } from './film';
import { edgeArrows, type RadarThing } from './logic/arrows';
import { cameraPose, computeFraming, follow, frameBox, keepInView, viewRect, type ArenaFraming, type Focus } from './logic/framing';
import { CT_VIEW } from '../../config/cartoon';

const SURROUND = 3000;
const HOLE = { w: 10, h: 7, gap: 22, off: 13 } as const;
const P = CT_VIEW.push;

/** true while setBackingStore runs: the RESIZE events it fires re-enter layout() */
let resizing = false;

/** Sizes the canvas backing store at `dpr` device px per CSS px (the CSS size stays the host's). */
function setBackingStore(scene: Phaser.Scene, v: ViewportInfo, dpr: number): void {
  const w = Math.max(1, Math.round(v.cssW * dpr));
  const h = Math.max(1, Math.round(v.cssH * dpr));
  if (resizing || (scene.scale.width === w && scene.scale.height === h)) return;
  resizing = true;
  try {
    scene.scale.resize(w, h);
    scene.scale.setZoom(1 / dpr);
  } finally {
    resizing = false;
  }
  scene.game.canvas.style.width = `${v.cssW}px`;
  scene.game.canvas.style.height = `${v.cssH}px`;
}

export class CartoonView {
  framing: ArenaFraming;
  readonly film: Film;
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly arrows: EdgeArrows;
  /** eased camera push (1 = whole arena) and wanted centre (world units) */
  private push = 1;
  private want: Vec = { x: ARENA.w / 2, y: ARENA.h / 2 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly viewport: ViewportInfo,
    private readonly calm: () => boolean,
  ) {
    scene.cameras.main.setBackgroundColor(CT_VIEW.background);
    scene.cameras.main.setRoundPixels(false);
    this.framing = this.measure();
    this.film = new Film(scene, this.framing.k, calm);
    this.frame = scene.add.graphics().setDepth(DEPTH.frame);
    this.arrows = new EdgeArrows(scene);
    this.drawFrame();
    this.layout();
  }

  /** Device px per CSS px of the canvas while level 8 runs. */
  private get dpr(): number {
    return Math.min(Math.max(1, this.viewport.dpr), CT_VIEW.dprCap);
  }

  private measure(): ArenaFraming {
    return computeFraming({ ...this.viewport, dpr: this.dpr });
  }

  private drawFrame(): void {
    const g = this.frame;
    const bg = Number.parseInt(CT_VIEW.background.slice(1), 16);
    const W = ARENA.w;
    const H = ARENA.h;
    g.fillStyle(bg, 1);
    g.fillRect(-SURROUND, -SURROUND, SURROUND * 2 + W, SURROUND);
    g.fillRect(-SURROUND, H, SURROUND * 2 + W, SURROUND);
    g.fillRect(-SURROUND, 0, SURROUND, H);
    g.fillRect(W, 0, SURROUND, H);
    g.fillStyle(0x2a1d12, 1);
    for (let x = HOLE.gap / 2; x < W; x += HOLE.gap) {
      g.fillRoundedRect(x - HOLE.w / 2, -HOLE.off - HOLE.h / 2, HOLE.w, HOLE.h, 2);
      g.fillRoundedRect(x - HOLE.w / 2, H + HOLE.off - HOLE.h / 2, HOLE.w, HOLE.h, 2);
    }
    g.lineStyle(4, CT_VIEW.frameInk, 1);
    g.strokeRect(-2, -2, W + 4, H + 4);
    g.lineStyle(1, CT_VIEW.frameGold, 0.8);
    g.strokeRect(-4.5, -4.5, W + 9, H + 9);
  }

  /** Re-frames the camera for the current canvas size and insets (capping the backing store first). */
  layout(): void {
    setBackingStore(this.scene, this.viewport, this.dpr);
    const cam = this.scene.cameras.main;
    cam.setSize(this.scene.scale.width, this.scene.scale.height);
    this.framing = this.measure();
    this.push = Math.min(this.push, this.framing.pushMax);
    this.place({ x: 0, y: 0 });
  }

  private place(offset: Vec): void {
    const pose = cameraPose(this.framing, this.push, this.want);
    const cam = this.scene.cameras.main;
    cam.setZoom(pose.zoom);
    cam.centerOn(pose.centerX + offset.x, pose.centerY + offset.y);
    this.film.layout(pose.zoom);
  }

  /**
   * Film + shake + camera: `focus` = what a pushed fight keeps in view, else `show` = a box shown as big as it fits
   * (the finale), else the whole arena (title cards, knockout); `radar` = the things the edge arrows may point at.
   */
  update(dtMs: number, shake: Vec, focus: Focus | null, radar: readonly RadarThing[], show: Box | null = null): void {
    const j = this.film.update(dtMs);
    const target = focus ? follow(this.framing, focus) : show ? frameBox(this.framing, show) : { push: 1, want: { x: ARENA.w / 2, y: ARENA.h / 2 } };
    const slow = this.calm() ? P.calmSlow : 1;
    const ez = 1 - Math.exp(-dtMs / (P.zoomTauMs * slow));
    const ep = 1 - Math.exp(-dtMs / (P.panTauMs * slow));
    this.push += (target.push - this.push) * ez;
    this.want = { x: this.want.x + (target.want.x - this.want.x) * ep, y: this.want.y + (target.want.y - this.want.y) * ep };
    // the eased pan never leaves the hero behind (a dash is faster than the pan)
    if (focus) this.want = keepInView(this.framing, this.push, this.want, focus.hero);
    this.place({ x: shake.x + j.x, y: shake.y + j.y });
    const zc = this.framing.zoomCss * this.push;
    const view = viewRect(this.framing, cameraPose(this.framing, this.push, this.want));
    const A = CT_VIEW.arrows;
    this.arrows.draw(radar.length > 0 ? edgeArrows(view, radar, A.insetCss / zc, A.range, A.max) : [], zc);
  }

  /** Device px per world unit at full push (crisp text). */
  get textRes(): number {
    return this.framing.zoom * this.framing.pushMax;
  }

  destroy(): void {
    this.film.destroy();
    this.frame.destroy();
    this.arrows.destroy();
    setBackingStore(this.scene, this.viewport, Math.max(1, this.viewport.dpr));
  }
}
