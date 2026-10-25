/**
 * Side-view layers of the sweet / crunchy toppings (caramelised pear slices, fig jam, chopped
 * hazelnuts, walnut pieces) and of the five sauces (thin glossy layer with drips).
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import type { SAUCES } from '../keys';
import { BASE, CX, drip, grain, layer, topOf } from './layerKit';
import { softLine } from './kit';
import { C, T, WHITE } from './palette';

/** Pere caramellate: golden slices fanned across the burger, glazed and glossy. */
export function pere(): Raster {
  const top = topOf('pere');
  return layer((m) => {
    for (let y = top + 1; y < BASE; y++) m.span(CX - 20, CX + 20, y, 1);
    for (let k = 0; k < 5; k++) m.ellipse(CX - 16 + k * 8, top + (k & 1), 5, 1, 1, 0.5);
    drip(m, CX - 2, 1, 2, 1);
  }, { 1: T.pear }, (r) => {
    for (let k = 0; k < 5; k++) {
      const x = CX - 16 + k * 8;
      const y = top + (k & 1);
      r.set(x - 2, y - 1, '#fff4c0');
      r.set(x - 1, y - 1, WHITE);
      r.set(x + 4, y + 1, T.pear.dark ?? T.pear.shade); // slice edge
    }
  });
}

/** Confettura di fichi: thick dark purple jam with seeds, running down. */
export function fichi(): Raster {
  const top = topOf('fichi');
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 20, CX + 20, y, 1);
    for (let x = CX - 18; x <= CX + 18; x++) if (Math.sin(x * 0.6) > 0.5) m.set(x, top - 1, 1);
    drip(m, CX - 13, 2, 3, 1);
    drip(m, CX + 1, 1, 2, 1);
    drip(m, CX + 12, 2, 2, 1);
  }, { 1: T.jam }, (r, m) => {
    grain(r, m, 1, C.jamSeed, 0.12, 181);
    for (const dx of [-16, -5, 8]) r.set(CX + dx, top, '#d08ab8');
  }, softLine(T.jam));
}

/** Nocciole: chopped hazelnut bits with pale broken faces. */
export function nocciole(): Raster {
  const top = topOf('nocciole');
  return layer((m) => {
    for (let k = 0; k < 11; k++) m.ellipse(CX - 20 + k * 4, top + (hash2(k, 0, 191) < 0.5 ? 0 : 1), 2, 1, 1);
    for (let x = CX - 20; x <= CX + 20; x++) m.set(x, BASE - 1, 1);
  }, { 1: T.hazelnut }, (r) => {
    for (let k = 0; k < 11; k += 2) r.set(CX - 21 + k * 4, top + (hash2(k, 0, 191) < 0.5 ? 0 : 1), '#f4d8a8');
  });
}

/** Noci: wrinkled walnut pieces, lighter than the hazelnuts. */
export function noci(): Raster {
  const top = topOf('noci');
  return layer((m) => {
    for (let k = 0; k < 6; k++) m.ellipse(CX - 18 + k * 7, top - (k & 1), 3, 1, 1);
    for (let x = CX - 19; x <= CX + 19; x++) m.set(x, BASE - 1, 1);
  }, { 1: T.walnut }, (r, m) => {
    for (let k = 0; k < 6; k++) r.set(CX - 18 + k * 7, top - (k & 1), T.walnut.dark ?? T.walnut.shade); // the crease
    grain(r, m, 1, T.walnut.shade, 0.15, 197);
  });
}

type SauceId = (typeof SAUCES)[number];

/** Thin glossy sauce with drips of different lengths (each sauce its own pattern). */
export function sauce(id: SauceId): Raster {
  const top = topOf(id);
  const tone: Tone = T[id];
  const seed = id.length * 13;
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 21 + (y === top ? 1 : 0), CX + 21 - (y === top ? 1 : 0), y, 1);
    for (let k = 0; k < 5; k++) {
      const x = CX - 18 + k * 8 + Math.round(hash2(k, 1, seed) * 4);
      drip(m, x, hash2(k, 2, seed) < 0.5 ? 1 : 2, 1 + Math.floor(hash2(k, 3, seed) * 3), 1);
    }
  }, { 1: tone }, (r) => {
    for (const dx of [-15, -14, 5]) r.set(CX + dx, top, WHITE);
  }, softLine(tone));
}
