/**
 * Deliveries: two customers waving from the sidewalk (16x24, 0-3 A, 4-7 B), the Ciccio's kraft
 * delivery bag with the face (12x14), the pulsing green delivery lane (40x64 x 4) and the little
 * red-white parachute for bags dropped from the flying truck (16x14).
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, gridR, outlineRaster } from '../hills/raster';
import { lineR, rectR } from '../rampage/draw';
import { RU } from './colors';
import { tones } from './traffic';

interface Look {
  hair: string;
  top: string;
  legs: string;
  /** long hair falls past the shoulders */
  long: boolean;
  cap?: string;
}

const A: Look = { hair: '#3a2416', top: '#e0407a', legs: '#2a3a6a', long: true };
const B: Look = { hair: '#141414', top: '#2fa060', legs: '#4a4a52', long: false, cap: '#f2c230' };

/** Hand positions of the waving arm, frames 0-3. */
const WAVE = [[14, 3], [15, 6], [14, 3], [12, 2]] as const;

function customer(look: Look, f: number): Raster {
  const r = new Raster(16, 24);
  const m = new Mask(16, 24);
  m.rect(5, 12, 7, 6, 1); // torso
  m.rect(5, 18, 3, 4, 2); // legs
  m.rect(9, 18, 3, 4, 2);
  m.ellipse(8, 7, 4, 4, 3); // head
  paintMask(m, r, { 1: tones(look.top), 2: tones(look.legs), 3: { light: RU.skin, base: RU.skin, shade: RU.skinShade } }, { shadeDepth: 1 });
  rectR(r, 4, 3, 9, 3, look.hair);
  if (look.long) {
    rectR(r, 4, 6, 2, 7, look.hair);
    rectR(r, 11, 6, 2, 7, look.hair);
  }
  if (look.cap) {
    rectR(r, 4, 2, 9, 3, look.cap);
    rectR(r, 8, 5, 6, 1, look.cap); // visor
  }
  r.set(6, 7, RU.ink); // eyes + smile
  r.set(10, 7, RU.ink);
  rectR(r, 7, 9, 3, 1, RU.lips);
  rectR(r, 5, 22, 3, 1, RU.ink); // shoes
  rectR(r, 9, 22, 3, 1, RU.ink);
  rectR(r, 3, 12, 2, 5, look.top); // resting arm
  r.set(3, 17, RU.skin);
  const [hx, hy] = WAVE[f];
  lineR(r, 11, 12, hx, hy + 2, look.top);
  lineR(r, 12, 12, hx + 1, hy + 2, look.top);
  rectR(r, hx, hy, 2, 2, RU.skin);
  outlineRaster(r, RU.ink);
  return r;
}

export function buildCustomers(): Raster[] {
  return [A, B].flatMap((look) => [0, 1, 2, 3].map((f) => customer(look, f)));
}

const MINI_FACE = ['.kkk.', 'kkkkk', 'kwwwk', 'kkwkk', '.www.', '.wmw.'];

/** Kraft paper bag, folded top with a handle cut-out, the face logo on the front. */
function bag(r: Raster, ox: number, oy: number): void {
  const m = new Mask(12, 14);
  m.rect(1, 3, 10, 11, 1);
  m.rect(2, 0, 8, 3, 2);
  paintMask(m, r, { 1: { light: RU.kraftLight, base: RU.kraft, shade: RU.kraftShade }, 2: { light: RU.kraftLight, base: RU.kraftLight, shade: RU.kraft } }, { ox, oy, shadeDepth: 1 });
  rectR(r, ox + 4, oy + 1, 4, 1, RU.kraftShade);
  rectR(r, ox + 3, oy + 6, 6, 7, RU.ink); // black label
  gridR(r, MINI_FACE, { k: RU.hair, w: RU.vinyl, m: RU.lips }, ox + 4, oy + 6);
}

