/**
 * Pure camera framing for the fixed playfield: zoom-to-fit (integer device-pixel zoom when
 * the loss is small or on low-DPR screens) and the camera centre that keeps the play band
 * between the HUD (insetTop) and the overlaid touch controls (insetBottom).
 */
import { FIELD, SPAN } from './config';

export interface FramingInput {
  cssW: number;
  cssH: number;
  dpr: number;
  insetTop: number;
  insetBottom: number;
}

export interface Framing {
  /** device pixels per world unit */
  zoom: number;
  /** world point at the centre of the canvas */
  centerX: number;
  centerY: number;
}

function fit(v: FramingInput, insetBottom: number): Framing {
  const devW = Math.max(1, v.cssW * v.dpr);
  const devH = Math.max(1, v.cssH * v.dpr);
  const freeTop = v.insetTop * v.dpr;
  const freeBottom = devH - insetBottom * v.dpr;
  const freeH = Math.max(1, freeBottom - freeTop);
  const ideal = Math.min(devW / FIELD.w, freeH / (SPAN.bottom - SPAN.top));
  const whole = Math.floor(ideal);
  // integer zoom keeps every art pixel the same size; on dense screens a fractional zoom's
  // 1-device-px unevenness is invisible and a big integer drop would waste the screen
  const keepWhole = v.dpr < 2 || whole / ideal >= (v.dpr >= 3 ? 0.9 : 0.8);
  const zoom = whole >= 1 && keepWhole ? whole : ideal;
  const spanMid = (SPAN.top + SPAN.bottom) / 2;
  const freeMid = (freeTop + freeBottom) / 2;
  return { zoom, centerX: FIELD.w / 2, centerY: spanMid + (devH / 2 - freeMid) / zoom };
}

/** Landscape overlay controls sit in the bottom corners: a field narrower than half the screen never meets them. */
const CORNER_SHARE = 0.5;
const CORNER_MARGIN = 12;

export function computeFraming(v: FramingInput): Framing {
  if (v.cssW > v.cssH && v.insetBottom > CORNER_MARGIN) {
    const wide = fit(v, CORNER_MARGIN);
    if ((FIELD.w * wide.zoom) / v.dpr <= v.cssW * CORNER_SHARE) return wide;
  }
  return fit(v, v.insetBottom);
}
