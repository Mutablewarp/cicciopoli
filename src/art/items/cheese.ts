/**
 * Provola Goat cheese art: yellow square pickup, T-shirt badge, cheese shot and splat.
 */
import { PAL, rng } from '../pixel';
import { Raster, diag, glint } from './raster';
import { Mask, capsule, disc, shadeMask } from './shapes';

const CHEESE = {
  hi: '#fffbc8',
  light: PAL.cheeseLight,
  base: PAL.cheese,
  dark: PAL.cheeseDark,
  deep: '#b07400',
  hole: '#a06200',
  line: '#6a3c00',
};

/* ------------------------------------------------------------ provola */

/** Bevelled block: 2-px lit rim top-left, 2-px shaded rim bottom-right, rounded corners. */
function bevelBlock(r: Raster, x0: number, y0: number, x1: number, y1: number): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x === x0 || x === x1) && (y === y0 || y === y1)) continue;
      const dl = x - x0;
      const dt = y - y0;
      const dr = x1 - x;
      const db = y1 - y;
      let c: string = CHEESE.base;
      if (dr === 0 || db === 0) c = CHEESE.deep;
      else if (dt === 0 || dl === 0) c = CHEESE.hi;
      else if (dr === 1 || db === 1) c = CHEESE.dark;
      else if (dt === 1 || dl === 1) c = CHEESE.light;
      r.set(x, y, c);
    }
  }
}

/** Hole: deep shadow top-left, lit inner wall bottom-right, bright lip just outside. */
function hole(r: Raster, x: number, y: number, size: 1 | 2): void {
  if (size === 1) {
    r.set(x, y, CHEESE.hole);
  } else {
    r.set(x, y, CHEESE.hole);
    r.set(x + 1, y, CHEESE.deep);
    r.set(x, y + 1, CHEESE.deep);
    r.set(x + 1, y + 1, CHEESE.dark);
  }
  r.set(x + size, y + size, CHEESE.hi);
}

const HOLES: readonly (readonly [number, number, 1 | 2])[] = [[5, 5, 2], [9, 4, 1], [9, 8, 2], [5, 10, 1], [11, 11, 1]];

export function provolaFrames(): Raster[] {
  // the glint is laid down before the holes so it never lightens their shadows
  const sweeps = [diag(2, 6, 3), diag(3, 9, 5), diag(5, 12, 6), diag(9, 12, 3)];
  return sweeps.map((pts) => {
    const r = new Raster(16, 16);
    bevelBlock(r, 2, 2, 13, 13);
    glint(r, pts, PAL.ink, 0.8);
    for (const [x, y, size] of HOLES) hole(r, x, y, size);
    r.outline(PAL.ink);
    return r;
  });
}

const BADGE = [
  '.kkkkkk.',
  'kHHHHHck',
  'kHLcccdk',
  'kHcocCdk',
  'kHccccdk',
  'kHcocCdk',
  'kcddddDk',
  '.kkkkkk.',
];

export function badgeRaster(): Raster {
  const r = new Raster(8, 8);
  r.grid(BADGE, { k: PAL.ink, H: CHEESE.hi, L: CHEESE.light, c: CHEESE.base, C: CHEESE.light, o: CHEESE.hole, d: CHEESE.dark, D: CHEESE.deep });
  return r;
}

/* -------------------------------------------------------- cheese shot */

/** Frame 0: 6x4 slice; frame 1: squashed 7x3 (the slice flaps as it flies right). */
function shotFrame(squash: boolean): Raster {
  const r = new Raster(12, 8);
  const [x0, x1, y0, y1] = squash ? [3, 9, 3, 5] : [4, 9, 2, 5];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      let c: string = CHEESE.base;
      if (y === y1 || x === x1) c = CHEESE.dark;
      else if (y === y0 || x === x0) c = CHEESE.hi;
      r.set(x, y, c);
    }
  }
  r.set(squash ? 6 : 7, 4, CHEESE.hole);
  r.outline(PAL.ink);
  // motion streak behind the slice
  const streak: readonly (readonly [number, number, number])[] = squash
    ? [[0, 3, 0.25], [1, 3, 0.5], [2, 4, 0.35], [0, 5, 0.3], [1, 5, 0.6]]
    : [[0, 3, 0.3], [1, 3, 0.6], [2, 3, 0.85], [1, 4, 0.3], [0, 5, 0.25], [1, 5, 0.45]];
  for (const [x, y, a] of streak) r.set(x, y, '#fff6b0', a);
  return r;
}

