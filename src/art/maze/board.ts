/**
 * Pre-renders the CICCIO-MAN board (224x248): charcoal floor with soft wall shadows and
 * Ciccio's maroon paper trays as walls — dark edge, lit rim (light from the top-left),
 * black/white checkered liner, paper floor. The ghost house is a deeper tray with a
 * paper-ticket door; the big top block carries the printed logo.
 */
import { ctxOf, hexToRgb, makeCanvas, rng } from '../pixel';
import { COLS, MAZE, MAZE_H, MAZE_W, ROWS, TILE, TUNNEL_ROWS } from '../../game/maze/layout';
import { MZ } from './palette';
import { PRINT, drawText, textWidth } from './font';

/** Floor visible inside a wall cell next to a corridor (px). */
const INSET = 3;
/** Ghost house cells (cols 10-17, rows 12-16): drawn by hand, excluded from the generic trays. */
const HOUSE_RECT = { c0: 10, r0: 12, c1: 17, r1: 16 };
/** Top-centre block that carries the printed logo (cols 10-17, rows 6-10). */
const LOGO_RECT = { x0: 80, y0: 48, x1: 144, y1: 88 };

type Rgb = [number, number, number];

class Buf {
  readonly data = new Uint8ClampedArray(MAZE_W * MAZE_H * 4);
  set(x: number, y: number, c: Rgb): void {
    if (x < 0 || y < 0 || x >= MAZE_W || y >= MAZE_H) return;
    const i = (y * MAZE_W + x) * 4;
    this.data[i] = c[0];
    this.data[i + 1] = c[1];
    this.data[i + 2] = c[2];
    this.data[i + 3] = 255;
  }
}

const C = Object.fromEntries(Object.entries(MZ).map(([k, v]) => [k, hexToRgb(v)])) as Record<keyof typeof MZ, Rgb>;

function inHouse(c: number, r: number): boolean {
  return c >= HOUSE_RECT.c0 && c <= HOUSE_RECT.c1 && r >= HOUSE_RECT.r0 && r <= HOUSE_RECT.r1;
}

/** Cell counts as floor for the tray computation (corridors, tunnel mouths, the hand-drawn house). */
function floorCell(c: number, r: number): boolean {
  if (TUNNEL_ROWS.includes(r) && (c < 0 || c >= COLS)) return true;
  if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return false;
  return MAZE.cell(c, r) !== 'wall' || inHouse(c, r);
}

/** Tray mask: wall pixels farther than INSET (euclidean) from every floor cell. */
function trayMask(): Uint8Array {
  const m = new Uint8Array(MAZE_W * MAZE_H);
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      const c = Math.floor(x / TILE);
      const r = Math.floor(y / TILE);
      if (floorCell(c, r)) continue;
      let near = Infinity;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!floorCell(c + dc, r + dr)) continue;
          const x0 = (c + dc) * TILE;
          const y0 = (r + dr) * TILE;
          const dx = Math.max(x0 - (x + 0.5), 0, x + 0.5 - (x0 + TILE));
          const dy = Math.max(y0 - (y + 0.5), 0, y + 0.5 - (y0 + TILE));
          near = Math.min(near, Math.hypot(dx, dy));
        }
      }
      if (near > INSET) m[y * MAZE_W + x] = 1;
    }
  }
  return m;
}

/** Chebyshev depth of every tray pixel from the floor (1 = edge). Off-board counts as tray. */
function depthMap(mask: Uint8Array): Uint8Array {
  const d = new Uint8Array(MAZE_W * MAZE_H);
  const isTray = (x: number, y: number): boolean => {
    if (x < 0 || x >= MAZE_W) return !TUNNEL_ROWS.includes(Math.floor(y / TILE));
    if (y < 0 || y >= MAZE_H) return true;
    return mask[y * MAZE_W + x] === 1;
  };
  for (let layer = 1; layer <= 6; layer++) {
    for (let y = 0; y < MAZE_H; y++) {
      for (let x = 0; x < MAZE_W; x++) {
        const i = y * MAZE_W + x;
        if (!mask[i] || d[i]) continue;
        let edge = false;
        for (let j = -1; j <= 1 && !edge; j++) {
          for (let k = -1; k <= 1 && !edge; k++) {
            if (!isTray(x + k, y + j)) edge = layer === 1;
            else if (layer > 1 && d[(y + j) * MAZE_W + (x + k)] === layer - 1 && x + k >= 0 && x + k < MAZE_W && y + j >= 0 && y + j < MAZE_H) edge = true;
          }
        }
        if (edge) d[i] = layer;
      }
    }
  }
  return d;
}

function paintFloor(b: Buf, mask: Uint8Array): void {
  const rand = rng(4404);
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      if (mask[y * MAZE_W + x]) continue;
      const t = rand();
      const wallUL = (x > 0 && mask[y * MAZE_W + x - 1]) || (y > 0 && mask[(y - 1) * MAZE_W + x]);
      b.set(x, y, wallUL ? C.floorShadow : t < 0.05 ? C.floorLight : t < 0.1 ? C.floorDark : C.floor);
    }
  }
}

/** Rim colour by which side of the tray the floor is on (light from the top-left). */
function rimColour(d: Uint8Array, x: number, y: number): Rgb {
  const edge = (k: number, j: number): number => {
    const xx = x + k;
    const yy = y + j;
    if (xx < 0 || yy < 0 || xx >= MAZE_W || yy >= MAZE_H) return 0;
    return d[yy * MAZE_W + xx] === 1 ? 1 : 0;
  };
  const lit = edge(0, -1) + edge(-1, 0) + edge(-1, -1);
  const dark = edge(0, 1) + edge(1, 0) + edge(1, 1);
  if (lit > dark) return C.trayRimLit;
  if (dark > lit) return C.trayRimShade;
  return C.trayRimMid;
}

