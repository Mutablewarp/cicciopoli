/**
 * KITCHEN.griddleItem (GRIDDLE_ITEM 40x40, frame = GRIDDLE_ITEMS index * 5 + GRIDDLE_STATE): what sits
 * on the plancha seen from above, raw -> cooking -> perfect -> over -> burnt, big and juicy. Patties
 * shrink a little as they cook: raw = glossy marbled mince; cooking = a seared ring creeping in, red
 * juice beading on top, fat starting to bubble at the edge; PERFETTO = a golden-brown crust with grill
 * marks, glistening fat and a ring of bubbling fat; over = dark and dry; burnt = cracked charcoal with
 * embers and grey smoke curls. Bacon = streaky strips that curl more as they crisp, guanciale = thick
 * fat-and-meat slices turning translucent gold. Every piece sits PIECE_DY px low in its frame and
 * leaves the rows above PIECE_TOP empty: the cook bar the game draws over the slot never covers its top.
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { GRIDDLE_ITEM, GRIDDLE_ITEMS, GRIDDLE_STATE } from '../keys';
import { ballLight, dots, inkEdge, inner, piece, roughen, specks } from './kit';
import { C, T, WHITE } from './palette';

const SIZE = GRIDDLE_ITEM.w;
const MID = SIZE / 2;
/**
 * First frame row a piece may use: the cook bar over a slot (game/kitchen/cookView.ts: ITEM_HALF 16 + bar dy 2,
 * its marker 2 px deeper) reaches frame row 4. The pieces sit PIECE_DY px below the frame centre to stay
 * under it (the griddle's burnished spots follow them).
 */
export const PIECE_TOP = 5;
export const PIECE_DY = 2;
const CY = MID + PIECE_DY;
/** Patty radius per state: 37 px across (>= 64 CSS px once the griddle spans ~82% of a 375 px phone),
 * the meat tightening only once it is past PERFETTO; PATTY_FLAT px less from front to back (the iron is
 * seen a little from the front, like its oval spots), so it fits between PIECE_TOP and the frame's foot. */
const PATTY_R = [18, 18, 18, 17, 16] as const;
const PATTY_FLAT = 3;
type Fleck = readonly [string, number];

/** Fat foaming on the hot iron, red juice beading on raw meat, smoke over a burnt piece. */
const FAT = { foam: '#fff2cc', gold: '#e0a64c' } as const;
const JUICE = { bead: '#e8606a', glint: '#ffd0d0' } as const;
const SMOKE = { light: '#eceaf0', base: '#b4b0ba' } as const;

interface Done {
  tone: Tone;
  /** cooking: the rim already browned, the centre still raw */
  rim?: Tone;
  flecks: readonly Fleck[];
  /** grill marks [mark, caramel edge under it] */
  marks?: readonly [string, string];
  sheen: boolean;
  juice: boolean;
  /** bubbles of fat foaming round the edge */
  bubbles: number;
  line: string;
}

const BURNT: Done = {
  tone: T.char, flecks: [[C.ash, 0.12], [C.ember, 0.05], [C.emberHot, 0.02]], sheen: false, juice: false, bubbles: 0, line: '#0a0606',
};
const SEARED: Tone = { light: '#b87448', base: '#94502a', shade: '#6a3218' };
/** Troppo cotto: deep brown and dry, clearly lighter and warmer than the charcoal of BRUCIATO. */
const OVER: Tone = { light: '#a06034', base: '#74401e', shade: '#4e2810' };

