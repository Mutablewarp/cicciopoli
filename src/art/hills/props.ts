/** Level props: cup '?' block, wooden crate, arrow sign, rock. */
import { PAL } from '../pixel';
import { HC } from './colors';
import { Mask, paintMask } from './mask';
import { Raster, gridR, hash2, outlineRaster } from './raster';

const QMARK = [
  '.XXXX.',
  'XX..XX',
  'XX..XX',
  '...XX.',
  '..XX..',
  '..XX..',
  '......',
  '..XX..',
  '..XX..',
];

interface BlockTones { face: string; light: string; dark: string; rivet: string }

const Q_ON: BlockTones = { face: PAL.qOrange, light: PAL.qOrangeLight, dark: PAL.qOrangeDark, rivet: '#a84a00' };
const Q_USED: BlockTones = { face: '#b4682c', light: '#d08a4c', dark: '#88481c', rivet: '#5e2c10' };

function blockBase(r: Raster, t: BlockTones): void {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let col: string = t.face;
      if (x === 0 || y === 0 || x === 15 || y === 15) col = HC.ink;
      else if (x === 14 || y === 14) col = t.dark;
      else if (x === 1 || y === 1) col = t.light;
      r.set(x, y, col);
    }
  }
  for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]] as const) {
    r.set(x, y, t.rivet);
    r.set(x - 1, y - 1, t.light);
  }
}

/** Frames 0-3: shimmer (glint sweeps across, '?' brightens); 4: used/empty. */
export function buildQBlock(): Raster[] {
  const glyph = ['#fcf0d8', '#fff8ea', '#ffffff', '#fcf0d8'];
  const frames: Raster[] = [];
  for (let f = 0; f < 4; f++) {
    const r = new Raster(16, 16);
    blockBase(r, Q_ON);
    const band = f * 8 - 2;
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) {
      const d = x + y - band;
      if (f > 0 && d >= 0 && d < 3) r.set(x, y, d === 1 ? '#fcd088' : '#fcac3c');
    }
    gridR(r, QMARK, { X: '#7a3000' }, 6, 4);
    gridR(r, QMARK, { X: glyph[f] }, 5, 3);
    frames.push(r);
  }
  const used = new Raster(16, 16);
  blockBase(used, Q_USED);
  frames.push(used);
  return frames;
}

export function buildCrate(): Raster {
  const r = new Raster(16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      const corner = (x === 0 || x === 15) && (y === 0 || y === 15);
      if (corner) continue;
      let col: string;
      if (edge) col = HC.ink;
      else if (x <= 2 || y <= 2 || x >= 13 || y >= 13) {
        // outer frame boards
        col = x === 1 || y === 1 ? HC.woodLight : x === 14 || y === 14 ? HC.woodDark : HC.woodShade;
      } else {
        const plankLine = y === 6 || y === 9;
        col = plankLine ? HC.woodDark : y === 3 || y === 7 || y === 10 ? HC.woodLight : HC.wood;
        if (!plankLine && hash2(x, y, 21) < 0.12) col = HC.woodShade;
        // X brace, 2 px wide, lit on its upper edge
        const a = x - y;
        const b = x + y - 15;
        if (a === 0 || b === 0) col = HC.woodLight;
        else if (a === 1 || b === 1) col = HC.wood;
        else if (a === 2 || b === 2) col = HC.woodDark;
      }
      r.set(x, y, col);
    }
  }
  for (const [x, y] of [[2, 2], [13, 2], [2, 13], [13, 13]] as const) {
    r.set(x, y, HC.nail);
    r.set(x + 1, y + 1 > 13 ? y : y + 1, HC.woodDark);
  }
  return r;
}

export function buildSign(): Raster {
  const m = new Mask(16, 16);
  m.rect(7, 8, 2, 8, 2);
  m.poly([[1, 2], [10, 2], [10, 0.6], [14.6, 5.5], [10, 10.4], [10, 9], [1, 9]], 1);
  const r = new Raster(16, 16);
  paintMask(m, r, {
    1: { light: HC.woodLight, base: HC.wood, shade: HC.woodShade },
    2: { light: HC.wood, base: HC.woodShade, shade: HC.woodDark },
  }, { shadeDepth: 1 });
  // painted cream arrow stroke on the board
  for (let x = 3; x <= 9; x++) r.set(x, 5, PAL.creamLight);
  r.set(9, 4, PAL.creamLight);
  r.set(9, 6, PAL.creamLight);
  r.set(10, 5, PAL.creamLight);
  r.set(8, 3, PAL.creamLight);
  r.set(8, 7, PAL.creamLight);
  for (let y = 10; y < 16; y++) if (hash2(7, y, 3) < 0.4) r.set(7, y, HC.woodDark);
  outlineRaster(r, HC.ink);
  return r;
}

export function buildRock(): Raster {
  const m = new Mask(16, 8);
  m.ellipse(8, 6, 6, 5, 1);
  m.ellipse(4, 7, 3, 3, 1);
  m.ellipse(12, 7, 3, 2, 1);
  const r = new Raster(16, 8);
  paintMask(m, r, { 1: { light: HC.stoneLight, base: HC.stone, shade: HC.stoneShade } }, { shadeDepth: 2, lightDepth: 2 });
  // moss cap and a crack
  for (const [x, y] of [[6, 1], [7, 1], [8, 1], [5, 2], [9, 2]] as const) r.set(x, y, '#6cb43c');
  r.set(7, 2, '#a8d848');
  r.set(10, 4, HC.stoneShade);
  r.set(11, 5, HC.stoneShade);
  outlineRaster(r, HC.ink);
  return r;
}
