/**
 * Crisp screen-space text and flashes of level 6, drawn by a second camera at device resolution
 * (zoom 1, never shaken): first-run hints, floating labels (combo, clean zone) that pop by the truck and
 * stack, customer speech bubbles that follow the sidewalk (never over the road), the red flash of a crash,
 * the last-seconds urgency (pulsing red edges + big digits) and the CICCIO FEVER gold glow on the screen
 * edges. Sizes are CSS px times the device pixel ratio. World points are projected through the main
 * camera's pose (zoom, centre and, in the v9 side view, its quarter turn), so everything here stays upright
 * whatever the road does.
 */
import Phaser from 'phaser';
import { ROAD_W } from '../../art/rush/keys';
import { FX, RUSH_VIEW, TRUCK_LOOK, TRUCK_W } from './config';
import { project, type CamPose, type RushFraming } from './framing';
import { pushUp } from './stack';
import { pixelCaps } from './logic/strings';

export const PIXEL_FONT = '"Press Start 2P", monospace';
const INK = '#1a0f0a';
/** overlay text grows on screens bigger than this (CSS px, short side), up to TEXT_GROW_MAX */
const TEXT_BASE_CSS = 420;
const TEXT_GROW_MAX = 1.5;
/** first-run hints (CSS px): text size, box padding, free edge around the box, gap to the bottom */
const HINT = { css: 9, padX: 8, padY: 6, edge: 6, bottom: 10 } as const;

type Getter = () => { x: number; y: number } | null;

/** Where the truck is (TruckView.pos): labels pop around it. `top` = world y of its front edge. */
export interface TruckAt {
  readonly x: number;
  readonly y: number;
  readonly lift: number;
  readonly top: number;
}

/** A floating label: where it popped (device px; y moves when a newer label pushes it), which way it rises (-1 up,
 * 1 down the screen), the truck's flank row then (side view, null upright), its rise. */
interface Tag {
  readonly x: number;
  y: number;
  readonly dir: number;
  readonly flank: number | null;
  rise: number;
}

interface Follower {
  readonly obj: Phaser.GameObjects.Text;
  readonly at: Getter;
  readonly dy: number;
  /** world y the bottom of the text never drops below */
  readonly floor: () => number;
  /** word-wrap width set on the text (device px), 0 = none yet */
  wrap: number;
}

