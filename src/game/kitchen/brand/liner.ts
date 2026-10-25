/**
 * The tray liner like the real one (ref/level7_wrap_tray.jpg): a sheet of cream paper printed with
 * rows of grey "CICCIO'S", laid a little askew on the black tray. 104x28 art px, laid over the
 * pixel-art tray (KITCHEN.tray) at LINER_AT (tray px) so it covers the tray's floor.
 */
import { polyPath, type Pt } from './kit';
import { printSheet } from './print';

export const LINER_W = 104;
export const LINER_H = 28;

const PAPER = { light: '#f6f1e6', base: '#ece4d3', edge: 'rgba(110,98,80,0.45)', ink: 'rgba(70,66,60,0.62)' } as const;
const PRINT = { letterH: 3, rowPitch: 2.4, wordGap: 1.4, angle: -0.07, phase: 0.3 } as const;
/** The sheet's corners: a touch askew, the front-right corner lifted off the floor. */
const SHEET: readonly Pt[] = [[0.6, 1.2], [103.2, 0.4], [103.6, 27.4], [0.3, 27.8]];

/** Paints the liner at the context's origin, in art px. */
export function paintLiner(ctx: CanvasRenderingContext2D): void {
  // thin shadow of the sheet on the tray floor (right and bottom edges)
  ctx.save();
  ctx.translate(0.6, 0.6);
  ctx.beginPath();
  polyPath(ctx, SHEET);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  polyPath(ctx, SHEET);
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, LINER_W * 0.4, LINER_H * 1.6);
  g.addColorStop(0, PAPER.light);
  g.addColorStop(1, PAPER.base);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LINER_W, LINER_H);
  printSheet(ctx, LINER_W, LINER_H, PRINT, PAPER.ink);
  // the tray's rims shade the paper's edges a little
  const v = ctx.createLinearGradient(0, 0, 0, LINER_H);
  v.addColorStop(0, 'rgba(60,50,40,0.16)');
  v.addColorStop(0.15, 'rgba(60,50,40,0)');
  v.addColorStop(0.9, 'rgba(60,50,40,0)');
  v.addColorStop(1, 'rgba(60,50,40,0.10)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, LINER_W, LINER_H);
  ctx.restore();
  ctx.beginPath();
  polyPath(ctx, SHEET);
  ctx.strokeStyle = PAPER.edge;
  ctx.lineWidth = 0.3;
  ctx.stroke();
}
