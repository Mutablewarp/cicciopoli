/** Ciccio's named colours and 4-step material ramps (light from the top-left). */
import { PAL, mix, shade } from '../pixel';
import type { Color } from './raster';

export interface Tones {
  hi: Color;
  base: Color;
  sh: Color;
  deep: Color;
}

export const INK: Color = PAL.ink;

export const C = {
  ink: INK,
  hair: '#1b1b24',
  hairHi: '#3b4658', //   dark blue-grey gloss
  hairHi2: '#5d6c84',
  hairRim: '#353d50', //  top-left outline of the hair: keeps it readable on dark backdrops
  skinHi: shade(PAL.skin, 0.28),
  skin: PAL.skin as Color,
  skinSh: PAL.skinShade as Color,
  skinDk: PAL.skinDark as Color,
  blush: mix(PAL.skin, '#f07060', 0.38),
  lens: '#0e0e14',
  lensHi: '#39405a', //    curved reflection on the lens bottom
  glint: '#ffffff',
  mouth: '#6a2418',
  lip: mix(PAL.skin, '#c8604a', 0.45),
  tongue: '#e0605a',
  teeth: '#fffaf0',
} as const;

export const SKIN: Tones = { hi: C.skinHi, base: C.skin, sh: C.skinSh, deep: C.skinDk };

export const SHIRT: Tones = {
  hi: '#fffaea', //  creamy highlight
  base: PAL.shirt,
  sh: '#d6d9e4', //  cool grey
  deep: '#a9aec4',
};

export const SHORTS: Tones = {
  hi: PAL.shortsLight,
  base: PAL.shorts,
  sh: PAL.shortsDark,
  deep: '#0c1236',
};

export const SOCK: Tones = { hi: '#ffffff', base: '#f4f4ee', sh: '#cfd2dc', deep: '#a9aec4' };

/** Far-side parts sit one step darker so the near limbs pop. */
export function darker(t: Tones): Tones {
  return { hi: t.base, base: t.sh, sh: t.deep, deep: shade(t.deep, -0.25) };
}

/** Shoe grid palette: o base, O toe light, d shade, s sole, w sock. */
export function shoePal(back: boolean): Record<string, Color> {
  return back
    ? { o: PAL.shoeDark, O: PAL.shoe, d: shade(PAL.shoeDark, -0.25), s: PAL.sole, w: SOCK.sh }
    : { o: PAL.shoe, O: '#ff8a5c', d: PAL.shoeDark, s: PAL.sole, w: SOCK.base };
}
