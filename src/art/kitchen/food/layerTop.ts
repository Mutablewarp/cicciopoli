/**
 * Side-view layers of the cured pork (streaky bacon ribbons, crispy guanciale chunks, ruffled
 * pancetta dolce) and of the vegetables (songino rosettes, ruffled lattuga, tomato slices, glossy
 * caramelised onion, crispy onion bits, capuliato, chilli rings).
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { BASE, CX, drip, grain, layer, seam, topOf, type Look } from './layerKit';
import { C, T, WHITE } from './palette';

const CHAR_FAT: Tone = { light: '#5a4030', base: '#40281c', shade: '#28180e' };
/** Outline of a bacon strip: a dark hue of its meat, softer than the ink between two strips. */
const PORK_LINE: Readonly<Record<Look, string>> = { raw: '#5a1018', served: '#3e1206', burnt: '#100806' };
const PORK: Readonly<Record<Look, readonly [Tone, Tone]>> = {
  raw: [T.baconRaw, T.fatRaw],
  served: [T.bacon, T.fat],
  burnt: [T.char, CHAR_FAT],
};

/** Rippled bacon edge: the strip rides one row up on the crests and hangs one row down in the troughs. */
const ripple = (top: number, phase: number) => (x: number): number => top + Math.round(Math.sin((x + phase) * 0.55) * 0.9);

/** One strip of streaky bacon (meat / fat / meat rows) rippling across the burger, ends curling down past the bun. */
function strip(look: Look, x0: number, x1: number, edge: (x: number) => number, phase: number): Raster {
  const [meat, fat] = PORK[look];
  const wave = (x: number): number => edge(x) + (x - x0 < 2 || x1 - x < 2 ? 1 : 0);
  return layer((m) => {
    for (let x = x0; x <= x1; x++) for (let k = 0; k < 3; k++) m.set(x, wave(x) + k, 1);
  }, { 1: meat }, (r) => {
    for (let x = x0; x <= x1; x++) {
      const y = wave(x);
      const lit = wave(x + 1) > y || wave(x - 1) < y || x < CX - 8; // the slopes facing the light, the left half
      r.set(x, y, lit ? meat.light : meat.base);
      r.set(x, y + 1, hash2(x, 1, phase) < 0.3 ? fat.base : fat.light); // the creamy fat streak
      r.set(x, y + 2, meat.shade);
      if (look === 'served' && hash2(x, 2, phase) < 0.14) r.set(x, y + 2, '#ec8a48'); // crispy caramelised spots
      if (look === 'burnt' && hash2(x, 3, phase) < 0.08) r.set(x, y + 1, C.ember);
    }
  }, PORK_LINE[look]);
}

/** A crispy rippled strip sticking out past the bun on both sides, glossy on the crests. */
export function bacon(look: Look): Raster {
  const top = topOf('bacon');
  const edge = ripple(top, 2);
  const r = strip(look, CX - 24, CX + 23, edge, 2);
  if (look !== 'burnt') for (let x = CX - 20; x <= CX + 20; x++) if (edge(x) < top && edge(x - 1) >= edge(x)) r.set(x, edge(x), WHITE);
  return r;
}

/** Guanciale croccante: chunky slices, mostly fat with a thin meat stripe, uneven heights. */
export function guanciale(look: Look): Raster {
  const top = topOf('guanciale');
  const [meat, fat] = look === 'raw' ? [T.baconRaw, T.guancialeFat] : PORK[look];
  return layer((m) => {
    for (let k = 0; k < 7; k++) {
      const x0 = CX - 22 + k * 6 + (k > 3 ? 1 : 0);
      const lift = hash2(k, 1, 131) < 0.5 ? 1 : 0;
      for (let y = top - lift; y < BASE; y++) m.span(x0, x0 + 5, y, y === top - lift + 1 ? 1 : 2);
    }
  }, { 1: meat, 2: fat }, (r, m) => {
    if (look === 'served') grain(r, m, 2, '#e09048', 0.18, 133);
    if (look === 'burnt') grain(r, m, 2, C.ember, 0.05, 137);
    seam(r, m, 2, fat.shade);
  });
}

/** Pancetta dolce: thin pink slices folded in ruffles that rise above the body. */
export function pancetta(): Raster {
  const top = topOf('pancetta');
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 21, CX + 21, y, 1);
    for (const dx of [-17, -8, 1, 10, 18]) {
      m.ellipse(CX + dx, top - 1, 3, 1, 1);
      m.set(CX + dx, top - 1, 2);
    }
  }, { 1: T.pancetta, 2: { light: T.fatRaw.base, base: T.fatRaw.base, shade: T.fatRaw.shade } }, (r) => {
    for (let x = CX - 20; x <= CX + 20; x++) if (((x >> 1) & 3) === 0) r.set(x, BASE - 1, T.fatRaw.base);
    for (const dx of [-18, 0, 17]) r.set(CX + dx, top - 2, WHITE);
  });
}

/** Songino: a row of small round dark-green rosettes poking up and out past the bun. */
export function songino(): Raster {
  const top = topOf('songino');
  return layer((m) => {
    for (let y = top + 1; y < BASE; y++) m.span(CX - 22, CX + 22, y, 1);
    for (let k = 0; k < 10; k++) {
      const x = CX - 23 + k * 5 + Math.round(hash2(k, 2, 141) * 2);
      m.ellipse(x, top - 1 + Math.round(hash2(k, 3, 141) * 2), 2, 1, 1);
    }
  }, { 1: T.songino }, (r, m) => {
    grain(r, m, 1, T.songino.light, 0.16, 143);
    grain(r, m, 1, T.songino.dark ?? T.songino.shade, 0.1, 147);
  });
}

