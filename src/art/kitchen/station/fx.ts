/**
 * Kitchen fx sheets: grey smoke puff of a burning item (16x16 x4), the white steam wisp of hot food
 * (16x24 x4), grease sizzle pops (16x12 x4),
 * the gold PERFETTO sparkle (12x12 x4) and the white-glove tutorial hand (20x22: 0 hover, 1 press;
 * the fingertip is the hot spot, at POINTER_TIP in frame 0).
 */
import { Mask, paintMask } from '../../hills/mask';
import { Raster, gridR, hash2, outlineRaster } from '../../hills/raster';
import { ST } from './colors';

/** Puffs in the rising column at once; each frame they climb 1/(4 * PUFF_COUNT) of the way, so the
 * 4-frame loop hands every puff on to the next one's place. */
const PUFF_COUNT = 3;

const SMOKE = { light: ST.smokeHi, base: ST.smokeLight, shade: ST.smoke };

/** A continuous plume, full at every frame (a burning item must read from across the kitchen):
 * small puffs born at the bottom, swelling and swaying as they rise, the oldest at the top; each
 * puff has its own lit rim so the column billows. Painted top (oldest) first, young puffs in front. */
export function buildSmoke(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(16, 16);
    for (let k = PUFF_COUNT - 1; k >= 0; k--) {
      const p = (f + 4 * k) / (4 * PUFF_COUNT); // 0 = just born, close to 1 = about to leave
      const m = new Mask(16, 16);
      const rad = 2.2 + p * 3.4;
      const cx = 8 + Math.sin(p * 2 * Math.PI) * 1.6;
      const cy = 13 - p * 8.6;
      const side = k % 2 === 0 ? 1 : -1; // a side lobe, alternating, so each puff is a cloud, not a ball
      m.ellipse(Math.round(cx + side * rad * 0.8), Math.round(cy + rad * 0.3), rad * 0.65, rad * 0.65, 1);
      m.ellipse(Math.round(cx), Math.round(cy), rad, rad, 1);
      paintMask(m, r, { 1: SMOKE }, { shadeDepth: 1 });
    }
    r.set(8, 15, ST.smoke); // the plume's root on the burning item
    outlineRaster(r, ST.smokeShade);
    return r;
  });
}

/** Steam loop: puffs born STEAM_GAP rows apart climb a quarter of the gap per frame, so the 4-frame loop
 * hands every puff on to the next one's place (a bigger step would read as the column sliding back). */
const STEAM_H = 24;
const STEAM_GAP = 8;
const STEAM_STEP = STEAM_GAP / 4;
/** Puff radius (art px) when born on the food and when it leaves the top: a fist of steam swelling into a cloud. */
const STEAM_R0 = 2.8;
const STEAM_R1 = 6.5;
/** Rows a puff climbs per row of `rise` (it swells as it goes, so it must not leave the frame too soon). */
const RISE = 0.72;
/** Rows at the top of the frame where the steam frays away. */
const STEAM_FRAY = 12;

/** White steam cloud rising (16x24 x4), big enough to read over the black iron at a glance: a column of
 * round puffs, each with a swinging side lobe, that swell, sway and thin out as they climb (oldest at the top,
 * painted first, so every younger puff's grey rim shows where it overlaps). Bright white faces, a pale
 * grey rim only on the far (bottom-right) side; the top frays away (fray). */
export function buildSteam(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(16, STEAM_H);
    for (let k = STEAM_H / STEAM_GAP - 1; k >= 0; k--) {
      const rise = (k * STEAM_GAP + f * STEAM_STEP) % STEAM_H;
      const p = rise / STEAM_H; // 0 = just born on the food, close to 1 = leaving the frame
      const rad = STEAM_R0 + p * (STEAM_R1 - STEAM_R0);
      const cx = 8 + Math.sin(p * 2 * Math.PI + 0.5) * 1.8 * p;
      const cy = STEAM_H - 1 - STEAM_R0 - rise * RISE;
      // the side lobe swings round as the puff climbs (a function of p: no jump when the loop hands it on)
      const lobes = [[cx, cy, rad], [cx + Math.sin(p * 3 * Math.PI + 0.8) * rad * 0.55, cy + rad * 0.25, rad * 0.62]] as const;
      for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) {
        for (let x = 0; x < 16; x++) {
          // distance to the nearest lobe edge (0 = centre, 1 = rim) and the light side of that lobe
          let d = 2;
          let far = 0;
          for (const [lx, ly, lr] of lobes) {
            const dl = Math.hypot(x + 0.5 - lx, (y + 0.5 - ly) * 1.1) / lr;
            if (dl < d) [d, far] = [dl, (x + 0.5 - lx + (y + 0.5 - ly)) / lr];
          }
          if (d > 1) continue;
          r.set(x, y, d > 0.5 && far > 0.45 ? ST.steamShade : far > 0 ? ST.steam : ST.steamHi);
        }
      }
    }
    fray(r, Math.round(f * STEAM_STEP * RISE));
    return r;
  });
}

