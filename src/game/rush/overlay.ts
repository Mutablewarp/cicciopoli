/**
 * Crisp screen-space text and flashes of level 6, drawn by a second camera at device resolution
 * (zoom 1, never shaken): first-run hints, floating labels (combo, clean zone), customer speech
 * bubbles that follow the sidewalk, the red flash of a crash and the last-seconds urgency (pulsing
 * red edges + big digits). Sizes are CSS px times the device pixel ratio.
 */
import Phaser from 'phaser';
import { FX, RUSH_VIEW } from './config';
import type { RushFraming } from './framing';
import { pixelCaps } from './logic/strings';

export const PIXEL_FONT = '"Press Start 2P", monospace';
const INK = '#1a0f0a';
/** overlay text grows on screens bigger than this (CSS px, short side), up to TEXT_GROW_MAX */
const TEXT_BASE_CSS = 420;
const TEXT_GROW_MAX = 1.5;
/** first-run hints (CSS px): text size, box padding, free edge around the box, gap to the bottom */
const HINT = { css: 9, padX: 8, padY: 6, edge: 6, bottom: 10 } as const;

type Getter = () => { x: number; y: number } | null;

interface Follower {
  readonly obj: Phaser.GameObjects.Text;
  readonly at: Getter;
  readonly dy: number;
  /** world y the bottom of the text never drops below */
  readonly floor: () => number;
}

export class Overlay {
  private frame: RushFraming | null = null;
  /** device px per CSS px of overlay text: dpr, a little more on big screens */
  private u = 1;
  private w = 1;
  private h = 1;
  private top = 0;
  /** device px kept free at each bottom corner for the overlaid touch controls (landscape phones) */
  private corner = 0;
  private hintText: Phaser.GameObjects.Text | null = null;
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly edges: Phaser.GameObjects.Graphics;
  private readonly big: Phaser.GameObjects.Text;
  private followers: Follower[] = [];
  /** floating labels in flight (a new run / the finale clears them) */
  private readonly labels = new Set<Phaser.GameObjects.Text>();
  private lastBig = -1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
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
    this.frame = f;
    this.w = w;
    this.h = h;
    this.u = u;
    this.top = topCss * dpr;
    this.corner = bottomCss > 0 ? RUSH_VIEW.cornerReserveCss * dpr : 0;
    this.flashRect.setSize(w, h);
    if (resized) this.big.setFontSize(Math.round(44 * u)).setStroke('#b01818', Math.round(10 * u));
    this.big.setPosition(w / 2, this.top + (h - this.top) * 0.3);
    this.hintText?.setWordWrapWidth(this.hintWrap, true).setPosition(w / 2, this.hintY);
  }

  /** Device px per CSS px of overlay text (the finale card lays out with it). */
  get unit(): number {
    return this.u;
  }

  /** World point -> device px on screen. */
  toScreen(x: number, y: number): { x: number; y: number } {
    const f = this.frame;
    if (!f) return { x: 0, y: 0 };
    return { x: (x - f.left) * f.zoom, y: (y - f.top) * f.zoom };
  }

  hint(text: string): void {
    this.hideHint();
    const t = this.put(this.text(text, HINT.css, '#fff6dc').setOrigin(0.5, 1));
    t.setBackgroundColor('rgba(16,12,10,0.82)').setPadding(Math.round(HINT.padX * this.u), Math.round(HINT.padY * this.u));
    t.setWordWrapWidth(this.hintWrap, true);
    t.setPosition(this.w / 2, this.hintY + 8 * this.u).setAlpha(0);
    this.scene.tweens.add({ targets: t, alpha: 1, y: this.hintY, duration: 220, ease: 'Back.easeOut' });
    this.hintText = t;
  }

  /** Hints sit at the bottom edge, under the truck: the banners own the top and the road ahead stays clear. */
  private get hintY(): number {
    return this.h - HINT.bottom * this.u;
  }

  /** Hint lines wrap inside the screen, and between the corner controls where they cover the canvas. */
  private get hintWrap(): number {
    return Math.max(this.u, this.w - 2 * this.corner - 2 * (HINT.padX + HINT.edge) * this.u);
  }

  hideHint(): void {
    const t = this.hintText;
    if (!t) return;
    this.hintText = null;
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 180, onComplete: () => t.destroy() });
  }

  /** Text that pops at a world point and rises away. */
  label(x: number, y: number, s: string, color: string, css = 11): void {
    const p = this.toScreen(x, y);
    const t = this.put(this.text(s, css, color).setOrigin(0.5).setPosition(p.x, p.y).setScale(0.4));
    this.labels.add(t);
    this.scene.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: p.y - 26 * this.u,
      alpha: 0,
      delay: 650,
      duration: 450,
      onComplete: () => {
        this.labels.delete(t);
        t.destroy();
      },
    });
  }

  /**
   * Speech bubble above a moving world point ("MIZZICA!"); `floor` = a world y its bottom stays
   * above (the truck's front: the bubble never covers the roof script).
   */
  bubble(at: Getter, s: string, floor: () => number = () => Infinity, ms = 1500): void {
    if (!at()) return;
    const t = this.put(this.text(s, 8, '#1a0f0a').setOrigin(0.5, 1));
    t.setStroke('#ffffff', 0).setBackgroundColor('#fff6dc').setPadding(Math.round(5 * this.u), Math.round(4 * this.u));
    const f: Follower = { obj: t, at, dy: -16, floor };
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
    const s = this.toScreen(p.x, Math.min(p.y + f.dy, f.floor()));
    // keep the bubble on screen near the edges
    const half = f.obj.displayWidth / 2;
    const lowest = this.h - 40 * this.u;
    f.obj.setPosition(Phaser.Math.Clamp(s.x, half + 4, this.w - half - 4), Phaser.Math.Clamp(s.y, this.top + f.obj.displayHeight, lowest));
  }

  flash(color: number, alpha: number, ms: number): void {
    this.flashRect.setFillStyle(color).setAlpha(alpha);
    this.scene.tweens.killTweensOf(this.flashRect);
    this.scene.tweens.add({ targets: this.flashRect, alpha: 0, duration: ms });
  }

  /** Per frame: followers, the last-seconds red edges and the big countdown digits. */
  update(timeLeftMs: number, playing: boolean): void {
    for (const f of this.followers) this.place(f);
    const g = this.edges;
    g.clear();
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

  clear(): void {
    this.hideHint();
    for (const f of this.followers) f.obj.destroy();
    this.followers = [];
    for (const t of this.labels) t.destroy();
    this.labels.clear();
    this.edges.clear();
    this.big.setAlpha(0);
    this.lastBig = -1;
  }
}