/** Lattuga: one big pale-green ruffled leaf, wavy edge above, scalloped frill below and drooping ends. */
export function lattuga(): Raster {
  const top = topOf('lattuga');
  return layer((m) => {
    for (let y = top; y < BASE; y++) m.span(CX - 24, CX + 23, y, 1);
    for (let x = CX - 23; x <= CX + 22; x++) {
      const s = Math.sin(x * 0.75);
      if (s > 0.1) m.set(x, top - 1, 1);
      if (s > 0.75) m.set(x, top - 2, 1);
    }
    // frilly underside: both ends droop past the bun, scallops all along the bottom edge
    drip(m, CX - 24, 3, 3, 1);
    drip(m, CX + 21, 3, 3, 1);
    for (let x = CX - 19; x <= CX + 15; x += 6) drip(m, x + (x & 1), 3, 1, 1);
  }, { 1: T.lattuga }, (r, m) => {
    for (let x = CX - 22; x <= CX + 21; x += 4) {
      r.set(x, BASE - 2, C.veinLight);
      r.set(x + 1, BASE - 3, C.veinLight);
    }
    seam(r, m, 1, T.lattuga.dark ?? T.lattuga.shade);
  });
}

export function pomodoro(): Raster {
  const top = topOf('pomodoro');
  return layer((m) => {
    for (const [x0, x1] of [[CX - 21, CX - 1], [CX + 1, CX + 21]] as const) {
      for (let y = top; y < BASE; y++) m.span(x0 + (y === top || y === BASE - 1 ? 1 : 0), x1 - (y === top || y === BASE - 1 ? 1 : 0), y, y === top + 1 ? 2 : 1);
      m.set(x0, top + 1, 1);
      m.set(x1, top + 1, 1);
    }
    drip(m, CX + 8, 1, 1, 2);
  }, { 1: T.tomato, 2: T.tomatoFlesh }, (r) => {
    for (let x = CX - 18; x <= CX + 18; x += 3) if (x !== CX) r.set(x, top + 1, C.seed);
    for (const dx of [-18, 4]) r.set(CX + dx, top, '#ffd0c0');
  });
}

/** Cipolla caramellata: glossy brown strands looping above a soft base, a few dangling. */
export function cipollaCaramellata(): Raster {
  const top = topOf('cipollaCaramellata');
  return layer((m) => {
    for (let y = top + 1; y < BASE; y++) m.span(CX - 21, CX + 21, y, 1);
    for (let k = 0; k < 3; k++) {
      for (let x = CX - 22; x <= CX + 22; x++) m.set(x, top + Math.round(1.3 * Math.sin(x * 0.33 + k * 2.1)) - (k === 1 ? 1 : 0), 1);
    }
    drip(m, CX - 15, 1, 2, 1);
    drip(m, CX + 11, 1, 3, 1);
  }, { 1: T.onion }, (r, m) => {
    grain(r, m, 1, T.onion.shade, 0.2, 151);
    for (let x = CX - 21; x <= CX + 21; x++) {
      const y = top + Math.round(1.3 * Math.sin(x * 0.33));
      if (hash2(x, 0, 153) < 0.3) r.set(x, y, C.sheen);
    }
    for (const dx of [-12, 6, 17]) r.set(CX + dx, top, '#f8d8a0');
  });
}

/** Cipolla croccante: a heap of tiny golden fried rings. */
export function cipollaCroccante(): Raster {
  const top = topOf('cipollaCroccante');
  return layer((m) => {
    for (let y = top + 1; y < BASE; y++) m.span(CX - 20, CX + 20, y, 1);
    for (let k = 0; k < 14; k++) {
      const x = CX - 21 + k * 3 + Math.round(hash2(k, 5, 161) * 2);
      m.ellipse(x, top - Math.round(hash2(k, 6, 161)), 1, 1, 1);
    }
  }, { 1: T.crispyOnion }, (r, m) => {
    grain(r, m, 1, T.crispyOnion.dark ?? T.crispyOnion.shade, 0.18, 163);
    grain(r, m, 1, T.crispyOnion.light, 0.14, 167);
  });
}

/** Capuliato: chopped cherry tomato chunks with an olive-oil sheen. */
export function capuliato(): Raster {
  const top = topOf('capuliato');
  return layer((m) => {
    for (let y = top + 1; y < BASE; y++) m.span(CX - 20, CX + 20, y, 1);
    for (let k = 0; k < 9; k++) m.ellipse(CX - 19 + k * 5, top + (k & 1), 2, 1, 1);
    drip(m, CX - 6, 1, 2, 1);
  }, { 1: T.capuliato }, (r, m) => {
    grain(r, m, 1, T.tomatoFlesh.base, 0.18, 171);
    grain(r, m, 1, C.seed, 0.06, 173);
    for (const dx of [-17, -7, 3, 13]) r.set(CX + dx, top - 1 + ((dx + 17) % 2), '#ffeec0');
  });
}

/** Peperoncino: a row of small red chilli rings with yellow seeds. */
export function peperoncino(): Raster {
  const top = topOf('peperoncino');
  return layer((m) => {
    for (let k = 0; k < 9; k++) {
      const x = CX - 20 + k * 5;
      m.ellipse(x, top + (k % 3 === 1 ? 0 : 1), 2, 1, 1);
    }
  }, { 1: T.chilli }, (r) => {
    for (let k = 0; k < 9; k++) r.set(CX - 20 + k * 5, top + (k % 3 === 1 ? 0 : 1), C.seed);
  });
}
