/**
 * The flying truck and the ROADCOASTER finale.
 * 'rush-truck-fly' 160x96 x 4: the side-view truck with two rocket boosters under the box
 * (Ciccio's red-white stripes) firing down, flame loop + a 1 px hover bob, pitched nose-up on the
 * pixel grid for the finale climb (the game must not rotate it).
 * 'rush-truck-orbit' 160x96: the famous "car floating in space" shot with our truck: driver window
 * open, Ciccio in a white spacesuit + helmet at the wheel (round black sunglasses behind the gold
 * visor), arm resting on the window frame, a hard sun from the left and a blue earthshine below.
 */
import { Mask, paintMask } from '../hills/mask';
import { Raster, outlineRaster, packColor } from '../hills/raster';
import { rectR, tint } from '../rampage/draw';
import { RU } from './colors';
import { SIDE_H, SIDE_W, drawTruckSide, lettering } from './truckSide';

export const FLY_H = 96;

/** Flame column pointing DOWN from (x, y): white core, yellow, orange, red tips. */
export function flameDown(r: Raster, cx: number, y: number, w: number, len: number, phase: number): void {
  for (let j = 0; j < len; j++) {
    const t = j / len;
    const col = t < 0.2 ? RU.flameCore : t < 0.5 ? RU.flameYellow : t < 0.78 ? RU.flameOrange : RU.flameRed;
    const half = Math.max(0, Math.round((w / 2) * (1 - t * 0.85)) - (j % 3 === phase % 3 && t > 0.4 ? 1 : 0));
    const wob = t > 0.5 ? ((j + phase) % 4 < 2 ? 1 : -1) * (phase % 2) : 0;
    rectR(r, cx - half + wob, y + j, half * 2 + 1, 1, col);
    if (t < 0.35 && half > 1) r.set(cx + wob, y + j, RU.white);
  }
}

function booster(r: Raster, x: number, y: number, phase: number): void {
  rectR(r, x, y, 9, 15, RU.white);
  rectR(r, x, y, 2, 15, RU.whiteShade);
  rectR(r, x + 7, y, 2, 15, RU.suitShade);
  for (let j = 3; j < 13; j += 4) rectR(r, x, y + j, 9, 2, RU.check);
  rectR(r, x - 2, y + 9, 2, 6, RU.checkDark); // fins
  rectR(r, x + 9, y + 9, 2, 6, RU.checkDark);
  rectR(r, x + 1, y + 15, 7, 2, RU.tyreLight); // nozzle
  flameDown(r, x + 4, y + 17, 7, [14, 17, 12, 16][phase], phase);
}

/** Nose-up pitch of the climbing truck (rad, ~5 deg): the widest that keeps every pixel inside 160x96. */
export const CLIMB_PITCH = 0.09;

/** One shear pass: whole rows (axis 'x') or columns (axis 'y') slide by k * distance from the pivot, rounded. */
const shift = (k: number, d: number): number => Math.round(k * d);

function shear(src: Raster, axis: 'x' | 'y', k: number, pivot: number): Raster {
  const out = new Raster(src.w, src.h);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < src.w; x++) {
      const c = src.px[y * src.w + x];
      if (c === 0) continue;
      if (axis === 'x') out.set(x + shift(k, y - pivot), y, c);
      else out.set(x, y + shift(k, x - pivot), c);
    }
  }
  return out;
}

/** Shear factors of a three-shear (Paeth) rotation by `rad`: x-shear a, y-shear b, x-shear a. */
const paeth = (rad: number): readonly [number, number] => [Math.tan(rad / 2), -Math.sin(rad)];

/**
 * Rotation by three shears: every pass only slides whole rows or columns by whole pixels, so the
 * art keeps one pixel size and no pixel is doubled or lost (unlike rotating the sprite in-engine).
 * Positive `rad` lifts the nose (the right side).
 */
export function pitchRaster(src: Raster, rad: number): Raster {
  const [a, b] = paeth(rad);
  const cx = (src.w - 1) / 2;
  const cy = (src.h - 1) / 2;
  return shear(shear(shear(src, 'x', a, cy), 'y', b, cx), 'x', a, cy);
}

/** Where pitchRaster() moves the pixel (x, y) of a w x h raster. */
export function pitchPoint(x: number, y: number, rad: number, w: number, h: number): readonly [number, number] {
  const [a, b] = paeth(rad);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const x1 = x + shift(a, y - cy);
  const y2 = y + shift(b, x1 - cx);
  return [x1 + shift(a, y2 - cy), y2];
}

