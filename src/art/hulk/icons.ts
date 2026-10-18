/**
 * Hero head images: a 16x16 HUD icon (hand-drawn grid: three-tuft quiff, two separate round lenses, a small smirk)
 * and a 64x64 front-view portrait. The portrait skin and hair are sculpted with the zbuf lit ellipsoids (same lime
 * ramp and same three-tuft quiff as the sprite): a thick neck, wide trapezius and a broad jaw; lenses, angled brows
 * and the smirk are drawn on top.
 */
import { C } from '../ciccio/palette';
import { grid, Raster, stamp } from '../ciccio/raster';
import { fillPoly } from './fx/poly';
import { FRAME, toImg } from './img';
import { GREEN, HEAD_PAL, INK, M } from './palette';
import { LAYER } from './rig';
import { capsule, ellipsoid, profile, resolve, type Prim, type ProfileKey } from './zbuf';

/* ---------------------------------------------------------------- icon */
const ICON: readonly string[] = [
  '...R...R...R..',
  '..Rhh.Rhh.Rhh.',
  '.RhhhhHhhhhhh.',
  '.RhHhhhhHhhhh.',
  '..csssssssssS.',
  '.csggssssggsS.',
  '.cgwgssssgwgS.',
  '.cggggssggggS.',
  '.csggssssggsS.',
  '..csssssssssS.',
  '..cssmmmmssS..',
  '...cssttmssS..',
  '....cSSSSsS...',
  '.....csssS....',
];

export function headIcon(): Raster {
  const face = new Raster(14, 14);
  grid(face, ICON, HEAD_PAL, 0, 0);
  const out = new Raster(16, 16);
  const shifted = new Raster(16, 16);
  face.px.forEach((c, i) => {
    if (c !== null) shifted.set((i % 14) + 1, Math.floor(i / 14) + 1, c);
  });
  stamp(out, shifted, INK);
  return out;
}

/* ------------------------------------------------------------ portrait */
const P = FRAME;

/** Half widths of the head, crown to chin: a broad, rounded jaw with a flat chin and no steps (one smooth surface, no stacked rolls). */
const HEAD: readonly ProfileKey[] = [
  [8, 5], [11, 11], [14, 15.4], [19, 17.4], [26, 18], [33, 18], [40, 17.4], [45, 16.2], [49.5, 14.2], [53, 11.2], [55.6, 8], [57.4, 4.6],
];

function portraitPrims(): Prim[] {
  const skin = M.skin;
  const face = M.face;
  const hair = M.hair;
  const top = LAYER.head + 1;
  // hairline over the forehead, sideburns trimmed to the ear
  const inHair = (x: number, y: number): boolean => y < 19 - (x - 14) * 0.1 || ((x < 18 || x > 46) && y < 27);
  return [
    // shoulders, trapezius yoke and a thick neck
    ellipsoid(skin, LAYER.torso, 32, 88, 44, 30, 20),
    ellipsoid(skin, LAYER.torso, 7, 70, 11, 10, 11, { lift: 4 }),
    ellipsoid(skin, LAYER.torso, 57, 70, 11, 10, 11, { lift: 4 }),
    ellipsoid(skin, LAYER.torso, 19, 62, 14, 7, 9, { lift: 2 }),
    ellipsoid(skin, LAYER.torso, 45, 62, 14, 7, 9, { lift: 2 }),
    capsule(skin, LAYER.torso, 32, 46, 32, 62, 14.5, 17, { lift: -4 }),
    // one extruded head: wide cheeks and jaw, a flat square chin
    profile(face, LAYER.head, 32, 0, HEAD, { flat: 0.7, bias: 0.15 }),
    // black hair: a low dome inside the head width, the three rounded tufts of the sprite's quiff, sideburns cut at the ear
    ellipsoid(hair, top, 32, 16.5, 18, 9, 13, { clip: inHair, bias: -0.2 }),
    capsule(hair, top, 23, 14, 22, 8.4, 5.4, 3.4, { lift: 6, bias: -0.1 }),
    capsule(hair, top, 32, 12.5, 33, 6.2, 5.8, 3.6, { lift: 8, bias: -0.1 }),
    capsule(hair, top, 42, 14, 43.6, 8.4, 5.4, 3.4, { lift: 6, bias: -0.1 }),
    ellipsoid(hair, top, 14.8, 22, 3.6, 6.5, 7, { clip: (_x, y) => y < 28, bias: -0.2 }),
    ellipsoid(hair, top, 49.2, 22, 3.6, 6.5, 7, { clip: (_x, y) => y < 28, bias: -0.2 }),
  ];
}

function disc(r: Raster, cx: number, cy: number, rad: number, colour: string): void {
  for (let y = Math.floor(cy - rad); y <= cy + rad; y++) {
    for (let x = Math.floor(cx - rad); x <= cx + rad; x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad) r.set(x, y, colour);
    }
  }
}

function lens(r: Raster, cx: number, cy: number): void {
  disc(r, cx, cy, 6.9, INK);
  disc(r, cx, cy, 6, C.lens);
  disc(r, cx + 1.6, cy + 1.9, 3.3, C.lensHi);
  disc(r, cx + 0.9, cy + 1.2, 3.2, C.lens);
  for (const [dx, dy] of [[-3, -3], [-2, -3], [-3, -2]]) r.set(cx + dx, cy + dy, C.glint);
}

function features(r: Raster): void {
  lens(r, 24, 32);
  lens(r, 40, 32);
  for (let x = 29; x <= 35; x++) {
    r.set(x, 29, INK);
    r.set(x, 30, C.lens);
  }
  // thick brows, slanting down toward the nose (determined look)
  const brow = C.hair;
  fillPoly(r, [[15, 25], [17.5, 22.6], [29.5, 25.6], [29.5, 27.6], [26, 26.6], [18.5, 25]], brow);
  fillPoly(r, [[49, 25], [46.5, 22.6], [34.5, 25.6], [34.5, 27.6], [38, 26.6], [45.5, 25]], brow);
  // smirk: a small dark mouth with a raised right corner, one row of teeth under the upper lip
  fillPoly(r, [[26.5, 47.4], [37, 47], [41.2, 44.6], [39.4, 49.6], [35, 51], [29, 50.6]], '#2a0c10');
  fillPoly(r, [[28.4, 48.4], [37.4, 48.1], [39.4, 47.2], [38.6, 49.4], [29.4, 49.8]], C.teeth);
  for (const x of [32, 36]) r.set(x, 49, '#c3c9a4');
  for (let x = 29; x <= 38; x++) r.set(x, 56, GREEN.sh);
}

export function portrait(): Raster {
  const img = toImg(resolve(portraitPrims(), P, P));
  features(img.r);
  const out = new Raster(P, P);
  stamp(out, img.r, INK);
  return out;
}
