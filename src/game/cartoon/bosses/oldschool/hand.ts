/**
 * THE OLD SCHOOL's GIANT white glove (canvas 2D in world units, no Phaser). Phase 1 it holds the burger up
 * from the bottom-right like on the shirt: the BACK layer (cuff, wrist, palm, open fingers) sits behind the
 * burger, the FRONT layer (curled fingertips, thumb) in front of it. Phase 2 it is a floating fist.
 */
import { INK } from '../../draw/canvas';
import { C, capsule, cel, ell, glove, hose } from './kit/style';

type Ctx = CanvasRenderingContext2D;

/** hand layers frame; GRIP = the burger's bottom-centre inside it */
export const HAND = { w: 180, h: 210 } as const;
export const GRIP = { x: 64, y: 118 } as const;
/** floating fist frames */
export const FIST = { w: 124, h: 124 } as const;
export const FIST_POSE = { left: 0, down: 1, flat: 2, surrender: 3 } as const;
/** ink width of the giant hand (bigger than the characters' default) */
const LW = 3.4;
const GLOVE = C.glove;

function cuff(ctx: Ctx, x: number, y: number, ang: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(0, -29);
    c.lineTo(28, -38);
    c.quadraticCurveTo(38, 0, 28, 38);
    c.lineTo(0, 29);
    c.quadraticCurveTo(-7, 0, 0, -29);
    c.closePath();
  }, GLOVE, C.gloveShade, 5, 4, LW);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW * 0.75;
  for (const rx of [10, 19]) {
    ctx.beginPath();
    ctx.moveTo(rx, -31 - rx * 0.25);
    ctx.quadraticCurveTo(rx + 7, 0, rx, 31 + rx * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

/** Back layer: wrist from the bottom-right corner, cuff, palm and the open fingers (hidden by the burger). */
export function drawHandBack(ctx: Ctx): void {
  hose(ctx, [[118, 150], [150, 186], [176, 222]], 54, GLOVE, LW);
  cuff(ctx, 150, 184, 0.86);
  const fingers: readonly (readonly [number, number, number, number])[] = [
    [92, 104, 42, 58],
    [100, 98, 62, 40],
    [108, 96, 86, 34],
    [116, 98, 108, 42],
  ];
  for (const [x1, y1, x2, y2] of fingers) hose(ctx, [[x1, y1], [x2, y2]], 19, GLOVE, LW);
  cel(ctx, (c) => ell(c, 110, 122, 42, 36, -0.6), GLOVE, C.gloveShade, 6, 6, LW);
  hose(ctx, [[86, 134], [66, 132], [48, 124]], 20, GLOVE, LW);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW * 0.7;
  ctx.beginPath();
  ctx.moveTo(96, 132);
  ctx.quadraticCurveTo(112, 142, 130, 132);
  ctx.stroke();
}

/** Front layer: the four fingertips curled over the burger's right side and the thumb across the bun. */
export function drawHandFront(ctx: Ctx): void {
  const curls: readonly (readonly (readonly [number, number])[])[] = [
    [[124, 46], [114, 33], [98, 36]],
    [[128, 63], [119, 52], [102, 55]],
    [[128, 80], [119, 71], [103, 74]],
    [[124, 96], [116, 89], [104, 92]],
  ];
  for (const pts of curls) hose(ctx, pts, 15, GLOVE, LW);
  ctx.strokeStyle = C.gloveShade;
  ctx.lineWidth = 3;
  for (const pts of curls) {
    const [x, y] = pts[2];
    ctx.beginPath();
    ctx.arc(x + 3, y + 1, 4, 0.6, 2.2);
    ctx.stroke();
  }
  hose(ctx, [[106, 148], [84, 138], [58, 124]], 19, GLOVE, LW);
}

function napkin(ctx: Ctx): void {
  ctx.beginPath();
  ctx.moveTo(66, 48);
  ctx.quadraticCurveTo(44, 40, 18, 48);
  ctx.quadraticCurveTo(12, 32, 16, 14);
  ctx.quadraticCurveTo(40, 6, 64, 16);
  ctx.closePath();
  ctx.fillStyle = C.white;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = '#d64a3a';
  ctx.lineWidth = 2.4;
  for (const y of [20, 26]) {
    ctx.beginPath();
    ctx.moveTo(12, y);
    ctx.quadraticCurveTo(40, y - 6, 68, y + 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();
}

/** Flat hand seen from the side, palm down, fingers to the left, resting on the frame bottom (the sweep). */
function flat(ctx: Ctx): void {
  cel(ctx, (c) => {
    c.beginPath();
    c.moveTo(14, 114);
    c.quadraticCurveTo(4, 114, 6, 106);
    c.quadraticCurveTo(10, 98, 34, 97);
    c.quadraticCurveTo(62, 94, 74, 88);
    c.quadraticCurveTo(92, 84, 100, 96);
    c.lineTo(100, 114);
    c.closePath();
  }, GLOVE, C.gloveShade, 2, 4, LW);
  capsule(ctx, 60, 95, 44, 92, 5, GLOVE, LW);
  ctx.strokeStyle = INK;
  ctx.lineWidth = LW * 0.6;
  for (const y of [102, 107]) {
    ctx.beginPath();
    ctx.moveTo(10, y);
    ctx.lineTo(24, y);
    ctx.stroke();
  }
  cuff(ctx, 100, 100, 0);
}

/** Phase 2 floating glove: FIST_POSE frames. */
export function drawFist(ctx: Ctx, f: number): void {
  if (f === FIST_POSE.left) glove(ctx, 64, 62, 25, Math.PI, 'fist');
  else if (f === FIST_POSE.down) glove(ctx, 62, 66, 25, Math.PI / 2, 'fist');
  else if (f === FIST_POSE.flat) flat(ctx);
  else {
    napkin(ctx);
    glove(ctx, 70, 88, 22, -Math.PI / 2, 'open');
  }
}
