/**
 * KITCHEN.griddleItem (28x28, frame = GRIDDLE_ITEMS index * 5 + GRIDDLE_STATE): what sits on the
 * plancha seen from above, raw -> cooking -> perfect -> over -> burnt. Patties shrink a little as
 * they cook; PERFETTO = rich golden-brown crust with a grill sheen, burnt = charcoal with orange
 * embers. Bacon = streaky wavy strips, guanciale = thick fat-and-meat slices.
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { GRIDDLE_ITEMS, GRIDDLE_STATE } from '../keys';
import { ballLight, dots, inkEdge, piece, specks } from './kit';
import { C, T, WHITE } from './palette';

const SIZE = 28;
const MID = 14;
type Fleck = readonly [string, number];

interface Done {
  tone: Tone;
  /** cooking: the rim already browned, the centre still raw */
  rim?: Tone;
  flecks: readonly Fleck[];
  sheen: boolean;
  line: string;
}

const BURNT: Done = { tone: T.char, flecks: [[C.ash, 0.12], [C.ember, 0.07], [C.emberHot, 0.025]], sheen: false, line: '#0a0606' };
const SEARED: Tone = { light: '#b87448', base: '#94502a', shade: '#6a3218' };

/** [raw, cooking, perfect, over, burnt] of the two patties. */
const PATTY: Readonly<Record<'manzo' | 'vegetale', readonly Done[]>> = {
  manzo: [
    { tone: T.beefRaw, flecks: [[C.marbling, 0.22], [T.beefRaw.shade, 0.1]], sheen: false, line: '#5a1018' },
    { tone: T.beefSeared, rim: SEARED, flecks: [[C.marbling, 0.1]], sheen: false, line: '#3a1408' },
    { tone: T.beefGolden, flecks: [['#6a3014', 0.2], ['#c47a3c', 0.14], ['#e0a060', 0.05]], sheen: true, line: '#2a1206' },
    { tone: T.beef, flecks: [[T.beef.shade, 0.22], [T.beefOver.base, 0.12]], sheen: false, line: '#1a0c04' },
    BURNT,
  ],
  vegetale: [
    { tone: T.veggieRaw, flecks: [[C.pea, 0.12], [C.carrot, 0.1], [C.corn, 0.08]], sheen: false, line: '#2e3410' },
    { tone: T.veggieRaw, rim: T.vegGolden, flecks: [[C.pea, 0.1], [C.carrot, 0.08], [C.corn, 0.06]], sheen: false, line: '#2e3410' },
    { tone: T.vegGolden, flecks: [[T.veggie.shade, 0.14], [C.pea, 0.07], [C.carrot, 0.07], [C.corn, 0.05]], sheen: true, line: '#2a1e08' },
    { tone: T.veggie, flecks: [[T.veggie.shade, 0.22], [C.carrot, 0.04]], sheen: false, line: '#1a1206' },
    BURNT,
  ],
};

/** Fat glistening in the top-left light: a soft crescent plus two hot glints. */
function sheen(p: Raster, m: Mask, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const l = ballLight(x, y, cx, cy, rx, ry);
      if (m.get(x, y) && l > 0.8 && hash2(x, y, 3) < (l > 0.9 ? 0.85 : 0.45)) p.set(x, y, '#f4c286');
    }
  }
  dots(p, [[cx - rx + 4, cy - ry + 3], [cx - rx + 5, cy - ry + 3], [cx - rx + 3, cy - ry + 5]], WHITE);
}

function patty(r: Raster, d: Done, rx: number, seed: number): void {
  const ry = rx - 1;
  piece(r, d.tone, (m) => m.ellipse(MID, MID, rx, ry, 1), {
    line: d.line,
    detail: (p, m) => {
      if (d.rim) {
        for (let y = 0; y < SIZE; y++) {
          for (let x = 0; x < SIZE; x++) {
            const k = Math.hypot((x - MID) / rx, (y - MID) / ry) + (hash2(x, y, seed) - 0.5) * 0.12;
            if (m.get(x, y) && k > 0.6) p.set(x, y, k > 0.84 ? d.rim.shade : d.rim.base);
          }
        }
      }
      d.flecks.forEach(([col, prob], i) => specks(p, m, col, prob, seed + i * 7));
      if (d.sheen) sheen(p, m, MID, MID, rx, ry);
      else if (d.tone !== T.char) dots(p, [[MID - rx + 4, MID - ry + 3]], d.tone.light);
    },
  });
}