export function cheeseShotFrames(): Raster[] {
  return [shotFrame(false), shotFrame(true)];
}

/* ------------------------------------------------------- cheese splat */

interface SplatStage {
  rx: number;
  ry: number;
  cy: number;
  /** flying droplets: angle (rad), distance, radius, fall (px) */
  drops: readonly (readonly [number, number, number, number])[];
  /** hanging drips under the puddle: x, length */
  drips: readonly (readonly [number, number])[];
  /** fraction of pixels kept (ordered dither) while the splat fades */
  keep: number;
}

const STAGES: readonly SplatStage[] = [
  { rx: 3, ry: 3, cy: 8, drops: [[-2.6, 5, 1, 0], [-0.5, 5, 1, 0], [0.9, 5, 0.7, 0], [2.3, 5, 0.7, 0], [-1.6, 5, 0.7, 0]], drips: [], keep: 1 },
  { rx: 6, ry: 4, cy: 8, drops: [[-2.7, 8, 1.2, 0], [-0.4, 8, 1.2, 0], [-1.5, 6, 1, 0], [0.8, 8, 1, 0], [2.4, 8, 1, 0]], drips: [], keep: 1 },
  { rx: 7, ry: 3, cy: 9, drops: [[-2.8, 10, 1, 1], [-0.3, 10, 1, 1], [-1.6, 7, 0.8, 1], [0.7, 10, 0.7, 2], [2.5, 10, 0.7, 2]], drips: [[8, 2], [14, 3]], keep: 1 },
  { rx: 7, ry: 2, cy: 10, drops: [[-2.9, 11, 0.7, 3], [-0.2, 11, 0.7, 3], [-1.6, 8, 0.7, 2]], drips: [[8, 3], [14, 4], [11, 2]], keep: 1 },
  { rx: 5, ry: 1, cy: 11, drops: [[-2.9, 11, 0.5, 4], [-0.2, 11, 0.5, 4]], drips: [[9, 3], [14, 2]], keep: 1 },
  { rx: 3, ry: 1, cy: 12, drops: [[-3, 9, 0.5, 4]], drips: [[11, 2]], keep: 0.55 },
];

function splatFrame(s: SplatStage, i: number): Raster {
  const cx = 12;
  const blob = Mask.of(24, 16, (x, y) => ((x - cx) * (x - cx)) / ((s.rx + 0.5) ** 2) + ((y - s.cy) * (y - s.cy)) / ((s.ry + 0.5) ** 2) <= 1);
  blob.roughen(rng(91 + i), 0.35, 0.1);
  const m = new Mask(24, 16);
  const shapes = [
    ...s.drops.map(([a, d, rad, fall]) => disc(cx + Math.cos(a) * d * 1.3, s.cy + Math.sin(a) * d * 0.8 + fall, rad)),
    ...s.drips.map(([x, len]) => capsule(x + 0.5, s.cy + s.ry - 0.5, x + 0.5, s.cy + s.ry + len - 0.5, 0.7, 0.9)),
  ];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 24; x++) {
      if (blob.has(x, y) || shapes.some((f) => f(x + 0.5, y + 0.5))) m.put(x, y, true);
    }
  }
  const r = new Raster(24, 16);
  shadeMask(r, m, { light: CHEESE.light, base: CHEESE.base, dark: CHEESE.dark, rim: CHEESE.hi, deep: CHEESE.deep });
  if (i === 0) r.ellipse(cx - 1, s.cy - 1, 1, 1, '#ffffff');
  r.outline(CHEESE.line);
  if (s.keep < 1) r.dither(s.keep); // full-colour pixels drop out (alpha would turn green on the sky)
  return r;
}

export function cheeseSplatFrames(): Raster[] {
  return STAGES.map(splatFrame);
}
