/** Hero colours: four lime skin tones + a dark-green seam, torn purple shorts, black hair (light from the top-left). */
import { PAL } from '../pixel';
import { C, darker, type Tones } from '../ciccio/palette';
import type { Color } from '../ciccio/raster';
import type { Mat } from './zbuf';

export const INK: Color = PAL.ink;

/** Lime skin of the T-shirt art: highlight, light, mid, shade. */
export const GREEN: Tones = { hi: '#d6f56c', base: '#a8d92e', sh: '#6dab25', deep: '#3d7421' };

/** Dark-green seam drawn between overlapping body parts (softer than the black silhouette line). */
export const SEAM: Color = '#244d19';

export const SHORTS: Tones = { hi: '#b46ad8', base: '#8040a3', sh: '#58277c', deep: '#361651' };

/** Light edge of the shorts: keeps the purple readable in front of the purple buildings. */
export const LILAC: Color = '#d39af2';

export const NAIL: Color = '#f2f8c4';

export const GREEN_FAR = darker(GREEN);
export const SHORTS_FAR = darker(SHORTS);

const mat = (tones: Tones, id: number): Mat => ({ tones, id });

export const M = {
  skin: mat(GREEN, 0),
  skinFar: mat(GREEN_FAR, 1),
  shorts: mat(SHORTS, 2),
  shortsFar: mat(SHORTS_FAR, 3),
  /** the sculpted face skin (own id so the chin gets a seam against the neck) */
  face: mat(GREEN, 4),
  /** black hair with a cool blue-grey sheen (portrait) */
  hair: mat({ hi: '#4c5870', base: '#252a3a', sh: '#181821', deep: '#0b0b10' }, 5),
} as const;

/** Palette of the logo-face grid (src/art/hulk/head.ts): lime skin, black swept hair, round black glasses. */
export const HEAD_PAL: Record<string, Color> = {
  R: C.hairRim,
  h: C.hair,
  H: C.hairHi,
  G: C.hairHi2,
  b: C.hair,
  s: GREEN.base,
  S: GREEN.sh,
  d: GREEN.deep,
  c: GREEN.hi,
  k: INK,
  g: C.lens,
  r: C.lensHi,
  w: C.glint,
  m: '#2a0c10',
  t: C.teeth,
  u: '#c3c9a4',
  T: C.tongue,
};
