/**
 * Side-view cheese layers, each readable by its body colour AND its rind: cheddar (bright orange,
 * drapes over the patty edge), brie (white bloomy rind, creamy inside), provola (pale cream, tan
 * rind ends, stretchy melt), taleggio (orange-pink rind line), tuma (pale cubes, golden honey),
 * scamorza (smoked brown rind), gorgonzola (cream with blue-green veins).
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { BASE, CX, bumps, drip, grain, layer, topOf } from './layerKit';
import { softLine } from './kit';
import { C, T, WHITE } from './palette';

const cheddarTone: Tone = { light: T.cheddar.light, base: T.cheddar.base, shade: T.cheddar.shade };

export function cheddar(): Raster {
  const top = topOf('cheddar');
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 23, CX + 23, y, 1);
    // the square slice melts on the hot patty: both corners droop in a curtain, a few drips run down
    [5, 4, 3, 1].forEach((w, k) => {
      const inset = k >> 1;
      m.span(CX - 23 + inset, CX - 24 + inset + w, BASE + k, 1);
      m.span(CX + 24 - inset - w, CX + 23 - inset, BASE + k, 1);
    });
    drip(m, CX - 10, 3, 3, 1);
    drip(m, CX + 2, 2, 4, 1);
    drip(m, CX + 11, 2, 2, 1);
  }, { 1: cheddarTone }, (r) => {
    for (const dx of [-18, -17, -16, -4, -3, 9, 10]) r.set(CX + dx, top, '#ffe890');
    for (const dx of [-17, 9]) r.set(CX + dx, top, WHITE);
    for (const [x, y] of [[CX - 22, BASE], [CX - 22, BASE + 1], [CX + 2, BASE + 1], [CX - 10, BASE]] as const) r.set(x, y, T.cheddar.light);
  }, softLine(cheddarTone));
}

/** Slices side by side: [x0, x1] spans, rind (id 1) on the top row and both ends, body id 2. */
function slices(m: Mask, top: number, spans: readonly (readonly [number, number])[], rindTop: boolean, rindEnd: number): void {
  for (const [x0, x1] of spans) {
    for (let y = top; y < BASE; y++) {
      for (let x = x0; x <= x1; x++) {
        const rind = (rindTop && y === top) || x < x0 + rindEnd || x > x1 - rindEnd;
        m.set(x, y, rind ? 1 : 2);
      }
    }
  }
}

const THIRDS = [[CX - 21, CX - 8], [CX - 7, CX + 6], [CX + 7, CX + 20]] as const;
const HALVES = [[CX - 21, CX - 1], [CX, CX + 21]] as const;

export function brie(): Raster {
  const top = topOf('brie');
  return layer((m) => {
    slices(m, top, THIRDS, true, 1);
    drip(m, CX - 8, 2, 2, 2); // creamy heart oozing at the cuts
    drip(m, CX + 6, 2, 1, 2);
  }, { 1: T.brieRind, 2: T.brie }, (r, m) => {
    grain(r, m, 1, C.rindSpeck, 0.3, 81);
    for (let x = CX - 20; x < CX + 20; x++) if (m.get(x, BASE - 1) === 1) r.set(x, BASE - 1, T.brieRind.shade);
    r.set(CX - 18, top + 1, '#fff8dc');
  }, softLine(T.brie));
}

export function provola(): Raster {
  const top = topOf('provola');
  return layer((m) => {
    slices(m, top, HALVES, false, 2);
    for (let y = top; y < BASE; y++) for (const x of [CX - 1, CX]) m.set(x, y, 2); // the two slices melted together
    drip(m, CX - 13, 2, 2, 2);
    drip(m, CX + 4, 1, 3, 2);
    drip(m, CX + 12, 2, 1, 2);
  }, { 1: T.provolaRind, 2: T.provola }, (r) => {
    for (const dx of [-15, -14, 2, 3, 15]) r.set(CX + dx, top, '#fffef4');
  }, softLine(T.provolaRind));
}

export function taleggio(): Raster {
  const top = topOf('taleggio');
  return layer((m) => {
    slices(m, top, THIRDS, true, 1);
    drip(m, CX - 3, 2, 2, 2);
  }, { 1: T.taleggioRind, 2: T.taleggio }, (r, m) => {
    grain(r, m, 1, T.taleggioRind.shade, 0.25, 91);
    r.set(CX - 16, top + 1, WHITE);
  }, softLine(T.taleggioRind));
}

/** Tuma caramellata al miele: pale cubes glazed with golden honey running down. */
export function tuma(): Raster {
  const top = topOf('tuma');
  return layer((m) => {
    for (let k = 0; k < 6; k++) {
      const x0 = CX - 21 + k * 7;
      for (let y = top; y < BASE; y++) m.span(x0, x0 + 5, y, 1);
      m.span(x0 + 1, x0 + 4, top, 2); // honey glaze on top of every cube
      if (k % 2 === 0) m.set(x0 + 2 + (k % 3), top - 1, 2);
    }
    for (const [x, len] of [[CX - 15, 3], [CX - 8, 1], [CX + 6, 2], [CX + 13, 3]] as const) drip(m, x, 1, len, 2);
  }, { 1: T.tuma, 2: T.honey }, (r, m) => {
    for (let x = 0; x < m.w; x++) if (m.get(x, top) === 2 && hash2(x, top, 97) < 0.3) r.set(x, top, '#fff4c0');
    for (const dx of [-19, -5, 9]) r.set(CX + dx, top, WHITE);
  }, softLine(T.honey));
}

export function scamorza(): Raster {
  const top = topOf('scamorza');
  return layer((m) => {
    slices(m, top, HALVES, true, 2);
    drip(m, CX - 9, 2, 2, 2);
    drip(m, CX + 10, 1, 2, 2);
  }, { 1: T.scamorzaRind, 2: T.scamorza }, (r, m) => {
    grain(r, m, 1, T.scamorzaRind.light, 0.25, 101);
    r.set(CX - 15, top + 1, '#fffaea');
  }, softLine(T.scamorzaRind));
}

export function gorgonzola(): Raster {
  const top = topOf('gorgonzola');
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 21, CX + 21, y, 1);
    bumps(m, top, CX - 19, CX + 19, 1, 0.4, 111);
    drip(m, CX - 14, 2, 2, 1);
    drip(m, CX + 2, 3, 2, 1);
    drip(m, CX + 15, 1, 1, 1);
  }, { 1: T.gorgonzola }, (r, m) => {
    grain(r, m, 1, T.vein.base, 0.2, 113);
    grain(r, m, 1, T.vein.shade, 0.08, 117);
    for (let x = CX - 18; x < CX + 18; x += 6) {
      r.set(x, BASE - 2, T.vein.shade);
      r.set(x + 1, BASE - 3 + (x & 1), T.vein.base);
    }
  }, softLine(T.gorgonzola));
}
