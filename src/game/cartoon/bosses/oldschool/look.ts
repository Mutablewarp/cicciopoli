/**
 * THE OLD SCHOOL bitmap rig: the parts scripts/level8/oldschool.mjs cut out of the owner's shirt
 * (public/level8/oldschool/*.webp, their boxes on the shirt in sprites.ts), redrawn at the round's texture
 * scale and placed in world units around one point, the burger's FOOT (the bottom-centre of its image).
 * At rest every part sits exactly where it is on the shirt (scripts/level8/oldschool-proof.mjs checks it).
 */
import type Phaser from 'phaser';
import type { ImageAsset, Vec } from '../../api';
import { image } from '../../draw/canvas';
import { OS_SRC } from './sprites';
import { OS } from './tuning';

export const PRE = 'ct-oldschool-';

const FILES = { burger: 'burger', arm: 'arm', handBack: 'hand-back', handFront: 'hand-front' } as const;
export type OsPart = keyof typeof FILES;
const NAMES = Object.keys(FILES) as OsPart[];

const srcKey = (p: OsPart): string => `${PRE}src-${FILES[p]}`;

/** the shirt bitmaps the CORE preloads (BossDef.assets) */
export const OS_ASSETS: readonly ImageAsset[] = NAMES.map((p) => ({ key: srcKey(p), url: `level8/oldschool/${FILES[p]}.webp` }));

/** the k-scaled textures drawn from them */
export const PART_TEX: Record<OsPart, string> = {
  burger: `${PRE}burger`,
  arm: `${PRE}arm`,
  handBack: `${PRE}hand-back`,
  handFront: `${PRE}hand-front`,
};

const SC = OS.art.scale;
const FOOT: Vec = { x: OS_SRC.burger.x + OS_SRC.burger.w / 2, y: OS_SRC.burger.y + OS_SRC.burger.h };

/** world offset of a shirt point (source px) from the burger's foot */
export function off(p: Vec): Vec {
  return { x: (p.x - FOOT.x) * SC, y: (p.y - FOOT.y) * SC };
}

/** sprite origin (fractions, may lie outside 0..1) that puts a shirt point on the sprite's position */
export function originAt(part: OsPart, p: Vec): readonly [number, number] {
  const b = OS_SRC[part];
  return [(p.x - b.x) / b.w, (p.y - b.y) / b.h];
}

/** Redraws the preloaded shirt bitmaps at world size and scale k (throws if one did not load). */
export function loadParts(scene: Phaser.Scene, k: number): void {
  for (const p of NAMES) {
    if (!scene.textures.exists(srcKey(p))) throw new Error(`THE OLD SCHOOL art missing: ${srcKey(p)}`);
    const src = scene.textures.get(srcKey(p)).getSourceImage() as CanvasImageSource;
    const w = OS_SRC[p].w * SC;
    const h = OS_SRC[p].h * SC;
    image(scene, PART_TEX[p], w, h, k, (ctx) => {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, w, h);
    });
  }
}

/** the little arm's poses (OS.armAngle) and the free hand's poses (OS.freeHand.angle) */
export const ARM_POSE = { waveA: 0, waveB: 1, windUp: 2, throw: 3, limp: 4 } as const;
export const HAND_POSE = { rest: 0, down: 1, flat: 2, surrender: 3 } as const;

/** the burger's foot sits at the image's bottom-centre: origin of the burger sprite */
export const BURGER_ORIGIN: readonly [number, number] = [0.5, 1];

/** offsets from the foot, unscaled pose: shoulder of the little arm, palm (the hand's pivot) */
export const SHOULDER = off(OS.art.shoulder);
export const PALM = off(OS.art.palm);
/** glove centre and finger tips relative to their pivots (world units) */
export const GLOVE_FROM_SHOULDER: Vec = { x: (OS.art.glove.x - OS.art.shoulder.x) * SC, y: (OS.art.glove.y - OS.art.shoulder.y) * SC };
export const TIPS_FROM_PALM: Vec = { x: (OS.art.tips.x - OS.art.palm.x) * SC, y: (OS.art.tips.y - OS.art.palm.y) * SC };

/** v rotated by deg (y down, clockwise), mirrored first when flip */
export function turn(v: Vec, deg: number, flip = false): Vec {
  const a = (deg * Math.PI) / 180;
  const x = flip ? -v.x : v.x;
  return { x: x * Math.cos(a) - v.y * Math.sin(a), y: x * Math.sin(a) + v.y * Math.cos(a) };
}