/** [raw, cooking, perfect, over, burnt] of the two patties. */
const PATTY: Readonly<Record<'manzo' | 'vegetale', readonly Done[]>> = {
  manzo: [
    { tone: T.beefRaw, flecks: [[C.marbling, 0.2], [T.beefRaw.shade, 0.16], [T.beefRaw.light, 0.08]], sheen: true, juice: false, bubbles: 0, line: '#5a1018' },
    { tone: T.beefSeared, rim: SEARED, flecks: [[C.marbling, 0.08], [T.beefSeared.shade, 0.12]], marks: ['#8a3a2a', '#d0846a'], sheen: false, juice: true, bubbles: 9, line: '#3a1408' },
    { tone: T.beefGolden, flecks: [['#6a3014', 0.16], ['#c47a3c', 0.14], ['#e0a060', 0.05]], marks: ['#4a1e0a', '#d89458'], sheen: true, juice: false, bubbles: 14, line: '#2a1206' },
    { tone: OVER, flecks: [[OVER.shade, 0.2], [T.beef.base, 0.12]], marks: ['#2e1408', '#8a522c'], sheen: false, juice: false, bubbles: 5, line: '#1a0c04' },
    BURNT,
  ],
  vegetale: [
    { tone: T.veggieRaw, flecks: [[C.pea, 0.12], [C.carrot, 0.1], [C.corn, 0.08]], sheen: false, juice: false, bubbles: 0, line: '#2e3410' },
    { tone: T.veggieRaw, rim: T.vegGolden, flecks: [[C.pea, 0.1], [C.carrot, 0.08], [C.corn, 0.06]], marks: ['#5a5a20', '#c8b860'], sheen: false, juice: false, bubbles: 8, line: '#2e3410' },
    { tone: T.vegGolden, flecks: [[T.veggie.shade, 0.12], [C.pea, 0.07], [C.carrot, 0.07], [C.corn, 0.05]], marks: ['#5a3a10', '#f0d488'], sheen: true, juice: false, bubbles: 12, line: '#2a1e08' },
    { tone: T.veggie, flecks: [[T.veggie.shade, 0.22], [C.carrot, 0.04]], marks: ['#2a1c08', '#8a7432'], sheen: false, juice: false, bubbles: 5, line: '#1a1206' },
    BURNT,
  ],
};

/** Fat glistening in the top-left light: a soft crescent plus three hot glints. */
function sheen(p: Raster, m: Mask, rx: number, ry: number, gloss: string): void {
  for (let y = CY - ry; y <= CY + ry; y++) {
    for (let x = MID - rx; x <= MID + rx; x++) {
      const l = ballLight(x, y, MID, CY, rx, ry);
      if (inner(m, x, y) && l > 0.8 && hash2(x, y, 3) < (l > 0.9 ? 0.8 : 0.4)) p.set(x, y, gloss);
    }
  }
  dots(p, [[MID - rx + 6, CY - ry + 5], [MID - rx + 7, CY - ry + 5], [MID - rx + 5, CY - ry + 7]], WHITE);
}

/** Diagonal grill marks (2 px dark, 1 px caramel under), inside the crust ring. */
function grillMarks(p: Raster, m: Mask, rx: number, ry: number, [mark, edge]: readonly [string, string], seed: number): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!inner(m, x, y) || Math.hypot((x - MID) / rx, (y - CY) / ry) > 0.86) continue;
      const k = (((x + y * 0.75 + (hash2(x, y, seed) - 0.5) * 1.4) % 8) + 8) % 8;
      if (k < 2) p.set(x, y, mark);
      else if (k < 3) p.set(x, y, edge);
    }
  }
}

/** Glossy red juice beads on the still-raw top (the patty is cooking from below). */
function juiceBeads(p: Raster, seed: number): void {
  for (let k = 0; k < 6; k++) {
    const x = MID - 7 + Math.floor(hash2(k, 1, seed) * 14);
    const y = CY - 6 + Math.floor(hash2(k, 2, seed) * 12);
    p.set(x, y, JUICE.bead);
    p.set(x + 1, y, JUICE.bead);
    p.set(x, y - 1, JUICE.glint);
  }
}

function patty(r: Raster, d: Done, rx: number, seed: number): void {
  const ry = rx - PATTY_FLAT;
  piece(r, d.tone, (m) => {
    m.ellipse(MID, CY, rx, ry, 1);
    roughen(m, seed, 0.14, 0.1); // hand-pressed mince, not a coin
  }, {
    line: d.line,
    detail: (p, m) => {
      for (let y = 0; y < SIZE; y++) {
        for (let x = 0; x < SIZE; x++) {
          if (!inner(m, x, y)) continue;
          const k = Math.hypot((x - MID) / rx, (y - CY) / ry) + (hash2(x, y, seed) - 0.5) * 0.12;
          if (d.rim && k > 0.62) p.set(x, y, k > 0.84 ? d.rim.shade : d.rim.base);
          else if (ballLight(x, y, MID, CY, rx, ry) < -0.32) p.set(x, y, d.tone.shade); // thick: shaded bottom-right
        }
      }
      d.flecks.forEach(([col, prob], i) => specks(p, m, col, prob, seed + i * 7));
      if (d.marks) grillMarks(p, m, rx, ry, d.marks, seed);
      if (d.juice) juiceBeads(p, seed);
      if (d.sheen) sheen(p, m, rx, ry, d.tone === T.beefRaw ? T.beefRaw.light : '#f4c286');
      else if (d.tone !== T.char) dots(p, [[MID - rx + 6, CY - ry + 5]], d.tone.light);
      if (d.tone === T.char) cracks(p, m, seed);
    },
  });
}

