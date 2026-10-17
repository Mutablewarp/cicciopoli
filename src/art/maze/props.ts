/** Small CICCIO-MAN props: nugget dots, provola power sticks, bonus food, golf hole + flag, captions. */
import { PAL, ctxOf, fillEllipse, makeCanvas, mix, outline, paintGrid } from '../pixel';
import { CAPTION, drawText, textWidth } from './font';
import { MZ } from './palette';

/** 4x4 mini nugget: breaded, golden-brown, a crumb highlight top-left. */
export function nuggetDot(): HTMLCanvasElement {
  const c = makeCanvas(4, 4);
  paintGrid(ctxOf(c), ['.LN.', 'LNNd', 'NdNd', '.dd.'], { L: MZ.nuggetLight, N: MZ.nugget, d: MZ.nuggetDark });
  return c;
}

/** 8x8 frames: a 6x4 battered provola stick (+ outline); frame 1 adds a hot glint. */
export function stickFrames(): HTMLCanvasElement[] {
  return [0, 1].map((i) => {
    const c = makeCanvas(8, 8);
    const ctx = ctxOf(c);
    paintGrid(ctx, ['lLlLLl', 'BbBBbB', 'BBbBBm', 'mmMmmM'], { l: MZ.batterLight, L: '#fff0c0', B: MZ.batter, b: MZ.batterLight, m: MZ.batterMid, M: MZ.batterDark }, 1, 2);
    if (i === 1) paintGrid(ctx, ['ww', 'w.'], { w: '#ffffff' }, 2, 2);
    outline(c, MZ.batterInk);
    return c;
  });
}

const BURGER = [
  '................',
  '................',
  '.....oOOOOo.....',
  '...oOOsOOsOOo...',
  '..oOsOOOOOOsOo..',
  '..OOOOOOOOOOOO..',
  '..llLllLllLlll..',
  '..yYyyyyYyyyyy..',
  '..PPPPPPPPPPPP..',
  '..pPPPPPPPPPPp..',
  '..tTtttTtttTtt..',
  '..BBBBBBBBBBBB..',
  '...bBBBBBBBBb...',
  '................',
  '................',
  '................',
];

const FRIES = [
  '................',
  '...f..F..f......',
  '...fF.Ff.fF.f...',
  '..FfFfFfFfFfFf..',
  '..fFfFfFfFfFfF..',
  '.RRRRRRRRRRRRRR.',
  '.rwkwkwkwkwkwkr.',
  '.rRRRRRRRRRRRRr.',
  '..rRRRRRRRRRRr..',
  '..rRRRRRRRRRRr..',
  '...rRRRRRRRRr...',
  '...rrrrrrrrrr...',
  '................',
  '................',
  '................',
  '................',
];

const WINGS = [
  '................',
  '..oGGo....oGGo..',
  '.oGcGGo..oGGcGo.',
  '.GGGGcG..GcGGGG.',
  '.GcGGGGooGGGGcG.',
  '.oGGcGGGGGGcGGo.',
  '..oGGGGcGGGGGo..',
  '...ooGGGGcGoo...',
  '.....oGGGGo.....',
  '......WooW......',
  '.....WW..WW.....',
  '....Ww....wW....',
  '...wW......Ww...',
  '................',
  '................',
  '................',
];

/** 16x16 frames: 0 burger, 1 Ciccio's red fries tray, 2 crunchy wings. */
export function bonusFrames(): HTMLCanvasElement[] {
  const burger = {
    o: PAL.bunLight, O: PAL.bun, s: '#fff4d0', l: PAL.lettuce, L: '#3a8a18', y: PAL.cheese, Y: PAL.cheeseDark,
    P: PAL.patty, p: '#3a1a0c', t: PAL.tomato, T: '#a81810', B: PAL.bun, b: PAL.bunDark,
  };
  const fries = { f: PAL.fry, F: PAL.fryDark, R: MZ.tray, r: '#5e1a1c', w: MZ.linerWhite, k: MZ.linerBlack };
  const wings = { G: '#d8902e', c: '#f6c45a', o: '#9a5418', W: '#f4ecd8', w: '#c8bca4' };
  return ([[BURGER, burger], [FRIES, fries], [WINGS, wings]] as const).map(([rows, pal]) => {
    const c = makeCanvas(16, 16);
    paintGrid(ctxOf(c), rows, pal);
    outline(c, PAL.ink);
    return c;
  });
}