/** Pork looks [meat, fat] per state; the strips / slices shrink as they render their fat. */
const PORK: readonly (readonly [Tone, Tone, string])[] = [
  [T.baconRaw, T.fatRaw, '#5a1018'],
  [{ light: '#ec7466', base: '#c84a3c', shade: '#902a22' }, { light: '#fce4c8', base: '#f6cca4', shade: '#dca47c' }, '#4a1410'],
  [T.bacon, T.fat, '#3a1006'],
  [{ light: '#8a3a1c', base: '#642410', shade: '#40160a' }, { light: '#d8a060', base: '#b07a3c', shade: '#7a5024' }, '#200a04'],
  [T.char, { light: '#5a4030', base: '#40281c', shade: '#28180e' }, '#0a0606'],
];

function bacon(r: Raster, state: number): void {
  const [meat, fat, line] = PORK[state];
  const len = 24 - state;
  [5, 12, 19].forEach((y0, i) => {
    const x0 = 2 + Math.round(state / 2) + (i === 1 ? 1 : 0);
    const wave = (x: number): number => y0 + Math.round(Math.sin(x * 0.45 + i * 1.7));
    piece(r, meat, (m) => {
      for (let x = x0; x < x0 + len; x++) for (let k = 0; k < 5; k++) m.set(x, wave(x) + k - 2, 1);
    }, {
      line,
      detail: (p) => {
        for (let x = x0; x < x0 + len; x++) {
          const y = wave(x) - 2;
          p.set(x, y + 1, hash2(x, i, 41) < 0.2 ? fat.shade : fat.base);
          p.set(x, y + 3, hash2(x, i, 43) < 0.25 ? fat.light : fat.base);
          if (state === GRIDDLE_STATE.perfect && hash2(x, i, 47) < 0.18) p.set(x, y + 2, '#ec8a48'); // crisp spots
          if (state === GRIDDLE_STATE.burnt && hash2(x, i, 49) < 0.1) p.set(x, y + 2, C.ember);
        }
        if (state < GRIDDLE_STATE.over) p.set(x0 + 3, wave(x0 + 3) - 2, WHITE);
      },
    });
  });
}

function guanciale(r: Raster, state: number): void {
  const [meat, fat, line] = PORK[state];
  const raw = state === GRIDDLE_STATE.raw;
  const slabFat = raw ? T.guancialeFat : fat;
  const s = state > GRIDDLE_STATE.cooking ? 1 : 0;
  for (const [x, y] of [[3, 4], [11, 3], [19, 4], [4, 15], [12, 16], [20, 15]] as const) {
    piece(r, slabFat, (m) => m.rect(x + s, y + s, 7 - s, 8 - s, 1), {
      line,
      detail: (p) => {
        for (let i = 0; i < 7 - s; i++) {
          p.set(x + s + i, y + 5, meat.base);
          p.set(x + s + i, y + 6, meat.shade);
          if (state === GRIDDLE_STATE.perfect && hash2(x + i, y, 51) < 0.3) p.set(x + s + i, y + 2, '#e09048');
          if (state === GRIDDLE_STATE.burnt && hash2(x + i, y, 53) < 0.2) p.set(x + s + i, y + 2, C.ember);
        }
        if (state < GRIDDLE_STATE.over) p.set(x + s + 1, y + s + 1, WHITE);
      },
    });
  }
}

export function buildGriddleItems(): Raster[] {
  return GRIDDLE_ITEMS.flatMap((id, k) => Array.from({ length: GRIDDLE_STATE.count }, (_, state) => {
    const r = new Raster(SIZE, SIZE);
    if (id === 'manzo' || id === 'vegetale') patty(r, PATTY[id][state], 12 - Math.ceil(state / 2), 601 + k * 31);
    else if (id === 'bacon') bacon(r, state);
    else guanciale(r, state);
    inkEdge(r);
    return r;
  }));
}
