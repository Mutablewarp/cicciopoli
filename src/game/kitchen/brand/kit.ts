/**
 * Shared bits of the brand painters. Every painter draws one frame in ART px on a context the caller
 * has already scaled (device px per art px) and moved to the frame's corner: vector paper and print
 * come out crisp at screen resolution, the pixel-art food is copied in with hard pixels.
 */

export type Pt = readonly [number, number];

/** A frame of a pixel-art texture (its source image and the cut inside it). */
export interface PixelFrame {
  src: CanvasImageSource;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Finds a pixel-art frame by texture key and frame index (null = not available: the painter skips it). */
export type PixelPick = (key: string, frame: number) => PixelFrame | null;

/** Copies a pixel-art frame with hard pixels at (x, y) art px, `s` art px per pixel. */
export function drawPixels(ctx: CanvasRenderingContext2D, f: PixelFrame, x: number, y: number, s = 1): void {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(f.src, f.x, f.y, f.w, f.h, x, y, f.w * s, f.h * s);
  ctx.restore();
}

/** Adds a smooth curve through the points (Catmull-Rom as cubic Béziers) to the current path. */
export function smoothPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed: boolean): void {
  const n = pts.length;
  const at = (i: number): Pt => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  ctx.moveTo(pts[0][0], pts[0][1]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    ctx.bezierCurveTo(
      p1[0] + (p2[0] - p0[0]) / 6,
      p1[1] + (p2[1] - p0[1]) / 6,
      p2[0] - (p3[0] - p1[0]) / 6,
      p2[1] - (p3[1] - p1[1]) / 6,
      p2[0],
      p2[1],
    );
  }
  if (closed) ctx.closePath();
}

/** Adds a polygon (closed) or a polyline (open) to the current path. */
export function polyPath(ctx: CanvasRenderingContext2D, pts: readonly Pt[], closed = true): void {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (closed) ctx.closePath();
}

/** Soft contact shadow: an ellipse fading out from its centre. */
export function contactShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, alpha: number): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