export function buildBag(): Raster {
  const r = new Raster(12, 14);
  bag(r, 0, 0);
  outlineRaster(r, RU.ink);
  return r;
}

const ZONE_W = 40;
const ZONE_H = 64;
/** chevrons scroll up 4 px a frame: 4 frames = one 16 px period, so the loop is seamless */
const CHEVRON_GAP = 16;

/** One up-pointing chevron (3 px thick, light leading edge) with its tip at (20, y). */
function chevron(r: Raster, y: number): void {
  for (let j = 0; j < 9; j++) {
    for (let t = 0; t < 3; t++) {
      const col = t === 0 ? RU.greenLight : RU.green;
      r.set(19 - j, y + j + t, col);
      r.set(20 + j, y + j + t, col);
    }
  }
}

/**
 * Glowing green delivery lane: a bright double rim, a dithered glow that thickens towards the rim,
 * up-scrolling chevrons, and the bag on a dark badge. Frames pulse (2 = brightest). The gaps stay
 * transparent so the in-game glow and the asphalt read through.
 */
export function buildZone(): Raster[] {
  return [0, 1, 2, 3].map((f) => {
    const r = new Raster(ZONE_W, ZONE_H);
    const pulse = [0, 1, 2, 1][f];
    for (let y = 0; y < ZONE_H; y++) {
      for (let x = 0; x < ZONE_W; x++) {
        const edge = Math.min(x, y, ZONE_W - 1 - x, ZONE_H - 1 - y);
        // 50% checker next to the rim, 25% one step in, a sparse 12% sprinkle across the lane
        const on = edge < 5 + pulse ? (x + y) % 2 === 0 : edge < 9 + pulse ? (x + y) % 2 === 0 && y % 2 === 0 : (x + 2 * y) % 8 === 0;
        if (on) r.set(x, y, edge < 5 ? RU.green : RU.greenShade);
      }
    }
    for (let y = ZONE_H + 4 - ((f * 4) % CHEVRON_GAP); y > -12; y -= CHEVRON_GAP) chevron(r, y);
    const rim = pulse === 2 ? RU.white : RU.greenLight;
    rectR(r, 0, 0, ZONE_W, 2, rim);
    rectR(r, 0, ZONE_H - 2, ZONE_W, 2, rim);
    rectR(r, 0, 0, 2, ZONE_H, rim);
    rectR(r, ZONE_W - 2, 0, 2, ZONE_H, rim);
    rectR(r, 2, 2, ZONE_W - 4, 1, RU.green);
    rectR(r, 2, ZONE_H - 3, ZONE_W - 4, 1, RU.green);
    rectR(r, 2, 2, 1, ZONE_H - 4, RU.green);
    rectR(r, ZONE_W - 3, 2, 1, ZONE_H - 4, RU.green);
    // dark badge so the bag reads over the chevrons
    rectR(r, 11, 23, 18, 18, RU.greenShade);
    rectR(r, 12, 24, 16, 16, RU.ink);
    const badge = new Raster(12, 14);
    bag(badge, 0, 0);
    outlineRaster(badge, RU.ink);
    r.blit(badge, 14, 25);
    return r;
  });
}

/** Red-white canopy with strings meeting at the bottom centre (the bag hangs below in-game). */
export function buildParachute(): Raster {
  const r = new Raster(16, 14);
  for (let y = 0; y < 7; y++) {
    const half = Math.round(7.5 * Math.sqrt(1 - ((6 - y) / 7) ** 2));
    for (let x = 8 - half; x < 8 + half; x++) r.set(x, y, Math.floor((x + 1) / 4) % 2 === 0 ? RU.check : RU.white);
  }
  rectR(r, 1, 6, 14, 1, RU.checkDark);
  for (const x of [1, 5, 10, 14]) lineR(r, x, 7, 8, 13, RU.whiteShade);
  outlineRaster(r, RU.ink);
  return r;
}
