/**
 * DOUBLE TRIPLE bitmap rig: the parts scripts/level8/doubletriple.mjs cut out of the owner's shirt
 * (public/level8/doubletriple/*.webp, their boxes on the shirt in sprites.ts), redrawn at the round's texture
 * scale and placed in world units around the FEET (the soles on the floor). At rest every part sits exactly
 * where it is on the shirt (scripts/level8/oldschool-proof.mjs doubletriple checks it). The limbs turn about
 * their hips / shoulders; their poses keep the names the moves use.
 */
import type Phaser from 'phaser';
import type { ImageAsset, Vec } from '../../api';
import { image } from '../../draw/canvas';
import { DT_SRC } from './sprites';
import { DT } from './tuning';

export const PRE = 'ct-doubletriple-';

const FILES = { body: 'body', armL: 'arm-l', armR: 'arm-r', legL: 'leg-l', legR: 'leg-r' } as const;
export type DtPart = keyof typeof FILES;
const NAMES = Object.keys(FILES) as DtPart[];
const srcKey = (p: DtPart): string => `${PRE}src-${FILES[p]}`;

/** the shirt bitmaps the CORE preloads (BossDef.assets) */
export const DT_ASSETS: readonly ImageAsset[] = NAMES.map((p) => ({ key: srcKey(p), url: `level8/doubletriple/${FILES[p]}.webp` }));

/** the k-scaled textures drawn from them */
export const PART_TEX: Record<DtPart, string> = {
  body: `${PRE}body`,
  armL: `${PRE}arm-l`,
  armR: `${PRE}arm-r`,
  legL: `${PRE}leg-l`,
  legR: `${PRE}leg-r`,
};

const A = DT.art;

/** world offset of a shirt point (source px) from the feet */
export function off(p: Vec): Vec {
  return { x: (p.x - A.feet.x) * A.scale, y: (p.y - A.feet.y) * A.scale };
}

/** sprite origin (fractions, may lie outside 0..1) that puts a shirt point on the sprite's position */
export function originAt(part: DtPart, p: Vec): readonly [number, number] {
  const b = DT_SRC[part];
  return [(p.x - b.x) / b.w, (p.y - b.y) / b.h];
}

/** Redraws the preloaded shirt bitmaps at world size and scale k (throws if one did not load). */
export function loadParts(scene: Phaser.Scene, k: number): void {
  for (const p of NAMES) {
    if (!scene.textures.exists(srcKey(p))) throw new Error(`DOUBLE TRIPLE art missing: ${srcKey(p)}`);
    const src = scene.textures.get(srcKey(p)).getSourceImage() as CanvasImageSource;
    const w = DT_SRC[p].w * A.scale;
    const h = DT_SRC[p].h * A.scale;
    image(scene, PART_TEX[p], w, h, k, (ctx) => {
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, 0, 0, w, h);
    });
  }
}

/** pivots of each part on the shirt: the body turns / squashes about its hips, limbs about hips and shoulders */
export const PIVOT: Record<DtPart, Vec> = { body: A.hip, legL: A.hipL, legR: A.hipR, armL: A.shoulderL, armR: A.shoulderR };

export const HIP = off(A.hip);
/** shoulders relative to the body's hips, unscaled (world units) */
export const SHOULDER_L: Vec = { x: (A.shoulderL.x - A.hip.x) * A.scale, y: (A.shoulderL.y - A.hip.y) * A.scale };
export const SHOULDER_R: Vec = { x: (A.shoulderR.x - A.hip.x) * A.scale, y: (A.shoulderR.y - A.hip.y) * A.scale };
/** the left glove relative to its shoulder at rest (world units) */
export const GLOVE_L: Vec = { x: (A.gloveL.x - A.shoulderL.x) * A.scale, y: (A.gloveL.y - A.shoulderL.y) * A.scale };

/** arm poses: where the hand points from the shoulder (any length; left = toward the player); swingL: the strut's
 * swing, outward, so the glove stays in view beside the body as on the shirt */
export const POSE = { peace: 0, hangL: 1, swingL: 2, across: 3, throw: 4, upL: 5, upR: 6, downL: 7, downR: 8, limp: 9, cockHigh: 10 } as const;
const AIM: readonly (readonly [number, number])[] = [
  [8, -32], [-14, 22], [-22, 17], [26, -16], [-36, -2], [-20, -30], [20, -30], [-26, 28], [26, 28], [-10, 32], [-4, -36],
];
const deg = (v: readonly [number, number]): number => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

/** how far (deg, clockwise) an arm turns from its shirt pose (left: hanging glove, right: the peace sign) */
export function armTurn(pose: number, side: 'L' | 'R'): number {
  const rest = side === 'L' ? POSE.hangL : POSE.peace;
  return deg(AIM[pose] ?? AIM[rest]) - deg(AIM[rest]);
}

/** leg frames: a strut cycle, stand (the shirt pose), crouch, tucked (jump) */
export const LEG = { walk0: 0, walkN: 6, stand: 6, crouch: 7, tuck: 8 } as const;

/** turn (deg, clockwise) of the left / right leg for a leg frame */
export function legTurn(f: number): readonly [number, number] {
  const L = DT.legs;
  if (f === LEG.crouch) return [L.crouch, -L.crouch];
  if (f === LEG.tuck) return [L.tuck, -L.tuck];
  if (f >= LEG.walkN) return [0, 0];
  const a = Math.sin((f / LEG.walkN) * Math.PI * 2) * L.walkAmp;
  return [a, -a];
}

/** v rotated by deg (y down, clockwise) */
export function turn(v: Vec, d: number): Vec {
  const a = (d * Math.PI) / 180;
  return { x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) };
}
