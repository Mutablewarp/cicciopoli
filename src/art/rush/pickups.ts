/**
 * 'rush-pickups' 20x20 x 6, food from the Ciccio's menu, each readable by shape AND colour:
 * 0 nuggets (shield: three golden nuggets), 1 waffle fries (radar: a lattice disc), 2 chicken pop
 * corn (sprint: striped cup heaped with bites), 3 cheddar slice (grip: orange square with a drip),
 * 4 PROPULSORE (a red-white rocket booster in its crate), 5 fries tray (score).
 */
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, hash2, outlineRaster } from '../hills/raster';
import { rectR } from '../rampage/draw';
import { RU } from './colors';

const GOLD: Tone = { light: RU.goldLight, base: RU.gold, shade: RU.goldShade, dark: RU.goldDark };
const CHEDDAR: Tone = { light: RU.cheddarLight, base: RU.cheddar, shade: RU.cheddarShade };
const SIZE = 20;

function crumbs(r: Raster, m: Mask, id: number, seed: number): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (m.get(x, y) !== id || m.get(x + 1, y) !== id || m.get(x, y + 1) !== id) continue;
      const h = hash2(x, y, seed);
      if (h < 0.12) r.set(x, y, RU.goldDark);
      else if (h > 0.9) r.set(x, y, RU.goldLight);
    }
  }
}

function nuggets(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  m.ellipse(6, 12, 5, 4, 1);
  m.ellipse(14, 12, 5, 4, 1);
  m.ellipse(10, 6, 5, 4, 1);
  paintMask(m, r, { 1: GOLD }, { shadeDepth: 1 });
  crumbs(r, m, 1, 31);
  for (const [x, y] of [[8, 4], [4, 10], [12, 10]] as const) r.set(x, y, RU.white);
}

function waffle(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  m.ellipse(10, 10, 8, 7, 1);
  paintMask(m, r, { 1: GOLD }, { shadeDepth: 1 });
  // the criss-cross lattice: square holes on a 4 px grid, kept off the rim
  for (let y = 4; y < 17; y += 4) {
    for (let x = 4; x < 17; x += 4) if (m.get(x - 1, y - 1) && m.get(x + 2, y + 2)) rectR(r, x, y, 2, 2, RU.goldDark);
  }
  r.set(6, 4, RU.white);
  r.set(7, 4, RU.goldLight);
}

function popcorn(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  m.poly([[4, 9], [16, 9], [14, 19], [6, 19]], 1); // cup
  for (const [x, y] of [[6, 7], [10, 5], [14, 7], [8, 9], [12, 9], [9, 3], [13, 4], [5, 4]] as const) m.ellipse(x, y, 2, 2, 2);
  paintMask(m, r, { 1: { light: RU.white, base: RU.white, shade: RU.whiteShade }, 2: GOLD }, { shadeDepth: 1 });
  for (let x = 5; x < 16; x += 3) for (let y = 10; y < 19; y++) if (m.get(x, y) === 1) r.set(x, y, RU.check);
  rectR(r, 5, 10, 11, 1, RU.checkDark);
  crumbs(r, m, 2, 47);
}

function cheddar(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  m.poly([[3, 4], [17, 3], [17, 15], [3, 16]], 1);
  m.rect(12, 15, 3, 3, 1); // melted drip
  m.ellipse(13, 18, 1, 1, 1);
  paintMask(m, r, { 1: CHEDDAR }, { shadeDepth: 1 });
  for (const [x, y] of [[6, 7], [12, 6], [8, 12]] as const) rectR(r, x, y, 2, 2, RU.cheddarShade);
  rectR(r, 4, 5, 5, 1, RU.cheddarLight);
  r.set(5, 6, RU.white);
}

function booster(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  m.rect(2, 11, 16, 8, 1); // crate
  m.rect(8, 3, 5, 12, 2); // rocket body
  m.ellipse(10, 3, 2, 2, 3); // red nose
  m.rect(6, 10, 2, 4, 3); // fins
  m.rect(13, 10, 2, 4, 3);
  paintMask(m, r, {
    1: { light: '#c8925a', base: '#a06e3e', shade: '#744c28' },
    2: { light: RU.white, base: RU.white, shade: RU.whiteShade },
    3: { light: RU.checkLight, base: RU.check, shade: RU.checkDark },
  }, { shadeDepth: 1 });
  rectR(r, 8, 6, 5, 1, RU.check);
  rectR(r, 8, 9, 5, 1, RU.check);
  for (let x = 3; x < 18; x += 2) rectR(r, x, 15, 1, 3, x % 4 === 1 ? RU.ink : RU.flameYellow); // hazard stripe
  rectR(r, 2, 14, 16, 1, '#744c28');
}

function fries(r: Raster): void {
  const m = new Mask(SIZE, SIZE);
  for (const [x, top] of [[5, 3], [7, 1], [9, 4], [11, 2], [13, 3], [15, 5], [6, 6], [12, 5]] as const) m.rect(x, top, 2, 9 - top + 3, 2);
  m.poly([[3, 9], [17, 9], [16, 19], [4, 19]], 1); // red tray box
  paintMask(m, r, {
    1: { light: RU.checkLight, base: RU.check, shade: RU.checkDark },
    2: { light: RU.goldLight, base: RU.gold, shade: RU.goldShade },
  }, { shadeDepth: 1 });
  rectR(r, 7, 12, 6, 5, RU.white); // white label with the face mark
  rectR(r, 8, 13, 4, 1, RU.ink);
  rectR(r, 8, 14, 1, 1, RU.ink);
  rectR(r, 11, 14, 1, 1, RU.ink);
}

export function buildPickups(): Raster[] {
  return [nuggets, waffle, popcorn, cheddar, booster, fries].map((draw) => {
    const r = new Raster(SIZE, SIZE);
    draw(r);
    outlineRaster(r, RU.ink);
    return r;
  });
}
