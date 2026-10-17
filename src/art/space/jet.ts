/**
 * Ciccio's light-blue jet (ref/invaders_sprites.png): delta wing, glass canopy on the nose,
 * Ciccio's round face with black round glasses at the wing root, grey pods, red trim.
 * Sheet 32x32, nose up, centre column x = 16.
 */
import { Buf, mirrorRows, sheetOf } from './buf';

const PAL: Record<string, string> = {
  k: '#101634',
  B: '#e6f7ff',
  b: '#a8dbf6',
  d: '#6eb2e2',
  D: '#4682be',
  g: '#3e9ad4',
  G: '#d8f6ff',
  q: '#2a6aa6',
  m: '#a4adbd',
  n: '#dfe5ee',
  M: '#5f6879',
  r: '#e8461e',
  R: '#a82410',
};

const NOSE_W = [0, 1, 1, 2, 2];

/** Left half + centre column (index 14) of the jet, mirrored later to 29 columns. */
function bodyHalf(): string[] {
  const rows: string[] = [];
  for (let y = 0; y <= 25; y++) {
    const r = Array.from({ length: 15 }, () => '.');
    const fill = (from: number, ch: string): void => {
      for (let x = from; x <= 14; x++) r[x] = ch;
    };
    if (y <= 4) {
      const left = 14 - NOSE_W[y];
      fill(left, 'b');
      r[left] = 'k';
    } else if (y <= 20) {
      // straight delta leading edge from the canopy base to the wing tip
      const left = Math.round(12 - (y - 5) * 0.8);
      fill(left, 'b');
      r[left] = 'k';
      r[left + 1] = 'B';
      if (y >= 18) for (let x = left + 1; x < 10; x++) r[x] = y === 20 ? 'r' : 'd';
    } else if (y === 21) {
      fill(0, 'd');
      for (let x = 0; x <= 10; x++) r[x] = 'k';
    } else if (y === 22) {
      fill(11, 'd');
      r[11] = 'k';
    } else if (y === 23) {
      r.splice(10, 5, 'k', 'm', 'n', 'm', 'k');
    } else if (y === 24) {
      r.splice(10, 5, 'k', 'M', 'M', 'M', 'k');
    } else {
      r.splice(11, 3, 'k', 'k', 'k');
    }
    // canopy glass down the nose to the face
    if (y >= 3 && y <= 9) {
      r[14] = y === 3 ? 'B' : y <= 7 ? 'G' : 'q';
      if (y >= 4) r[13] = y <= 7 ? 'g' : 'q';
    }
    rows.push(r.join(''));
  }
  return rows;
}

const POD = ['.kk.', 'knmk', 'knmk', 'knmk', 'knMk', 'kMMk', '.kk.'];

const FACE = [
  '..kkkkk..',
  '.khhhhhk.',
  'khhhhsssk',
  'khsssssSk',
  'kowooowok',
  'kooosoook',
  'kssssssSk',
  '.kssmsSk.',
  '..kkkkk..',
];
const FACE_PAL = { k: '#101634', h: '#141414', s: '#fcf0e2', S: '#e2c4a6', o: '#0a0a0a', w: '#ffffff', m: '#b0603c' };

type Bank = -1 | 0 | 1;

/** Character matrix of the whole jet (29 wide) with pods, trim and light from the top-left. */
function baseMatrix(): string[][] {
  const m = mirrorRows(bodyHalf()).map((r) => [...r]);
  // the right wing faces away from the light
  m.forEach((row, y) =>
    row.forEach((ch, x) => {
      if (x <= 14 || y < 5) return;
      if (ch === 'B') row[x] = 'b';
      else if (ch === 'b' && y >= 16 && x > 18) row[x] = 'd';
    }),
  );
  for (const ox of [3, 22]) {
    POD.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) if (row[x] !== '.') m[12 + y][ox + x] = row[x];
    });
  }
  // little red "///" marks near the wing roots (ref)
  for (const [x, y] of [[7, 17], [8, 16], [9, 17], [10, 16]] as const) {
    m[y][x] = 'r';
    m[y][28 - x] = 'r';
  }
  return m;
}

const LOWER: Record<string, string> = { B: 'b', b: 'd', d: 'D', n: 'm', m: 'M', r: 'R' };
const RAISE: Record<string, string> = { b: 'B', d: 'b', D: 'd' };

/**
 * Banking: the wing on the turn side dips (foreshortened by dropping two columns, darker),
 * the other wing rises into the light.
 */
function banked(bank: Bank): string[][] {
  const m = baseMatrix();
  if (bank === 0) return m;
  const drop = bank < 0 ? new Set([2, 7]) : new Set([26, 21]);
  return m.map((row) =>
    row
      .map((ch, x) => {
        const lowSide = bank < 0 ? x < 11 : x > 17;
        const highSide = bank < 0 ? x > 17 : x < 11;
        if (lowSide) return LOWER[ch] ?? ch;
        if (highSide) return RAISE[ch] ?? ch;
        return ch;
      })
      .filter((_, x) => !drop.has(x)),
  );
}

function flame(b: Buf, cx: number, top: number, len: number, flick: number): void {
  for (let i = 0; i < len; i++) {
    const t = i / Math.max(1, len - 1);
    b.set(cx, top + i, t < 0.4 ? '#ffffff' : t < 0.75 ? '#fff3a0' : '#fcb030');
    if (i < len - 1) {
      b.set(cx - 1, top + i, t < 0.5 ? '#fcb030' : '#f06a18');
      b.set(cx + 1, top + i, t < 0.5 ? '#fcb030' : '#f06a18');
    }
  }
  b.set(cx + flick, top + len, '#f06a18');
}

function drawJet(b: Buf, bank: Bank, frame: number): void {
  const m = banked(bank);
  // keep the fuselage centre on x = 16: banking left drops two columns left of it
  const x0 = 16 - (bank < 0 ? 12 : 14);
  m.forEach((row, y) => {
    row.forEach((ch, x) => {
      if (ch !== '.') b.set(x0 + x, 1 + y, PAL[ch]);
    });
  });
  b.grid(FACE, FACE_PAL, 12 + bank, 10);
  const len = frame === 0 ? 5 : 3;
  flame(b, 14, 26, len, frame === 0 ? 1 : -1);
  flame(b, 18, 26, len, frame === 0 ? -1 : 1);
}

export function buildJet(): HTMLCanvasElement {
  const banks: Bank[] = [0, 0, -1, -1, 1, 1];
  return sheetOf(6, 32, 32, (b, i) => drawJet(b, banks[i], i % 2));
}
