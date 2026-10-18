/**
 * Ciccio's light-blue jet (ref/invaders_sprites.png): a slim pointed nose with the glass canopy,
 * a wide delta wing with plain grey rounded pods, three red claw marks and trim, grey fins and
 * the engine bell under the trailing edge, and Ciccio's round face (./jetFace.ts) at the wing root: it is
 * the hit box too. Sheet 43x40, nose up, centre column x = 21.
 */
import { Buf, sheetOf } from './buf';
import { drawFace, FACE_SIZE } from './jetFace';

const PAL: Record<string, string> = {
  k: '#0c1230',
  B: '#eaf8ff',
  b: '#b4dcf6',
  d: '#78b4e2',
  D: '#3a78b4',
  g: '#46a0d8',
  G: '#dcf6ff',
  q: '#2a6aa6',
  m: '#a4adbd',
  n: '#dfe5ee',
  M: '#5f6879',
  r: '#e8461e',
  R: '#a82410',
};

/** Matrix width (symmetric about column C) and the frame row where the nose starts. */
const W = 41;
const C = 20;
const ROWS = 40;
/** Columns removed from the wing that dips when banking (fins, bell and face columns stay whole). */
const DROP_LEFT = [3, 6, 12];
const INNER_FIN_X = 11;
/** Frame row of the first flame pixel, just below the engine bell. */
const FLAME_TOP = 35;
/** The face (the hit box of the jet, see game/invaders/config.ts) in frame pixels, level flight. */
export const JET_FACE = { x: 14, y: 14, size: FACE_SIZE } as const;

/** Fuselage half width per row from the nose tip (row 1) to the wing root (row 12). */
const NOSE_HW = [0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6, 6];
const ROOT_Y = 12;
const TRAIL_Y = 28;
/** Leading edge column of the left wing at row y (the wing sweeps out one column per row). */
const edge = (y: number): number => (y <= ROOT_Y ? C - NOSE_HW[y - 1] : Math.round(C - 6 - (y - ROOT_Y) * 0.82));

/** Three separate dashes with a slight lean (ref: three claw marks on each wing), clear of the face. */
const CLAW = ['..r.r.r', '..r.r.r', '.r.r.r.'];
const POD = ['.kkk.', 'knnmk', 'knmMk', 'knmMk', 'knmMk', 'kmmMk', 'kmMMk', 'kmMMk', 'kMMMk', 'kMMMk', 'kMMMk', 'kMMMk'];
const FIN = ['knmk', 'knMk', 'kmMk', 'kMMk', '.kk.'];
const BELL_HW = [3, 3, 4, 4];

type Grid = string[][];
type Bank = -1 | 0 | 1;

/** Sets a cell and its mirror image. */
function sym(g: Grid, x: number, y: number, ch: string): void {
  g[y][x] = ch;
  g[y][W - 1 - x] = ch;
}

function put(g: Grid, x0: number, y0: number, art: readonly string[]): void {
  art.forEach((line, j) => [...line].forEach((ch, i) => ch !== '.' && sym(g, x0 + i, y0 + j, ch)));
}

/** Symmetric jet matrix: pods, nose + wing, trim, canopy, fins and bell. The right half is shaded later. */
function baseMatrix(): Grid {
  const g: Grid = Array.from({ length: ROWS }, () => Array.from({ length: W }, () => '.'));
  // pods sit behind the wing: only their tips show above the leading edge
  put(g, 5, 11, POD);
  for (let y = 1; y <= TRAIL_Y - 1; y++) {
    const left = edge(y);
    for (let x = left; x <= C; x++) sym(g, x, y, y >= TRAIL_Y - 3 ? 'd' : 'b');
    sym(g, left, y, 'k');
    if (y > 2 && left + 1 <= C) sym(g, left + 1, y, 'B');
  }
  for (let x = edge(TRAIL_Y); x <= C; x++) {
    sym(g, x, TRAIL_Y, x === edge(TRAIL_Y) ? 'k' : 'r');
    sym(g, x, TRAIL_Y + 1, 'k');
  }
  // dark panel line across the wing with the red claw marks above it (ref)
  for (let x = 3; x <= 12; x++) sym(g, x, TRAIL_Y - 3, 'D');
  put(g, 5, TRAIL_Y - 6, CLAW);
  // grey fins under the trailing edge and the engine bell in the middle
  put(g, 1, TRAIL_Y + 2, FIN);
  put(g, INNER_FIN_X, TRAIL_Y + 2, FIN);
  BELL_HW.forEach((hw, j) => {
    for (let x = C - hw; x <= C; x++) sym(g, x, TRAIL_Y + 2 + j, x === C - hw ? 'k' : x <= C - hw + 2 ? 'n' : 'm');
  });
  for (let x = C - 4; x <= C; x++) sym(g, x, TRAIL_Y + 2 + BELL_HW.length, 'k');
  return g;
}