/** 24x12 putting green (lime grass, as on the cup) with the black golf hole in the middle. */
export function holeImage(): HTMLCanvasElement {
  const c = makeCanvas(24, 12);
  const ctx = ctxOf(c);
  fillEllipse(ctx, 12, 6, 11, 5, PAL.grassDark);
  fillEllipse(ctx, 12, 6, 10, 4, PAL.grassMid);
  fillEllipse(ctx, 11, 5, 8, 3, PAL.grass);
  ctx.fillStyle = PAL.grassMid;
  for (let x = 4; x < 20; x += 3) ctx.fillRect(x, (x * 7) % 3 === 0 ? 4 : 7, 1, 1); // grass blades
  fillEllipse(ctx, 12, 6, 4, 2, '#2a1a10');
  fillEllipse(ctx, 12, 7, 3, 1, '#000000');
  outline(c, PAL.ink);
  return c;
}

/** 16x24 frames: red golf flag waving on an orange pole (base at 3,23). */
export function flagFrames(): HTMLCanvasElement[] {
  return [0, 1, 2, 3].map((i) => {
    const c = makeCanvas(16, 24);
    const ctx = ctxOf(c);
    for (let y = 2; y < 23; y++) {
      ctx.fillStyle = y % 5 === 0 ? PAL.poleLight : PAL.pole;
      ctx.fillRect(3, y, 1, 1);
    }
    ctx.fillStyle = PAL.poleLight;
    ctx.fillRect(3, 1, 1, 1);
    for (let x = 4; x <= 13; x++) {
      const t = (x - 4) / 9;
      const wave = Math.round(Math.sin(t * Math.PI * 1.5 - i * (Math.PI / 2)) * 1.2 * t);
      const h = Math.round(7 - t * 3);
      for (let k = 0; k < h; k++) {
        ctx.fillStyle = k === 0 ? '#ff5a4a' : k === h - 1 ? PAL.flagRedDark : PAL.flagRed;
        ctx.fillRect(x, 2 + wave + k + Math.round(t * 1.5), 1, 1);
      }
    }
    outline(c, PAL.ink);
    return c;
  });
}

/** Cheese-yellow caption with ink outline (e.g. "PRONTI!", "VAI IN BUCA!"). */
export function caption(text: string): HTMLCanvasElement {
  const w = textWidth(CAPTION, text) + 2;
  const c = makeCanvas(w, 9);
  drawText(ctxOf(c), CAPTION, text, 1, 1, PAL.cheeseLight, { color: PAL.cheese, from: 3 });
  outline(c, PAL.ink);
  return c;
}

/** 12x22: a tunnel corridor continuing left of the board edge (from 8 px above its row), fading to dark. */
export function tunnelMouth(): HTMLCanvasElement {
  const w = 12;
  const c = makeCanvas(w, 22);
  const ctx = ctxOf(c);
  const put = (x: number, y: number, col: string): void => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let x = 0; x < w; x++) {
    const fade = (w - 1 - x) / (w - 1); // 0 at the board edge, 1 far under the paper
    const wx = x - w; // world x (the image ends at x = 0)
    put(x, 2, ((wx + 106) % 2 + 2) % 2 === 0 ? MZ.linerWhite : MZ.linerBlack);
    put(x, 3, MZ.trayRimShade);
    put(x, 4, MZ.trayInk);
    for (let y = 5; y <= 18; y++) put(x, y, mix(y === 5 ? MZ.floorShadow : MZ.floor, '#000000', Math.min(1, fade * 1.15)));
    put(x, 19, MZ.trayInk);
    put(x, 20, MZ.trayRimLit);
    put(x, 21, ((wx + 125) % 2 + 2) % 2 === 0 ? MZ.linerWhite : MZ.linerBlack);
  }
  return c;
}
