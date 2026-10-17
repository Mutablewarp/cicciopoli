/**
 * Ciccio's round head for CICCIO-MAN (16x16 frames, logo face: black hair mass, round black
 * glasses with a glint, smile). Facing right / up / down are drawn by hand; left mirrors
 * right, so the glasses are never upside down. Chomping cuts a jaw wedge (right, down) or
 * opens an O-mouth (up). Death squashes the front face flat (a poof follows in-game).
 */
import { PAL, ctxOf, makeCanvas, outline, paintGrid } from '../pixel';
import { MZ } from './palette';

const F = 16;

const SKIN: Readonly<Record<string, string>> = {
  h: '#1b1b20',
  H: '#3c3c4c',
  k: PAL.ink,
  g: '#0c0c0e',
  w: '#ffffff',
  s: PAL.skin,
  l: '#fcd8a8',
  S: PAL.skinShade,
  m: '#7a2a1a',
};

const RIGHT = [
  '................',
  '......hhhh......',
  '....hhHHHhhh....',
  '...hhHHhhhhhh...',
  '..hhhhhhhhhhhh..',
  '..hhhskkksskkh..',
  '.hhhsssggsssggs.',
  '.hSSsggwggggggs.',
  '.hSSssggggsgggs.',
  '.hhSsssggsssggs.',
  '..hsssssssssSs..',
  '..Ssssssssmmms..',
  '...SssssssSSs...',
  '....SSssssSS....',
  '......SSSS......',
  '................',
];

const DOWN = [
  '................',
  '......hhhh......',
  '....hhHHHhhh....',
  '...hHHhhhhhHh...',
  '..hhhhhhhhhhhh..',
  '..hkkksssskkkh..',
  '.hhsggsggsggshh.',
  '.hggwggssgwgggh.',
  '.hSggggssggggSh.',
  '.hssggssssggssh.',
  '..SssssSSssssS..',
  '..SsmmmmmmmmsS..',
  '...SssSSSSssS...',
  '....SSssssSS....',
  '......SSSS......',
  '................',
];

const UP = [
  '................',
  '......hhhh......',
  '....hhhHHhhh....',
  '...hkkksskkkh...',
  '..hsggsggsggsh..',
  '..ggwggssgwggg..',
  '.hSggggssggggSh.',
  '.hssggssssggssh.',
  '.SsssssSSsssssS.',
  '.SssssssssssssS.',
  '..SssmmmmmmssS..',
  '..SsssSSSSsssS..',
  '...SssssssssS...',
  '....SSssssSS....',
  '......SSSS......',
  '................',
];

function grid(rows: readonly string[]): HTMLCanvasElement {
  const c = makeCanvas(F, F);
  paintGrid(ctxOf(c), rows, SKIN);
  return c;
}

/**
 * Opens the jaw: clears a wedge from (ax, ay) towards angle `dir` (edges at -up / +down),
 * rims it with lips and puts the tongue at the back of the mouth.
 */
function chompWedge(c: HTMLCanvasElement, ax: number, ay: number, dir: number, up: number, down: number): void {
  const ctx = ctxOf(c);
  const cut = new Set<number>();
  for (let y = 0; y < F; y++) {
    for (let x = 0; x < F; x++) {
      const vx = x + 0.5 - ax;
      const vy = y + 0.5 - ay;
      if (vx * vx + vy * vy < 0.6) continue;
      let a = Math.atan2(vy, vx) - dir;
      a = Math.atan2(Math.sin(a), Math.cos(a));
      if (a >= -up && a <= down) cut.add(y * F + x);
    }
  }
  const img = ctx.getImageData(0, 0, F, F).data;
  const opaque = (x: number, y: number): boolean => img[(y * F + x) * 4 + 3] > 0;
  for (const i of cut) {
    const x = i % F;
    const y = Math.floor(i / F);
    const d = Math.hypot(x + 0.5 - ax, y + 0.5 - ay);
    if (d < 3.2 && opaque(x, y)) {
      ctx.fillStyle = d < 2 ? '#e0505a' : '#3a0a0e';
      ctx.fillRect(x, y, 1, 1);
    } else ctx.clearRect(x, y, 1, 1);
  }
  ctx.fillStyle = '#9a3a2c';
  for (let y = 0; y < F; y++) {
    for (let x = 0; x < F; x++) {
      if (cut.has(y * F + x) || !opaque(x, y)) continue;
      const nearCut = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([k, j]) => cut.has((y + j) * F + (x + k)) && x + k >= 0 && x + k < F);
      if (nearCut) ctx.fillRect(x, y, 1, 1);
    }
  }
}

/** Open O-mouth (front / looking-up faces): dark mouth with a tongue, top-left at (x, y). */
function oMouth(c: HTMLCanvasElement, open: 1 | 2, x: number, y: number): void {
  const rows = open === 1 ? ['.mm.', 'mttm'] : ['.mmmm.', 'mMMMMm', 'mMttMm', '.mttm.'];
  paintGrid(ctxOf(c), rows, { m: PAL.ink, M: '#3a0a0e', t: '#e0505a' }, open === 1 ? x + 1 : x, y);
}

function finish(c: HTMLCanvasElement): HTMLCanvasElement {
  outline(c, PAL.ink);
  return c;
}

const DEG = Math.PI / 180;

/** Frames 0-8: right (closed, half, open), up (…), down (…). */
export function headFrames(): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = [];
  const jaw: [number, number][] = [[0, 0], [6, 34], [12, 58]];
  jaw.forEach(([u, d], i) => {
    const c = grid(RIGHT);
    if (i > 0) chompWedge(c, 8, 11, 0, u * DEG, d * DEG);
    out.push(finish(c));
  });
  for (const [rows, mx, my] of [[UP, 5, 9], [DOWN, 5, 10]] as const) {
    [0, 1, 2].forEach((i) => {
      const c = grid(rows);
      if (i > 0) oMouth(c, i as 1 | 2, mx, i === 1 ? my + 1 : my);
      out.push(finish(c));
    });
  }
  return out;
}

/** Frames 9-12: the front face squashing flat and wide (death, before the poof). */
export function deflateFrames(): HTMLCanvasElement[] {
  const src = grid(DOWN);
  return [
    [1.08, 0.78],
    [1.18, 0.55],
    [1.25, 0.34],
    [1.3, 0.18],
  ].map(([sx, sy]) => {
    const c = makeCanvas(F, F);
    const ctx = ctxOf(c);
    const w = Math.round(14 * sx);
    const h = Math.max(2, Math.round(14 * sy));
    ctx.drawImage(src, 1, 1, 14, 14, Math.round((F - w) / 2), F - 2 - h, w, h);
    return finish(c);
  });
}

/** The face as printed on Ciccio's tray paper: cream face, black hair and glasses. */
export function printedHead(): HTMLCanvasElement {
  const pal = { ...SKIN, s: MZ.printCream, l: MZ.printCream, S: '#d8b896', H: SKIN.h, w: MZ.printCream, m: PAL.ink };
  const c = makeCanvas(F, F);
  paintGrid(ctxOf(c), DOWN, pal);
  return finish(c);
}
