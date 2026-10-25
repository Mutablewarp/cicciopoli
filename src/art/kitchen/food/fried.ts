/**
 * Everything that goes in the fryer: KITCHEN.fryItem (FRY_ITEM 44x28, frame = FRY_ITEMS index * 3 +
 * FRY_STATE: raw pale / perfect golden with oil glints / burnt dark, big pieces heaped in a raised basket)
 * and KITCHEN.binSide (PAN 44x28, frame = SIDES index: the raw menù sides heaped in their pan). Shapes tell
 * them apart: one big battered / craggy / panko fillet, a pile of fries, nuggets, round meatballs, small
 * pop-corn bites, green nuggets.
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2, packColor } from '../../hills/raster';
import { FRY_ITEM, FRY_ITEMS, FRY_STATE, SIDES, type FryItemId } from '../keys';
import { PAN, ballLight, bed, dots, inkEdge, panClip, piece, rampAt, roughen, specks, type Pt } from './kit';
import { mix } from '../../pixel';
import { C, INK, T, WHITE } from './palette';

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

function fillet(r: Raster, tone: Tone, kind: 'pastellato' | 'croccante' | 'panko', cx: number, cy: number, seed: number, size = 1): void {
  const z = (v: number): number => Math.round(v * size);
  piece(r, tone, (m) => {
    if (kind === 'panko') thighMask(m, cx, cy, size);
    else m.ellipse(cx, cy, z(11), z(5), 1);
    if (kind === 'pastellato') {
      // batter blisters along the top: more of them on a bigger fillet, never bigger (bumps, not ears)
      const n = Math.round(4 * size);
      for (let k = 0; k < n; k++) m.ellipse(cx + Math.round((k / (n - 1) - 0.5) * 17 * size), cy - z(4), 2, 1, 1);
    }
    if (kind !== 'pastellato') roughen(m, seed, kind === 'croccante' ? 0.55 : 0.3, kind === 'croccante' ? 0.2 : 0.12);
  }, {
    line: lineOf(tone),
    detail: (p, m) => {
      if (kind === 'croccante') crumbs(p, m, tone, seed);
      else if (kind === 'panko') pankoFlakes(p, m, tone, seed);
      else specks(p, m, tone.light, 0.12, seed);
      if (tone !== T.burntFry) dots(p, [[cx - z(7), cy - z(3)], [cx - z(7) + 1, cy - z(3)]], WHITE);
      else specks(p, m, C.ember, 0.03, seed + 9);
    },
  });
}

/** One fry: [centre x, centre y, angle (rad, screen), length], a square-cut stick FRY_W px thick. */
export type Fry = readonly [number, number, number, number];
const FRY_W = 4;

/** Coordinate of pixel (x, y) along the fry (u) and across it (v), from its centre. */
function fryUV([cx, cy, a]: Fry, x: number, y: number): [number, number] {
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  return [dx * Math.cos(a) + dy * Math.sin(a), dy * Math.cos(a) - dx * Math.sin(a)];
}

/** Fries: square-cut sticks, each lit on its top face and inked on its own, so every stick reads; the
 * cooked ones get crisp darker tips. */
function fries(r: Raster, tone: Tone, pile: readonly Fry[], line = lineOf(tone)): void {
  for (const f of pile) {
    const reach = f[3] / 2 + FRY_W;
    const inside = (x: number, y: number): boolean => {
      const [u, v] = fryUV(f, x, y);
      return Math.abs(u) <= f[3] / 2 && Math.abs(v) <= FRY_W / 2;
    };
    piece(r, tone, (m) => {
      for (let y = Math.floor(f[1] - reach); y <= f[1] + reach; y++) for (let x = Math.floor(f[0] - reach); x <= f[0] + reach; x++) if (inside(x, y)) m.set(x, y, 1);
    }, {
      line,
      detail: (p, m) => {
        if (tone !== T.fries) return;
        for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (m.get(x, y) && Math.abs(fryUV(f, x, y)[0]) > f[3] / 2 - 1.5) p.set(x, y, tone.shade);
      },
    });
  }
}

/**
 * A loose pile of fries over w x h: `rows` staggered rows of `cols` sticks, each leaning the other way
 * from its neighbours (criss-cross: parallel rows read as straw or wood grain), back row first. `len`
 * is the mean length; a stick near the edge slides inwards to fit whole (never cut short: stubs read as
 * nuggets). `heap` drops the corners (a mound in a basket).
 */
export function friesPile(w: number, h: number, rows: number, cols: number, len: number, seed: number, heap = false): Fry[] {
  const out: Fry[] = [];
  const sx = (w - 2 * FRY_W) / cols;
  const fit = (c: number, ext: number, size: number): number => Math.max(ext + 1, Math.min(size - 1 - ext, c));
  for (let j = 0; j < rows; j++) {
    const odd = j & 1;
    for (let i = 0; i < cols + odd; i++) {
      const cx = FRY_W + sx * (i + (odd ? 0 : 0.5)) + (hash2(i, j, seed) - 0.5) * 3;
      const cy = FRY_W + ((h - 2 * FRY_W) * j) / (rows - 1) + (hash2(j, i, seed) - 0.5) * 2;
      if (heap && ((cx - w / 2) / (w / 2)) ** 2 + ((cy - h / 2) / (h / 2)) ** 2 > 1.3) continue;
      const steep = hash2(i, j, seed + 1) < 0.18;
      const lean = (i + j) % 2 ? 1 : -1; // mostly alternating, a few strays: a pile, not parquet
      const a = (hash2(i, j, seed + 4) < 0.25 ? -lean : lean) * (steep ? 1.15 : 0.2 + hash2(i, j, seed + 2) * 0.65);
      const [c, sn] = [Math.abs(Math.cos(a)), Math.abs(Math.sin(a))];
      // the longest stick that fits the frame at this angle, then its half extents across x and y
      const half = Math.min((len * (0.85 + hash2(i, j, seed + 3) * 0.3)) / 2, (w / 2 - 1 - (FRY_W / 2) * sn) / c, (h / 2 - 1 - (FRY_W / 2) * c) / sn);
      out.push([fit(cx, half * c + (FRY_W / 2) * sn, w), fit(cy, half * sn + (FRY_W / 2) * c, h), a, 2 * half]);
    }
  }
  return out.sort((p, q) => p[1] - q[1]);
}

