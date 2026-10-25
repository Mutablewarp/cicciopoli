/**
 * Everything that goes in the fryer: KITCHEN.fryItem (28x18, frame = FRY_ITEMS index * 3 + FRY_STATE:
 * raw / perfect golden / burnt, what sits in a raised basket) and KITCHEN.binSide (PAN 44x28, frame =
 * SIDES index: the raw menù sides heaped in their pan). Shapes tell them apart: one big battered / craggy /
 * panko fillet, a pile of fries, nuggets, round meatballs, small pop-corn bites, green nuggets.
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { FRY_ITEMS, FRY_STATE, SIDES, type FryItemId } from '../keys';
import { PAN, ballLight, bed, capsuleMask, dots, inkEdge, panClip, piece, rampAt, roughen, specks, type Pt } from './kit';
import { C, T, WHITE } from './palette';

/** [raw, perfect, burnt] tones of each fryer item. */
export const LOOK: Readonly<Record<FryItemId, readonly [Tone, Tone, Tone]>> = {
  polloPastellato: [T.batterRaw, T.batter, T.burntFry],
  polloCroccante: [T.crumbRaw, T.crisp, T.burntFry],
  cosciaPanko: [T.pankoRaw, T.panko, T.burntFry],
  patatine: [T.friesRaw, T.fries, T.friesBurnt],
  nuggets: [T.crumbRaw, T.batter, T.burntFry],
  meatball: [T.meatballRaw, T.meatball, T.char],
  chickenPopCorn: [T.crumbRaw, T.crisp, T.burntFry],
  greenNuggets: [T.greenRaw, T.green, T.burntFry],
};

const lineOf = (tone: Tone): string => (tone === T.char || tone === T.burntFry ? '#100806' : '#3a1e08');

/** Breadcrumb texture: dark and light crumbs on the inner pixels. */
function crumbs(p: Raster, m: Mask, tone: Tone, seed: number): void {
  specks(p, m, tone.shade, 0.2, seed);
  specks(p, m, tone.light, 0.14, seed + 1);
}

/** Boneless thigh cutlet: an irregular oval, one end fuller than the other, about 18 x 9 at size 1. */
export function thighMask(m: Mask, cx: number, cy: number, size = 1): void {
  m.ellipse(cx - Math.round(size), cy, Math.round(8 * size), Math.round(4 * size), 1);
  m.ellipse(cx + Math.round(4 * size), cy - Math.round(size), Math.round(5 * size), Math.round(4 * size), 1);
}

/** Panko coat: flaky ridges (a light flake with its shadow to the right) and a few dark crumbs, dense enough to read as breading. */
export function pankoFlakes(p: Raster, m: Mask, tone: Tone, seed: number): void {
  for (let y = 0; y < m.h; y++) {
    for (let x = 0; x < m.w; x++) {
      if (!m.get(x, y) || !m.get(x + 1, y)) continue;
      const h = hash2(x, y, seed);
      if (h < 0.2) {
        p.set(x, y, tone.light);
        p.set(x + 1, y, tone.shade);
      } else if (h > 0.93) p.set(x, y, tone.dark ?? tone.shade);
    }
  }
}

function fillet(r: Raster, tone: Tone, kind: 'pastellato' | 'croccante' | 'panko', cx: number, cy: number, seed: number): void {
  piece(r, tone, (m) => {
    if (kind === 'panko') thighMask(m, cx, cy);
    else m.ellipse(cx, cy, 11, 5, 1);
    if (kind === 'pastellato') for (const dx of [-8, -2, 4, 9]) m.ellipse(cx + dx, cy - 4, 2, 1, 1); // batter blisters
    if (kind !== 'pastellato') roughen(m, seed, kind === 'croccante' ? 0.55 : 0.3, kind === 'croccante' ? 0.2 : 0.12);
  }, {
    line: lineOf(tone),
    detail: (p, m) => {
      if (kind === 'croccante') crumbs(p, m, tone, seed);
      else if (kind === 'panko') pankoFlakes(p, m, tone, seed);
      else specks(p, m, tone.light, 0.12, seed);
      if (tone !== T.burntFry) dots(p, [[cx - 7, cy - 3], [cx - 6, cy - 3]], WHITE);
      else specks(p, m, C.ember, 0.03, seed + 9);
    },
  });
}

/** Fries: sticks of radius `rad` at a few angles, crisp darker tips when cooked. */
function fries(r: Raster, tone: Tone, sticks: readonly (readonly [number, number, number, number])[], rad = 1.2, line = lineOf(tone)): void {
  for (const [ax, ay, bx, by] of sticks) {
    piece(r, tone, (m) => capsuleMask(m, ax, ay, bx, by, rad, rad), {
      line,
      detail: (p) => {
        if (tone === T.fries) p.set(bx, by, tone.shade);
        p.set(ax, ay, tone.light);
      },
    });
  }
}

export type Shape = 'nugget' | 'ball' | 'bite';

