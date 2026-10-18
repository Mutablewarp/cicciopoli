import { describe, expect, it } from 'vitest';
import { LOGO_LABEL } from '../../art/maze/keys';
import { LOGO_BITS, LOGO_LEVELS } from '../../art/maze/logoBits';
import { MAZE, TILE } from './layout';

describe('logo label', () => {
  it('is a rectangular hex grid with white (face, wordmark) and black ink (hair, glasses) cells', () => {
    const w = LOGO_BITS[0].length;
    for (const row of LOGO_BITS) expect(row).toMatch(new RegExp(`^[0-9a-f]{${w}}$`));
    const cells = LOGO_BITS.join('');
    const white = [...cells].filter((ch) => parseInt(ch, 16) % 8 === LOGO_LEVELS - 1).length;
    const ink = [...cells].filter((ch) => parseInt(ch, 16) >= 8).length;
    expect(white).toBeGreaterThan(600);
    expect(ink).toBeGreaterThan(300);
  });

  it('sits wholly on wall cells of the centre block, clear of every corridor', () => {
    const w = LOGO_BITS[0].length * LOGO_LABEL.scale;
    const h = LOGO_BITS.length * LOGO_LABEL.scale;
    let offWall = 0;
    for (let y = LOGO_LABEL.y; y < LOGO_LABEL.y + h; y++) {
      for (let x = LOGO_LABEL.x; x < LOGO_LABEL.x + w; x++) {
        if (MAZE.cell(Math.floor(x / TILE), Math.floor(y / TILE)) !== 'wall') offWall++;
      }
    }
    expect(offWall).toBe(0);
  });
});
