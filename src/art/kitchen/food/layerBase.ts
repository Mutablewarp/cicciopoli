/**
 * Side-view layers of the bread and the proteins: glossy brioche bun (round heel and dome),
 * beef / veggie patties (golden-brown seared discs bulging past the bun, juicy) and the three fried
 * chickens, each in the three looks the stack can show (raw, served = cooked right, burnt).
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { BASE, CX, grain, layer, seam, topOf, type Look } from './layerKit';
import { ballLight, rampAt, roughen } from './kit';
import { BUN_RAMP, C, T, WHITE } from './palette';

/** Half width of the brioche: narrower than the fillings, so patty, cheese and leaves overhang it. */
const BUN_HALF = 18;

/** Body rows [top, BASE) of half width `half`, each row inset by the larger of its `fromTop` / `fromBottom` entries. */
function rounded(m: Mask, top: number, half: number, id: number, fromTop: readonly number[], fromBottom: readonly number[]): void {
  for (let y = top; y < BASE; y++) {
    const inset = Math.max(fromTop[y - top] ?? 0, fromBottom[BASE - 1 - y] ?? 0);
    m.span(CX - half + inset, CX + half - inset, y, id);
  }
}

/** Lights the pixels of material `id` as a rounded volume of centre row `cy`: `ramp` (dark -> light) from the top-left. */
function volume(r: Raster, m: Mask, id: number, ramp: readonly string[], cy: number, ry: number, half: number, spread = 0.5): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) if (m.get(x, y) === id) r.set(x, y, rampAt(ramp, (ballLight(x, y, CX, cy, half + 1, ry) + 0.6) / 1.5, x, y, spread));
  }
}

const rampOf = (t: Tone, dark: string): readonly string[] => [t.dark ?? dark, t.shade, t.base, t.light];

/**
 * Bottom heel: the toasted cut face on top (a flat ellipse in the frill rows, seen a little from above), golden sides
 * curving into a round bottom (a puck, not a loaf), a gloss streak on the left, a baked underside.
 */
export function bunBottom(): Raster {
  const top = topOf('bunBottom');
  return layer((m) => {
    m.span(CX - 12, CX + 12, top - 2, 2);
    m.span(CX - 16, CX + 16, top - 1, 2);
    rounded(m, top, BUN_HALF, 1, [1], [4, 2, 1, 1]);
    m.span(CX - BUN_HALF + 1, CX + BUN_HALF - 1, top, 2);
  }, { 1: T.bun, 2: T.crumb }, (p, m) => {
    grain(p, m, 2, '#f4c070', 0.22, 11); // the cut face toasted on the plancha
    volume(p, m, 1, BUN_RAMP.slice(1, 7), top + 2, BASE - top + 1, BUN_HALF, 0.6);
    for (let x = CX - 12; x <= CX - 4; x++) p.set(x, top + 2, BUN_RAMP[7]); // egg-wash gloss
    for (let x = CX - 15; x <= CX - 10; x++) p.set(x, top + 3, BUN_RAMP[6]);
    for (let x = CX - 13; x <= CX + 13; x++) if (m.get(x, BASE - 1) === 1) p.set(x, BASE - 1, BUN_RAMP[1]);
  });
}

/** Dome profile: a round brioche crown (superellipse), half width of row j of `rows`. */
const domeHalf = (j: number, rows: number): number => Math.round(BUN_HALF * (1 - ((rows - j - 0.5) / rows) ** 2.4) ** (1 / 2.4));

/** Top bun: glossy egg-washed dome lit as a volume, paler sides near the cut, a toasted lip on the fillings. */
export function bunTop(): Raster {
  const top = topOf('bunTop') - 2; // the crown rises into the frill rows: nothing sits on the top bun
  const rows = BASE - 2 - top;
  return layer((m) => {
    for (let j = 0; j < rows; j++) m.span(CX - domeHalf(j, rows), CX + domeHalf(j, rows), top + j, 1);
    m.span(CX - BUN_HALF, CX + BUN_HALF, top + rows, 2);
    m.span(CX - BUN_HALF + 1, CX + BUN_HALF - 1, top + rows + 1, 3);
  }, { 1: T.bun, 2: T.crumb, 3: T.bunCrust }, (r, m) => {
    for (let y = top; y < top + rows; y++) {
      for (let x = CX - BUN_HALF; x <= CX + BUN_HALF; x++) {
        if (m.get(x, y) !== 1) continue;
        const l = ballLight(x, y, CX, top + rows, BUN_HALF + 1, rows + 0.5);
        const bake = Math.max(0, (top + 3 - y) * 0.05) - (y >= top + rows - 2 ? 0.12 : 0); // crown more baked, sides paler
        r.set(x, y, l > 0.95 ? WHITE : rampAt(BUN_RAMP, (l + 0.5) / 1.6 - bake, x, y));
      }
    }
    for (const [dx, dy] of [[-8, 3], [-7, 3], [-12, 5], [-3, 2]] as const) r.set(CX + dx, top + dy, BUN_RAMP[7]); // gloss glints
  });
}