/** Right wing away from the light is one step darker; the glass canopy goes on last. */
function shaded(g: Grid): Grid {
  g.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (x <= C) return;
      if (ch === 'B') row[x] = 'b';
      else if (ch === 'b' && y >= 17 && x > 24) row[x] = 'd';
      else if (ch === 'n') row[x] = 'm';
      else if (ch === 'm' && x > 30) row[x] = 'M';
    }),
  );
  // glass canopy: dark arch, pale glass with a cyan left edge and a deep right edge
  for (let y = 7; y <= 24; y++) {
    const hw = y === 7 ? 1 : y === 8 ? 2 : y <= 10 ? 3 : 4;
    for (let x = C - hw; x <= C + hw; x++) {
      const rim = y === 7 || x === C - hw || x === C + hw;
      g[y][x] = rim ? 'k' : x === C - hw + 1 ? 'g' : x === C + hw - 1 ? 'q' : 'G';
    }
  }
  g[9][C - 1] = 'B';
  g[10][C - 1] = 'B';
  return g;
}

const LOWER: Record<string, string> = { B: 'b', b: 'd', d: 'D', n: 'm', m: 'M', r: 'R' };
const RAISE: Record<string, string> = { b: 'B', d: 'b', D: 'd' };

/**
 * Banking: the wing on the turn side dips (foreshortened by dropping columns, darker), the
 * other wing rises into the light. Returns the matrix and where its columns moved.
 */
function banked(bank: Bank): { m: Grid; drop: Set<number> } {
  const m = shaded(baseMatrix());
  const drop = new Set(bank === 0 ? [] : bank < 0 ? DROP_LEFT : DROP_LEFT.map((x) => W - 1 - x));
  if (bank === 0) return { m, drop };
  const out = m.map((row) =>
    row
      .map((ch, x) => {
        const lowSide = bank < 0 ? x < C - 3 : x > C + 3;
        const highSide = bank < 0 ? x > C + 3 : x < C - 3;
        return (lowSide ? LOWER[ch] : highSide ? RAISE[ch] : undefined) ?? ch;
      })
      .filter((_, x) => !drop.has(x)),
  );
  return { m: out, drop };
}

/** Main exhaust under the bell: a 5 px wide tongue that tapers, white at the root. */
function flame(b: Buf, cx: number, top: number, len: number, flick: number): void {
  for (let i = 0; i < len; i++) {
    const t = i / Math.max(1, len - 1);
    const half = i < len - 2 ? 2 : i < len - 1 ? 1 : 0;
    for (let d = -half; d <= half; d++) {
      const core = Math.abs(d) <= Math.max(0, half - 1);
      b.set(cx + d, top + i, core ? (t < 0.4 ? '#ffffff' : '#fff3a0') : t < 0.5 ? '#fcb030' : '#f06a18');
    }
  }
  b.set(cx + flick, top + len, '#f06a18');
}

/** One column of the small flame inside a fin: pale root, orange tip. */
function finFlame(b: Buf, x: number, top: number, len: number): void {
  for (let i = 0; i < len; i++) b.set(x, top + i, i === 0 ? '#fff3a0' : i < len - 1 ? '#fcb030' : '#f06a18');
}

function drawJet(b: Buf, bank: Bank, frame: number): void {
  const { m, drop } = banked(bank);
  // keep the fuselage centre on frame column 21: banking left drops three columns left of it
  const x0 = 21 - (C - (bank < 0 ? DROP_LEFT.length : 0));
  m.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (ch !== '.') b.set(x0 + x, y, PAL[ch]);
    }),
  );
  drawFace(b, JET_FACE.x + bank, JET_FACE.y);
  const long = frame === 0;
  const shift = (c: number): number => c - [...drop].filter((d) => d < c).length;
  flame(b, 21, FLAME_TOP, long ? 5 : 3, long ? 1 : -1);
  // the two inner fins carry a 2 px flame each (the grey fin interior), mirrored about the centre
  for (const c of [INNER_FIN_X + 1, INNER_FIN_X + 2, W - 1 - (INNER_FIN_X + 2), W - 1 - (INNER_FIN_X + 1)]) {
    if (!drop.has(c)) finFlame(b, x0 + shift(c), FLAME_TOP, long ? 3 : 2);
  }
}

export function buildJet(): HTMLCanvasElement {
  const banks: Bank[] = [0, 0, -1, -1, 1, 1];
  return sheetOf(6, 43, 40, (b, i) => drawJet(b, banks[i], i % 2));
}
