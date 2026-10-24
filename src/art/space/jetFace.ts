/**
 * Ciccio's badge on the jet: the official logo face (./jetLogoBits.ts, baked from
 * public/brand/ciccios-logo.png by scripts/jet-logo-bits.mjs) on a round white badge with a
 * thin red ring, like the sticker on the bags. The ring is a 1 px midpoint circle in the jet's
 * trim red and never touches the face (1 px of white all round, see jetFace.test.ts).
 */
import type { Buf } from './buf';
import { JET_LOGO } from './jetLogoBits';

/** Badge diameter, ring radius and where the 17x23 face sits inside the badge box. */
export const BADGE_SIZE = 27;
const RING_R = 13;
export const LOGO_AT = { x: 5, y: 2 } as const;
/** The shaded rim runs inside the ring from this corner down and to the right (clear of the chin). */
const SHADE_FROM = { x: 17, y: 10 } as const;

export const BADGE_PAL: Readonly<Record<string, string>> = {
  /** ring (the jet's trim red), disc, the disc's shaded lower-right rim */
  r: '#e8461e',
  w: '#ffffff',
  s: '#dde3ee',
  /** logo ink and its thin strokes (brow tails, glasses arms, nose, lip corners) */
  o: '#0a0a0a',
  g: '#55565e',
};

/** The badge as a square grid: 'r' ring, 'w' disc, 's' shade, the face's 'o' / 'g' / 'w', '.' outside. */
export function badgeGrid(): string[] {
  const g = Array.from({ length: BADGE_SIZE }, () => Array.from({ length: BADGE_SIZE }, () => '.'));
  const c = RING_R;
  // midpoint circle: one pixel per step, so the ring reads as a thin line at 1:1
  for (let x = RING_R, y = 0, err = 1 - RING_R; x >= y; y++) {
    for (const [a, b] of [[x, y], [y, x], [-y, x], [-x, y], [-x, -y], [-y, -x], [y, -x], [x, -y]]) g[c + b][c + a] = 'r';
    if (err < 0) err += 2 * y + 3;
    else {
      x--;
      err += 2 * (y - x) + 3;
    }
  }
  g.forEach((row) => {
    const l = row.indexOf('r');
    const r = row.lastIndexOf('r');
    for (let x = l + 1; x < r; x++) if (row[x] === '.') row[x] = 'w';
  });
  // one shade step just inside the lower-right ring
  g.forEach((row, y) =>
    row.forEach((ch, x) => {
      const rim = g[y][x + 1] === 'r' || g[y + 1]?.[x] === 'r';
      if (ch === 'w' && rim && x >= SHADE_FROM.x && y >= SHADE_FROM.y) row[x] = 's';
    }),
  );
  JET_LOGO.forEach((line, j) => [...line].forEach((ch, i) => ch !== '.' && (g[LOGO_AT.y + j][LOGO_AT.x + i] = ch)));
  return g.map((row) => row.join(''));
}

const BADGE = badgeGrid();

/** Draws the badge with its top-left at (x, y). */
export function drawBadge(b: Buf, x: number, y: number): void {
  b.grid(BADGE, BADGE_PAL, x, y);
}
