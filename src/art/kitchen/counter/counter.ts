/**
 * The counter pieces of the BANCONE view, after the owner's POV photo (ref/level7_pov_order.png): the
 * polished flat steel counter top seen from behind it (64x56, seamless; its bottom rows tile on down to
 * the bottom of the screen as more of the same top, never a cabinet front), the black iron pergola beam
 * under the warm concrete soffit with small ring lights hanging from it (64x30 x 2, seamless; frame 1
 * = finale flash) and the La Lumia black till with its receipt (52x40). The lights hang at x = 16 and
 * 48 of every tile and the counter top reflects them at the same x, so tiled together they line up.
 */
import { Raster, hash2, outlineRaster } from '../../hills/raster';
import { bayer, mix } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { drawText, textWidth } from '../../rush/font';
import { KC } from './palette';

const TILE = 64;
const LIGHTS = [16, 48] as const;
/**
 * Soft warm streaks on the steel, as in the photo: x, half width, strength, row of the hottest point,
 * share of it left in the still part. The two strongest mirror the beam's lights (LIGHTS) and carry on
 * down the screen, broad and soft; the faint ones, the room's ring lights farther back, die out before
 * it. Uneven widths, gaps and peaks, so they read as reflections, never as a row of posts.
 */
const STREAKS: readonly (readonly [number, number, number, number, number])[] = [
  [16, 6, 0.85, 17, 0.5], [48, 4.5, 0.6, 23, 0.12], [30, 2.5, 0.3, 12, 0], [58, 3, 0.42, 29, 0.45], [5, 3.5, 0.26, 34, 0],
];
/** first row of the counter top's still part: from here every row depends only on y mod 4 (the dither's
 * period), so the game's 4 tiled bottom rows (52-55) carry the top on down the screen without a seam */
export const STILL_FROM = 44;
/** the steel, warm with the room it mirrors: the dark room right behind the lip, the steel, the sheen
 * of the warm ceiling and its lights; LEVELS close tones along it, so its dither stays fine */
const RAMP = [
  mix(KC.steelDark, KC.brickDark, 0.18),
  mix(KC.steelShade, KC.ceilingDark, 0.35),
  mix(KC.steel, KC.ceiling, 0.4),
  mix(KC.steelLight, KC.ceilingLight, 0.45),
] as const;
const LEVELS = 9;
const STEEL = Array.from({ length: LEVELS }, (_, i) => {
  const t = (i * (RAMP.length - 1)) / (LEVELS - 1);
  const k = Math.min(RAMP.length - 2, Math.floor(t));
  return mix(RAMP[k], RAMP[k + 1], t - k);
});
/** steel level (index into STEEL) of the rows: dark behind the lip, the sheen at SHEEN_ROW, then darker
 * towards the player down to the flat STILL_LEVEL of the still part (no dither left to read as a checker) */
const SHEEN_ROW = 15;
const SHEEN_LEVEL = 7;
const STILL_LEVEL = 3;
/** the streaks' warm light over the steel and their hot core */
const WARM = mix(KC.steelLight, KC.bulbWarm, 0.55);
const HOT = 0.7;
/** heat steps of the streaks' soft edges */
const HEAT_STEPS = 6;

const on = (x: number, y: number, t: number): boolean => t > bayer(x, y);
/** Horizontal distance from x to x0 on the tile (wraps). */
const dist = (x: number, x0: number): number => Math.min(Math.abs(x - x0), TILE - Math.abs(x - x0));
/** Horizontal distance to the nearest light of the tile (wraps). */
const lightDx = (x: number): number => Math.min(...LIGHTS.map((b) => dist(x, b)));

function level(yy: number): number {
  if (yy <= SHEEN_ROW) return (SHEEN_LEVEL * (yy - 3)) / (SHEEN_ROW - 3);
  return SHEEN_LEVEL - ((SHEEN_LEVEL - STILL_LEVEL) * (yy - SHEEN_ROW)) / (STILL_FROM - SHEEN_ROW);
}

/** Heat (0-1) of the warm streaks at (x, yy): faint at the lip, hottest at each streak's peak, then
 * fading to its tail in the still part, widening as they come down. */
