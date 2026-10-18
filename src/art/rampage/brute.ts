/**
 * Brute 40x40, faces LEFT: a big angry burger-bruiser with red boxing gloves.
 * 0-3 walk, 4 windup (fist cocked behind the head), 5 strike (lunging jab), 6 hit flash, 7 dazed.
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, outlineRaster } from '../hills/raster';
import { Id, TONES, angryEye, armWithGlove, dizzyStars, gloveShine, ouchFace, snarl, stack } from './burger';
import { RC } from './colors';
import { lineR, rectR, washR } from './draw';

type Pt = readonly [number, number];

interface Pose {
  dx: number;
  dy: number;
  /** squashes the bun dome (dazed) */
  squash: number;
  legs: readonly [number, number];
  lift: readonly [number, number];
  /** glove centres: x relative to the body centre, y in frame pixels before the bob */
  front: Pt;
  back: Pt;
  /** the front arm swings behind the body (windup) */
  frontBehind: boolean;
  glove: number;
}

const WALK: readonly Pose[] = [
  { dx: 0, dy: 0, squash: 0, legs: [-2, 2], lift: [0, 0], front: [-15, 26], back: [11, 27], frontBehind: false, glove: 5 },
  { dx: 0, dy: -1, squash: 0, legs: [0, 0], lift: [1, 0], front: [-14, 24], back: [12, 28], frontBehind: false, glove: 5 },
  { dx: 0, dy: 0, squash: 0, legs: [2, -2], lift: [0, 0], front: [-13, 27], back: [11, 25], frontBehind: false, glove: 5 },
  { dx: 0, dy: -1, squash: 0, legs: [0, 0], lift: [0, 1], front: [-14, 28], back: [12, 24], frontBehind: false, glove: 5 },
];
const WINDUP: Pose = { dx: 1, dy: 1, squash: 1, legs: [-4, 3], lift: [0, 0], front: [11, 5], back: [11, 27], frontBehind: true, glove: 5 };
const STRIKE: Pose = { dx: 3, dy: 0, squash: 0, legs: [-5, 1], lift: [0, 1], front: [-17, 18], back: [10, 27], frontBehind: false, glove: 6 };
const DAZED: Pose = { dx: 0, dy: 3, squash: 3, legs: [-1, 1], lift: [0, 0], front: [-14, 28], back: [11, 28], frontBehind: false, glove: 5 };

const CX = 22;
const TOP = 4;

function body(p: Pose): { r: Raster; top: number; cx: number } {
  const m = new Mask(40, 40);
  const cx = CX + p.dx;
  const top = TOP + p.dy + p.squash;
  const shoulderY = 26 + p.dy;
  const gy = (pt: Pt): number => pt[1] + p.dy;
  armWithGlove(m, cx + 11, shoulderY, cx + p.back[0], gy(p.back), p.glove, 4);
  if (p.frontBehind) armWithGlove(m, cx - 10, shoulderY, cx + p.front[0], gy(p.front), p.glove, 4);
  p.legs.forEach((lx, i) => {
    const x = cx + (i === 0 ? -9 : 3) + lx;
    const lift = p.lift[i];
    m.rect(x, 32, 5, 5 - lift, Id.Leg);
    m.rect(x - 2, 37 - lift, 9, 3, Id.Leg);
    m.set(x - 3, 38 - lift, Id.Leg);
  });
  stack(m, { cx, top, hw: 14, dome: 17 - p.squash, lettuce: 3, cheese: 2, tomato: 0, patty: 4, under: 5 });
  if (!p.frontBehind) armWithGlove(m, cx - 10, shoulderY, cx + p.front[0], gy(p.front), p.glove, 4);
  const r = new Raster(40, 40);
  paintMask(m, r, TONES, { shadeDepth: 2, lightDepth: 1 });
  gloveShine(r, cx + p.front[0], gy(p.front), p.glove);
  if (!p.frontBehind) gloveShine(r, cx + p.back[0], gy(p.back), p.glove);
  return { r, top, cx };
}

function seeds(r: Raster, cx: number, top: number): void {
  for (const [dx, dy] of [[-8, 4], [-3, 2], [3, 3], [8, 5], [0, 5]] as const) {
    rectR(r, cx + dx, top + dy, 2, 1, RC.sesame);
    r.set(cx + dx + 1, top + dy + 1, RC.bunShade);
  }
}

function face(r: Raster, cx: number, top: number, kind: 'angry' | 'ouch' | 'dazed'): void {
  const ey = top + 7;
  if (kind === 'ouch') {
    ouchFace(r, cx - 12, cx + 1, ey);
    snarl(r, cx - 10, top + 13, 12, 4);
    return;
  }
  if (kind === 'dazed') {
    for (const x of [cx - 12, cx]) {
      lineR(r, x, ey, x + 5, ey + 4, RC.ink);
      lineR(r, x + 5, ey, x, ey + 4, RC.ink);
    }
    rectR(r, cx - 9, top + 13, 9, 3, RC.ink);
    rectR(r, cx - 7, top + 14, 5, 3, '#ff6a9a');
    return;
  }
  angryEye(r, cx - 12, ey, 6, 4, 'right');
  angryEye(r, cx, ey, 6, 4, 'left');
  snarl(r, cx - 10, top + 13, 12, 4);
}

function frame(p: Pose, kind: 'angry' | 'ouch' | 'dazed'): Raster {
  const { r, top, cx } = body(p);
  if (kind === 'ouch') washR(r, '#ffffff', 0.88);
  seeds(r, cx, top);
  face(r, cx, top, kind);
  if (kind === 'dazed') dizzyStars(r, cx, 0, 8);
  outlineRaster(r, RC.ink);
  return r;
}

export function buildBrute(): Raster[] {
  return [
    ...WALK.map((p) => frame(p, 'angry')),
    frame(WINDUP, 'angry'),
    frame(STRIKE, 'angry'),
    frame(WALK[0], 'ouch'),
    frame(DAZED, 'dazed'),
  ];
}
