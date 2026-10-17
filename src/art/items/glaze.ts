/**
 * Thai-glazed chicken wings: the `thai` pickup (two crossed drumettes) and the
 * giant wing `club` held by Ciccio (grip at (5,19), meaty bulb up-right).
 */
import { PAL, rng } from '../pixel';
import { Raster, diag } from './raster';
import { Mask, capsule, disc, shadeMask, type Tones } from './shapes';
import { shineCycle } from './food';

const GLAZE: Tones & { hi: string; rim: string } = {
  hi: '#ffe6c0',
  rim: '#fca060',
  light: '#f86a30',
  base: '#e03c18',
  dark: '#a8200c',
  deep: '#701006',
};
const GLAZE_BACK: Tones = { rim: '#e06a3a', light: '#d24a22', base: '#b82c12', dark: '#82180a', deep: '#5a0c04' };
const BONE: Tones = { light: '#fffaf0', base: '#f0e2c4', dark: '#c8b490' };
const TOPPING = { sesame: '#fff2cc', chili: '#5a0804', chiliRed: '#fc3010', scallion: '#7ad83a', scallionDark: '#3a9a18' };

type Pt = readonly [number, number];

interface Drumette {
  bulb: Pt;
  end: Pt;
  rBulb: number;
  rEnd: number;
  knob: Pt;
}

/** Glazed meat + bone knob, outlined on its own layer so overlaps keep a dark seam. */
function drumetteLayer(w: number, h: number, d: Drumette, tones: Tones): Raster {
  const r = new Raster(w, h);
  const shaft = capsule(d.end[0], d.end[1], d.knob[0], d.knob[1], 1, 1.2);
  const knob = disc(d.knob[0], d.knob[1], 1.5);
  shadeMask(r, Mask.of(w, h, (x, y) => shaft(x, y) || knob(x, y)), BONE);
  const meat = Mask.of(w, h, capsule(d.bulb[0], d.bulb[1], d.end[0], d.end[1], d.rBulb, d.rEnd));
  shadeMask(r, meat, tones);
  r.outline(PAL.ink);
  return r;
}

/** Sesame seeds, chili flakes and scallion bits at fixed spots (readable at 1x). */
function toppings(r: Raster, spots: readonly (readonly [number, number, keyof typeof TOPPING])[]): void {
  for (const [x, y, k] of spots) if (r.alpha(x, y) > 0 && !r.is(x, y, PAL.ink)) r.set(x, y, TOPPING[k]);
}

/* ------------------------------------------------------------- pickup */

export function thaiFrames(): Raster[] {
  const back = drumetteLayer(16, 16, { bulb: [4.8, 5.2], end: [10.6, 10.8], rBulb: 3.5, rEnd: 1.7, knob: [12.8, 13] }, GLAZE_BACK);
  const front = drumetteLayer(16, 16, { bulb: [11, 5.4], end: [5.4, 10.8], rBulb: 3.9, rEnd: 1.9, knob: [3.2, 13] }, GLAZE);
  const base = back.clone();
  base.draw(front);
  // glossy glaze streaks on the lit side of each bulb, then sparse toppings
  for (const [x, y] of [[9, 3], [10, 2], [8, 4], [3, 3], [3, 4]] as const) base.set(x, y, GLAZE.hi);
  toppings(base, [[12, 4, 'sesame'], [10, 7, 'sesame'], [5, 6, 'sesame'], [13, 6, 'chili'], [7, 8, 'chili'], [11, 8, 'scallion'], [4, 5, 'scallion']]);
  return shineCycle(base, [[], diag(8, 7, 2), diag(10, 6, 3), diag(12, 4, 2)], PAL.ink, 0.6);
}

/* --------------------------------------------------------------- club */

export function clubFrames(): Raster[] {
  const W = 24;
  const r = new Raster(W, W);
  // bone handle: shaft from the meat down-left to the condyles; grip (5,19) sits on it
  const shaft = capsule(9.5, 14.5, 3.8, 20.2, 1.3, 1.3);
  const condyles = [disc(2.6, 19.6, 1.6), disc(4.4, 21.5, 1.6)];
  const bone = Mask.of(W, W, (x, y) => shaft(x, y) || condyles.some((c) => c(x, y)));
  shadeMask(r, bone, BONE);
  // meat: big glazed bulb up-right tapering into the bone
  const meatShape = capsule(16, 7.6, 9.6, 14.4, 6.6, 3);
  const meat = Mask.of(W, W, (x, y) => meatShape(x, y) || disc(18.4, 6, 4.6)(x, y));
  meat.roughen(rng(7), 0.08, 0.04);
  shadeMask(r, meat, GLAZE);
  r.outline(PAL.ink);
  // glaze gloss: two long highlight streaks + caramelised spots, toppings
  for (const [x, y] of [...diag(11, 11, 3), ...diag(14, 5, 3), [15, 2], [16, 2]] as const) r.set(x, y, GLAZE.hi);
  for (const [x, y] of [...diag(12, 11, 2), ...diag(15, 5, 2)] as const) r.set(x, y, GLAZE.rim);
  toppings(r, [
    [18, 6, 'sesame'], [14, 9, 'sesame'], [20, 9, 'sesame'], [12, 13, 'sesame'],
    [17, 9, 'chili'], [21, 6, 'chili'], [14, 12, 'chiliRed'],
    [19, 4, 'scallion'], [16, 12, 'scallionDark'],
  ]);
  return [r];
}