/** Charred crust split by glowing cracks. */
function cracks(p: Raster, m: Mask, seed: number): void {
  for (let k = 0; k < 4; k++) {
    let x = MID - 8 + Math.floor(hash2(k, 3, seed) * 16);
    let y = CY - 8 + Math.floor(hash2(k, 4, seed) * 16);
    for (let s = 0; s < 6; s++) {
      if (inner(m, x, y)) p.set(x, y, s % 3 === 1 ? C.emberHot : C.ember);
      x += hash2(k, s, seed + 1) < 0.5 ? 1 : 0;
      y += hash2(s, k, seed + 2) < 0.6 ? 1 : -1;
    }
  }
}

/** Fat foaming on the iron round the edge: little bubbles hugging the outline (after the ink). */
function fatBubbles(r: Raster, n: number, rx: number, ry: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const a = ((k + hash2(k, 0, seed) * 0.6) / n) * 2 * Math.PI;
    const out = 1 + hash2(k, 1, seed) * 1.2;
    const x = Math.min(SIZE - 2, Math.round(MID + Math.cos(a) * (rx + out)));
    const y = Math.max(PIECE_TOP, Math.min(SIZE - 2, Math.round(CY + Math.sin(a) * (ry + out))));
    r.set(x, y, FAT.foam);
    if (hash2(k, 2, seed) < 0.45) {
      r.set(x + 1, y, FAT.foam);
      r.set(x, y + 1, FAT.gold);
      r.set(x + 1, y + 1, FAT.gold);
    }
  }
}

/** Grey smoke curls rising off a burnt piece (after the ink, so they float over it). */
function smokeCurls(r: Raster, seed: number): void {
  for (const x0 of [MID - 6, MID + 5]) {
    for (let s = 0; s < 12; s++) {
      const y = CY - 2 - s;
      const x = x0 + Math.round(Math.sin(s * 0.7 + hash2(x0, 0, seed) * 3) * 1.6);
      r.set(x, y, SMOKE.light);
      if (s < 8) r.set(x + 1, y, SMOKE.base);
    }
  }
}

/** Pork looks [meat, fat, line] per state; the strips / slices shrink as they render their fat. */
const PORK: readonly (readonly [Tone, Tone, string])[] = [
  [T.baconRaw, T.fatRaw, '#5a1018'],
  [{ light: '#ec7466', base: '#c84a3c', shade: '#902a22' }, { light: '#fce4c8', base: '#f6cca4', shade: '#dca47c' }, '#4a1410'],
  [T.bacon, T.fat, '#3a1006'],
  [{ light: '#8a3a1c', base: '#642410', shade: '#40160a' }, { light: '#d8a060', base: '#b07a3c', shade: '#7a5024' }, '#200a04'],
  [T.char, { light: '#5a4030', base: '#40281c', shade: '#28180e' }, '#0a0606'],
];