function heat(x: number, yy: number): number {
  const fade = (yy - 3) / (STILL_FROM - 3);
  let best = 0;
  for (const [x0, half, strength, peak, tail] of STREAKS) {
    const a = Math.max(0, 1 - dist(x, x0) / (half * (0.8 + 0.9 * fade)));
    const down = yy < peak ? 0.35 + (0.65 * (yy - 3)) / (peak - 3) : 1 - ((1 - tail) * (yy - peak)) / (STILL_FROM - peak);
    best = Math.max(best, strength * down * a * a * (3 - 2 * a));
  }
  return best;
}

/**
 * Bright lip (rows 0-2), the dark room mirrored right behind it, a warm sheen a few rows down, then the
 * wide polished top going darker towards the player, with soft warm streaks of the lights running down
 * it, on into the still rows (STILL_FROM) and the rows the game tiles to the bottom of the screen.
 */
export function buildCounterTop(): Raster {
  const r = new Raster(TILE, 56, true);
  // brushed grain: a few long faint streaks on the upper top (wraps across the tile edge)
  const grain = new Set<number>();
  for (let y = 9; y < STILL_FROM - 6; y += 5) {
    const s = Math.floor(hash2(y, 1, 7) * TILE);
    const len = 10 + Math.floor(hash2(y, 2, 7) * 16);
    for (let i = 0; i < len; i++) if ((s + i + y) % 2 === 0) grain.add(y * TILE + ((s + i) % TILE));
  }
  for (let x = 0; x < TILE; x++) {
    r.set(x, 0, KC.steelDark);
    r.set(x, 1, KC.white);
    r.set(x, 2, KC.steelHi);
    for (let y = 3; y < 56; y++) {
      const yy = Math.min(y, STILL_FROM);
      const u = level(yy);
      const k = Math.min(LEVELS - 2, Math.floor(u));
      let c = on(x, y, u - k) ? STEEL[k + 1] : STEEL[k];
      if (grain.has(y * TILE + x)) c = mix(c, KC.steelHi, 0.25);
      const h = heat(x, yy);
      if (h >= HOT) c = on(x, y, (h - HOT) / (1 - HOT)) ? KC.bulb : WARM;
      else {
        const q = (h / HOT) * HEAT_STEPS;
        c = mix(c, WARM, (Math.floor(q) + (on(x, y, q - Math.floor(q)) ? 1 : 0)) / HEAT_STEPS);
      }
      r.set(x, y, c);
    }
  }
  return r;
}

/** One small ring light hanging from the beam on two wires: a warm ellipse, its glow, a bright rim. */
function ringLight(r: Raster, cx: number, flash: boolean): void {
  const glowR = flash ? 12 : 9;
  for (let y = 16; y < 30; y++) {
    for (let dx = -glowR; dx <= glowR; dx++) {
      const d = Math.hypot(dx / 1.3, (y - 23) * 1.2) / glowR;
      if (d < 1 && on(cx + dx, y, (1 - d) * (flash ? 0.85 : 0.55))) r.set(cx + dx, y, flash ? KC.bulb : KC.bulbGlow);
    }
  }
  r.set(cx - 5, 16, KC.iron);
  r.set(cx + 5, 16, KC.iron);
  for (let y = 17; y < 21; y++) {
    r.set(cx - 5, y, KC.blackHi);
    r.set(cx + 5, y, KC.blackHi);
  }
  for (let i = 0; i < 48; i++) {
    const t = (i / 48) * Math.PI * 2;
    const x = Math.round(cx + Math.cos(t) * 6.5);
    const y = Math.round(23 + Math.sin(t) * 2.4);
    r.set(x, y, Math.sin(t) < 0 ? (flash ? KC.white : KC.bulb) : flash ? KC.bulbCore : KC.ring);
  }
}

/** Pothos trailing from the beam between the lights: a stem and a few heart leaves. */
const POTHOS = ['.ab.', 'abbc', 'bbcd', '.cd.'];
function pothos(r: Raster, x: number, len: number): void {
  const pal: Record<string, string> = { a: KC.leafLight, b: KC.leaf, c: KC.leafShade, d: KC.leafDark };
  for (let k = 0; k < len; k++) r.set(x + (k % 6 < 3 ? 0 : 1), 16 + k, KC.leafDark);
  for (let k = 1; k < len; k += 4) {
    const flip = k % 8 === 1;
    POTHOS.forEach((row, j) => [...row].forEach((ch, i) => {
      if (ch !== '.') r.set(x + (flip ? -4 + (3 - i) : 1 + i), 15 + k + j, pal[ch]);
    }));
  }
}

