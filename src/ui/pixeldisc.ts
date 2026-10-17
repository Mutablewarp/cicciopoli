/** Procedural pixel-art arcade button faces (round, outlined, with a 3D bottom edge). */
import { pixelSvg } from './dom';

export interface DiscColors {
  base: string;
  hi: string;
  lo: string;
  side: string;
  /** line between the face and its side */
  lip: string;
  /** optional accent ring just inside the outline */
  ring?: string;
}

const INK = '#141414';

/**
 * n = disc diameter in art pixels, depth = rows of visible side below the face.
 * pressed = the face sinks onto its side (only 1 row of side remains).
 */
export function pixelDisc(n: number, depth: number, c: DiscColors, pressed = false): string {
  const r = n / 2;
  const sink = pressed ? depth - 1 : 0;
  const rows: string[] = [];
  const inDisc = (x: number, y: number, oy: number): boolean => {
    const dx = x + 0.5 - r;
    const dy = y + 0.5 - r - oy;
    return dx * dx + dy * dy <= r * r;
  };
  const inShape = (x: number, y: number): boolean => inDisc(x, y, sink) || inDisc(x, y, depth);
  for (let y = 0; y < n + depth; y++) {
    let row = '';
    for (let x = 0; x < n; x++) {
      if (!inShape(x, y)) {
        row += '.';
        continue;
      }
      const edge = !inShape(x - 1, y) || !inShape(x + 1, y) || !inShape(x, y - 1) || !inShape(x, y + 1);
      if (edge) {
        row += 'k';
        continue;
      }
      if (!inDisc(x, y, sink)) {
        // side band below the face; the first row under the face reads as the face's lip
        row += inDisc(x, y - 1, sink) ? 'p' : 's';
        continue;
      }
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r - sink;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (c.ring && d > r - 2.6) row += 'g';
      else if (d > r - (c.ring ? 4.2 : 3.2) && dy > Math.abs(dx) * 0.2) row += 'l';
      else if (d > r - (c.ring ? 4.6 : 3.6) && dy < -Math.abs(dx) * 0.15 && dx < r * 0.45) row += 'h';
      else row += 'b';
    }
    rows.push(row);
  }
  // specular glint, top-left
  const gy = Math.round(r * 0.42) + sink;
  const gx = Math.round(r * 0.42);
  rows[gy] = rows[gy].slice(0, gx) + 'w' + rows[gy].slice(gx + 1);
  rows[gy + 1] = rows[gy + 1].slice(0, gx - 1) + 'w' + rows[gy + 1].slice(gx);
  return pixelSvg(rows, { k: INK, b: c.base, h: c.hi, l: c.lo, s: c.side, p: c.lip, g: c.ring ?? c.base, w: '#ffffff' }, 'cc-disc');
}
