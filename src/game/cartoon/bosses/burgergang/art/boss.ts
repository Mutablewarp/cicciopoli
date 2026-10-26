/**
 * IL BOSS DELLA BURGER GANG cut out of the owner's shirt (scripts/level8/burgergang.mjs -> public/level8/
 * burgergang/boss.webp + atlas.ts), not redrawn: one texture per cut-out part, resampled from the atlas at the
 * round's texture scale (crisp at any zoom), plus what is made of the same pixels — the flying sunglasses (pink
 * halo: parryable), the gang (mini copies of him, strutting) — and the knockout dizzy eyes.
 */
import type Phaser from 'phaser';
import type { ImageAsset, Vec } from '../../../api';
import { anim, image, sheet } from '../../../draw/canvas';
import { BG, PRE } from '../config';
import { ATLAS, GANG_SIGN, PARTS, type PartName } from './atlas';
import { halo, spiralEye } from './parts';

/** Bitmaps the CORE preloads before load() (BossDef.assets). */
export const BOSS_ASSETS: readonly ImageAsset[] = [
  { key: ATLAS.key, url: ATLAS.url },
  { key: GANG_SIGN.key, url: GANG_SIGN.url },
];
/** Parts back to front. */
export const PART_NAMES: readonly PartName[] = (Object.keys(PARTS) as PartName[]).sort((a, b) => PARTS[a].z - PARTS[b].z);
export const partKey = (n: PartName): string => `${PRE}p-${n}`;
export const DIZZY_KEY = `${PRE}dizzy`;
export const SHADES_KEY = `${PRE}shades`;
export const GANG_KEY = `${PRE}gang`;
export const GANG_ANIM = `${PRE}gang-a`;

/** Flying sunglasses: share of their size on the face; gang member: height, frame, hit radius, leg swing. */
const FLY = { scale: 0.75, w: 64, h: 32 } as const;
const MINI = { h: 34, frame: 46, r: 12, legDeg: 14, fps: 7 } as const;
/** Dizzy eyes: frame, the two eyes (relative to EMIT.eyes), spiral radius. */
const DIZZY = { w: 44, h: 24, eyes: [[-10.5, -2.6], [10.2, 1.3]] as const, r: 7.5 } as const;
const DEG = Math.PI / 180;

/** His height in world units (boss scale 1), feet to the top of the bun. */
export const BOSS_H = (ATLAS.foot.y - Math.min(...PART_NAMES.map((n) => PARTS[n].oy))) * BG.wu;

/** A part's size in world units (boss scale 1). */
export function partSize(n: PartName): { w: number; h: number } {
  const p = PARTS[n];
  return { w: (p.w / ATLAS.tex) * BG.wu, h: (p.h / ATLAS.tex) * BG.wu };
}

/** Where a part's pivot sits in boss space (feet origin, scale 1). */
export function pivotOf(n: PartName): Vec {
  const p = PARTS[n];
  return { x: (p.px - ATLAS.foot.x) * BG.wu, y: (p.py - ATLAS.foot.y) * BG.wu };
}

/** The pivot inside the part image (sprite origin, 0..1). */
export function originOf(n: PartName): Vec {
  const p = PARTS[n];
  return { x: ((p.px - p.ox) * ATLAS.tex) / p.w, y: ((p.py - p.oy) * ATLAS.tex) / p.h };
}

function atlasImage(scene: Phaser.Scene): CanvasImageSource {
  if (!scene.textures.exists(ATLAS.key)) throw new Error('burger gang atlas not loaded');
  return scene.textures.get(ATLAS.key).getSourceImage() as CanvasImageSource;
}

function drawPart(ctx: CanvasRenderingContext2D, src: CanvasImageSource, n: PartName, x: number, y: number, deg: number, s: number): void {
  const p = PARTS[n];
  const o = originOf(n);
  const { w, h } = partSize(n);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg * DEG);
  ctx.scale(s, s);
  ctx.drawImage(src, p.x, p.y, p.w, p.h, -o.x * w, -o.y * h, w, h);
  ctx.restore();
}

/** The whole boss in his shirt pose (legs swung by `leg` degrees), feet at (x, y), scaled by s. */
function composeBoss(ctx: CanvasRenderingContext2D, src: CanvasImageSource, x: number, y: number, s: number, leg: number): void {
  const swing: Partial<Record<PartName, number>> = { legF: leg, legB: -leg };
  for (const n of PART_NAMES) {
    const pv = pivotOf(n);
    drawPart(ctx, src, n, x + pv.x * s, y + pv.y * s, swing[n] ?? 0, s);
  }
}

/** Every texture of the boss itself at texture scale kb (the giant phase wants a sharper one than k). */
export function loadBossArt(scene: Phaser.Scene, kb: number, k: number): void {
  const src = atlasImage(scene);
  const smooth = (ctx: CanvasRenderingContext2D): void => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  };
  for (const n of PART_NAMES) {
    const { w, h } = partSize(n);
    const p = PARTS[n];
    image(scene, partKey(n), w, h, kb, (ctx) => {
      smooth(ctx);
      ctx.drawImage(src, p.x, p.y, p.w, p.h, 0, 0, w, h);
    });
  }
  image(scene, SHADES_KEY, FLY.w, FLY.h, k, (ctx) => {
    smooth(ctx);
    halo(ctx, FLY.w / 2, FLY.h / 2, FLY.h / 2);
    drawPart(ctx, src, 'shades', FLY.w / 2, FLY.h / 2, 0, FLY.scale);
  });
  const ms = MINI.h / BOSS_H;
  sheet(scene, GANG_KEY, MINI.frame, MINI.frame, 2, k, (ctx, f) => {
    smooth(ctx);
    composeBoss(ctx, src, MINI.frame / 2, MINI.frame / 2 + MINI.r, ms, f ? MINI.legDeg : -MINI.legDeg);
  });
  anim(scene, GANG_ANIM, GANG_KEY, 2, MINI.fps);
  image(scene, DIZZY_KEY, DIZZY.w, DIZZY.h, kb, (ctx) => {
    DIZZY.eyes.forEach(([x, y], i) => spiralEye(ctx, DIZZY.w / 2 + x, DIZZY.h / 2 + y, DIZZY.r, i * 2));
  });
}
