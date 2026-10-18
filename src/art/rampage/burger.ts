/**
 * Shared kit for the two burger bruisers (brute 40x40, megaburger 64x64): material ids and tones,
 * the stacked-burger body, limbs with boxing gloves, faces and the dazed / hit-flash effects.
 * Enemies face LEFT; everything is drawn into a Mask and lit top-left by paintMask.
 */
import { Mask, type Tone } from '../hills/mask';
import { Raster, gridR } from '../hills/raster';
import { RC } from './colors';
import { lineR, rectR } from './draw';

export const Id = { Bun: 1, Lettuce: 2, Cheese: 3, Tomato: 4, Patty: 5, Under: 6, Leg: 7, Arm: 8, Glove: 9, Cuff: 10, Crown: 11 } as const;

export const TONES: Readonly<Record<number, Tone>> = {
  [Id.Bun]: { light: RC.bunLight, base: RC.bun, shade: RC.bunShade, dark: RC.bunDark },
  [Id.Lettuce]: { light: '#9cec4c', base: RC.lettuce, shade: RC.lettuceShade },
  [Id.Cheese]: { light: '#fff27a', base: RC.cheese, shade: RC.cheeseShade },
  [Id.Tomato]: { light: '#ff6a52', base: RC.tomato, shade: '#a81c12' },
  [Id.Patty]: { light: RC.pattyLight, base: RC.patty, shade: RC.pattyShade },
  [Id.Under]: { light: RC.bunLight, base: RC.bun, shade: RC.bunShade, dark: RC.bunDark },
  [Id.Leg]: { light: '#6a5478', base: '#46365a', shade: '#2c2040' },
  [Id.Arm]: { light: '#d89246', base: '#b86a1c', shade: '#80440e' },
  [Id.Glove]: { light: RC.gloveLight, base: RC.glove, shade: RC.gloveShade, dark: RC.gloveDark },
  [Id.Cuff]: { light: '#ffffff', base: RC.white, shade: RC.whiteShade },
  [Id.Crown]: { light: '#fff27a', base: RC.cheese, shade: RC.cheeseShade },
};

export interface Stack {
  cx: number;
  /** top y of the bun dome */
  top: number;
  /** half width of the bun */
  hw: number;
  dome: number;
  lettuce: number;
  cheese: number;
  tomato: number;
  patty: number;
  under: number;
}

/** Stacks dome bun, lettuce frill, cheese with drips, tomato, patty and bottom bun. */
export function stack(m: Mask, s: Stack): void {
  const { cx, hw } = s;
  let y = s.top;
  for (let j = 0; j < s.dome; j++) {
    const u = (s.dome - j - 0.5) / s.dome;
    const half = Math.max(2, Math.round(hw * Math.sqrt(1 - u * u)));
    m.span(cx - half, cx + half, y + j, Id.Bun);
  }
  y += s.dome;
  m.rect(cx - hw - 1, y, 2 * hw + 3, s.lettuce, Id.Lettuce);
  for (let x = cx - hw - 1; x <= cx + hw + 1; x += 3) m.set(x, y + s.lettuce, Id.Lettuce);
  y += s.lettuce;
  m.rect(cx - hw, y, 2 * hw + 1, s.cheese, Id.Cheese);
  for (const [dx, len] of [[-hw + 2, 3], [3, 2], [hw - 5, 3]] as const) m.rect(cx + dx, y + s.cheese, 2, len, Id.Cheese);
  y += s.cheese;
  if (s.tomato > 0) {
    m.rect(cx - hw + 1, y, 2 * hw - 1, s.tomato, Id.Tomato);
    y += s.tomato;
  }
  m.rect(cx - hw - 1, y, 2 * hw + 3, s.patty, Id.Patty);
  for (const sx of [-1, 1]) m.set(cx + sx * (hw + 1), y, 0);
  y += s.patty;
  for (let j = 0; j < s.under; j++) {
    const u = j / s.under;
    const half = Math.round(hw * (0.98 - 0.22 * u * u));
    m.span(cx - half, cx + half, y + j, Id.Under);
  }
}

