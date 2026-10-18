/**
 * Megaburger 64x64, faces LEFT: the crowned mini-boss. 0-3 walk, 4 windup (fists overhead),
 * 5 jump up, 6 smash (fists in the ground), 7 hit flash, 8 dazed, 9 defeated (the stack collapsed).
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, hash2, outlineRaster } from '../hills/raster';
import { Id, TONES, angryEye, armWithGlove, dizzyStars, gloveShine, ouchFace, snarl, stack } from './burger';
import { RC } from './colors';
import { lineR, rectR, washR } from './draw';

type Pt = readonly [number, number];

interface Pose {
  dy: number;
  squash: number;
  legs: readonly [number, number];
  lift: readonly [number, number];
  /** glove centres: x relative to the body centre, y in frame pixels before the bob */
  front: Pt;
  back: Pt;
}

const WALK: readonly Pose[] = [
  { dy: 0, squash: 0, legs: [-3, 3], lift: [0, 0], front: [-21, 47], back: [20, 49] },
  { dy: -1, squash: 0, legs: [0, 0], lift: [2, 0], front: [-20, 44], back: [21, 51] },
  { dy: 0, squash: 0, legs: [3, -3], lift: [0, 0], front: [-19, 50], back: [20, 46] },
  { dy: -1, squash: 0, legs: [0, 0], lift: [0, 2], front: [-20, 51], back: [21, 44] },
];
const WINDUP: Pose = { dy: 3, squash: 3, legs: [-5, 5], lift: [0, 0], front: [-17, 9], back: [17, 9] };
const JUMP: Pose = { dy: -1, squash: -1, legs: [-2, 2], lift: [4, 5], front: [-20, 16], back: [20, 16] };
const SMASH: Pose = { dy: 4, squash: 4, legs: [-6, 6], lift: [0, 0], front: [-23, 54], back: [23, 54] };
const DAZED: Pose = { dy: 5, squash: 5, legs: [-2, 2], lift: [0, 0], front: [-21, 52], back: [21, 52] };

const CX = 32;

interface Built { r: Raster; top: number }

function crown(m: Mask, cx: number, top: number): void {
  m.rect(cx - 9, top - 1, 19, 4, Id.Crown);
  for (const dx of [-8, 0, 8]) m.poly([[cx + dx - 2, top - 1], [cx + dx, top - 8], [cx + dx + 2, top - 1]], Id.Crown);
}

function body(p: Pose): Built {
  const m = new Mask(64, 64);
  const top = 11 + p.dy + p.squash;
  const gy = (pt: Pt): number => pt[1] + p.dy;
  const shoulderY = 36 + p.dy + p.squash;
  const reach = (side: -1 | 1, pt: Pt): void => armWithGlove(m, CX + side * 19, shoulderY, CX + pt[0], gy(pt), 8, 6);
  reach(1, p.back);
  p.legs.forEach((lx, i) => {
    const x = CX + (i === 0 ? -14 : 6) + lx;
    const lift = p.lift[i];
    m.rect(x, 54, 8, 7 - lift, Id.Leg);
    m.rect(x - 2, 60 - lift, 12, 4, Id.Leg);
    m.set(x - 3, 62 - lift, Id.Leg);
  });
  stack(m, { cx: CX, top, hw: 22, dome: 24 - p.squash, lettuce: 4, cheese: 3, tomato: 3, patty: 6, under: 7 });
  crown(m, CX, top);
  reach(-1, p.front);
  const r = new Raster(64, 64);
  paintMask(m, r, TONES, { shadeDepth: 2, lightDepth: 1 });
  gloveShine(r, CX + p.front[0], gy(p.front), 8);
  gloveShine(r, CX + p.back[0], gy(p.back), 8);
  return { r, top };
}

function trim(r: Raster, top: number): void {
  for (let i = 0; i < 16; i++) {
    const x = CX - 14 + Math.floor(hash2(i, 1, 21) * 28);
    const y = top + 3 + Math.floor(hash2(i, 2, 21) * 8);
    if (r.get(x, y) !== 0) {
      rectR(r, x, y, 3, 1, RC.sesame);
      r.set(x + 2, y + 1, RC.bunShade);
    }
  }
  // crown jewels and tips
  for (const [dx, c] of [[-8, RC.tomato], [0, RC.drum], [8, RC.lime]] as const) {
    r.set(CX + dx, top - 6, c);
    r.set(CX + dx, top - 2, c);
  }
  for (const dx of [-8, 0, 8]) r.set(CX + dx, top - 8, RC.white);
}

