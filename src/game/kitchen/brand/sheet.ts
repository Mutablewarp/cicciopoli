/**
 * Pure sizing of the brand textures: the drawing density (device px per art px, quantised so a small
 * resize does not redraw everything) and where each frame sits on its canvas.
 */

/** Density steps / bounds and the gutter between frames (device px: no LINEAR bleed between frames). */
export const BRAND_DENSITY = { step: 0.5, min: 1, max: 24, gutter: 2, maxTexture: 4096 } as const;

/** The density actually drawn for a wanted one: rounded UP to a step, within [min, max]. */
export function quantizeDensity(pxPerArtPx: number): number {
  const { step, min, max } = BRAND_DENSITY;
  if (!Number.isFinite(pxPerArtPx)) return min;
  return Math.min(max, Math.max(min, Math.ceil(pxPerArtPx / step - 1e-9) * step));
}

export interface SheetLayout {
  /** canvas size, device px */
  w: number;
  h: number;
  /** frame size, device px */
  fw: number;
  fh: number;
  /** top-left of every frame, device px */
  cells: { x: number; y: number }[];
}

/**
 * Frames of artW x artH art px drawn at density k, in a near-square grid (a long strip would pass the
 * GPU's texture limit) with a gutter between frames and none round the edge (one frame = the canvas).
 */
export function sheetLayout(artW: number, artH: number, frames: number, k: number): SheetLayout {
  const fw = Math.ceil(artW * k);
  const fh = Math.ceil(artH * k);
  const cols = Math.ceil(Math.sqrt(frames));
  const rows = Math.ceil(frames / cols);
  const g = BRAND_DENSITY.gutter;
  const cells = Array.from({ length: frames }, (_, i) => ({ x: (i % cols) * (fw + g), y: Math.floor(i / cols) * (fh + g) }));
  return { w: cols * fw + (cols - 1) * g, h: rows * fh + (rows - 1) * g, fw, fh, cells };
}