interface ProteinLook {
  tone: Tone;
  seam: string;
  flecks: readonly (readonly [string, number])[];
}

interface PattyLook extends ProteinLook {
  /** the top face seen a little from above: the seared / raw surface, lighter than the side */
  face: Tone;
  /** crust texture: dark crevices and light nubs in short horizontal dashes */
  crust: readonly [string, string];
}

const BEEF: Readonly<Record<Look, PattyLook>> = {
  raw: { tone: T.beefRaw, face: T.beefRawTop, seam: '#7a1828', crust: ['#b8303e', C.marbling], flecks: [[C.marbling, 0.08]] },
  // PERFETTO = a juicy golden-brown crust, never charcoal-dark
  served: { tone: T.beefSide, face: T.beefTop, seam: '#4c2412', crust: ['#5a2a12', '#e0a060'], flecks: [['#d08a50', 0.05]] },
  burnt: { tone: T.char, face: T.charTop, seam: '#0e0a0a', crust: ['#0e0a0a', C.ash], flecks: [[C.ember, 0.04], [C.emberHot, 0.015]] },
};

const VEG: Readonly<Record<Look, PattyLook>> = {
  raw: { tone: T.veggieRaw, face: T.veggieRawTop, seam: '#3a4418', crust: ['#525c26', '#bcc878'], flecks: [[C.pea, 0.08], [C.carrot, 0.07], [C.corn, 0.05]] },
  served: { tone: T.vegGolden, face: T.vegTop, seam: '#3a2a0c', crust: ['#74561e', '#f0d480'], flecks: [[C.pea, 0.07], [C.carrot, 0.07], [C.corn, 0.05]] },
  burnt: BEEF.burnt,
};

function fleck(r: Raster, m: Mask, look: ProteinLook, seed: number): void {
  look.flecks.forEach(([col, p], i) => grain(r, m, 1, col, p, seed + i * 7));
  seam(r, m, 1, look.seam);
}

/** Meaty crust: short horizontal dashes of dark crevices and light nubs on the body rows of material `id`. */
function crust(r: Raster, m: Mask, id: number, [dark, light]: readonly [string, string], top: number, seed: number): void {
  for (let y = top + 1; y < BASE - 1; y++) {
    for (let x = 0; x < m.w; x++) {
      if (m.get(x, y) !== id || m.get(x - 1, y) !== id || m.get(x + 1, y) !== id) continue;
      const h = hash2((x + 3 * y) >> 1, y, seed);
      if (h < 0.16) r.set(x, y, dark);
      else if (h > 0.9 && y < BASE - 3) r.set(x, y, light);
    }
  }
}

/** Half width of a patty: 3 px past the brioche on each side. */
const PATTY_HALF = 21;

/**
 * 170 g patty bulging past the bun: a round-edged disc lit as a volume, a craggy seared crust, plump ends sagging one
 * row over the brioche's edge, the seared top face seen a little from above, juicy glints when served.
 */
function patty(look: PattyLook, served: boolean, seed: number): Raster {
  const top = topOf('manzo');
  return layer((m) => {
    rounded(m, top, PATTY_HALF, 1, [2, 1], [1]);
    // the plump ends sag one row past the body, over the brioche's edge (bun + outline reach 19 px from the centre)
    m.span(CX - 20, CX - 18, BASE, 1);
    m.span(CX + 18, CX + 20, BASE, 1);
    m.span(CX - 15, CX + 15, top - 2, 2);
    m.span(CX - 19, CX + 19, top - 1, 2);
  }, { 1: look.tone, 2: look.face }, (r, m) => {
    volume(r, m, 1, rampOf(look.tone, look.seam), top + 2, BASE - top, PATTY_HALF, 0.6);
    crust(r, m, 1, look.crust, top, seed);
    for (let x = 0; x < r.w; x++) {
      if (m.get(x, top) === 1) r.set(x, top, hash2(x, top, seed) < 0.3 ? look.face.light : look.face.base); // seared crust rims
      if (m.get(x, BASE - 2) === 1 && hash2(x, BASE, seed) < 0.35) r.set(x, BASE - 2, look.face.shade);
    }
    // the top face lit from the top-left, the crust grain on it
    for (let y = top - 2; y < top; y++) {
      for (let x = 0; x < r.w; x++) if (m.get(x, y) === 2) r.set(x, y, x < CX - 7 ? look.face.light : x > CX + 10 ? look.face.shade : look.face.base);
    }
    grain(r, m, 2, look.crust[0], 0.14, seed + 3);
    fleck(r, m, look, seed);
    for (const x of [CX - 20, CX - 19, CX - 18, CX + 18, CX + 19, CX + 20]) r.set(x, BASE, look.seam); // the sagging ends show the seared underside
    if (!served) return;
    for (const [dx, dy] of [[-14, -1], [-13, -1], [-6, -2], [-15, 1], [-14, 1], [-11, 2], [-17, 2]] as const) r.set(CX + dx, top + dy, '#ffe2b4'); // juicy glints
  });
}

