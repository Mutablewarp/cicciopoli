/** Procedural pixel flame shared by torch, brazier, burning flag and fire spirit. */
import { PAL, px, rng, type Ctx } from '../pixel';

export interface Flame {
  cx: number;
  /** y of the flame's bottom row */
  base: number;
  w: number;
  h: number;
  frame: number;
  seed: number;
  /** extra sideways sway amplitude (px at the tip) */
  sway?: number;
}

const HOT = PAL.lavaHot;
const YEL = PAL.lavaYellow;
const ORA = PAL.lavaOrange;
const RED = PAL.lavaRed;
const TIP = '#9c1c0c';

export function heatColor(heat: number): string {
  if (heat > 0.72) return HOT;
  if (heat > 0.5) return YEL;
  if (heat > 0.3) return ORA;
  if (heat > 0.12) return RED;
  return TIP;
}

/** Teardrop flame; wobble phase advances with `frame` so 4 frames make a loop. */
export function drawFlame(ctx: Ctx, f: Flame): void {
  const ph = (f.frame / 4) * Math.PI * 2;
  const sway = f.sway ?? f.w * 0.22;
  for (let j = 0; j < f.h; j++) {
    const t = j / f.h;
    const hw = (f.w / 2) * Math.pow(1 - t, 0.75) * Math.min(1, 0.55 + t * 2.4);
    const off = Math.sin(t * 4.2 - ph + f.seed) * sway * t;
    const y = f.base - j;
    for (let x = Math.floor(f.cx - hw + off); x <= Math.ceil(f.cx + hw + off); x++) {
      const d = Math.abs(x + 0.5 - (f.cx + 0.5 + off)) / (hw + 0.5);
      if (d > 1) continue;
      px(ctx, x, y, heatColor((1 - d) * (1 - t * 0.85) + 0.08));
    }
  }
  // a detached tongue flickering above the tip
  const r = rng(f.seed * 97 + f.frame * 13 + 1);
  const tx = Math.round(f.cx + (r() - 0.5) * f.w * 0.5);
  const ty = f.base - f.h - Math.floor(r() * 3);
  px(ctx, tx, ty, r() < 0.5 ? ORA : RED);
  if (r() < 0.6) px(ctx, tx, ty - 1, TIP);
}