/**
 * Warm concrete soffit (rows 0-9, the same on every row: the game tiles them up to the top of the
 * screen and hangs the neon on them), the black iron pergola beam (10-15) with a lit top edge and
 * bolts, pothos trailing from it and two ring lights hanging under it (16-29). Frame 1 = flash: bigger,
 * hotter lights and a warm beam edge; the soffit stays the same, since the ceiling above is tiled from frame 0.
 */
export function buildBeam(): Raster[] {
  return [false, true].map((flash) => {
    const r = new Raster(TILE, 30, true);
    for (let x = 0; x < TILE; x++) {
      const c = mix(KC.ceiling, KC.bulb, Math.max(0, 1 - lightDx(x) / 16) * 0.3);
      for (let y = 0; y < 10; y++) r.set(x, y, c);
      r.set(x, 10, flash ? KC.bulbWarm : KC.ironHi);
      for (let y = 11; y < 15; y++) r.set(x, y, y === 11 ? KC.blackLight : KC.iron);
      r.set(x, 15, KC.ink);
    }
    for (const bx of [0, 32]) {
      r.set(bx + 4, 12, KC.blackHi); // bolts
      r.set(bx + 4, 13, KC.ink);
    }
    pothos(r, 1, 9);
    pothos(r, 30, 5);
    pothos(r, 35, 12);
    for (const b of LIGHTS) ringLight(r, b, flash);
    return r;
  });
}

/** Black till from the cook's side: drawer with the CICCIO'S sticker, keypad, display, receipt. */
export function buildRegister(): Raster {
  const r = new Raster(52, 40);
  // receipt curling out of the printer slot (behind the body)
  rectR(r, 9, 3, 9, 13, KC.white);
  rectR(r, 9, 1, 8, 2, KC.white);
  rectR(r, 17, 3, 1, 13, KC.boardLine);
  for (let y = 5; y < 14; y += 2) rectR(r, 11, y, y % 4 === 1 ? 5 : 4, 1, KC.boardLine);
  rectR(r, 9, 0, 6, 1, KC.white);
  // customer display on its post
  rectR(r, 38, 9, 3, 6, KC.blackLight);
  rectR(r, 33, 2, 14, 8, KC.black);
  rectR(r, 34, 3, 12, 5, '#1d3a2c');
  rectR(r, 35, 4, 2, 3, '#7cf0a8');
  rectR(r, 38, 4, 2, 3, '#7cf0a8');
  rectR(r, 41, 6, 1, 1, '#7cf0a8');
  rectR(r, 43, 4, 2, 3, '#7cf0a8');
  rectR(r, 33, 2, 14, 1, KC.blackHi);
  // body with the sloped keypad
  for (let y = 14; y < 26; y++) {
    const inset = Math.max(0, Math.floor((25 - y) / 3));
    rectR(r, 5 + inset, y, 42 - inset * 2, 1, y < 16 ? KC.blackHi : KC.black);
  }
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 6; i++) {
      const x = 11 + i * 5;
      const y = 17 + j * 3;
      rectR(r, x, y, 3, 2, i === 5 && j === 2 ? KC.red : KC.steelShade);
      r.set(x, y, i === 5 && j === 2 ? '#ff7a6a' : KC.steelLight);
    }
  }
  // drawer
  rectR(r, 3, 26, 46, 14, KC.blackLight);
  rectR(r, 3, 26, 46, 1, KC.blackHi);
  rectR(r, 3, 38, 46, 2, KC.black);
  rectR(r, 21, 35, 10, 1, KC.blackHi); // handle
  // CICCIO'S sticker
  const tw = textWidth("CICCIO'S");
  const sx = Math.round(26 - (tw + 4) / 2);
  rectR(r, sx, 28, tw + 4, 7, KC.white);
  rectR(r, sx, 34, tw + 4, 1, KC.steelLight);
  drawText(r, "CICCIO'S", sx + 2, 29, KC.ink);
  outlineRaster(r, KC.ink);
  return r;
}
