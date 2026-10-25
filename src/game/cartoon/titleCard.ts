/**
 * Vintage title cards in the arena: "PRONTI? AMUNÌ!" with the boss intro line, "AL TAPPETO!" with a
 * spinning sunburst, "K.O.!". Lettering = canvas text in a heavy serif stack, thick ink outline, drop
 * shadow, a slight per-glyph wobble, gradient fill, drawn at scale k (crisp) and cached per text.
 */
import type Phaser from 'phaser';
import { ARENA } from './api';
import { INK, image } from './draw/canvas';
import { DEPTH } from './depths';
import { CT_FONT } from '../../config/cartoon';

export interface LetterStyle {
  size: number;
  /** top / bottom of the fill gradient */
  fill: readonly [string, string];
  italic?: boolean;
  /** radians of per-glyph wobble */
  wobble?: number;
  font?: string;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function fontOf(s: LetterStyle): string {
  return `${s.italic ? 'italic ' : ''}900 ${s.size}px ${s.font ?? CT_FONT.display}`;
}

function hash(text: string): string {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}

/** Registers (once) the lettering texture; returns its key and world size. */
export function lettering(scene: Phaser.Scene, text: string, s: LetterStyle, k: number): { key: string; w: number; h: number } {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  const font = fontOf(s);
  const glyphs = [...text];
  const spacing = s.size * 0.04;
  let widths = glyphs.map(() => s.size * 0.6);
  if (measureCtx) {
    measureCtx.font = font;
    widths = glyphs.map((g) => measureCtx?.measureText(g).width ?? s.size * 0.6);
  }
  const pad = s.size * 0.22;
  const w = widths.reduce((a, b) => a + b + spacing, 0) + pad * 2;
  const h = s.size * 1.35 + pad * 2;
  const key = `ct-core-txt-${hash(`${text}|${font}|${s.fill.join()}|${s.wobble ?? 0}`)}-${k}`;
  image(scene, key, w, h, k, (ctx) => {
    ctx.font = font;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    const base = pad + s.size * 1.02;
    const g = ctx.createLinearGradient(0, base - s.size * 0.8, 0, base);
    g.addColorStop(0, s.fill[0]);
    g.addColorStop(1, s.fill[1]);
    let x = pad;
    glyphs.forEach((ch, i) => {
      const gw = widths[i];
      ctx.save();
      ctx.translate(x + gw / 2, base + Math.sin(i * 2.1) * s.size * 0.03);
      ctx.rotate(Math.sin(i * 1.7 + 0.5) * (s.wobble ?? 0));
      ctx.fillStyle = INK; // drop shadow
      ctx.fillText(ch, s.size * 0.05, s.size * 0.07);
      ctx.strokeStyle = INK;
      ctx.lineWidth = s.size * 0.15;
      ctx.lineJoin = 'round';
      ctx.strokeText(ch, 0, 0);
      ctx.fillStyle = g;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
      x += gw + spacing;
    });
  });
  return { key, w, h };
}

export type CardTone = 'start' | 'knockout' | 'defeat';

const STYLE: Readonly<Record<CardTone, LetterStyle>> = {
  start: { size: 50, fill: ['#fff6dc', '#f2c14e'], wobble: 0.06 },
  knockout: { size: 66, fill: ['#fff1b0', '#ff4a1c'], wobble: 0.08 },
  defeat: { size: 76, fill: ['#f3e6c8', '#a89a84'], wobble: 0.05 },
};

export class TitleCard {
  private root: Phaser.GameObjects.Container | null = null;
  private rays: Phaser.GameObjects.Graphics | null = null;
  private text: Phaser.GameObjects.Image | null = null;
  private ageMs = 0;
  /** card age when it starts to leave */
  private outAt = Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
    private readonly calm: () => boolean,
  ) {}

  show(tone: CardTone, text: string, sub: string | null, ms: number): void {
    this.clear();
    const sc = this.scene;
    const items: Phaser.GameObjects.GameObject[] = [];
    if (tone === 'knockout') {
      this.rays = sc.add.graphics();
      for (let i = 0; i < 18; i++) {
        const a0 = (i / 18) * Math.PI * 2;
        const a1 = a0 + Math.PI / 18;
        this.rays.fillStyle(i % 2 ? 0xffe9a8 : 0xf5b84a, 0.2);
        this.rays.fillTriangle(0, 0, Math.cos(a0) * 300, Math.sin(a0) * 300, Math.cos(a1) * 300, Math.sin(a1) * 300);
      }
      items.push(this.rays);
    } else {
      items.push(sc.add.rectangle(0, sub ? 8 : 0, ARENA.w + 40, sub ? 128 : 104, 0x1c1511, tone === 'defeat' ? 0.72 : 0.55));
    }
    const L = lettering(sc, text, STYLE[tone], this.k);
    this.text = sc.add.image(0, sub ? -12 : 0, L.key).setScale(1 / this.k);
    items.push(this.text);
    if (sub) {
      const S = lettering(sc, sub, { size: 17, fill: ['#fff8e6', '#f3dfae'], italic: true, wobble: 0.02, font: CT_FONT.script }, this.k);
      const fit = Math.min(1, (ARENA.w - 40) / S.w);
      items.push(sc.add.image(0, 44, S.key).setScale(fit / this.k));
    }
    this.root = sc.add.container(ARENA.w / 2, ARENA.h / 2, items).setDepth(DEPTH.title).setScale(0.2).setAlpha(0);
    sc.tweens.add({ targets: this.root, scale: 1, alpha: 1, duration: 380, ease: 'Back.Out' });
    this.outAt = Math.max(0, ms - 320);
    this.ageMs = 0;
  }

  /** Runs on the round clock (clamped on slow devices), so the card leaves when the fight starts. */
  update(dtMs: number): void {
    if (!this.root || !this.text) return;
    this.ageMs += dtMs;
    if (this.ageMs >= this.outAt) {
      const root = this.root;
      this.outAt = Infinity;
      this.scene.tweens.add({ targets: root, alpha: 0, scale: 1.25, duration: 300, onComplete: () => this.root === root && this.clear() });
    }
    if (this.rays) this.rays.rotation += dtMs * (this.calm() ? 0.00015 : 0.0006);
    if (this.calm()) return;
    this.text.setAngle(Math.sin(this.ageMs / 140) * 1.4);
    this.text.setScale((1 + Math.sin(this.ageMs / 95) * 0.015) / this.k);
  }

  clear(): void {
    if (this.root) this.scene.tweens.killTweensOf(this.root);
    this.root?.destroy();
    this.root = null;
    this.rays = null;
    this.text = null;
  }
}
