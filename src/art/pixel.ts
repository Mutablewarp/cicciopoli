/**
 * Pixel-art drawing helpers shared by every art pack. OWNER: integrator.
 * Pure DOM canvas code — no Phaser import — so packs also run in gallery.html.
 */

/** Brand palette sampled from the Ciccio's cup / box artwork and logo. */
export const PAL = {
  ink: '#141414', //       universal dark outline
  inkSoft: '#2a2422',
  hud: '#242424', //       cup HUD band (anthracite)
  cream: '#fce4c0', //     cup clouds, HUD text
  creamLight: '#fcf0d8',
  creamShade: '#e4cca8',
  sky: '#60ccf0',
  skyDeep: '#3aa8e0',
  skyPale: '#a8e4f4',
  hill: '#489c30',
  hillLight: '#5cb43c',
  hillDark: '#2f7a24',
  hillOutline: '#1f3a2c',
  grass: '#a8cc00', //     bright lime grass top
  grassMid: '#48b424',
  grassDark: '#2c8a1c',
  brick: '#603c3c',
  brickLight: '#784848',
  brickDark: '#3c3030',
  mortar: '#2a2020',
  qOrange: '#fc9000',
  qOrangeDark: '#d86c00',
  qOrangeLight: '#fcc060',
  flagRed: '#fc000c',
  flagRedDark: '#b00010',
  pole: '#fc8400',
  poleLight: '#fcc000',
  heart: '#fc0c24',
  skin: '#f6c08a',
  skinShade: '#d89660',
  skinDark: '#a8683c',
  hair: '#141414',
  shirt: '#fcfcf4',
  shirtShade: '#d8d8d0',
  shorts: '#22307a', //   denim navy
  shortsLight: '#3a4ea0',
  shortsDark: '#141c4c',
  shoe: '#e83a1c', //     red-orange shoes
  shoeDark: '#9a1c0c',
  sole: '#2a1a14',
  cheese: '#fcd400',
  cheeseLight: '#fcf070',
  cheeseDark: '#d89c00',
  fry: '#fcc030',
  fryDark: '#d88a10',
  bun: '#e0902c',
  bunLight: '#f4b860',
  bunDark: '#a85a18',
  patty: '#5a2c18',
  lettuce: '#5cc020',
  tomato: '#e83020',
  // inferno
  lavaHot: '#fff0a0',
  lavaYellow: '#fcc020',
  lavaOrange: '#fc7a10',
  lavaRed: '#d82810',
  lavaDeep: '#8c1408',
  bordeaux: '#4a0e1c',
  wine: '#6e1626',
  ember: '#fc9c30',
  coral: '#f0645a',
  stone: '#3a2a30',
  stoneLight: '#56404a',
  stoneDark: '#22161c',
  castle: '#2a1018',
  castleLit: '#fcb040',
} as const;

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) ctx.imageSmoothingEnabled = false;
  return c;
}

export function ctxOf(c: HTMLCanvasElement): Ctx {
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D canvas unavailable');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Paint ASCII pixel art. Each char maps through `palette`; '.' and ' ' are transparent.
 * Example: paintGrid(ctx, ['.kk.', 'kyyk'], { k: PAL.ink, y: PAL.cheese }, 2, 3)
 */
export function paintGrid(
  ctx: Ctx,
  rows: readonly string[],
  palette: Readonly<Record<string, string>>,
  ox = 0,
  oy = 0,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (color === undefined) throw new Error(`paintGrid: no colour for '${ch}'`);
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    }
  }
}

/** Filled pixel-perfect ellipse (integer bounding box, no anti-aliasing). */
export function fillEllipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string): void {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.0001))));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}

export function fillCircle(ctx: Ctx, cx: number, cy: number, r: number, color: string): void {
  fillEllipse(ctx, cx, cy, r, r, color);
}