/** Thick segment drawn as squares along the line. */
export function limb(m: Mask, x0: number, y0: number, x1: number, y1: number, thick: number, id: number): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  const off = Math.floor(thick / 2);
  for (let i = 0; i <= n; i++) {
    m.rect(Math.round(x0 + ((x1 - x0) * i) / n) - off, Math.round(y0 + ((y1 - y0) * i) / n) - off, thick, thick, id);
  }
}

/** Arm from the shoulder to a boxing glove of radius `rad`; a white tape cuff sits at the wrist. */
export function armWithGlove(m: Mask, sx: number, sy: number, gx: number, gy: number, rad: number, thick: number): void {
  limb(m, sx, sy, gx, gy, thick, Id.Arm);
  const len = Math.max(1, Math.hypot(gx - sx, gy - sy));
  const ux = (gx - sx) / len;
  const uy = (gy - sy) / len;
  limb(m, gx - ux * (rad - 1), gy - uy * (rad - 1), gx - ux * (rad + 2), gy - uy * (rad + 2), thick + 1, Id.Cuff);
  m.ellipse(gx, gy, rad, rad, Id.Glove);
  m.ellipse(gx + Math.round(ux * 1), gy - 2, Math.max(1, rad - 3), 1, Id.Glove);
}

/** Glossy highlight pixels on the knuckles of a glove, drawn after painting. */
export function gloveShine(r: Raster, gx: number, gy: number, rad: number): void {
  r.set(gx - Math.floor(rad / 2), gy - Math.floor(rad / 2), RC.white);
  r.set(gx - Math.floor(rad / 2) + 1, gy - Math.floor(rad / 2), RC.gloveLight);
  r.set(gx - Math.floor(rad / 2), gy - Math.floor(rad / 2) + 1, RC.gloveLight);
}

/** Eye of w x h px: white with rounded corners, pupil looking left, thick brow slanting down towards the nose. */
export function angryEye(r: Raster, x: number, y: number, w: number, h: number, inner: 'left' | 'right'): void {
  rectR(r, x, y, w, h, RC.eyeWhite);
  for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]] as const) r.set(cx, cy, null);
  rectR(r, x, y + 1, Math.ceil(w / 2), h - 2, RC.ink);
  r.set(x + 1, y + 1, RC.white);
  const t = h > 4 ? 3 : 2;
  const outerX = inner === 'right' ? x : x + w - 1;
  const innerX = inner === 'right' ? x + w : x - 1;
  for (let k = 0; k < t; k++) lineR(r, outerX, y - 3 - t + 1 + k, innerX, y + k, RC.ink);
}

/** Snarling mouth: ink pit, top row of fangs, two lower tusks. */
export function snarl(r: Raster, x: number, y: number, w: number, h: number): void {
  rectR(r, x, y, w, h, RC.ink);
  r.set(x, y, null);
  r.set(x + w - 1, y, null);
  for (let i = 1; i + 1 < w; i += 2) {
    r.set(x + i, y + 1, RC.white);
    if (h > 4) r.set(x + i, y + 2, RC.white);
  }
  r.set(x + 2, y + h - 2, RC.white);
  r.set(x + w - 3, y + h - 2, RC.white);
  rectR(r, x + 3, y + h - 2, w - 6, 1, '#7a1030');
}

/** Squeezed ">  <" eyes and an open mouth for the hit-flash frame. */
export function ouchFace(r: Raster, lx: number, rx: number, y: number): void {
  for (const [x, dir] of [[lx, 1], [rx, -1]] as const) {
    gridR(r, dir === 1 ? ['k....', '.kk..', '..kk.', '.kk..', 'k....'] : ['....k', '..kk.', '.kk..', '..kk.', '....k'], { k: RC.ink }, x, y);
  }
}

/** Three little stars circling above a dazed head. */
export function dizzyStars(r: Raster, cx: number, y: number, spread: number): void {
  const star = ['.y.', 'yYy', '.y.'];
  const pal = { y: RC.star, Y: RC.starLight };
  gridR(r, star, pal, cx - spread - 1, y + 2);
  gridR(r, star, pal, cx + spread - 1, y + 1);
  gridR(r, ['.y.', 'y.y', '.y.'], { y: RC.starLight }, cx - 1, y - 1);
}
