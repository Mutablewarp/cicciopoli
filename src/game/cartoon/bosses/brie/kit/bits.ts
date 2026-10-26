/**
 * BOSS-A bitmap puppets: the parts cut from the shirts (scripts/level8/*.mjs) are horizontal strips the
 * CORE preloads (BossDef.assets); this kit numbers their frames, pins a part on a pivot given in crop
 * pixels of the shirt, and draws the rubber-hose limbs live (ink-edged tubes on a Graphics object).
 */
import Phaser from 'phaser';
import type { ImageAsset, Vec } from '../../../api';

/** A strip written by the cut script: `frames` frames of fw x fh px; (x, y) = crop px of a frame's top-left. */
export interface Strip {
  readonly url: string;
  readonly frames: number;
  readonly fw: number;
  readonly fh: number;
  readonly x: number;
  readonly y: number;
}

/** The ImageAsset list of a boss: one bitmap per strip, keyed `${prefix}${name}`. */
export function stripAssets(prefix: string, strips: Readonly<Record<string, Strip>>): ImageAsset[] {
  return Object.entries(strips).map(([name, s]) => ({ key: `${prefix}${name}`, url: s.url }));
}

/** Numbers the frames of a preloaded strip (0 … frames-1) and smooths it; throws when it was not preloaded. */
export function cutStrip(scene: Phaser.Scene, key: string, s: Strip): void {
  if (!scene.textures.exists(key)) throw new Error(`${key}: bitmap not preloaded`);
  const tex = scene.textures.get(key);
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  for (let i = 0; i < s.frames; i++) if (!tex.has(String(i))) tex.add(i, 0, i * s.fw, 0, s.fw, s.fh);
}

/**
 * Copy of frame `frame` of a cut strip redrawn at `scale` (e.g. k / ppu: a hazard texture, which the CORE
 * shows at 1 / k like the vector ones).
 */
export function rescaledCopy(scene: Phaser.Scene, src: string, s: Strip, dst: string, scale: number, frame = 0): void {
  if (scene.textures.exists(dst)) return;
  const img = scene.textures.get(src).getSourceImage() as CanvasImageSource;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(s.fw * scale));
  c.height = Math.max(1, Math.ceil(s.fh * scale));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, frame * s.fw, 0, s.fw, s.fh, 0, 0, c.width, c.height);
  scene.textures.addCanvas(dst, c);
  scene.textures.get(dst).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** Converts crop pixels to the puppet's local world units around `origin` (crop px) at `ppu` px per unit. */
export function toLocal(origin: Vec, ppu: number, c: Vec): Vec {
  return { x: (c.x - origin.x) / ppu, y: (c.y - origin.y) / ppu };
}

/**
 * A sprite of strip `s` whose origin is the crop pixel `pivot`, shown at 1 / ppu (world units); place it with
 * setPosition(toLocal(pivot)) to rebuild the shirt's pose.
 */
export function pinned(scene: Phaser.Scene, key: string, s: Strip, pivot: Vec, ppu: number, frame = 0): Phaser.GameObjects.Sprite {
  return scene.add
    .sprite(0, 0, key, frame)
    .setOrigin((pivot.x - s.x) / s.fw, (pivot.y - s.y) / s.fh)
    .setScale(1 / ppu);
}

export interface HoseStyle {
  /** fill width and ink edge, world units */
  readonly w: number;
  readonly edge: number;
  readonly fill: number;
  readonly ink: number;
}

const STEPS = 14;

/** Point on the quadratic curve a → (control c) → b at u. */
export function quad(a: Vec, c: Vec, b: Vec, u: number): Vec {
  const v = 1 - u;
  return { x: v * v * a.x + 2 * v * u * c.x + u * u * b.x, y: v * v * a.y + 2 * v * u * c.y + u * u * b.y };
}

/** Rubber-hose tube from a to b bending through c (round caps and joints), appended to `g`. */
export function hose(g: Phaser.GameObjects.Graphics, a: Vec, c: Vec, b: Vec, st: HoseStyle): void {
  const pts = Array.from({ length: STEPS + 1 }, (_, i) => quad(a, c, b, i / STEPS));
  for (const [col, r] of [
    [st.ink, st.w / 2 + st.edge],
    [st.fill, st.w / 2],
  ] as const) {
    g.lineStyle(r * 2, col, 1);
    g.fillStyle(col, 1);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      if (!p) continue;
      g.fillCircle(p.x, p.y, r);
      if (q) g.lineBetween(p.x, p.y, q.x, q.y);
    }
  }
}

/** Hex colour string '#rrggbb' as a Phaser colour number. */
export const hex = (c: string): number => Number.parseInt(c.slice(1), 16);