/** First row inside the liner: the tray is concave, so the top-left inner wall is in shade. */
function innerWall(d: Uint8Array, x: number, y: number): Rgb {
  const at = (k: number, j: number): boolean =>
    x + k >= 0 && x + k < MAZE_W && y + j >= 0 && y + j < MAZE_H && d[(y + j) * MAZE_W + (x + k)] === 3;
  if (at(0, -1) || at(-1, 0)) return C.trayInnerShade;
  if (at(0, 1) || at(1, 0)) return C.trayInnerLit;
  return C.tray;
}

function paintTrays(b: Buf, d: Uint8Array): void {
  const rand = rng(8811);
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      const layer = d[y * MAZE_W + x];
      const t = rand();
      if (layer === 0) continue;
      if (layer === 1) b.set(x, y, C.trayInk);
      else if (layer === 2) b.set(x, y, rimColour(d, x, y));
      else if (layer === 3) b.set(x, y, (x + y) % 2 === 0 ? C.linerWhite : C.linerBlack);
      else if (layer === 4) b.set(x, y, innerWall(d, x, y));
      else b.set(x, y, t < 0.08 ? C.trayLight : t < 0.16 ? C.trayDark : C.tray);
    }
  }
  // tray floors left unlabelled by the depth pass (deep inside big blocks)
  for (let y = 0; y < MAZE_H; y++) {
    for (let x = 0; x < MAZE_W; x++) {
      const i = y * MAZE_W + x;
      if (d[i] === 0 && b.data[i * 4 + 3] === 0) b.set(x, y, rand() < 0.1 ? C.trayDark : C.tray);
    }
  }
}

/** The ghost house: a deeper tray with liner band, lined floor and a cream paper-ticket door. */
function paintHouse(b: Buf): void {
  const L = HOUSE_RECT.c0 * TILE + 2;
  const T = HOUSE_RECT.r0 * TILE + 2;
  const R = (HOUSE_RECT.c1 + 1) * TILE - 3;
  const B = (HOUSE_RECT.r1 + 1) * TILE - 3;
  const IL = L + 6;
  const IT = T + 6;
  const IR = R - 6;
  const IB = B - 6;
  for (let y = T; y <= B; y++) {
    for (let x = L; x <= R; x++) {
      const k = Math.min(x - L, y - T, R - x, B - y);
      if (x >= IL && x <= IR && y >= IT && y <= IB) {
        const chk = (Math.floor((x - IL) / 4) + Math.floor((y - IT) / 4)) % 2 === 0;
        const shadow = x === IL || y === IT;
        b.set(x, y, shadow ? C.floorShadow : chk ? C.houseFloor : C.houseFloorAlt);
        continue;
      }
      const litSide = y - T === k || x - L === k;
      if (k === 0 || k === 5) b.set(x, y, C.trayInk);
      else if (k === 1) b.set(x, y, litSide ? C.trayRimLit : C.trayRimShade);
      else if (k === 4) b.set(x, y, (x + y) % 2 === 0 ? C.linerWhite : C.linerBlack);
      else b.set(x, y, C.tray);
    }
  }
  // door gap over cols 13-14 with a cream ticket bar
  const dx0 = 13 * TILE;
  const dx1 = 15 * TILE - 1;
  for (let y = T; y < IT; y++) for (let x = dx0; x <= dx1; x++) b.set(x, y, C.floor);
  for (let x = dx0 - 1; x <= dx1 + 1; x++) {
    b.set(x, T + 2, x === dx0 - 1 || x === dx1 + 1 ? C.trayInk : C.doorLight);
    b.set(x, T + 3, x === dx0 - 1 || x === dx1 + 1 ? C.trayInk : C.doorDark);
  }
}

/** Printed logo on the big top-centre tray: the head (as on the paper) and the wordmark. */
function paintLogo(canvas: HTMLCanvasElement, head: HTMLCanvasElement): void {
  const ctx = ctxOf(canvas);
  const word = "CICCIO'S";
  const ww = textWidth(PRINT, word);
  const cx = (LOGO_RECT.x0 + LOGO_RECT.x1) / 2;
  const top = LOGO_RECT.y0 + 9;
  ctx.drawImage(head, Math.round(cx - head.width / 2), top);
  drawText(ctx, PRINT, word, Math.round(cx - ww / 2), top + head.height + 2, MZ.printCream);
}

export function buildBoard(logoHead: HTMLCanvasElement): HTMLCanvasElement {
  const mask = trayMask();
  const depth = depthMap(mask);
  const b = new Buf();
  paintFloor(b, mask);
  paintTrays(b, depth);
  paintHouse(b);
  const canvas = makeCanvas(MAZE_W, MAZE_H);
  ctxOf(canvas).putImageData(new ImageData(b.data, MAZE_W, MAZE_H), 0, 0);
  paintLogo(canvas, logoHead);
  return canvas;
}

/** 64x64 seamless tray paper for the space around the board, with a faint repeated wordmark. */
export function buildPanel(): HTMLCanvasElement {
  const c = makeCanvas(64, 64);
  const ctx = ctxOf(c);
  const rand = rng(5150);
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 64; x++) {
      const t = rand();
      ctx.fillStyle = t < 0.08 ? MZ.trayLight : t < 0.16 ? MZ.trayDark : MZ.tray;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  drawText(ctx, PRINT, "CICCIO'S", 4, 12, MZ.print);
  drawText(ctx, PRINT, "CICCIO'S", 36, 44, MZ.print);
  return c;
}