export const manzo = (look: Look): Raster => patty(BEEF[look], look === 'served', 21);
export const vegetale = (look: Look): Raster => patty(VEG[look], look === 'served', 33);

/** Fried chicken fillet: a rounded cutlet wider than the bun, lit as a volume. */
function cutlet(m: Mask, top: number, half: number): void {
  rounded(m, top, half, 1, [3, 1], [2, 1]);
}

const BATTER: Readonly<Record<Look, ProteinLook>> = {
  raw: { tone: T.batterRaw, seam: '#c4a474', flecks: [['#f6c8bc', 0.1]] },
  served: { tone: T.batter, seam: '#8a4c10', flecks: [['#ffe6a8', 0.08], ['#c47a22', 0.07]] },
  burnt: { tone: T.burntFry, seam: '#140a06', flecks: [['#24140a', 0.15], [C.ember, 0.02]] },
};

/** Pollo pastellato: smooth puffy batter blisters on a plump rounded fillet. */
export function polloPastellato(look: Look): Raster {
  const top = topOf('polloPastellato');
  const lk = BATTER[look];
  const blisters = [[-16, 4], [-7, 5], [3, 4], [12, 5]] as const;
  return layer((m) => {
    cutlet(m, top + 1, 22);
    for (const [dx, rx] of blisters) m.ellipse(CX + dx, top + 2, rx, 2, 1);
  }, { 1: lk.tone }, (r, m) => {
    volume(r, m, 1, rampOf(lk.tone, lk.seam), top + 3, BASE - top, 22, 0.5);
    fleck(r, m, lk, 41);
    if (look === 'served') for (const [dx] of blisters) r.set(CX + dx - 2, top + 1, WHITE);
  });
}

const CRUMB: Readonly<Record<Look, ProteinLook>> = {
  raw: { tone: T.crumbRaw, seam: '#9a8058', flecks: [['#b89c6c', 0.18], ['#fff4dc', 0.12]] },
  served: { tone: T.crisp, seam: '#6a3208', flecks: [['#8a4a12', 0.2], ['#ffd27a', 0.16]] },
  burnt: BATTER.burnt,
};

/** Pollo croccante: craggy breaded fillet, ragged crumb all round its rounded edge. */
export function polloCroccante(look: Look): Raster {
  const top = topOf('polloCroccante');
  const lk = CRUMB[look];
  return layer((m) => {
    cutlet(m, top + 1, 22);
    roughen(m, 51, 0.45, 0.2);
    for (let y = BASE; y < m.h; y++) m.span(0, m.w - 1, y, 0); // crumbs never hang under the body
  }, { 1: lk.tone }, (r, m) => {
    volume(r, m, 1, rampOf(lk.tone, lk.seam), top + 3, BASE - top, 22, 0.7);
    fleck(r, m, lk, 61);
  });
}

const PANKO: Readonly<Record<Look, ProteinLook>> = {
  raw: { tone: T.pankoRaw, seam: '#9a7034', flecks: [['#c89c54', 0.14], ['#fff0bc', 0.12]] },
  served: { tone: T.panko, seam: '#7a4410', flecks: [['#ffe8b0', 0.2], ['#c47622', 0.1]] },
  burnt: BATTER.burnt,
};

/** Coscia panko: lumpy marinated thigh, spiky panko flakes standing up on top. */
export function cosciaPanko(look: Look): Raster {
  const top = topOf('cosciaPanko');
  const lk = PANKO[look];
  const flake = (x: number): number => top + (hash2(x, 3, 71) < 0.5 ? 0 : 1);
  return layer((m) => {
    cutlet(m, top + 2, 22);
    m.ellipse(CX - 10, top + 3, 10, 2, 1);
    m.ellipse(CX + 10, top + 3, 9, 1, 1);
    for (let x = CX - 19; x <= CX + 19; x += 3) if (hash2(x, 2, 71) < 0.7) m.set(x, flake(x), 1);
  }, { 1: lk.tone }, (r, m) => {
    volume(r, m, 1, rampOf(lk.tone, lk.seam), top + 4, BASE - top, 22, 0.6);
    fleck(r, m, lk, 73);
    if (look === 'served') for (let x = CX - 19; x <= CX + 19; x += 3) if (m.get(x, flake(x)) === 1) r.set(x, flake(x), '#fff2c8');
  });
}
