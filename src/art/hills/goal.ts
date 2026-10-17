/** Goal flag (cup golf flag), golf hole and checkpoint pennant. */
import { PAL } from '../pixel';
import { HC } from './colors';
import { Mask } from './mask';
import { Raster, gridR, outlineRaster } from './raster';

interface Cloth { light: string; base: string; shade: string }

const FLAG_CLOTH: Cloth = { light: '#ff5a48', base: PAL.flagRed, shade: PAL.flagRedDark };
const PENNANT_CLOTH: Cloth = { light: '#ff9a50', base: '#fc4c14', shade: '#b8280a' };

/**
 * Waving triangular cloth attached at x0, between y0 and y1 at the pole, pointing
 * right to length `len`. Rising cloth catches light, falling cloth is shaded.
 */
function cloth(r: Raster, x0: number, y0: number, y1: number, len: number, amp: number, phase: number, c: Cloth): void {
  const half = (y1 - y0) / 2;
  const wave = (u: number): number => amp * Math.sin(u * 0.34 - phase) * Math.min(1, u / 6);
  for (let u = 0; u < len; u++) {
    const shrink = half * (u / len);
    const w = Math.round(wave(u));
    const top = Math.round(y0 + shrink + w);
    const bot = Math.round(y1 - shrink + w);
    const slope = wave(u + 1) - wave(u);
    const col = slope < -0.4 ? c.light : slope > 0.4 ? c.shade : c.base;
    for (let y = top; y <= bot; y++) r.set(x0 + u, y, col);
  }
}

const BALL = [
  '..kkkk..',
  '.kWyyok.',
  'kyWyyook',
  'kyyyyook',
  '.koooak.',
  '..kkkk..',
];

/** 32x64, pole base at (8,63): 4 waving frames. */
export function buildFlag(): Raster[] {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = new Raster(32, 64);
    const flag = new Raster(32, 64);
    cloth(flag, 11, 7, 26, 19, 1.4, (f * Math.PI) / 2, FLAG_CLOTH);
    outlineRaster(flag, HC.ink);
    r.blit(flag, 0, 0);
    for (let y = 6; y < 64; y++) {
      r.set(7, y, HC.ink);
      r.set(8, y, PAL.poleLight);
      r.set(9, y, PAL.pole);
      r.set(10, y, HC.ink);
    }
    gridR(r, BALL, { k: HC.ink, W: '#fffbe0', y: PAL.poleLight, o: PAL.pole, a: '#c85c00' }, 5, 0);
    frames.push(r);
  }
  return frames;
}

/** 32x10 golf hole: lime mound with a dark elliptical cup, sits on the ground surface. */
export function buildHole(): Raster {
  const m = new Mask(32, 10);
  m.ellipse(16, 11, 14, 8, 1);
  const r = new Raster(32, 10);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 32; x++) {
    if (m.get(x, y) === 0) continue;
    const edgeTop = m.get(x, y - 1) === 0;
    const edgeTop2 = m.get(x, y - 2) === 0;
    r.set(x, y, edgeTop ? HC.grassLine : edgeTop2 && x < 18 ? HC.grassLine : y >= 8 ? HC.grassMid : HC.grass);
  }
  // the cup: far inner wall (lit soil) above a black pit, light lip at the near edge
  const hole = new Mask(32, 10);
  hole.ellipse(16, 6, 7, 2, 1);
  for (let y = 0; y < 10; y++) for (let x = 0; x < 32; x++) {
    if (hole.get(x, y) === 0) continue;
    const wall = hole.get(x, y - 1) === 0;
    r.set(x, y, wall ? '#5a3424' : '#0c0808');
    if (hole.get(x, y + 1) === 0) r.set(x, y + 1, HC.grassLine);
  }
  outlineRaster(r, HC.ink);
  return r;
}

const BURGER_EMBLEM = ['.bb.', 'pppp', 'BBBB'];

/** 16x32: 0 = inactive grey limp pennant, 1-3 = red-orange pennant waving. */
export function buildCheckpoint(): Raster[] {
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = new Raster(16, 32);
    const cl = new Raster(16, 32);
    if (f === 0) {
      const m = new Mask(16, 32);
      m.poly([[7, 4], [10, 5], [10, 8], [9, 12], [8, 15], [7, 15]], 1);
      for (let y = 0; y < 32; y++) for (let x = 0; x < 16; x++) {
        if (m.get(x, y)) cl.set(x, y, x === 7 ? '#c8c8d0' : m.get(x + 1, y) ? '#a0a0ac' : '#76768a');
      }
    } else {
      cloth(cl, 7, 4, 13, 9, 1.1, (f * Math.PI * 2) / 3, PENNANT_CLOTH);
      gridR(cl, BURGER_EMBLEM, { b: PAL.bunLight, p: PAL.patty, B: PAL.bun }, 8, 7 + Math.round(1.1 * Math.sin(1.3 - (f * Math.PI * 2) / 3)));
    }
    outlineRaster(cl, HC.ink);
    r.blit(cl, 0, 0);
    for (let y = 3; y < 30; y++) {
      r.set(4, y, HC.ink);
      r.set(5, y, '#e0e0e8');
      r.set(6, y, HC.ink);
    }
    gridR(r, ['.kk.', 'kyok', 'kook', '.kk.'], { k: HC.ink, y: PAL.poleLight, o: PAL.pole }, 3, 0);
    // stone base
    gridR(r, ['..kkkkk..', '.kssssbk.', 'kssssssbk', 'kbbbbbbbk'], { k: HC.ink, s: HC.stone, b: HC.stoneShade }, 1, 28);
    frames.push(r);
  }
  return frames;
}
