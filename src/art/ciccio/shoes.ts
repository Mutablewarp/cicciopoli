/**
 * Chunky red-orange shoes (cup style), facing right. Each kind is a hand-drawn grid
 * with the ankle attach point; the leg layer outlines them.
 * o base · O light toe · d shade · s dark sole
 */
import { grid, type Raster } from './raster';
import { shoePal } from './palette';

export type ShoeKind = 'flat' | 'heelUp' | 'toeUp' | 'point' | 'trail';

interface ShoeDef {
  ax: number;
  ay: number;
  rows: readonly string[];
}

const SHOES: Record<ShoeKind, ShoeDef> = {
  // planted: ankle 3 rows above the sole
  flat: { ax: 2, ay: 0, rows: ['.ooo....', 'ooooOOO.', 'dooooooO', 'ssssssss'] },
  // push-off: heel lifted, toe on the ground (ankle 4 rows above the toe sole)
  heelUp: { ax: 1, ay: 0, rows: ['ooo....', 'ooooOO.', 'sdoooOO', '.ssoooo', '...ssss'] },
  // heel strike: toe raised
  toeUp: { ax: 2, ay: 1, rows: ['.....OO.', '.oooooOO', 'ooooooo.', 'dooooo..', 'ssss....'] },
  // airborne foot, toe pointing down-forward
  point: { ax: 1, ay: 0, rows: ['ooo..', 'ooooO', 'sooOO', '.sooo', '..ss.'] },
  // flying / kicked back: toe points back (left), sole faces up
  trail: { ax: 5, ay: 1, rows: ['.ssssss', 'sOOoooo', 'Oooooodd', '.ooo.dd.'].map((r) => r.padEnd(8, '.')) },
};

export function paintShoe(r: Raster, kind: ShoeKind, ankleX: number, ankleY: number, back: boolean): void {
  const s = SHOES[kind];
  grid(r, s.rows, shoePal(back), Math.round(ankleX) - s.ax, Math.round(ankleY) - s.ay);
}