/** The top STEAM_FRAY rows thin out: edge pixels fray away, more near the top, in a pattern that rises with
 * the steam (`drift` rows). Only the edge, two pixels deep: never holes inside (they read as eyes). */
function fray(r: Raster, drift: number): void {
  for (let pass = 0; pass < 2; pass++) {
    const src = r.px.slice();
    const clear = (x: number, y: number): boolean => x < 0 || x >= r.w || y < 0 || src[y * r.w + x] === 0;
    for (let y = 0; y < STEAM_FRAY; y++) {
      for (let x = 0; x < r.w; x++) {
        const edge = clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1);
        if (src[y * r.w + x] !== 0 && edge && hash2(x, y + drift, pass + 41) < (1 - y / STEAM_FRAY) * 0.8) r.set(x, y, null);
      }
    }
  }
}

/** [x, y, kind] grease bits per frame: 0 = flying drop (white head, warm tail), 1 = pop (warm cross). */
const SIZZLE = [
  [[5, 9, 1], [11, 10, 0], [8, 8, 0]],
  [[4, 6, 0], [12, 7, 0], [8, 4, 0], [10, 10, 1]],
  [[3, 3, 0], [13, 4, 0], [7, 2, 0], [5, 9, 1]],
  [[2, 2, 0], [14, 2, 0], [11, 9, 1], [7, 10, 0]],
] as const;

export function buildSizzle(): Raster[] {
  return SIZZLE.map((bits) => {
    const r = new Raster(16, 12);
    for (const [x, y, kind] of bits) {
      if (kind === 0) {
        r.set(x, y, ST.spark);
        r.set(x, y + 1, ST.sparkWarm);
      } else {
        for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) r.set(x + dx, y + dy, ST.sparkWarm);
        r.set(x, y, ST.spark);
      }
    }
    return r;
  });
}

/** [arm length, diagonal length, centre colour] per frame: dot, small star, full burst, fading glints. */
const SPARKLE = [[1, 0], [3, 1], [5, 2], [2, 0]] as const;

export function buildSparkle(): Raster[] {
  return SPARKLE.map(([arm, diag], f) => {
    const r = new Raster(12, 12);
    const c = 6;
    for (let k = 1; k <= arm; k++) {
      const col = k === arm ? ST.gold : ST.goldLight;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) r.set(c + dx * k, c + dy * k, col);
    }
    for (let k = 1; k <= diag; k++) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) r.set(c + dx * k, c + dy * k, ST.gold);
    r.set(c, c, f === 3 ? ST.goldLight : ST.spark);
    if (f === 3) for (const [x, y] of [[2, 2], [9, 3], [3, 9], [9, 9]] as const) r.set(x, y, ST.goldLight); // fading glints
    outlineRaster(r, ST.goldDark);
    return r;
  });
}

/** Where the fingertip points in frame 0 (press frame: the finger squashes, tip 3 px lower, tap marks). */
export const POINTER_TIP = { x: 7, y: 0 } as const;

const HAND = [
  '......kkk..........',
  '.....kwwsk.........',
  '.....kwwsk.........',
  '.....kwwsk.........',
  '.....kwwskkkk......',
  '.....kwwskwwskkk...',
  '.....kwwskwwskwwsk.',
  '..kkkkwwskwwskwwsk.',
  '.kwwwkwwwwwswwwwsk.',
  '.kwwwwwwwwwwwwwwsk.',
  '.kswwwwwwswwswwwsk.',
  '..kswwwwwswwswwssk.',
  '..kwwwwwwswwswssk..',
  '...kwwwwwwwwwssk...',
  '...kswwwwwwwsssk...',
  '....kkkkkkkkkkk....',
  '....kwwwwwwwwsk....',
  '....kddddddddsk....',
  '....kkkkkkkkkkk....',
];

/** Tap marks round the fingertip of the press frame. */
const TAP = [[3, 1], [4, 2], [11, 1], [10, 2], [2, 4]] as const;

export function buildPointer(): Raster[] {
  const pal = { k: ST.ink, w: ST.glove, s: ST.gloveShade, d: ST.gloveDark };
  const hover = new Raster(20, 22);
  gridR(hover, HAND, pal, 0, 0);
  const press = new Raster(20, 22);
  gridR(press, HAND.slice(1), pal, 0, 3);
  for (const [x, y] of TAP) press.set(x, y, ST.ink);
  return [hover, press];
}