export function lumps(r: Raster, tone: Tone, shape: Shape, spots: readonly Pt[], seed: number): void {
  spots.forEach(([x, y], i) => {
    const rad = shape === 'bite' ? 2 : 3;
    piece(r, tone, (m) => {
      m.ellipse(x, y, shape === 'nugget' ? 4 : rad, shape === 'nugget' ? 3 : rad, 1);
      if (shape !== 'ball') roughen(m, seed + i * 3, shape === 'bite' ? 0.45 : 0.12, shape === 'bite' ? 0.2 : 0.06); // smooth nuggets, craggy bites
    }, {
      line: lineOf(tone),
      detail: (p, m) => {
        if (shape === 'ball') {
          const ramp = [tone.dark ?? tone.shade, tone.shade, tone.base, tone.light];
          for (let yy = y - rad; yy <= y + rad; yy++) {
            for (let xx = x - rad; xx <= x + rad; xx++) if (m.get(xx, yy)) p.set(xx, yy, rampAt(ramp, (ballLight(xx, yy, x, y, rad + 0.5, rad + 0.5) + 0.55) / 1.45, xx, yy));
          }
          // minced meat: matte, crumbly specks and one soft highlight (a white glint would read as a cherry)
          specks(p, m, tone.dark ?? tone.shade, 0.22, seed + i * 5);
          if (tone !== T.char) p.set(x - 1, y - 1, tone.light);
          else specks(p, m, C.ember, 0.15, seed + i);
        } else if (shape === 'bite') crumbs(p, m, tone, seed + i * 7);
        else {
          specks(p, m, tone.light, 0.16, seed + i * 7);
          specks(p, m, tone.shade, 0.06, seed + i * 7 + 1);
          if (tone !== T.burntFry) p.set(x - 2, y - 1, WHITE);
        }
      },
    });
  });
}

/** Jittered rows of spots inside w x h, `step` apart, `pad` px from the edges (the last row may sit one px lower to fill the pan). */
function spotsIn(w: number, h: number, step: number, pad: number, seed: number): Pt[] {
  const out: Pt[] = [];
  let row = 0;
  for (let y = pad; y <= h - pad; y += step - 1, row++) {
    for (let x = pad + (row & 1 ? step >> 1 : 0); x <= w - pad - 1; x += step) {
      out.push([x + Math.round((hash2(x, y, seed) - 0.5) * 2), y]);
    }
  }
  return out;
}

/** Sticks criss-crossing the w x h area: [ax, ay, bx, by]. */
function stickPile(w: number, h: number, seed: number): (readonly [number, number, number, number])[] {
  const out: [number, number, number, number][] = [];
  for (let k = 0; k < Math.round((w * h) / 30); k++) {
    const x = 3 + Math.round(hash2(k, 1, seed) * (w - 7));
    const y = 3 + Math.round(hash2(k, 2, seed) * (h - 7));
    const a = (hash2(k, 3, seed) - 0.5) * 1.6;
    const len = Math.round(w / 7) + Math.round(hash2(k, 4, seed) * 2); // 4..6 in a basket, longer in the pan
    const dx = Math.round(Math.cos(a) * len);
    const dy = Math.round(Math.sin(a) * len * 0.8);
    out.push([Math.max(2, Math.min(w - 3, x - dx)), Math.max(2, Math.min(h - 3, y - dy)), Math.max(2, Math.min(w - 3, x + dx)), Math.max(2, Math.min(h - 3, y + dy))]);
  }
  return out;
}

/** Draws fryer item `id` in look `tone` filling a w x h frame. */
function drawItem(r: Raster, id: FryItemId, tone: Tone): void {
  const { w, h } = r;
  const seed = FRY_ITEMS.indexOf(id) * 37 + 501;
  if (id === 'polloPastellato') fillet(r, tone, 'pastellato', w >> 1, (h >> 1) + 1, seed);
  else if (id === 'polloCroccante') fillet(r, tone, 'croccante', w >> 1, (h >> 1) + 1, seed);
  else if (id === 'cosciaPanko') fillet(r, tone, 'panko', w >> 1, (h >> 1) + 1, seed);
  else if (id === 'patatine') fries(r, tone, stickPile(w, h, seed));
  else if (id === 'meatball') lumps(r, tone, 'ball', spotsIn(w, h, 7, 4, seed), seed);
  else if (id === 'chickenPopCorn') lumps(r, tone, 'bite', spotsIn(w, h, 5, 3, seed), seed);
  else lumps(r, tone, 'nugget', spotsIn(w, h, 7, 4, seed), seed);
}

export function buildFryItems(): Raster[] {
  return FRY_ITEMS.flatMap((id) => [FRY_STATE.raw, FRY_STATE.perfect, FRY_STATE.burnt].map((s) => {
    const r = new Raster(28, 18);
    drawItem(r, id, LOOK[id][s]);
    inkEdge(r);
    return r;
  }));
}

/** Long raw fries lying in loose rows across the pan, each row leaning its own way: [ax, ay, bx, by]. */
function panFries(): (readonly [number, number, number, number])[] {
  const out: [number, number, number, number][] = [];
  for (let y = 2, row = 0; y <= 26; y += 3, row++) {
    for (let x = -6 + (row % 3) * 5; x < 44; x += 14) {
      const a = (hash2(x, y, 541) - 0.5) * 1.1;
      out.push([x, y, Math.round(x + Math.cos(a) * 13), Math.round(y + Math.sin(a) * 6)]);
    }
  }
  return out;
}

/** The raw menù sides heaped in their pan, full to the brim. */
export function buildBinSide(): Raster[] {
  return SIDES.map((id) => {
    const r = new Raster(PAN.w, PAN.h);
    const raw = LOOK[id][FRY_STATE.raw];
    bed(r, raw, 531 + SIDES.indexOf(id), raw.shade);
    if (id === 'patatine') fries(r, raw, panFries(), 1.7, '#a8884a');
    else drawItem(r, id, raw);
    return panClip(r);
  });
}