export type Shape = 'nugget' | 'ball' | 'bite';

/** Pieces of `shape` at `spots`; `size` scales them (1 = in the pan, bigger in the basket). */
export function lumps(r: Raster, tone: Tone, shape: Shape, spots: readonly Pt[], seed: number, size = 1): void {
  spots.forEach(([x, y], i) => {
    const rad = Math.round((shape === 'bite' ? 2 : 3) * size);
    piece(r, tone, (m) => {
      m.ellipse(x, y, shape === 'nugget' ? Math.round(4 * size) : rad, shape === 'nugget' ? Math.round(3 * size) : rad, 1);
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
          if (tone !== T.burntFry) p.set(x - Math.round(2 * size), y - Math.round(size), WHITE);
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

/** Draws the raw starter `id` (not the fries) in look `tone` filling a pan frame. */
function drawStarter(r: Raster, id: FryItemId, tone: Tone): void {
  const { w, h } = r;
  const seed = FRY_ITEMS.indexOf(id) * 37 + 501;
  if (id === 'meatball') lumps(r, tone, 'ball', spotsIn(w, h, 7, 4, seed), seed);
  else if (id === 'chickenPopCorn') lumps(r, tone, 'bite', spotsIn(w, h, 5, 3, seed), seed);
  else lumps(r, tone, 'nugget', spotsIn(w, h, 7, 4, seed), seed);
}

/** Basket pieces are this much bigger than in the pan (read at a glance on the COTTURA page). */
const BIG = 1.5;

/** Spots of a heap: a jittered grid kept inside an ellipse filling the w x h frame, back row first. */
function heapSpots(w: number, h: number, step: number, pad: number, seed: number): Pt[] {
  return spotsIn(w, h, step, pad, seed).filter(([x, y]) => ((x - w / 2) / (w / 2 - pad + 1)) ** 2 + ((y - h / 2) / (h / 2 - pad + 2)) ** 2 <= 1.15);
}

/** Hot oil glints on the lit pixels of golden pieces. */
function glints(r: Raster, tone: Tone, seed: number): void {
  const lit = packColor(tone.light);
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.get(x, y) === lit && hash2(x, y, seed) < 0.12) r.set(x, y, WHITE);
}

/** Fryer item `id` in its basket look `tone`: big pieces heaped to fill the FRY_ITEM frame. */
function drawBasketItem(r: Raster, id: FryItemId, tone: Tone): void {
  const { w, h } = r;
  const seed = FRY_ITEMS.indexOf(id) * 37 + 701;
  const cx = w >> 1;
  const cy = (h >> 1) + 1;
  if (id === 'polloPastellato') fillet(r, tone, 'pastellato', cx, cy, seed, BIG + 0.1);
  else if (id === 'polloCroccante') fillet(r, tone, 'croccante', cx, cy, seed, BIG + 0.1);
  else if (id === 'cosciaPanko') fillet(r, tone, 'panko', cx - 2, cy, seed, BIG);
  else if (id === 'patatine') fries(r, tone, friesPile(w, h, 4, 4, 21, seed, true));
  else if (id === 'meatball') lumps(r, tone, 'ball', heapSpots(w, h, 10, 5, seed), seed, BIG);
  else if (id === 'chickenPopCorn') lumps(r, tone, 'bite', heapSpots(w, h, 7, 4, seed), seed, BIG);
  else lumps(r, tone, 'nugget', heapSpots(w, h, 11, 5, seed), seed, BIG);
}

export function buildFryItems(): Raster[] {
  return FRY_ITEMS.flatMap((id) => [FRY_STATE.raw, FRY_STATE.perfect, FRY_STATE.burnt].map((s) => {
    const r = new Raster(FRY_ITEM.w, FRY_ITEM.h);
    const tone = LOOK[id][s];
    drawBasketItem(r, id, tone);
    if (s === FRY_STATE.perfect) glints(r, tone, FRY_ITEMS.indexOf(id) + 811);
    inkEdge(r);
    return r;
  }));
}

/** The raw menù sides heaped in their pan, full to the brim. */
export function buildBinSide(): Raster[] {
  return SIDES.map((id) => {
    const r = new Raster(PAN.w, PAN.h);
    const raw = LOOK[id][FRY_STATE.raw];
    if (id === 'patatine') {
      // shadowed gaps between the pale sticks (a pale bed made them blur into one straw-coloured patch)
      bed(r, { light: raw.shade, base: mix(T.fries.shade, INK, 0.3), shade: mix(T.fries.shade, INK, 0.55) }, 531);
      fries(r, raw, friesPile(r.w, r.h, 5, 3, 17, 541));
    } else {
      bed(r, raw, 531 + SIDES.indexOf(id), raw.shade);
      drawStarter(r, id, raw);
    }
    return panClip(r);
  });
}
