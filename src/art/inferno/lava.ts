/** Lava surface strip, additive glow and ember particles. */
import { buildFrames, makeCanvas, ctxOf, PAL, px } from '../pixel';
import { PixBuf, ditherPick, rgba } from './buf';

const LW = 32;
const TAU = Math.PI * 2;
const BODY = [PAL.lavaDeep, PAL.lavaRed, PAL.lavaOrange, '#fca024', PAL.lavaYellow, PAL.lavaHot].map((h) => rgba(h));
const CRUST = rgba('#2a0806');
const CRUST_HI = rgba('#5a1208');

/**
 * Every wave has an integer number of periods over 32 px and over 4 frames → seamless loop.
 * Rows: hot crest, orange/red band, scalloped dark crust (scrolls 4 px/frame), molten body
 * fading to solid PAL.lavaRed on the last row so gameplay can fill below with that colour.
 */
function lavaFrame(buf: PixBuf, ox: number, f: number): void {
  const t = (f / 4) * TAU;
  for (let x = 0; x < LW; x++) {
    const a = (x / LW) * TAU;
    const crest = 2 + Math.round(0.9 * Math.sin(2 * a + t) + 0.5 * Math.sin(3 * a - t));
    const sc = (((x + f * 4) % 16) + 0.5) / 16;
    const line = 11 - Math.round(3.3 * Math.sin(Math.PI * sc));
    for (let y = crest; y < LW; y++) {
      let c: number;
      if (y === crest) c = BODY[5];
      else if (y === crest + 1) c = BODY[4];
      else if (y < line) c = ditherPick(BODY, 0.55 - (y - crest) * 0.07, x, y);
      else if (y === line) c = CRUST;
      else if (y === line + 1) c = CRUST_HI;
      else {
        // molten body: blob cells from products of travelling waves over red
        let v =
          0.56 +
          0.26 * Math.sin(2 * a + t) * Math.sin(y * 0.55) +
          0.2 * Math.sin(3 * a - t + 1) * Math.cos(y * 0.9 + 0.5) +
          0.1 * Math.sin(5 * a + 2 * t + y * 0.3);
        if (y === line + 2) v -= 0.25;
        if (y >= 27) v += (0.2 - v) * ((y - 27) / 4);
        c = ditherPick(BODY, v, x, y);
      }
      buf.set(ox + x, y, c);
    }
  }
}

export function buildLava(): HTMLCanvasElement {
  const buf = new PixBuf(LW * 4, LW);
  for (let f = 0; f < 4; f++) lavaFrame(buf, f * LW, f);
  return buf.toCanvas();
}

/** 64x32 soft glow, brightest at the bottom, horizontally uniform so it can tile. */
export function buildLavaGlow(): HTMLCanvasElement {
  const c = makeCanvas(64, 32);
  const ctx = ctxOf(c);
  const g = ctx.createLinearGradient(0, 0, 0, 32);
  g.addColorStop(0, 'rgba(252,122,16,0)');
  g.addColorStop(0.55, 'rgba(252,122,16,0.22)');
  g.addColorStop(1, 'rgba(252,170,48,0.6)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 32);
  return c;
}

const EMBER: readonly (readonly [string, string, string])[] = [
  [PAL.lavaHot, PAL.lavaYellow, PAL.lavaOrange],
  [PAL.lavaYellow, PAL.lavaOrange, PAL.lavaRed],
  [PAL.lavaOrange, PAL.lavaRed, ''],
  [PAL.lavaRed, '', ''],
];

export function buildEmber(): HTMLCanvasElement {
  return buildFrames(4, 4, 4, (ctx, i) => {
    const [core, ring, corner] = EMBER[i];
    px(ctx, 1, 1, core);
    if (i < 2) px(ctx, 2, 2, core);
    else px(ctx, 2, 2, ring || core);
    if (ring) for (const [x, y] of [[2, 1], [1, 2], [1, 0], [0, 1], [3, 2], [2, 3]]) px(ctx, x, y, ring);
    if (corner) for (const [x, y] of [[2, 0], [0, 2], [3, 1], [1, 3]]) px(ctx, x, y, corner);
  });
}
