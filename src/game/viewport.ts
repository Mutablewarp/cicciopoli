/**
 * Camera zoom maths. Pure functions (unit-tested in viewport.test.ts).
 *
 * The canvas backing store is sized in DEVICE pixels, so a zoom of N means one
 * art pixel = N device pixels. Integer zooms keep every art pixel the same size.
 */

/** Visible world height we design for in landscape (16 tiles). */
export const TARGET_VIEW_H = 256;
/** Never show less than this many world units horizontally (portrait phones). */
export const MIN_VIEW_W = 208;
/** Never show less than this many world units vertically. */
export const MIN_VIEW_H = 216;

export interface ZoomResult {
  /** device pixels per world unit */
  zoom: number;
  /** visible world size in world units */
  viewW: number;
  viewH: number;
}

export function computeZoom(cssW: number, cssH: number, dpr: number): ZoomResult {
  const devW = Math.max(1, cssW * dpr);
  const devH = Math.max(1, cssH * dpr);
  const ideal = Math.min(devH / TARGET_VIEW_H, devW / MIN_VIEW_W);
  // Below 1.5 a rounded integer zoom would change the framing too much; keep it fractional.
  let zoom = ideal < 1.5 ? ideal : Math.round(ideal);
  if (zoom >= 1.5) {
    while (zoom > 1 && (devW / zoom < MIN_VIEW_W || devH / zoom < MIN_VIEW_H)) zoom -= 1;
  }
  zoom = Math.max(0.25, zoom);
  return { zoom, viewW: devW / zoom, viewH: devH / zoom };
}

/** Device pixel ratio actually used for the canvas (capped for GPU fill-rate on phones). */
export function effectiveDpr(raw: number | undefined): number {
  const d = raw && Number.isFinite(raw) && raw > 0 ? raw : 1;
  return Math.min(d, 3);
}