/** Bresenham line, 1 px wide. */
export function line(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, color: string): void {
  ctx.fillStyle = color;
  let ax = Math.round(x0);
  let ay = Math.round(y0);
  const bx = Math.round(x1);
  const by = Math.round(y1);
  const dx = Math.abs(bx - ax);
  const dy = -Math.abs(by - ay);
  const sx = ax < bx ? 1 : -1;
  const sy = ay < by ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    ctx.fillRect(ax, ay, 1, 1);
    if (ax === bx && ay === by) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; ax += sx; }
    if (e2 <= dx) { err += dx; ay += sy; }
  }
}

/** Adds a 1-px outline (4-neighbourhood) around every opaque pixel of the canvas region. */
export function outline(c: HTMLCanvasElement, color: string = PAL.ink, region?: { x: number; y: number; w: number; h: number }): void {
  const r = region ?? { x: 0, y: 0, w: c.width, h: c.height };
  const ctx = ctxOf(c);
  const img = ctx.getImageData(r.x, r.y, r.w, r.h);
  const a = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= r.w || y >= r.h ? 0 : img.data[(y * r.w + x) * 4 + 3];
  ctx.fillStyle = color;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (a(x, y) > 0) continue;
      if (a(x - 1, y) > 127 || a(x + 1, y) > 127 || a(x, y - 1) > 127 || a(x, y + 1) > 127) {
        ctx.fillRect(r.x + x, r.y + y, 1, 1);
      }
    }
  }
}

/** Deterministic PRNG (mulberry32) so art is identical on every load. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered-dither threshold in [0,1) for pixel (x, y) — use for pixel-art gradients. */
export function bayer(x: number, y: number): number {
  return (BAYER4[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number): string => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix of two hex colours, t in [0,1]. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

/** Lighten (amt > 0) or darken (amt < 0) a hex colour, amt in [-1,1]. */
export function shade(hex: string, amt: number): string {
  return amt >= 0 ? mix(hex, '#ffffff', amt) : mix(hex, '#000000', -amt);
}

/** Copy `src` into `dst` at (x, y); optional horizontal flip. */
export function blit(dst: HTMLCanvasElement, src: HTMLCanvasElement, x: number, y: number, flipX = false): void {
  const ctx = ctxOf(dst);
  if (!flipX) {
    ctx.drawImage(src, x, y);
    return;
  }
  ctx.save();
  ctx.translate(x + src.width, y);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  ctx.restore();
}

/** Packs equally sized frames into a sheet, row-major, up to `maxCols` per row. */
export function packSheet(frames: readonly HTMLCanvasElement[], fw: number, fh: number, maxCols = 16): HTMLCanvasElement {
  const cols = Math.min(maxCols, frames.length);
  const rows = Math.ceil(frames.length / cols);
  const sheet = makeCanvas(cols * fw, rows * fh);
  frames.forEach((f, i) => blit(sheet, f, (i % cols) * fw, Math.floor(i / cols) * fh));
  return sheet;
}

/** Draws `count` frames by calling `draw(ctx, frameIndex)` on fresh canvases, then packs them. */
export function buildFrames(count: number, fw: number, fh: number, draw: (ctx: Ctx, i: number, c: HTMLCanvasElement) => void): HTMLCanvasElement {
  const frames: HTMLCanvasElement[] = [];
  for (let i = 0; i < count; i++) {
    const c = makeCanvas(fw, fh);
    draw(ctxOf(c), i, c);
    frames.push(c);
  }
  return packSheet(frames, fw, fh);
}

/** Vertical dithered gradient through colour stops [{at:0..1,color}] into a rect. */
export function ditherGradient(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  stops: readonly { at: number; color: string }[],
): void {
  for (let j = 0; j < h; j++) {
    const t = h <= 1 ? 0 : j / (h - 1);
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1].at) k++;
    const a = stops[k];
    const b = stops[Math.min(k + 1, stops.length - 1)];
    const span = Math.max(0.0001, b.at - a.at);
    const local = Math.max(0, Math.min(1, (t - a.at) / span));
    for (let i = 0; i < w; i++) {
      ctx.fillStyle = local > bayer(x + i, y + j) ? b.color : a.color;
      ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
}