/** Three streaky strips, 6 px wide, waving a little more (curling) the crisper they get. */
function bacon(r: Raster, state: number): void {
  const [meat, fat, line] = PORK[state];
  const len = 34 - state * 2;
  const amp = 1 + state * 0.2;
  [9, 20, 31].map((y) => y + PIECE_DY).forEach((y0, i) => {
    const x0 = 3 + state + (i === 1 ? 1 : 0);
    const wave = (x: number): number => y0 + Math.round(amp * Math.sin(x * 0.36 + i * 0.5)); // near-parallel: strips never touch
    piece(r, meat, (m) => {
      for (let x = x0; x < x0 + len; x++) for (let k = -3; k <= 2; k++) m.set(x, wave(x) + k, 1);
    }, {
      line,
      detail: (p) => {
        for (let x = x0; x < x0 + len; x++) {
          const y = wave(x);
          const end = x < x0 + 3 || x >= x0 + len - 3; // the curled ends catch the light
          p.set(x, y - 3, end ? fat.light : fat.base);
          p.set(x, y - 1, hash2(x, i, 43) < 0.3 ? fat.light : fat.base);
          if (hash2(x, i, 41) < 0.5) p.set(x, y + 1, fat.shade);
          if (state === GRIDDLE_STATE.perfect && hash2(x, i, 47) < 0.22) p.set(x, y, '#ec8a48'); // crisp spots
          if (state === GRIDDLE_STATE.burnt && hash2(x, i, 49) < 0.1) p.set(x, y, C.ember);
        }
        if (state < GRIDDLE_STATE.over) p.set(x0 + 4, wave(x0 + 4) - 2, WHITE);
      },
    });
  });
}

/** Six thick slices: white fat with a meat band, turning golden and translucent, crisp at the edges. */
function guanciale(r: Raster, state: number): void {
  const [meat, fat, line] = PORK[state];
  const slabFat = state === GRIDDLE_STATE.raw ? T.guancialeFat : fat;
  const s = state > GRIDDLE_STATE.cooking ? 1 : 0;
  for (const [x, y0] of [[3, 6], [15, 5], [27, 6], [4, 22], [16, 23], [28, 22]] as const) {
    const y = y0 + PIECE_DY;
    const w = 10 - s;
    const h = 12 - s;
    piece(r, slabFat, (m) => {
      m.rect(x + s, y + s, w, h, 1);
      for (const [cx, cy] of [[x + s, y + s], [x + s + w - 1, y + s], [x + s, y + s + h - 1], [x + s + w - 1, y + s + h - 1]] as const) m.set(cx, cy, 0);
    }, {
      line,
      detail: (p) => {
        for (let i = 0; i < w; i++) {
          p.set(x + s + i, y + s + 7, meat.base);
          p.set(x + s + i, y + s + 8, meat.base);
          p.set(x + s + i, y + s + 9, meat.shade);
          if (state === GRIDDLE_STATE.perfect && hash2(x + i, y, 51) < 0.35) p.set(x + s + i, y + s + 2, '#e09048');
          if (state === GRIDDLE_STATE.burnt && hash2(x + i, y, 53) < 0.25) p.set(x + s + i, y + s + 3, C.ember);
        }
        if (state < GRIDDLE_STATE.over) dots(p, [[x + s + 2, y + s + 2], [x + s + 3, y + s + 2]], WHITE);
      },
    });
  }
}

/** Bubbles of rendered fat along the pork pieces (cooking and PERFETTO only). */
function porkBubbles(r: Raster, state: number, seed: number): void {
  if (state !== GRIDDLE_STATE.cooking && state !== GRIDDLE_STATE.perfect) return;
  for (let k = 0; k < 14; k++) {
    const x = 3 + Math.floor(hash2(k, 0, seed) * (SIZE - 6));
    const y = PIECE_TOP + Math.floor(hash2(k, 1, seed) * (SIZE - 3 - PIECE_TOP));
    if (r.get(x, y) === 0 && r.get(x + 1, y) === 0) {
      r.set(x, y, FAT.foam);
      r.set(x + 1, y, FAT.gold);
    }
  }
}

export function buildGriddleItems(): Raster[] {
  return GRIDDLE_ITEMS.flatMap((id, k) => Array.from({ length: GRIDDLE_STATE.count }, (_, state) => {
    const r = new Raster(SIZE, SIZE);
    const seed = 601 + k * 31;
    const rx = PATTY_R[state];
    if (id === 'manzo' || id === 'vegetale') patty(r, PATTY[id][state], rx, seed);
    else if (id === 'bacon') bacon(r, state);
    else guanciale(r, state);
    inkEdge(r);
    if (id === 'manzo' || id === 'vegetale') fatBubbles(r, PATTY[id][state].bubbles, rx, rx - PATTY_FLAT, seed);
    else porkBubbles(r, state, seed);
    if (state === GRIDDLE_STATE.burnt && (id === 'manzo' || id === 'vegetale')) smokeCurls(r, seed); // strips: the game's smoke is enough
    return r;
  }));
}
