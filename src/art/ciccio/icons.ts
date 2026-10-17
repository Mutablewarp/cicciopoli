/**
 * Ciccio head images: a 16x16 HUD icon (3/4 view, hand-drawn grid) and a 64x64
 * front-view portrait of the logo face (layered lit shapes + hand-drawn details).
 */
import { C, INK, SHIRT, SKIN, type Tones } from './palette';
import { grid, Raster, stamp } from './raster';
import { capsule, litEllipse } from './shapes';

const ICON_PAL: Record<string, string> = {
  k: C.ink, R: C.hairRim, h: C.hair, H: C.hairHi, G: C.hairHi2, b: C.hair,
  s: C.skin, S: C.skinSh, d: C.skinDk, c: C.blush,
  g: C.lens, r: C.lensHi, w: C.glint, m: C.mouth,
};

const ICON: readonly string[] = [
  '................',
  '.....RRRRRk.....',
  '...RRhhhhhhkk...',
  '..RhhhHGHhhhhk..',
  '.RhhHHhhhhhhhhk.',
  '.RhHhhhhhhHHHhk.',
  'Rhhhhsssssssshk.',
  'Rhhhsbbbbsbbbsk.',
  'Rhhssgggsssggsk.',
  'khdkgwgggkgwggk.',
  '.kdsggggrsgggrk.',
  '.kssSgggssSggssk',
  '..kccsssdsssdsk.',
  '..kssssssmmmsk..',
  '...kssssssSSk...',
  '....kkkkkkkk....',
];

export function headIcon(): Raster {
  const r = new Raster(16, 16);
  grid(r, ICON, ICON_PAL, 0, 0);
  return r;
}

/* ------------------------------------------------------------- portrait */
const P = 64;
const HAIR: Tones = { hi: C.hairHi, base: C.hair, sh: C.hair, deep: '#0c0c12' };

const DETAIL_PAL: Record<string, string> = {
  b: C.hair, g: C.lens, r: C.lensHi, w: C.glint, k: C.ink,
  m: C.mouth, p: C.lip, S: C.skinSh, d: C.skinDk, l: C.skinHi,
};

const BROW_L: readonly string[] = [
  '.....bbbbbb.',
  '..bbbbbbbbbb',
  '.bbbbbbbbbb.',
  'bbb.........',
];

const LENS: readonly string[] = [
  '....kkkkk....',
  '..kkgggggkk..',
  '.kgwwggggggk.',
  '.kgwgggggggk.',
  'kgggggggggggk',
  'kgggggggggggk',
  'kgggggggggggk',
  'kgggggggggggk',
  'kggggggggggrk',
  '.kgggggggrgk.',
  '.kgggggrrggk.',
  '..kkgggggkk..',
  '....kkkkk....',
];

const NOSE: readonly string[] = [
  '..S..',
  '..S..',
  '.S.S.',
  'd.l.d',
  '.ddd.',
];

const MOUTH: readonly string[] = [
  'm...........m',
  '.mmmmmmmmmmm.',
  '..ppppppppp..',
  '....SSSSS....',
];

function mirror(rows: readonly string[]): string[] {
  return rows.map((r) => r.split('').reverse().join(''));
}

function inForehead(x: number, y: number): boolean {
  const dx = (x - 32) / 13.5;
  const dy = (y - 32) / 12;
  return dx * dx + dy * dy <= 1;
}

/** Re-tints the top/left ring of a dark layer as a cool rim light. */
function rimLight(out: Raster, layer: Raster, maxY: number): void {
  for (let y = 0; y <= maxY; y++) {
    for (let x = 0; x < P; x++) {
      if (layer.get(x, y) !== null || out.get(x, y) !== INK) continue;
      const litSide = layer.get(x + 1, y) !== null || layer.get(x, y + 1) !== null;
      const shadowSide = layer.get(x - 1, y) !== null || layer.get(x, y - 1) !== null;
      if (litSide && !shadowSide && x < 44) out.set(x, y, C.hairRim);
    }
  }
}

/** Shades the skin row right under the hair cap (contact shadow on the forehead). */
function capShadow(out: Raster, cap: Raster): void {
  for (let x = 0; x < P; x++) {
    let y = P - 1;
    while (y >= 0 && cap.get(x, y) === null) y--;
    const below = out.get(x, y + 2);
    if (y >= 0 && (below === SKIN.base || below === SKIN.hi)) out.set(x, y + 2, SKIN.sh);
  }
}

/** Combed gloss strands following the side-swept volume (light from the top-left). */
const GLOSS: readonly (readonly [number, number])[] = [
  [17, 16], [18, 15], [18, 14], [19, 13], [20, 12], [21, 11], [22, 10], [24, 9], [25, 9], [26, 9],
  [21, 14], [22, 13], [23, 12], [24, 12], [39, 7], [40, 6], [41, 6], [42, 6],
];

function features(r: Raster): void {
  grid(r, BROW_L, DETAIL_PAL, 17, 26);
  grid(r, mirror(BROW_L), DETAIL_PAL, 35, 26);
  grid(r, LENS, DETAIL_PAL, 18, 30);
  grid(r, LENS, DETAIL_PAL, 33, 30);
  for (let x = 30; x <= 33; x++) {
    r.set(x, 34, C.ink);
    r.set(x, 35, C.ink);
  }
  for (let x = 13; x <= 18; x++) r.set(x, 34, C.ink);
  for (let x = 45; x <= 51; x++) r.set(x, 34, C.ink);
  grid(r, NOSE, DETAIL_PAL, 30, 41);
  grid(r, MOUTH, DETAIL_PAL, 26, 48);
  for (const cx of [20, 44]) {
    for (let x = cx - 2; x <= cx + 2; x++) r.tint(x, 45, C.blush);
    for (let x = cx - 1; x <= cx + 1; x++) r.tint(x, 46, C.blush);
  }
}

export function portrait(): Raster {
  const out = new Raster(P, P);
  const body = new Raster(P, P);
  litEllipse(body, 32, 71, 30, 14, SHIRT);
  litEllipse(body, 32, 58, 12, 3, { hi: SHIRT.sh, base: SHIRT.sh, sh: SHIRT.deep, deep: SHIRT.deep });
  stamp(out, body, INK);
  const neck = new Raster(P, P);
  capsule(neck, 32, 48, 32, 52, 9, { hi: SKIN.base, base: SKIN.sh, sh: SKIN.sh, deep: SKIN.deep }, 0.1);
  stamp(out, neck, INK);
  const back = new Raster(P, P);
  litEllipse(back, 32, 25, 22, 18, HAIR, { bias: -0.25 });
  stamp(out, back, INK);
  rimLight(out, back, 40);
  const face = new Raster(P, P);
  litEllipse(face, 32, 36, 16, 18, SKIN, { bias: 0.32 });
  stamp(out, face, INK);
  const cap = new Raster(P, P);
  litEllipse(cap, 32, 21, 21, 14, HAIR, { bias: -0.25, clip: (x, y) => !inForehead(x, y) });
  litEllipse(cap, 42, 9, 7, 4, HAIR, { bias: -0.25 });
  stamp(out, cap, INK);
  rimLight(out, cap, 20);
  capShadow(out, cap);
  for (const [x, y] of GLOSS) out.set(x, y, C.hairHi);
  out.set(23, 10, C.hairHi2);
  out.set(40, 7, C.hairHi2);
  features(out);
  return out;
}
