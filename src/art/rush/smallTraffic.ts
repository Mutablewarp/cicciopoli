/**
 * The small Palermo traffic, top-down facing UP: the Vespa-style scooter with its rider (2-frame
 * wobble), the three-wheeler Ape car loaded with lemon and orange crates (2-frame wobble) and the
 * amber blinker overlay that sits on the 24x40 city cars (frame 0 off, 1 on).
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { tones } from './traffic';

const VESPA = '#f0e2b0';
const JACKET = '#3a5ad0';
const APE = '#8cbcd8';

/** 12x24 scooter + rider; `lean` shifts the front (wobble). */
function scooter(lean: number): Raster {
  const r = new Raster(12, 24);
  const m = new Mask(12, 24);
  m.ellipse(6, 18, 3, 4, 1); // rear cowl
  m.rect(4, 6, 5, 9, 1); // footboard
  m.ellipse(6 + lean, 5, 3, 2, 1); // front shield
  paintMask(m, r, { 1: tones(VESPA) }, { shadeDepth: 1 });
  rectR(r, 1 + lean, 3, 10, 1, RU.rim); // handlebar + mirrors
  r.set(1 + lean, 2, RU.rimLight);
  r.set(10 + lean, 2, RU.rimLight);
  rectR(r, 6 + lean, 0, 1, 2, RU.tyre);
  rectR(r, 6, 22, 1, 2, RU.tyre);
  r.set(6, 21, RU.check); // tail light
  // rider: blue jacket, arms to the grips, white helmet with a dark visor
  const p = new Mask(12, 24);
  p.ellipse(6, 13, 4, 3, 1);
  p.ellipse(6 + Math.sign(lean), 10, 3, 3, 2);
  paintMask(p, r, { 1: tones(JACKET), 2: { light: RU.white, base: RU.whiteShade, shade: RU.rim } }, { shadeDepth: 1 });
  rectR(r, 5 + Math.sign(lean), 8, 3, 1, RU.glassDark);
  rectR(r, 2 + lean, 4, 2, 7, JACKET);
  rectR(r, 8 + lean, 4, 2, 7, JACKET);
  outlineRaster(r, RU.ink);
  return r;
}

export function buildScooter(): Raster[] {
  return [scooter(0), scooter(1)];
}

/** 20x32 Ape: one front wheel, small cab, cargo bed with crates of lemons and oranges. */
function ape(wobble: number): Raster {
  const r = new Raster(20, 32);
  const m = new Mask(20, 32);
  m.ellipse(10 + wobble, 6, 6, 5, 1); // rounded cab
  m.rect(4 + wobble, 6, 13, 6, 1);
  m.rect(3, 13, 14, 15, 2); // cargo bed
  paintMask(m, r, { 1: tones(APE), 2: { light: '#b89068', base: '#9a7450', shade: '#704e32' } }, { shadeDepth: 1 });
  rectR(r, 6 + wobble, 3, 9, 3, RU.glass); // windscreen
  rectR(r, 6 + wobble, 3, 9, 1, RU.glassLight);
  rectR(r, 10 + wobble, 0, 1, 2, RU.tyre); // the single front wheel
  for (const [x, y, fruit, light] of [[4, 14, '#f4d83a', '#fff2a0'], [10, 14, '#f08a1c', '#ffc070'], [4, 21, '#f08a1c', '#ffc070'], [10, 21, '#f4d83a', '#fff2a0']] as const) {
    rectR(r, x, y, 6, 6, '#5a3c22'); // crate
    rectR(r, x + 1, y + 1, 4, 4, fruit);
    r.set(x + 1, y + 1, light);
    r.set(x + 3, y + 2, light);
    r.set(x + 2, y + 4, '#5a3c22');
  }
  rectR(r, 3, 28, 14, 2, '#704e32'); // tailgate
  rectR(r, 3, 28, 2, 1, RU.check);
  rectR(r, 15, 28, 2, 1, RU.check);
  rectR(r, 1, 24, 2, 4, RU.tyre); // rear wheels
  rectR(r, 17, 24, 2, 4, RU.tyre);
  outlineRaster(r, RU.ink);
  return r;
}

export function buildApe(): Raster[] {
  return [ape(0), ape(1)];
}

/** Amber indicators at the four corners of the 24x40 city car (body x 3..20, y 1..38). */
export function buildBlinker(): Raster[] {
  return [false, true].map((on) => {
    const r = new Raster(24, 40);
    for (const [x, y] of [[3, 2], [19, 2], [3, 34], [19, 34]] as const) {
      rectR(r, x, y, 2, 2, on ? RU.amber : RU.amberOff);
      if (!on) continue;
      r.set(x + (x < 10 ? 0 : 1), y + (y < 10 ? 0 : 1), RU.amberHot);
      const gx = x < 10 ? x - 2 : x + 3;
      rectR(r, gx, y, 1, 2, RU.amber); // glow spilling past the body
      r.set(x + (x < 10 ? 0 : 1), y < 10 ? y - 1 : y + 2, RU.amber);
    }
    return r;
  });
}
