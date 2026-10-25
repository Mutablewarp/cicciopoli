/**
 * The golden award of a 3-star shift: the golden burger trophy on its black pedestal with the small
 * CICCIO'S plate (96x96 x 4, a shine sweeping across frames 1-3, frame 0 at rest), the radial gold
 * rays behind it (160x160), confetti bits (4x6 x 6) and the rating star (16x16 x 2: empty, full).
 */
import { Mask, paintMask, type Tone } from '../../hills/mask';
import { Raster, outlineRaster, packColor } from '../../hills/raster';
import { bayer } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { drawText, textWidth } from '../../rush/font';
import { sparkle } from './goldText';
import { KC } from './palette';

const GOLD: Tone = { light: KC.goldLight, base: KC.gold, shade: KC.goldShade, dark: KC.goldDark };
const GOLD_DEEP: Tone = { light: KC.gold, base: KC.goldShade, shade: KC.goldDark, dark: KC.goldDeep };
const GOLD_PALE: Tone = { light: KC.goldHi, base: KC.goldLight, shade: KC.gold };

/** Five-point star polygon centred on (cx, cy). */
function starPts(cx: number, cy: number, ro: number, ri: number): [number, number][] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? ro : ri;
    return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad] as [number, number];
  });
}

export function buildStar(): Raster[] {
  return [false, true].map((full) => {
    const r = new Raster(16, 16);
    const m = new Mask(16, 16);
    m.poly(starPts(8, 8.6, 7.6, 3.3), 1);
    paintMask(m, r, { 1: full ? GOLD : { light: '#5a5a66', base: '#3c3c46', shade: '#2c2c34' } }, { shadeDepth: 1 });
    if (full) {
      r.set(6, 6, KC.goldHi);
      r.set(7, 5, KC.goldHi);
    }
    outlineRaster(r, KC.ink);
    return r;
  });
}

/** gold, white, red, black, pink, cream: [light, base, shade]. */
const CONFETTI = [
  [KC.goldHi, KC.gold, KC.goldShade],
  [KC.white, '#ecece6', '#c8c8c2'],
  ['#ff6a5a', KC.red, '#98141a'],
  ['#55555f', '#2a2a30', '#141418'],
  ['#ffb0d0', KC.pink, '#c84a80'],
  [KC.white, KC.cream, '#d8b890'],
] as const;

export function buildConfetti(): Raster[] {
  return CONFETTI.map(([light, base, dark]) => {
    const r = new Raster(4, 6);
    rectR(r, 0, 0, 4, 6, base);
    rectR(r, 0, 0, 4, 1, light);
    rectR(r, 0, 0, 1, 6, light);
    rectR(r, 3, 1, 1, 5, dark);
    return r;
  });
}

/** 12 wedges of light fading outwards by dither (the game spins and fades the sprite). */
export function buildGoldRays(): Raster {
  const r = new Raster(160, 160);
  for (let y = 0; y < 160; y++) {
    for (let x = 0; x < 160; x++) {
      const dx = x + 0.5 - 80;
      const dy = y + 0.5 - 80;
      const d = Math.hypot(dx, dy);
      const a = ((Math.atan2(dy, dx) / (Math.PI * 2)) * 12 + 12) % 1; // 0..1 inside each 30° sector
      if (a > 0.46 || d > 80) continue;
      const fade = d < 26 ? 1 : 1 - (d - 26) / 54;
      if (fade <= bayer(x, y)) continue;
      const core = Math.abs(a - 0.23) < 0.08;
      r.set(x, y, core && d < 60 ? KC.goldHi : d < 40 ? KC.goldLight : KC.gold);
    }
  }
  return r;
}

/** Gold burger (top bun with seeds, cheese drips, patty, lettuce, bottom bun) on its stem. */
function trophy(): Raster {
  const r = new Raster(96, 96);
  const m = new Mask(96, 96);
  m.ellipse(48, 66, 13, 3, 6); // foot
  m.poly([[42, 56], [54, 56], [52, 66], [44, 66]], 6); // stem
  m.ellipse(48, 52, 27, 5, 1); // bottom bun
  m.rect(21, 46, 55, 6, 1);
  m.ellipse(48, 42, 31, 5, 2); // patty
  m.ellipse(48, 36, 30, 4, 3); // lettuce
  m.ellipse(48, 31, 28, 18, 4); // top bun dome
  m.rect(19, 31, 59, 6, 4);
  paintMask(m, r, { 1: GOLD, 2: GOLD_DEEP, 3: GOLD_PALE, 4: GOLD, 6: GOLD_DEEP }, { shadeDepth: 2 });
  // lettuce frills and cheese drips over the patty
  for (let x = 20; x < 77; x++) if (x % 5 < 2) r.set(x, 40, KC.goldLight);
  for (const [x, len] of [[26, 4], [37, 6], [52, 3], [63, 5], [71, 3]] as const) {
    rectR(r, x, 39, 4, len, KC.goldHi);
    rectR(r, x + 3, 40, 1, len - 1, KC.goldLight);
  }
  // sesame seeds + big highlight on the dome
  for (const [x, y] of [[34, 22], [44, 18], [56, 19], [64, 25], [40, 28], [52, 26], [29, 29], [68, 31]] as const) {
    rectR(r, x, y, 2, 1, KC.goldHi);
    r.set(x, y + 1, KC.goldShade);
  }
  rectR(r, 30, 17, 5, 2, KC.goldHi);
  rectR(r, 28, 19, 2, 3, KC.goldHi);
  outlineRaster(r, KC.goldDeep);
  return r;
}

/** Black pedestal with gold trims and the small CICCIO'S plate. */
function pedestal(r: Raster): void {
  rectR(r, 22, 69, 52, 25, KC.black);
  rectR(r, 22, 69, 52, 2, KC.blackHi);
  rectR(r, 22, 71, 52, 1, KC.gold);
  rectR(r, 22, 91, 52, 1, KC.goldShade);
  rectR(r, 22, 72, 2, 19, KC.blackLight);
  const tw = textWidth("CICCIO'S");
  const px = Math.round(48 - (tw + 6) / 2);
  rectR(r, px, 77, tw + 6, 10, KC.goldShade);
  rectR(r, px, 77, tw + 5, 9, KC.goldLight);
  rectR(r, px + 1, 78, tw + 4, 8, KC.gold);
  drawText(r, "CICCIO'S", px + 3, 80, KC.goldDeep);
}

const SHINE = [-999, 14, 36, 58] as const;
const TWINKLE: readonly (readonly [number, number, number, number])[] = [
  [12, 14, 0, 2], [84, 20, 1, 3], [8, 50, 2, 2], [88, 56, 3, 2], [20, 4, 2, 1], [76, 6, 0, 1],
];

export function buildGoldenBurger(): Raster[] {
  const base = trophy();
  const edge = packColor(KC.goldDeep);
  const shine = packColor(KC.goldHi);
  return SHINE.map((s, f) => {
    const r = new Raster(96, 96);
    pedestal(r);
    r.blit(base, 0, 0);
    // diagonal shine band sweeping left to right over the gold
    r.map((c, x, y) => (y < 68 && c !== edge && base.get(x, y) !== 0 && x - y * 0.5 >= s && x - y * 0.5 < s + 5 ? shine : c));
    outlineRaster(r, KC.ink);
    for (const [x, y, frame, len] of TWINKLE) if (frame === f || (frame + 2) % 4 === f) sparkle(r, x, y, frame === f ? len : 1);
    return r;
  });
}