export class Overlay {
  private frame: RushFraming | null = null;
  /** device px per CSS px of overlay text: dpr, a little more on big screens */
  private u = 1;
  /** labels and bubbles by the truck: this much bigger again where the road is drawn big (RUSH_VIEW.nearText) */
  private near = 1;
  private w = 1;
  private h = 1;
  private top = 0;
  /** device px kept free at each bottom corner for the overlaid touch controls (upright landscape) */
  private corner = 0;
  /** side view: device px of the ▲ ▼ column on the left (labels keep right of it), kept free of FRENA on the right too */
  private column = 0;
  private hintText: Phaser.GameObjects.Text | null = null;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly edges: Phaser.GameObjects.Graphics;
  private readonly big: Phaser.GameObjects.Text;
  private followers: Follower[] = [];
  /** floating labels in flight (a new run / the finale clears them) */
  private readonly labels = new Map<Phaser.GameObjects.Text, Tag>();
  private lastBig = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly pose: CamPose,
    private readonly truck: TruckAt,
  ) {
    this.flashRect = this.put(scene.add.rectangle(0, 0, 1, 1, 0xffffff).setOrigin(0, 0).setAlpha(0));
    this.edges = this.put(scene.add.graphics());
    this.big = this.put(this.text('', 44, '#fff6dc').setStroke('#b01818', 11).setOrigin(0.5).setAlpha(0));
  }

  private put<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.layer.add(o);
    return o;
  }

  /** Pixel-font text, `css` px high, dark outline. */
  text(s: string, css: number, color: string): Phaser.GameObjects.Text {
    const px = Math.round(css * this.u);
    return this.scene.add.text(0, 0, pixelCaps(s), {
      fontFamily: PIXEL_FONT,
      fontSize: `${px}px`,
      color,
      stroke: INK,
      strokeThickness: Math.max(2, Math.round(px / 4)),
      align: 'center',
    });
  }

  /** Canvas size (device px), framing, the top of the free band and the touch controls over the bottom (CSS px). */
  layout(f: RushFraming, w: number, h: number, dpr: number, topCss: number, bottomCss: number): void {
    const u = dpr * Math.min(TEXT_GROW_MAX, Math.max(1, Math.min(w, h) / dpr / TEXT_BASE_CSS));
    const resized = u !== this.u;
    const N = RUSH_VIEW.nearText;
    this.near = Math.max(1, Math.min(N.max, f.zoom / dpr / N.zoomCss) / (u / dpr));
    if (this.frame && this.frame.side !== f.side) this.dropLabels();
    this.frame = f;
    this.w = w;
    this.h = h;
    this.u = u;
    this.top = topCss * dpr;
    this.corner = bottomCss > 0 && !f.side ? RUSH_VIEW.cornerReserveCss * dpr : 0;
    this.column = f.side ? RUSH_VIEW.side.controlsCss * dpr : 0;
    this.flashRect.setSize(w, h);
    if (resized) this.big.setFontSize(Math.round(44 * u)).setStroke('#b01818', Math.round(10 * u));
    this.big.setPosition(w / 2, this.top + (h - this.top) * 0.3);
    this.hintText?.setWordWrapWidth(this.hintWrap, true).setOrigin(...this.hintOrigin).setPosition(this.hintX, this.hintY);
  }

  /** Device px per CSS px of overlay text (the finale card lays out with it). */
  get unit(): number {
    return this.u;
  }

  /** World point -> device px on screen (the camera as it is now, mid-ease included). */
  toScreen(x: number, y: number): { x: number; y: number } {
    return project(this.pose, this.w, this.h, x, y);
  }

  hint(text: string): void {
    this.hideHint();
    const t = this.put(this.text(text, HINT.css, '#fff6dc').setOrigin(...this.hintOrigin));
    t.setBackgroundColor('rgba(16,12,10,0.82)').setPadding(Math.round(HINT.padX * this.u), Math.round(HINT.padY * this.u));
    t.setWordWrapWidth(this.hintWrap, true);
    t.setPosition(this.hintX, this.hintY + 8 * this.u).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, y: this.hintY, duration: 220, ease: 'Back.easeOut' });
    this.hintText = t;
  }

  /** Upright the hint hangs from its bottom centre, in the side view from its bottom right corner. */
  private get hintOrigin(): [number, number] {
    return this.frame?.side ? [1, 1] : [0.5, 1];
  }

  /** Hints sit at the bottom edge, under the truck / on the bottom sidewalk: the banners own the top and the road
   * ahead stays clear. */
  private get hintY(): number {
    return this.h - HINT.bottom * this.u;
  }

  /** Hint lines wrap inside the screen, between the corner controls where they cover the canvas. Side view: in the
   * right half, short of FRENA: the Ciccio's La Lumia sign plate has scrolled to the left half when the first hint
   * comes, and the top band is the banners'. */
  private get hintWrap(): number {
    const room = this.frame?.side ? this.w / 2 - this.column : this.w - 2 * this.corner;
    return Math.max(this.u, room - 2 * (HINT.padX + HINT.edge) * this.u);
  }

  private get hintX(): number {
    return this.frame?.side ? this.w - this.column - HINT.edge * this.u : this.w / 2;
  }

  hideHint(): void {
    const t = this.hintText;
    if (!t) return;
    this.hintText = null;
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 180, onComplete: () => t.destroy() });
  }

  /**
   * Text that pops by the truck and rises away. Upright: `dy` px ahead of the truck centre, never over the truck.
   * Side view: over the truck's flank on screen, centred on its front, so a long label never covers the lane ahead
   * nor the roof lettering, and it follows the truck across lanes; from the top lane (the band above is the HUD's
   * and the banners') under it, sinking. Labels popping together (SFIORATO! + COMBO, a chain + a clean zone) stack
   * by the truck, the older ones pushed away from it.
   */
  label(dy: number, s: string, color: string, css = 11): void {
    const t = this.put(this.text(s, css * this.near, color).setOrigin(0.5).setScale(0.4));
    const gap = 2 * this.u * this.near;
    const tr = this.truck;
    const dir = this.frame?.side && tr.x < ROAD_W / 3 ? 1 : -1;
    const flank = this.flank(dir);
    let p: { x: number; y: number };
    if (flank !== null) {
      const front = this.toScreen(tr.x, tr.top);
      p = { x: Phaser.Math.Clamp(front.x, this.column + t.width / 2 + gap, this.w - t.width / 2 - gap), y: flank + dir * (gap + t.height / 2) };
    } else {
      p = this.toScreen(tr.x, tr.y - dy);
      p.y = Math.min(p.y, this.toScreen(tr.x, tr.top).y - gap - t.height / 2);
    }
    // pushUp works up the screen: mirrored for a stack that grows down
    const same = [...this.labels].filter(([, g]) => g.dir === dir);
    const lift = pushUp(same.map(([o]) => ({ x: o.x, y: -dir * o.y, w: o.width, h: o.height })), { x: p.x, y: -dir * p.y, w: t.width, h: t.height }, gap);
    same.forEach(([o, g], i) => {
      g.y += dir * lift[i];
      this.placeTag(o, g);
    });
    const tag: Tag = { x: p.x, y: p.y, dir, flank, rise: 0 };
    this.labels.set(t, tag);
    this.placeTag(t, tag);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 450 });
    this.scene.tweens.add({
      targets: tag,
      rise: 26 * this.u * this.near,
      delay: 650,
      duration: 450,
      onComplete: () => {
        if (this.labels.delete(t)) t.destroy(); // clear() already took it otherwise
      },
    });
  }

  /** Side view: screen row of the truck's flank on the `dir` side (-1 up, 1 down the screen; it moves with the lane), null upright. */
  private flank(dir: number): number | null {
    if (!this.frame?.side) return null;
    const tr = this.truck;
    return this.toScreen(tr.x + dir * (TRUCK_W / 2) * (1 + TRUCK_LOOK.flyScale * tr.lift), tr.top).y;
  }

  private placeTag(t: Phaser.GameObjects.Text, g: Tag): void {
    const flank = g.flank === null ? null : this.flank(g.dir);
    const follow = g.flank !== null && flank !== null ? flank - g.flank : 0;
    t.setPosition(g.x, Phaser.Math.Clamp(g.y + follow + g.dir * g.rise, this.top + t.height / 2, this.h - t.height / 2));
  }

  /**
   * Speech bubble by a moving world point ("MIZZICA!"); `floor` = the world y of the truck's front: the
   * bubble stays ahead of it (above it upright, right of it in the side view), never over the roof script,
   * and on the speaker's sidewalk, never over the road (upright its lines wrap to the sidewalk's width).
   */
  bubble(at: Getter, s: string, floor: () => number = () => Infinity, ms = 1500): void {
    if (!at()) return;
    const k = this.u * this.near;
    const t = this.put(this.text(s, 8 * this.near, '#1a0f0a').setOrigin(0.5, 1));
    t.setStroke('#ffffff', 0).setBackgroundColor('#fff6dc').setPadding(Math.round(5 * k), Math.round(4 * k));
    const f: Follower = { obj: t, at, dy: 16, floor, wrap: 0 };
    this.followers.push(f);
    this.place(f);
    t.setScale(0.3);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 220, ease: 'Back.easeOut' });
    this.scene.time.delayedCall(ms, () => this.unfollow(f));
  }

  /** A bubble whose speaker is gone (null getter) or whose time is up fades out. */
  private unfollow(f: Follower): void {
    if (!this.followers.includes(f)) return;
    this.followers = this.followers.filter((x) => x !== f);
    this.scene.tweens.add({ targets: f.obj, alpha: 0, duration: FX.bubbleFadeMs, onComplete: () => f.obj.destroy() });
  }

  private place(f: Follower): void {
    const p = f.at();
    if (!p) {
      this.unfollow(f);
      return;
    }
    const o = f.obj;
    const m = 4 * this.u;
    const s = this.toScreen(p.x, p.y);
    const front = this.toScreen(p.x, f.floor());
    // the road edge on the speaker's side: the bubble stays on that sidewalk
    const far = p.x > ROAD_W / 2;
    const edge = this.toScreen(far ? ROAD_W : 0, p.y);
    if (this.frame?.side) {
      // beside the speaker (ahead of it and of the truck), in the band between the road edge and the screen edge
      const half = o.displayWidth / 2;
      const x = Math.max(s.x + (f.dy * this.pose.zoom) / 2 + half, front.x + half + m);
      const lo = (far ? edge.y : this.top) + m + o.displayHeight;
      const hi = far ? this.h - m : edge.y - m;
      o.setPosition(Phaser.Math.Clamp(x, half + m, this.w - half - m), Phaser.Math.Clamp(s.y + o.displayHeight / 2, lo, hi));
      return;
    }
    const wrap = Math.max(40 * this.u, (far ? this.w - edge.x : edge.x) - 2 * m - 10 * this.u);
    if (Math.abs(wrap - f.wrap) > 1) {
      f.wrap = wrap;
      o.setWordWrapWidth(wrap, true);
    }
    const half = o.displayWidth / 2;
    const x = far ? Phaser.Math.Clamp(s.x, edge.x + m + half, this.w - m - half) : Phaser.Math.Clamp(s.x, m + half, edge.x - m - half);
    const y = Math.min(s.y - f.dy * this.pose.zoom, front.y);
    // keep the bubble on screen near the edges
    o.setPosition(x, Phaser.Math.Clamp(y, this.top + o.displayHeight, this.h - 40 * this.u));
  }

  /** The view turned: labels in flight fade out at once (they sat by the truck where it was on the old screen). */
  private dropLabels(): void {
    for (const t of this.labels.keys()) {
      this.scene.tweens.killTweensOf(t);
      this.scene.tweens.add({ targets: t, alpha: 0, duration: RUSH_VIEW.turnFadeMs, onComplete: () => t.destroy() });
    }
    this.labels.clear(); // their rise tweens find them gone and leave them to the fade
  }

  flash(color: number, alpha: number, ms: number): void {
    this.flashRect.setFillStyle(color).setAlpha(alpha);
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: ms });
  }

  /** Per frame: followers, the FEVER glow (`fever` 0..1 time left), the last-seconds red edges and the big countdown digits. */
  update(timeLeftMs: number, playing: boolean, fever = 0): void {
    for (const f of this.followers) this.place(f);
    for (const [t, g] of this.labels) this.placeTag(t, g);
    const g = this.edges;
    g.clear();
    if (playing && fever > 0) this.glow(fever);
    const s = Math.ceil(timeLeftMs / 1000);
    if (!playing || s > FX.urgentS || timeLeftMs <= 0) {
      this.big.setAlpha(0);
      return;
    }
    const beat = 1 - (timeLeftMs % 1000) / 1000;
    const band = Math.round((10 + 10 * beat) * this.u);
    g.fillStyle(0xe01a1a, 0.12 + 0.18 * (1 - beat) * (FX.urgentS + 1 - s) / FX.urgentS);
    g.fillRect(0, 0, this.w, band);
    g.fillRect(0, this.h - band, this.w, band);
    g.fillRect(0, 0, band, this.h);
    g.fillRect(this.w - band, 0, band, this.h);
    if (s <= FX.bigDigitsS) {
      if (s !== this.lastBig) {
        this.lastBig = s;
        this.big.setText(String(s)).setScale(1.6);
      }
      this.big.setScale(1 + 0.6 * (1 - Math.min(1, beat * 3))).setAlpha(0.95 * (1 - beat * 0.6));
    }
  }

  /**
   * CICCIO FEVER: a pulsing gold glow round the free screen, fading in its last fifth: three rings, brightest at the
   * edge, each pixel filled once (a ring holds the alpha of the 3, 2, 1 layers that used to overlap there).
   */
  private glow(level: number): void {
    const g = this.edges;
    const beat = 0.5 + 0.5 * Math.sin(this.scene.time.now / FX.feverPulseMs);
    const a = (FX.feverGlowAlpha + FX.feverGlowPulse * beat) * Math.min(1, level * 5);
    const step = (FX.feverGlowCss * this.u) / 3;
    for (let i = 0; i < 3; i++) {
      const o = Math.round(step * i);
      const d = Math.round(step * (i + 1)) - o;
      const side = this.h - this.top - 2 * (o + d);
      g.fillStyle(FX.feverGold, 1 - (1 - a) ** (3 - i));
      g.fillRect(o, this.top + o, this.w - 2 * o, d);
      g.fillRect(o, this.h - o - d, this.w - 2 * o, d);
      g.fillRect(o, this.top + o + d, d, side);
      g.fillRect(this.w - o - d, this.top + o + d, d, side);
    }
  }

  clear(): void {
    this.hideHint();
    for (const f of this.followers) f.obj.destroy();
    this.followers = [];
    for (const t of this.labels.keys()) t.destroy();
    this.labels.clear();
    this.edges.clear();
    this.big.setAlpha(0);
    this.lastBig = -1;
  }
}