/** Vertical offset of the art in frame i: the 1 px hover bob of frames 1-2, all raised 1 px so the pitched flames fit. */
const dropOf = (i: number): number => (i === 1 || i === 2 ? 0 : -1);

/** The art of climbing frame i before the pitch, lettering left out (shared with the tests). */
export function climbLevel(i: number): Raster {
  const truck = new Raster(SIDE_W, SIDE_H);
  drawTruckSide(truck, { window: 'glass', bare: true });
  const level = new Raster(SIDE_W, FLY_H);
  const drop = dropOf(i);
  level.blit(truck, 0, drop);
  booster(level, 66, 60 + drop, i);
  booster(level, 102, 60 + drop, (i + 2) % 4);
  return level;
}

/**
 * Climbing frames, drawn nose-up on the pixel grid (the finale shows them unrotated). The 3x5
 * lettering is stamped after the pitch, glyph by glyph at its pitched spot, so it stays legible.
 */
export function buildTruckFly(): Raster[] {
  return [0, 1, 2, 3].map((i) => {
    const r = pitchRaster(climbLevel(i), CLIMB_PITCH);
    // a 3x5 glyph follows the pitched position of its centre
    lettering(r, (x, y) => {
      const [px, py] = pitchPoint(x + 1, y + 2 + dropOf(i), CLIMB_PITCH, SIDE_W, FLY_H);
      return [px - 1, py - 2];
    });
    outlineRaster(r, RU.ink);
    return r;
  });
}

/** Ciccio in his spacesuit at the open driver window, arm on the frame (window spans x 120..146). */
function astronaut(r: Raster): void {
  const m = new Mask(SIDE_W, FLY_H);
  m.rect(121, 37, 13, 5, 1); // shoulders (the door hides the rest)
  m.rect(120, 30, 3, 10, 1); // life-support pack
  m.ellipse(130, 32, 7, 7, 2); // helmet
  m.rect(125, 41, 14, 3, 1); // forearm resting on the window frame
  m.ellipse(139, 42, 2, 2, 1); // glove
  paintMask(m, r, {
    1: { light: RU.suit, base: RU.suit, shade: RU.suitShade, dark: RU.suitDark },
    2: { light: RU.white, base: RU.suit, shade: RU.suitShade, dark: RU.suitDark },
  }, { oy: 8 });
  // gold-rimmed visor on the front of the helmet; through it Ciccio: fringe, round black sunglasses, smile
  const v = new Mask(SIDE_W, FLY_H);
  v.ellipse(134, 32, 4, 4, 1);
  paintMask(v, r, { 1: { light: RU.visor, base: RU.skin, shade: RU.visor, dark: RU.visorDark } }, { oy: 8, shadeDepth: 1, lightDepth: 1 });
  rectR(r, 132, 37, 5, 2, RU.hair);
  rectR(r, 134, 39, 3, 3, RU.hair); // round lens
  r.set(134, 39, RU.skin);
  r.set(136, 41, RU.skin);
  r.set(135, 39, RU.white); // glint
  r.set(132, 40, RU.hair); // the arm of the glasses
  r.set(133, 40, RU.hair);
  rectR(r, 135, 43, 2, 1, RU.lips);
  rectR(r, 123, 46, 3, 1, RU.check); // mission patch on the shoulder
  r.set(124, 45, RU.white);
}

/** Hard sun from the left: a bright rim on left / top edges, the right and the belly fall into blue shade. */
function relight(r: Raster): void {
  const src = r.px.slice();
  const opaque = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < r.w && y < r.h && src[y * r.w + x] !== 0;
  const ink = packColor(RU.ink);
  r.map((c, x, y) => {
    if (!opaque(x - 1, y) || !opaque(x, y - 1)) return tint(c, RU.white, c === ink ? 0.3 : 0.55);
    const shadeT = Math.max(0, (x - 40) / 120) * 0.4 + Math.max(0, (y - 60) / 36) * 0.3;
    return tint(c, '#0c1640', Math.min(0.45, shadeT));
  });
}

export function buildTruckOrbit(): Raster {
  const truck = new Raster(SIDE_W, SIDE_H);
  drawTruckSide(truck, { window: 'open' });
  const r = new Raster(SIDE_W, FLY_H);
  r.blit(truck, 0, 8);
  outlineRaster(r, RU.ink);
  relight(r);
  // drawn after the relight: the suit stays the brightest thing in the shot
  const pilot = new Raster(SIDE_W, FLY_H);
  astronaut(pilot);
  outlineRaster(pilot, RU.ink);
  r.blit(pilot, 0, 0);
  return r;
}
