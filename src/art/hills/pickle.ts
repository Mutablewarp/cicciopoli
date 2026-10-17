/**
 * Sottaceto (pickle) 24x24, faces LEFT. 0-3 walk (squash/stretch), 4-5 charge
 * (leaning forward, steam puff), 6 squashed (flat pickle slice).
 */
import { Mask, paintMask, type Tone } from './mask';
import { Raster, gridR, outlineRaster } from './raster';

const SKIN: Tone = { light: '#b6de58', base: '#7cb434', shade: '#4e8a22', dark: '#386a18' };
const FOOT: Tone = { light: '#4a6a24', base: '#34501a', shade: '#243a12' };
const LINE = '#122608';
const WART = '#cdee7c';
const SPEC = '#e0f6b0';

interface Pose {
  /** body vertical radius / horizontal radius */
  ry: number;
  rx: number;
  /** body centre y */
  cy: number;
  /** lean to the left (px at the top relative to the bottom) */
  lean: number;
  /** foot x offsets (front, back) relative to their rest place */
  feet: [number, number];
  /** foot lift (front, back) */
  lift: [number, number];
}

const WALK: readonly Pose[] = [
  { ry: 8, rx: 7, cy: 13, lean: 0, feet: [-1, 1], lift: [0, 0] },
  { ry: 9, rx: 6, cy: 12, lean: 0, feet: [0, 0], lift: [0, 1] },
  { ry: 8, rx: 7, cy: 13, lean: 0, feet: [1, -1], lift: [0, 0] },
  { ry: 9, rx: 6, cy: 12, lean: 0, feet: [0, 0], lift: [1, 0] },
];

const CHARGE: readonly Pose[] = [
  { ry: 8, rx: 7, cy: 13, lean: 4, feet: [-3, 3], lift: [1, 0] },
  { ry: 8, rx: 7, cy: 13, lean: 4, feet: [2, -2], lift: [0, 1] },
];

/** Bumpy gherkin silhouette: ellipse with 1-px nubs around the rim. */
function body(m: Mask, p: Pose): void {
  const cx = 12;
  const shear = p.lean / (2 * p.ry);
  m.ellipse(cx, p.cy, p.rx, p.ry, 1, shear);
  for (const a of [-2.1, -0.9, 0.2, 1.1, 2.7]) {
    const y = p.cy + Math.round((p.ry + 1) * Math.sin(a));
    const x = Math.round(cx - shear * (y - p.cy) + (p.rx + 0.6) * Math.cos(a));
    m.set(x, y, 1);
  }
  // stem nub on top
  m.set(cx + 1 - Math.round(shear * -p.ry), p.cy - p.ry - 1, 1);
}

function feet(m: Mask, p: Pose): void {
  const y = 22;
  const front = 9 + p.feet[0];
  const back = 14 + p.feet[1];
  m.rect(back, y - p.lift[1], 3, 2, 2);
  m.rect(front, y - p.lift[0], 3, 2, 2);
}

function face(r: Raster, p: Pose, angry: boolean): void {
  const shear = p.lean / (2 * p.ry);
  const at = (y: number): number => Math.round(-shear * (y - p.cy));
  const ey = p.cy - 4;
  const fx = 7 + at(ey);
  // V-shaped brows (inner ends low) = angry; charging adds a shouting mouth
  const rows = angry
    ? ['kk...kk', '.kk.kk.', '.Pw.Pw.', '.Pw.Pw.', '.......', '.kkkk..', '.kwwk..', '.kkkk..']
    : ['kk...kk', '.kk.kk.', '.Pw.Pw.', '.Pw.Pw.', '.......', '.kkkk..', 'k....k.'];
  gridR(r, rows, { k: LINE, P: '#141414', w: '#fcfcf0' }, fx, ey - 2);
}

function warts(r: Raster, p: Pose): void {
  const shear = p.lean / (2 * p.ry);
  for (const [dx, dy] of [[4, -5], [3, 1], [5, 5], [0, 6]] as const) {
    const y = p.cy + dy;
    const x = 12 + dx - Math.round(shear * dy);
    r.set(x, y, WART);
    r.set(x + 1, y + 1, SKIN.shade);
  }
  // glossy streak on the lit side
  for (let k = 0; k < 3; k++) r.set(9 + 1 - Math.round(shear * (-5 + k)), p.cy - 5 + k, SPEC);
}

function steam(r: Raster, big: boolean): void {
  const puff = big ? ['.www.', 'wwwww', 'wwwwc', '.ccc.'] : ['.ww.', 'wwwc', '.cc.'];
  gridR(r, puff, { w: '#fcfcf4', c: '#b8ccd8' }, big ? 18 : 19, big ? 1 : 3);
  // speed lines trailing behind
  for (const [x, y, n] of [[19, 13, 3], [20, 16, 3], [19, 19, 2]] as const) for (let i = 0; i < n; i++) r.set(x + i + (big ? 1 : 0), y, '#fcfcf4');
  // sweat drop flying off the brow
  gridR(r, ['.b', 'bB'], { b: '#8ad8f8', B: '#4aa8e0' }, 17, big ? 7 : 6);
}

function pose(p: Pose, angry: boolean, puff: number): Raster {
  const m = new Mask(24, 24);
  feet(m, p);
  body(m, p);
  const r = new Raster(24, 24);
  paintMask(m, r, { 1: SKIN, 2: FOOT }, { shadeDepth: 2, lightDepth: 1 });
  warts(r, p);
  face(r, p, angry);
  if (angry) r.set(7 + Math.round(-(p.lean / (2 * p.ry)) * 1), p.cy + 1, '#e86a5a');
  outlineRaster(r, LINE);
  if (puff > 0) steam(r, puff === 2);
  return r;
}

/** Frame 6: flattened pickle slice with seeds and dizzy eyes. */
function squashed(): Raster {
  const m = new Mask(24, 24);
  m.ellipse(12, 20, 10, 3, 1);
  m.ellipse(12, 19, 8, 2, 3);
  const r = new Raster(24, 24);
  paintMask(m, r, { 1: SKIN, 3: { light: '#e4f6b0', base: '#c4e47c', shade: '#a8cc5c' } }, { shadeDepth: 1 });
  for (const [x, y] of [[6, 19], [9, 18], [14, 18], [17, 19], [12, 20]] as const) r.set(x, y, '#8aa83a');
  gridR(r, ['k.k', '.k.', 'k.k'], { k: LINE }, 6, 17);
  gridR(r, ['k.k', '.k.', 'k.k'], { k: LINE }, 10, 17);
  outlineRaster(r, LINE);
  return r;
}

export function buildPickle(): Raster[] {
  return [
    ...WALK.map((p) => pose(p, false, 0)),
    ...CHARGE.map((p, i) => pose(p, true, i + 1)),
    squashed(),
  ];
}
