/**
 * DOUBLE TRIPLE limbs (canvas 2D in world units, no Phaser): black rubber-hose arms ending in white gloves
 * (one pose per frame, directions in world space: left = toward the player) and hose legs in the shirt's
 * teal sneakers (a strut cycle, stand, crouch, tuck).
 */
import { INK, LINE } from '../../draw/canvas';
import { C, cel, glove, hose, type GloveShape } from '../oldschool/kit/style';

type Ctx = CanvasRenderingContext2D;

/** arm frame, shoulder at its centre */
export const ARMF = { w: 120, h: 120, s: 60 } as const;
export const POSE = { peace: 0, hangL: 1, hangR: 2, across: 3, throw: 4, upL: 5, upR: 6, downL: 7, downR: 8, limp: 9, cockHigh: 10 } as const;

/** hand position from the shoulder, elbow bend, finger direction and shape, per POSE */
export const HANDS: readonly (readonly [number, number, number, number, GloveShape])[] = [
  [8, -32, -10, 0.1, 'peace'],
  [-14, 22, -8, 1.9, 'fist'],
  [14, 22, 8, 1.2, 'fist'],
  [26, -16, 10, -0.5, 'open'],
  [-36, -2, -6, Math.PI, 'open'],
  [-20, -30, -10, -2.1, 'open'],
  [20, -30, 10, -1.0, 'open'],
  [-26, 28, -12, 2.2, 'open'],
  [26, 28, 12, 0.9, 'open'],
  [-10, 32, -10, 1.6, 'open'],
  [-4, -36, -10, -1.75, 'fist'],
];

/** Rubber-hose arm with a glove: POSE frames. */
export function drawArm(ctx: Ctx, f: number): void {
  const s = ARMF.s;
  const [hx, hy, bend, ang, shape] = HANDS[f] ?? HANDS[0];
  const wx = s + hx - Math.cos(ang) * 11;
  const wy = s + hy - Math.sin(ang) * 11;
  const mx = s + (wx - s) / 2 - (wy - s) * 0.18 + bend * 0.3;
  const my = s + (wy - s) / 2 + (wx - s) * 0.18;
  hose(ctx, [[s, s], [mx, my], [wx, wy]], 5.5, INK, 0.6);
  glove(ctx, s + hx, s + hy, 9.5, ang, shape);
}

/** Teal sneaker pointing left, sole bottom at (x, y). */
export function sneaker(ctx: Ctx, x: number, y: number, s = 1): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const lw = LINE / s;
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(-13, -1);
    c.quadraticCurveTo(-15, -10, -6, -11);
    c.lineTo(2, -14);
    c.quadraticCurveTo(9, -16, 10, -9);
    c.lineTo(10, -1);
    c.closePath();
  }, C.sneaker, '#1d6570', 1.5, 1.5, lw);
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(-14, -4);
    c.quadraticCurveTo(-15, 1, -10, 1);
    c.lineTo(10, 1);
    c.lineTo(11, -3);
    c.closePath();
  }, C.white, C.gloveShade, 0, 1, lw);
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(-13, -4);
    c.quadraticCurveTo(-14, -10, -7, -10);
    c.quadraticCurveTo(-6, -6, -9, -4);
    c.closePath();
  }, C.white, C.gloveShade, 0, 0.5, lw);
  ctx.strokeStyle = C.white;
  ctx.lineWidth = 1.3 / s;
  for (const lx of [-3, 0, 3]) {
    ctx.beginPath();
    ctx.moveTo(lx - 1.5, -12.5 + lx * 0.3);
    ctx.lineTo(lx + 1.5, -10 + lx * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

export const LEGS = { w: 80, h: 48, hipY: 4, soleY: 46 } as const;
export const LEG = { walk0: 0, walkN: 6, stand: 6, crouch: 7, tuck: 8 } as const;

function leg(ctx: Ctx, hipX: number, footX: number, footY: number, knee: number): void {
  const kx = (hipX + footX) / 2 - knee;
  const ky = (LEGS.hipY + footY) / 2;
  hose(ctx, [[hipX, LEGS.hipY], [kx, ky], [footX + 3, footY - 11]], 7, INK, 0.6);
  hose(ctx, [[footX + 1, footY - 15], [footX + 4, footY - 10]], 7, C.white, 0.8);
  sneaker(ctx, footX, footY, 1.2);
}

/** Two legs: frames 0-5 strut cycle, 6 stand, 7 crouch, 8 tucked (jump). */
export function drawLegs(ctx: Ctx, f: number): void {
  const cx = LEGS.w / 2;
  const sole = LEGS.soleY;
  if (f === LEG.crouch) {
    leg(ctx, cx + 10, cx + 22, sole, 12);
    leg(ctx, cx - 10, cx - 20, sole, 12);
    return;
  }
  if (f === LEG.tuck) {
    leg(ctx, cx + 10, cx + 14, sole - 14, 14);
    leg(ctx, cx - 10, cx - 12, sole - 10, 14);
    return;
  }
  if (f === LEG.stand) {
    leg(ctx, cx + 10, cx + 14, sole, 2);
    leg(ctx, cx - 10, cx - 12, sole, 2);
    return;
  }
  const a = (f / LEG.walkN) * Math.PI * 2;
  for (const side of [1, -1]) {
    const ph = a + (side > 0 ? Math.PI : 0);
    const fx = cx + side * 6 - Math.cos(ph) * 13;
    const lift = Math.max(0, Math.sin(ph)) * 9;
    leg(ctx, cx + side * 10, fx, sole - lift, 4 + lift * 0.6);
  }
}
