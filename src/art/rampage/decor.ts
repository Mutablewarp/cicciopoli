/** Street decor of the rampage level: bent lamp, traffic cone, battered dumpster, bent road sign. */
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, hash2, outlineRaster } from '../hills/raster';
import { RC } from './colors';
import { lineR, pathR, rectR } from './draw';

const STEEL: Tone = { light: RC.steelLight, base: RC.steel, shade: RC.steelShade, dark: RC.steelDark };

/** Point on a quadratic curve. */
function bezier(a: readonly [number, number], b: readonly [number, number], c: readonly [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]];
}

/** 16x48 street lamp whose arm was bent down by a rampage; the lamp glass is cracked and flickering. */
export function buildLamp(): Raster {
  const m = new Mask(16, 48);
  m.rect(2, 44, 7, 3, 2);
  m.rect(3, 40, 5, 4, 2);
  m.rect(4, 14, 3, 27, 1);
  for (let i = 0; i <= 12; i++) {
    const [x, y] = bezier([5, 15], [5, 4], [12, 5], i / 12);
    m.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, 1);
  }
  m.rect(9, 5, 7, 3, 3);
  m.rect(10, 8, 6, 3, 3);
  const r = new Raster(16, 48);
  paintMask(m, r, { 1: STEEL, 2: { light: RC.steel, base: RC.steelShade, shade: RC.steelDark }, 3: STEEL }, { shadeDepth: 1, lightDepth: 1 });
  rectR(r, 11, 10, 4, 2, RC.winLitHi);
  r.set(12, 11, RC.winLit);
  pathR(r, [[11, 9], [12, 11], [14, 9]], RC.steelDark);
  r.set(7, 22, RC.steelDark);
  r.set(5, 30, RC.steelLight);
  outlineRaster(r, RC.ink);
  return r;
}

/** 8x12 traffic cone: orange with two white bands and a flat base. */
export function buildCone(): Raster {
  const r = new Raster(8, 12);
  for (let y = 0; y < 10; y++) {
    const half = Math.floor(y / 3);
    const left = 3 - half;
    const right = 4 + half;
    for (let x = left; x <= right; x++) {
      const band = y === 3 || y === 4 || y === 7 || y === 8;
      let col: string = band ? RC.white : RC.cone;
      if (x === left || x === right) col = RC.ink;
      else if (x === left + 1) col = band ? RC.white : RC.coneLight;
      else if (x === right - 1) col = band ? RC.whiteShade : RC.coneShade;
      r.set(x, y, col);
    }
  }
  rectR(r, 0, 10, 8, 2, RC.ink);
  rectR(r, 1, 10, 6, 1, RC.coneShade);
  r.set(1, 10, RC.cone);
  return r;
}

/** 32x20 dumpster: dented green bin on wheels, lid hanging open, junk sticking out. */
export function buildDumpster(): Raster {
  const m = new Mask(32, 20);
  m.poly([[1, 7], [31, 7], [30, 17], [2, 17]], 1);
  m.poly([[0, 3], [18, 2], [18, 7], [0, 7]], 2);
  m.poly([[19, 4], [31, 1], [31, 4], [19, 7]], 2);
  const r = new Raster(32, 20);
  paintMask(m, r, {
    1: { light: RC.dumpLight, base: RC.dump, shade: RC.dumpShade },
    2: { light: RC.dump, base: RC.dumpShade, shade: '#154228' },
  }, { shadeDepth: 2, lightDepth: 1 });
  for (const x of [8, 16, 24]) rectR(r, x, 8, 1, 9, RC.dumpShade);
  rectR(r, 2, 10, 28, 1, RC.dumpShade);
  for (let i = 0; i < 26; i++) {
    const x = 3 + Math.floor(hash2(i, 1, 4) * 26);
    const y = 8 + Math.floor(hash2(i, 2, 4) * 9);
    if (r.get(x, y) !== 0) r.set(x, y, hash2(i, 3, 4) < 0.5 ? RC.brickShade : RC.dumpLight);
  }
  // dent and rust streaks
  rectR(r, 20, 12, 5, 3, RC.dumpShade);
  rectR(r, 20, 12, 5, 1, RC.dumpLight);
  lineR(r, 5, 11, 5, 16, RC.rebar);
  // rubbish: a pink rag and a lime bag peeking out of the open lid
  rectR(r, 3, 4, 5, 2, RC.drum);
  rectR(r, 4, 3, 3, 1, RC.drumLight);
  rectR(r, 10, 4, 5, 3, RC.mossDark);
  rectR(r, 10, 4, 5, 1, RC.moss);
  for (const x of [5, 25]) rectR(r, x, 17, 4, 3, RC.ink);
  outlineRaster(r, RC.ink);
  return r;
}

/** 16x16 "no entry" road sign, pole folded over so the sign hangs sideways. */
export function buildRoadSign(): Raster {
  const r = new Raster(16, 16);
  const m = new Mask(16, 16);
  for (let i = 0; i <= 10; i++) {
    const [x, y] = bezier([3, 15], [3, 4], [8, 3], i / 10);
    m.rect(Math.round(x), Math.round(y), 2, 2, 2);
  }
  const body = new Mask(16, 16);
  body.ellipse(11, 9, 4, 4, 1);
  paintMask(m, r, { 2: STEEL }, { shadeDepth: 1 });
  for (let y = 5; y <= 13; y++) {
    for (let x = 7; x <= 15; x++) {
      if (body.get(x, y) === 0) continue;
      const edge = body.get(x - 1, y) === 0 || body.get(x + 1, y) === 0 || body.get(x, y - 1) === 0 || body.get(x, y + 1) === 0;
      r.set(x, y, edge ? RC.flagDark : RC.flagRed);
    }
  }
  rectR(r, 8, 8, 7, 2, RC.white);
  rectR(r, 8, 8, 7, 1, RC.whiteShade);
  r.set(9, 6, RC.flagLight);
  r.set(8, 7, RC.flagLight);
  outlineRaster(r, RC.ink);
  return r;
}
