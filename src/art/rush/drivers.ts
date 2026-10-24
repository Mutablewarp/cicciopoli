/**
 * 'rush-drivers' 32x32 x 3 portraits for the driver cards:
 * 0 RIFLESSI DA CICCIO: Ciccio himself, slick black hair and the round black sunglasses of the logo;
 * 1 OCCHIO AL TRAFFICO: a rider in an open helmet with big amber goggles and a scarf;
 * 2 RE DELLE CONSEGNE: a smiling courier with a red delivery cap and a golden crown on top.
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, gridR, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';
import { tones } from './traffic';

const S = 32;
const SKIN = { light: '#ffd8a8', base: RU.skin, shade: RU.skinShade, dark: '#b87448' };

/** Rounded badge background with a lighter top-left. */
function badge(r: Raster, colour: string): void {
  const m = new Mask(S, S);
  m.rect(2, 1, 28, 30, 1);
  m.rect(1, 2, 30, 28, 1);
  paintMask(m, r, { 1: tones(colour) }, { shadeDepth: 2, lightDepth: 2 });
}

function headAndShoulders(r: Raster, shirt: string): void {
  const m = new Mask(S, S);
  m.ellipse(16, 29, 12, 5, 2);
  m.ellipse(16, 16, 9, 10, 1);
  m.rect(13, 24, 6, 3, 1); // neck
  paintMask(m, r, { 1: SKIN, 2: tones(shirt) }, { shadeDepth: 2 });
  rectR(r, 13, 26, 6, 1, shade(shirt));
}

function shade(c: string): string {
  return tones(c).shade;
}

function smile(r: Raster, y: number): void {
  rectR(r, 13, y, 6, 1, RU.lips);
  r.set(12, y - 1, RU.lips);
  r.set(19, y - 1, RU.lips);
}

function ciccio(r: Raster): void {
  badge(r, '#c8282e');
  headAndShoulders(r, RU.white);
  gridR(r, [
    '....kkkkkkkkkk....',
    '..kkkkkkkkkkkkkk..',
    '.kkkkkkkkkkkkkkkkk',
    'kkkkkhhkkkkkkkkkkk',
    'kkkkkkkk.......kkk',
    'kkk............kkk',
    'kk..............kk',
  ], { k: RU.hair, h: '#4a4a56' }, 7, 4);
  rectR(r, 9, 13, 5, 1, RU.hair); // brows
  rectR(r, 18, 13, 5, 1, RU.hair);
  for (const cx of [11, 21]) {
    const g = new Mask(S, S);
    g.ellipse(cx, 17, 3, 3, 1);
    paintMask(g, r, { 1: { light: '#2a2a34', base: RU.hair, shade: RU.hair } });
    r.set(cx - 1, 16, RU.white);
  }
  rectR(r, 14, 17, 4, 1, RU.hair); // bridge
  rectR(r, 7, 17, 1, 1, RU.hair);
  rectR(r, 24, 17, 1, 1, RU.hair);
  r.set(16, 20, RU.skinShade); // nose
  smile(r, 23);
}

function rider(r: Raster): void {
  badge(r, '#2a64c8');
  headAndShoulders(r, '#d83a2e');
  const h = new Mask(S, S);
  h.ellipse(16, 12, 10, 8, 1); // open helmet
  h.rect(6, 12, 3, 9, 1);
  h.rect(23, 12, 3, 9, 1);
  paintMask(h, r, { 1: { light: RU.white, base: '#e8e8e4', shade: '#b4b4b8', dark: '#8a8a90' } }, { shadeDepth: 2 });
  rectR(r, 9, 12, 14, 2, RU.skin);
  rectR(r, 6, 15, 20, 2, '#5a3a22'); // goggle strap
  for (const cx of [12, 20]) {
    const g = new Mask(S, S);
    g.ellipse(cx, 16, 4, 3, 1);
    paintMask(g, r, { 1: { light: '#ffe08a', base: '#f0a020', shade: '#a86410', dark: '#6a3a10' } }, { shadeDepth: 1 });
    r.set(cx - 2, 15, RU.white);
    r.set(cx - 1, 15, '#fff0c0');
  }
  rectR(r, 15, 16, 2, 1, '#5a3a22');
  smile(r, 23);
  rectR(r, 9, 25, 14, 3, '#f2c230'); // scarf
  rectR(r, 9, 25, 14, 1, '#fff0a0');
}

function king(r: Raster): void {
  badge(r, '#e0a020');
  headAndShoulders(r, '#2fa060');
  const c = new Mask(S, S);
  c.ellipse(16, 11, 10, 5, 1); // red delivery cap
  c.rect(6, 11, 20, 3, 1);
  c.rect(14, 13, 13, 2, 2); // visor
  c.poly([[9, 6], [12, 0], [14, 4], [16, -1], [18, 4], [20, 0], [23, 6]], 3); // crown
  paintMask(c, r, {
    1: tones('#d8282e'),
    2: tones('#9a1418'),
    3: { light: '#fff0a0', base: '#f4c430', shade: '#c08a10', dark: '#7a5208' },
  }, { shadeDepth: 1 });
  for (const x of [12, 16, 20]) r.set(x, 2 + (x === 16 ? -1 : 0) + 1, RU.check); // jewels
  rectR(r, 11, 18, 3, 2, RU.hair); // happy eyes
  rectR(r, 19, 18, 3, 2, RU.hair);
  r.set(12, 18, RU.white);
  r.set(20, 18, RU.white);
  rectR(r, 12, 22, 8, 2, RU.hair); // big grin
  rectR(r, 13, 22, 6, 1, RU.white);
}

export function buildDrivers(): Raster[] {
  return [ciccio, rider, king].map((draw) => {
    const r = new Raster(S, S);
    draw(r);
    outlineRaster(r, RU.ink);
    return r;
  });
}
