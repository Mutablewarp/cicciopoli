/**
 * DON TUMA arena: the Sicilian beach of arena-paint.ts (one bled background), drifting clouds and a sail,
 * the potted lemon trees cut from the shirt either side, the checkered awning on top and the shirt's
 * checker strip in front. Every layer reaches BLEED past the arena edges, so the camera never shows a cut.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { BLEED, FRONT, drawFront, drawTumaBg } from './arena-paint';
import { TK, TREE, treeTex } from './config';
import { CLOUD, drawCloud, loop } from './kit/scenery';
import { type Ctx } from './kit/toon';
import { checkerBand } from './props';

const BG = { w: ARENA.w + BLEED.x * 2, h: ARENA.h + BLEED.y * 2 } as const;
/** the watercolour background is soft: drawn at most at this texture scale (memory) */
const BG_KMAX = 2;
/** Foreground props: over the fight (core hazards 14, fx 16, rain 18), under balloons 30 / title 40. */
export const FG_DEPTH = 20;
/**
 * The lemon trees: pot base x, mirror (-1 = flipped), base y (world units). Whole in every framing: the 16:9
 * view shows x 0-640, the landscape push-in at most x 46-640 (each tree is ~90 units wide).
 */
const TREES = [
  [124, -1, 300],
  [592, 1, 296],
] as const;

/** Sailboat on the sea (BOAT.w x BOAT.h). */
const BOAT = { w: 30, h: 30 } as const;
function drawBoat(ctx: Ctx): void {
  ctx.strokeStyle = '#7a5a40';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(15, 3);
  ctx.lineTo(15, 22);
  ctx.lineTo(26, 22);
  ctx.closePath();
  ctx.fillStyle = '#fff8ea';
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(4, 23);
  ctx.lineTo(27, 23);
  ctx.lineTo(23, 28);
  ctx.lineTo(8, 28);
  ctx.closePath();
  ctx.fillStyle = '#c8502c';
  ctx.fill();
  ctx.stroke();
}

/** The checkered awning along the top, scalloped (AWNING.w x AWNING.h): honey drips from it. */
const AWNING = { w: ARENA.w + BLEED.x * 2, h: 34 + BLEED.y } as const;
function drawAwning(ctx: Ctx): void {
  const y0 = BLEED.y;
  ctx.fillStyle = '#7a4a2a';
  ctx.fillRect(0, 0, AWNING.w, y0 + 5);
  checkerBand(ctx, [[-10, y0 + 15], [AWNING.w / 3, y0 + 15], [(AWNING.w * 2) / 3, y0 + 15], [AWNING.w + 10, y0 + 15]], 20);
  for (let x = 0; x < AWNING.w; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, y0 + 24, 16, 0, Math.PI);
    ctx.fillStyle = (x / 32) % 2 ? '#e2483c' : '#fffaf0';
    ctx.fill();
    ctx.strokeStyle = '#3a2418';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}

/** Register the arena textures (prefix `pre`; the tree bitmap is resampled by the boss load). */
export function loadTumaArena(scene: Phaser.Scene, pre: string, k: number): void {
  const kb = Math.min(k, BG_KMAX);
  image(scene, `${pre}bg`, BG.w, BG.h, kb, (ctx) => {
    ctx.translate(BLEED.x, BLEED.y);
    drawTumaBg(ctx);
  });
  image(scene, `${pre}cloud`, CLOUD.w, CLOUD.h, k, drawCloud);
  image(scene, `${pre}boat`, BOAT.w, BOAT.h, k, drawBoat);
  image(scene, `${pre}awning`, AWNING.w, AWNING.h, k, drawAwning);
  image(scene, `${pre}front`, FRONT.w, FRONT.h, k, drawFront);
}

export function buildTumaArena(scene: Phaser.Scene, pre: string, k: number): Phaser.GameObjects.GameObject[] {
  const kb = Math.min(k, BG_KMAX);
  const bg = worldSprite(scene, ARENA.w / 2, ARENA.h / 2, `${pre}bg`, kb).setDepth(-20);
  const clouds = [[40, 40, 0.8], [250, 22, 0.6], [600, 70, 0.7]].map(([x, y, s], i) => {
    const c = worldSprite(scene, x, y, `${pre}cloud`, k).setDepth(-19).setScale(s / k).setAlpha(0.92);
    return loop(scene, c, { x: x + 60, duration: 26000 + i * 7000 });
  });
  const boat = loop(scene, worldSprite(scene, 300, 214, `${pre}boat`, k).setDepth(-19), { angle: { from: -4, to: 4 }, x: 340, duration: 3200 });
  // the shirt's potted lemon trees either side, whole inside the 640-wide view (pot, crown and oranges)
  const tk = treeTex(k);
  const trees = TREES.map(([x, flip, y], i) => {
    const t = scene.add.image(x, y, TK.tree).setOrigin(TREE.base[0] / TREE.w, TREE.base[1] / TREE.h).setDepth(-15);
    t.setScale((flip * TREE.scale) / tk, TREE.scale / tk);
    return loop(scene, t, { angle: { from: -1.2, to: 1.2 }, duration: 2600 + i * 500 });
  });
  const awning = worldSprite(scene, ARENA.w / 2, (34 - BLEED.y) / 2, `${pre}awning`, k).setDepth(FG_DEPTH);
  const front = worldSprite(scene, ARENA.w / 2, ARENA.h - 6, `${pre}front`, k).setDepth(FG_DEPTH);
  return [bg, ...clouds, boat, ...trees, awning, front];
}
