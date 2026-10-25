/**
 * The owner's ORIGINAL face logo (public/brand/ciccio-face-hd.png), never redrawn: resampled with
 * the browser's high-quality filter at screen resolution. Plain, on a white disc (the round sign on
 * the pillar, like ref/level7_lalumia_counter.jpg) and GOLD for the YOU ARE SO GOLDEN finale: the
 * original pixels tinted (white -> gold, black -> bronze), the drawing identical.
 */

/** Logical sizes (art px). The face keeps the logo's 358:512 proportions. */
export const FACE_W = 42;
export const FACE_H = 60;
export const DISC = 36;
/** Face height on the disc, and its centre (art px). */
const DISC_FACE = { h: 26, cx: 18, cy: 18.4 } as const;

const GOLD = {
  /** what the white of the face becomes, top to bottom */
  face: ['#fff6cc', '#ffe07a', '#f7c23c'],
  /** the disc's gold, centre to rim */
  disc: ['#f2bd3e', '#d18a16', '#8f5606'],
  /** what the black lines become */
  bronze: '#5c3a06',
  rim: '#6e4304',
} as const;

/** Copies the logo into (x, y, w, h) art px with high-quality smoothing. */
function drawLogo(ctx: CanvasRenderingContext2D, img: CanvasImageSource, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/**
 * The logo tinted gold on its own canvas of w x h DEVICE px: multiply by a gold gradient (white ->
 * gold, black stays), screen with bronze (black -> bronze), then the logo's own alpha back.
 */
export function goldLogo(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  drawLogo(ctx, img, 0, 0, w, h);
  const g = ctx.createLinearGradient(0, 0, w * 0.35, h);
  GOLD.face.forEach((col, i) => g.addColorStop(i / (GOLD.face.length - 1), col));
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = GOLD.bronze;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'destination-in';
  drawLogo(ctx, img, 0, 0, w, h);
  return c;
}

/** Paints the plain face (FACE_W x FACE_H art px) at the context's origin. */
export function paintFace(ctx: CanvasRenderingContext2D, img: CanvasImageSource): void {
  drawLogo(ctx, img, 0, 0, FACE_W, FACE_H);
}

/** Paints the gold face (FACE_W x FACE_H art px); k = device px per art px of the context. */
export function paintGoldFace(ctx: CanvasRenderingContext2D, img: CanvasImageSource, k: number): void {
  drawLogo(ctx, goldLogo(img, Math.ceil(FACE_W * k), Math.ceil(FACE_H * k)), 0, 0, FACE_W, FACE_H);
}

/** Paints the round sign (DISC x DISC art px): white disc (or gold) with a thin rim and the face. */
export function paintDisc(ctx: CanvasRenderingContext2D, img: CanvasImageSource, gold: boolean, k: number): void {
  const r = DISC / 2;
  const fill = (() => {
    if (!gold) return '#fbfbf8';
    const g = ctx.createRadialGradient(r * 0.7, r * 0.6, 1, r, r, r);
    GOLD.disc.forEach((col, i) => g.addColorStop(i / (GOLD.disc.length - 1), col));
    return g;
  })();
  ctx.beginPath();
  ctx.arc(r, r, r - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = gold ? GOLD.rim : 'rgba(40,40,40,0.55)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // soft inner shade so the disc reads as a sign, not a sticker
  const shade = ctx.createRadialGradient(r, r, r * 0.7, r, r, r);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = shade;
  ctx.fill();
  const fh = DISC_FACE.h;
  const fw = (fh * FACE_W) / FACE_H;
  const x = DISC_FACE.cx - fw / 2;
  const y = DISC_FACE.cy - fh / 2;
  if (gold) drawLogo(ctx, goldLogo(img, Math.ceil(fw * k), Math.ceil(fh * k)), x, y, fw, fh);
  else drawLogo(ctx, img, x, y, fw, fh);
}
