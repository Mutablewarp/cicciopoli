/**
 * HAPPY BOX arena: the alley of arena-paint.ts (one bled background), the shirt's own MAKE IT HAPPY
 * lettering sprayed on the brick wall (cut from the shirt by scripts/level8/happy.mjs), paint cans by the
 * door, drifting clouds; in front, laundry across the alley and a hydrant. Every layer reaches past the arena
 * edges, so the camera never shows a cut.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { image, worldSprite } from '../../draw/canvas';
import { CLOUD, drawCloud, loop } from '../tuma/kit/scenery';
import { type Ctx, ell } from '../tuma/kit/toon';
import { BLEED, WALK, drawHappyBg } from './arena-paint';
import { HAPPY_CFG as C, HAPPY_MURAL_LAYER, HK, MURAL } from './config';
import { loadRig } from '../tuma/kit/rig';

const BG = { w: ARENA.w + BLEED.x * 2, h: ARENA.h + BLEED.y * 2 } as const;
/** the watercolour background is soft: drawn at most at this texture scale (memory) */
const BG_KMAX = 2;
/** Foreground props: over the fight (core hazards 14, fx 16, rain 18), under balloons 30 / title 40. */
const FG_DEPTH = 20;
const OUTLINE = '#5a3a2a';

function soft(ctx: Ctx, fill: string, w = 1.3): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w;
  ctx.stroke();
}

/** Laundry line across the whole alley (LAUNDRY, foreground, sways): it starts and ends past the edges. */
const LAUNDRY = { w: ARENA.w + BLEED.x * 2, h: 66 } as const;
function drawLaundry(ctx: Ctx): void {
  const sag = (x: number): number => 6 + 24 * (1 - ((x - LAUNDRY.w / 2) / (LAUNDRY.w / 2)) ** 2);
  ctx.beginPath();
  for (let x = 0; x <= LAUNDRY.w; x += 8) ctx.lineTo(x, sag(x));
  ctx.strokeStyle = '#3a2c24';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  for (const [x, w, h, c] of [[150, 30, 34, '#f3ead8'], [206, 22, 26, '#e2483c'], [262, 36, 30, '#7cc6f2'], [330, 24, 40, '#f6d23c'], [388, 30, 28, '#f3ead8'], [620, 26, 32, '#e2483c']] as const) {
    const y = sag(x + w / 2) - 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - 2, y + h);
    ctx.lineTo(x + 2, y + h);
    ctx.closePath();
    soft(ctx, c, 1.2);
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x + 3, y - 2, 3, 5);
    ctx.fillRect(x + w - 6, y - 2, 3, 5);
  }
}

/** Mid props: a stack of paint cans (frame 0) and a hydrant (frame 1, foreground). */
const PROP = { w: 70, h: 60 } as const;
function drawProp(ctx: Ctx, f: number): void {
  if (f === 0) {
    for (const [x, y, c] of [[16, 46, '#4fd1a8'], [40, 46, '#f6d23c'], [28, 24, '#ff9a3c']] as const) {
      ctx.beginPath();
      ctx.rect(x - 10, y - 10, 20, 22);
      soft(ctx, '#c9ccd2');
      ctx.fillStyle = c;
      ctx.fillRect(x - 10, y - 4, 20, 9);
      ctx.fillRect(x - 3, y - 10, 5, 8);
    }
    return;
  }
  ctx.beginPath();
  ctx.roundRect(24, 18, 22, 40, 4);
  soft(ctx, '#d0453a', 1.6);
  ell(ctx, 35, 18, 12, 6);
  soft(ctx, '#e0584a', 1.6);
  ctx.beginPath();
  ctx.rect(16, 30, 38, 8);
  soft(ctx, '#b83a30', 1.4);
}

/** Register the arena textures (prefix `pre`; the mural bitmap was preloaded by the CORE). */
export function loadHappyArena(scene: Phaser.Scene, pre: string, k: number): void {
  image(scene, `${pre}bg`, BG.w, BG.h, Math.min(k, BG_KMAX), (ctx) => {
    ctx.translate(BLEED.x, BLEED.y);
    drawHappyBg(ctx);
  });
  loadRig(scene, [HAPPY_MURAL_LAYER], MURAL.w, MURAL.h, Math.min(k * MURAL.scale, C.texMax));
  image(scene, `${pre}cloud`, CLOUD.w, CLOUD.h, k, drawCloud);
  image(scene, `${pre}laundry`, LAUNDRY.w, LAUNDRY.h, k, drawLaundry);
  for (const f of [0, 1]) image(scene, `${pre}prop${f}`, PROP.w, PROP.h, k, (c) => drawProp(c, f));
}

export function buildHappyArena(scene: Phaser.Scene, pre: string, k: number): Phaser.GameObjects.GameObject[] {
  const bg = worldSprite(scene, ARENA.w / 2, ARENA.h / 2, `${pre}bg`, Math.min(k, BG_KMAX)).setDepth(-20);
  const mk = Math.min(k * MURAL.scale, C.texMax);
  const mural = scene.add.image(214, 150, HK.mural).setScale(MURAL.scale / mk).setAngle(-3).setAlpha(0.94).setDepth(-18);
  const clouds = [[120, 10, 0.5], [450, 4, 0.4]].map(([x, y, s], i) => {
    const c = worldSprite(scene, x, y, `${pre}cloud`, k).setDepth(-19).setScale(s / k).setAlpha(0.85);
    return loop(scene, c, { x: x + 50, duration: 24000 + i * 6000 });
  });
  const cans = worldSprite(scene, 664, WALK - 6, `${pre}prop0`, k).setOrigin(0.5, 1).setDepth(-15);
  const laundry = loop(scene, worldSprite(scene, ARENA.w / 2, -8, `${pre}laundry`, k).setOrigin(0.5, 0).setDepth(FG_DEPTH), { angle: { from: -0.6, to: 0.6 }, duration: 2600 });
  const hydrant = worldSprite(scene, 14, ARENA.h - 24, `${pre}prop1`, k).setDepth(FG_DEPTH);
  return [bg, mural, ...clouds, cans, laundry, hydrant];
}