function face(r: Raster, top: number, kind: 'angry' | 'ouch' | 'dazed'): void {
  const ey = top + 9;
  if (kind === 'ouch') {
    ouchFace(r, CX - 15, CX + 4, ey + 1);
    snarl(r, CX - 13, top + 17, 20, 6);
    return;
  }
  if (kind === 'dazed') {
    for (const x of [CX - 16, CX + 4]) {
      lineR(r, x, ey, x + 8, ey + 6, RC.ink);
      lineR(r, x + 8, ey, x, ey + 6, RC.ink);
      lineR(r, x + 1, ey, x + 9, ey + 6, RC.ink);
      lineR(r, x + 9, ey, x + 1, ey + 6, RC.ink);
    }
    rectR(r, CX - 12, top + 17, 16, 5, RC.ink);
    rectR(r, CX - 8, top + 19, 7, 5, '#ff6a9a');
    return;
  }
  angryEye(r, CX - 16, ey, 8, 6, 'right');
  angryEye(r, CX + 4, ey, 8, 6, 'left');
  snarl(r, CX - 14, top + 17, 20, 6);
  rectR(r, CX - 3, top + 18, 2, 2, RC.cheese);
}

function frame(p: Pose, kind: 'angry' | 'ouch' | 'dazed'): Raster {
  const { r, top } = body(p);
  if (kind === 'ouch') washR(r, '#ffffff', 0.88);
  trim(r, top);
  face(r, top, kind);
  if (kind === 'dazed') dizzyStars(r, CX, 1, 14);
  outlineRaster(r, RC.ink);
  return r;
}

/** Shock cracks, chips and dust where the fists hit the ground. */
function impact(r: Raster): void {
  for (const [x0, dx] of [[4, -1], [59, 1]] as const) {
    lineR(r, x0, 63, x0 + dx * 3, 59, RC.ink);
    lineR(r, x0 + dx * 3, 59, x0 + dx * 2, 55, RC.ink);
  }
  for (const [x, y] of [[3, 49], [7, 45], [60, 48], [56, 44], [1, 56], [62, 57]] as const) {
    rectR(r, x, y, 2, 2, RC.concMid);
    r.set(x, y, RC.concHi);
  }
}

/** The stack lying in a heap: patty and buns spread out, crown rolled away, top bun slid off. */
function defeated(): Raster {
  const m = new Mask(64, 64);
  m.ellipse(30, 60, 25, 3, Id.Under);
  m.ellipse(31, 56, 24, 3, Id.Patty);
  m.rect(10, 52, 42, 2, Id.Cheese);
  m.rect(14, 54, 5, 4, Id.Cheese);
  m.ellipse(28, 51, 21, 2, Id.Lettuce);
  m.ellipse(22, 49, 6, 2, Id.Tomato);
  m.ellipse(38, 49, 6, 2, Id.Tomato);
  for (let j = 0; j < 20; j++) {
    const half = Math.round(15 * Math.sqrt(1 - ((20 - j - 0.5) / 20) ** 2));
    m.span(44 - half + Math.floor((20 - j) / 6), 44 + half + Math.floor((20 - j) / 6), 28 + j, Id.Bun);
  }
  m.rect(52, 46, 9, 5, Id.Glove);
  m.ellipse(55, 47, 4, 4, Id.Glove);
  m.ellipse(5, 56, 4, 4, Id.Glove);
  m.rect(2, 61, 9, 3, Id.Crown);
  const r = new Raster(64, 64);
  paintMask(m, r, TONES, { shadeDepth: 2, lightDepth: 1 });
  for (const [dx, dy] of [[-6, 4], [2, 3], [8, 7], [-2, 9]] as const) rectR(r, 44 + dx, 28 + dy, 3, 1, RC.sesame);
  for (const x of [38, 49]) {
    lineR(r, x, 40, x + 5, 45, RC.ink);
    lineR(r, x + 5, 40, x, 45, RC.ink);
  }
  rectR(r, 41, 47, 8, 3, RC.ink);
  rectR(r, 43, 48, 4, 3, '#ff6a9a');
  lineR(r, 7, 62, 9, 61, RC.concHi);
  dizzyStars(r, 30, 20, 16);
  outlineRaster(r, RC.ink);
  return r;
}

export function buildMegaburger(): Raster[] {
  const smash = frame(SMASH, 'angry');
  impact(smash);
  return [
    ...WALK.map((p) => frame(p, 'angry')),
    frame(WINDUP, 'angry'),
    frame(JUMP, 'angry'),
    smash,
    frame(WALK[0], 'ouch'),
    frame(DAZED, 'dazed'),
    defeated(),
  ];
}
