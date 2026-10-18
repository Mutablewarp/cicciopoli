/**
 * Green rage aura (drawn with ADD blend behind the hero): ten twinkling lime energy sparks (round dots and filled
 * diamonds with a lime-white centre) floating around the head, the sides and the feet, clear of the broad shoulders
 * and arms; 4 frames of 64 x 64. No haze and no dither, so on the dark purple scenery it reads as clean power
 * instead of grey dirt, and it never touches the sprite outline.
 */
import { Raster } from '../../ciccio/raster';

export const AURA = 64;

// ADD blend: saturated green with no red / blue and a bright core, so it stays lime on purple and never clips to white
const ARM = '#38d000';
const CORE = '#c4ff58';

/** x, y and the frame offset of the twinkle. */
const SPARKS: readonly (readonly [number, number, number])[] = [
  [8, 16, 0], [56, 14, 2], [4, 48, 1], [60, 51, 3], [10, 6, 2], [54, 6, 0], [5, 58, 3], [59, 59, 1], [17, 3, 1], [47, 3, 3],
];

/** Twinkle size over time: dot, round 2x2 blob, filled diamond, blob (never a plus sign). */
const REACH = [0, 1, 2, 1] as const;

export function auraFrames(): Raster[] {
  return Array.from({ length: 4 }, (_, f) => {
    const r = new Raster(AURA, AURA);
    for (const [x, y, phase] of SPARKS) {
      const reach = REACH[(f + phase) % 4];
      if (reach === 2) {
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const d = Math.abs(dx) + Math.abs(dy);
            if (d <= 2) r.set(x + dx, y + dy, d === 0 ? CORE : ARM);
          }
        }
      } else if (reach === 1) {
        for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) r.set(x + dx, y + dy, dx + dy === 0 ? CORE : ARM);
      } else {
        r.set(x, y, CORE);
      }
    }
    return r;
  });
}
