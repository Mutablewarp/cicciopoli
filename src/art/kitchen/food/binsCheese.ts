/**
 * KITCHEN.binFill, the seven cheeses from above, the pan full (PAN 44x28), told apart by shape AND
 * colour: cheddar = bright orange square slices fanned out in two rows; brie = wedges with a white
 * bloomy rind; provola = many pale round slices with a thin tan rind; taleggio = ivory squares framed
 * in orange-pink rind; tuma = small pale cubes under a golden honey drizzle; scamorza = big rounds with
 * a thick smoked-brown rind; gorgonzola = creamy craggy chunks with blue-green veins.
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { lineR } from '../../rampage/draw';
import { bed, dots, piece, roughen, scatter, specks, type Pt } from './kit';
import { C, T, WHITE } from './palette';

const cheddarTone = { light: T.cheddar.light, base: T.cheddar.base, shade: T.cheddar.shade };

/** Two rows of square slices fanned left to right, each one lying on the next. */
export function binCheddar(r: Raster): void {
  for (const [y, x0, n] of [[1, 0, 5], [14, -4, 6]] as const) {
    for (let k = 0; k < n; k++) {
      const x = x0 + k * 8;
      piece(r, cheddarTone, (m) => m.rect(x, y + (k & 1), 13, 13, 1), {
        line: '#6a2a00',
        detail: (p) => dots(p, [[x + 1, y + 1 + (k & 1)], [x + 2, y + 1 + (k & 1)], [x + 1, y + 2 + (k & 1)]], '#ffe890'),
      });
    }
  }
}

/** Brie: wedges heads-to-tails, creamy straw-yellow inside, a thick white bloomy rind on the wide end and a thin one on the cut sides. */
export function binBrie(r: Raster): void {
  bed(r, T.brie, 253, T.brieRind.base);
  [-4, 4, 12, 20, 28, 36].forEach((x, i) => {
    const up = (i & 1) === 0;
    const pts = up ? [[x, 27], [x + 15, 27], [x + 7.5, 0]] as const : [[x, 0], [x + 15, 0], [x + 7.5, 27]] as const;
    piece(r, T.brie, (m) => m.poly(pts, 1), {
      line: '#7a6a40',
      detail: (p, m) => {
        for (let yy = 0; yy < 28; yy++) {
          for (let xx = x; xx <= x + 15; xx++) {
            if (!m.get(xx, yy)) continue;
            const edge = !m.get(xx - 1, yy) || !m.get(xx + 1, yy);
            const wide = up ? yy >= 23 : yy <= 4;
            if (edge || wide) p.set(xx, yy, hash2(xx, yy, 251) < 0.25 ? C.rindSpeck : T.brieRind.base);
          }
        }
        const oy = up ? 14 : 11;
        dots(p, [[x + 7, oy], [x + 8, oy], [x + 7, oy + 1], [x + 8, oy + 1]], T.brie.shade); // the soft heart
        dots(p, [[x + 6, up ? 19 : 7]], WHITE);
      },
    });
  });
}

/** Round slices with a `rind`-coloured ring `thick` px wide inside the outline. */
function rounds(r: Raster, spots: readonly Pt[], rad: number, body: Tone, rind: string, thick: number, line: string): void {
  bed(r, body, rad * 31, rind);
  for (const [x, y] of spots) {
    piece(r, body, (m) => m.ellipse(x, y, rad, rad - 1, 1), {
      line,
      detail: (p, m) => {
        for (let yy = y - rad; yy <= y + rad; yy++) {
          for (let xx = x - rad; xx <= x + rad; xx++) {
            const d = Math.hypot((xx - x) / rad, (yy - y) / (rad - 1));
            if (m.get(xx, yy) && d > 1 - thick / rad) p.set(xx, yy, rind);
          }
        }
        dots(p, [[x - 3, y - 2], [x - 2, y - 2], [x - 2, y - 3]], WHITE);
      },
    });
  }
}

export function binProvola(r: Raster): void {
  rounds(r, scatter(11, 8, 255, 4, 5, 42, 22), 6, T.provola, T.provolaRind.base, 1.2, '#8a6a3a');
}

export function binScamorza(r: Raster): void {
  const spots = [[8, 7], [24, 6], [40, 7], [0, 20], [16, 20], [32, 20], [46, 20]] as const;
  rounds(r, spots, 8, T.scamorza, T.scamorzaRind.base, 2.6, '#3e1e08');
  for (const [x, y] of spots) dots(r, [[x - 6, y - 3], [x - 5, y - 4], [x + 6, y + 3]], T.scamorzaRind.light);
}

/** Taleggio: square slices, ivory paste framed by the orange-pink washed rind. */
export function binTaleggio(r: Raster): void {
  bed(r, T.taleggio, 257, T.taleggioRind.base);
  for (const [y, x0] of [[1, 0], [14, -5]] as const) {
    for (let x = x0; x < 44; x += 11) {
      const yy = y + Math.round(hash2(x, y, 259));
      piece(r, T.taleggio, (m) => m.rect(x, yy, 12, 12, 1), {
        line: '#7a3018',
        detail: (p) => {
          for (let i = 0; i < 12; i++) {
            for (const [px, py] of [[x + i, yy], [x + i, yy + 11], [x, yy + i], [x + 11, yy + i], [x + i, yy + 10]] as const) {
              p.set(px, py, hash2(px, py, 261) < 0.3 ? T.taleggioRind.shade : T.taleggioRind.base);
            }
          }
          dots(p, [[x + 2, yy + 2], [x + 3, yy + 2], [x + 2, yy + 3]], WHITE);
        },
      });
    }
  }
}

/** Tuma caramellata al miele: small pale cubes seen 3/4, golden honey running over them. */
export function binTuma(r: Raster): void {
  bed(r, T.tuma, 263, T.honey.base);
  for (let row = 0; row < 4; row++) {
    for (let col = -1; col < 7; col++) {
      const x = 1 + col * 6 + (row & 1 ? 3 : 0);
      const y = 1 + row * 6 + Math.round(hash2(col, row, 265));
      piece(r, T.tuma, (m) => m.rect(x, y, 6, 7, 1), {
        line: '#8a7440',
        detail: (p) => {
          for (let i = 0; i < 6; i++) p.set(x + i, y + 5, T.tuma.shade); // the front face
          p.set(x + 1, y + 1, WHITE);
        },
      });
    }
  }
  for (const drizzle of [
    [[1, 5], [9, 2], [15, 9], [23, 3], [31, 8], [38, 3], [43, 7]],
    [[0, 19], [7, 14], [14, 22], [22, 15], [29, 23], [36, 16], [43, 21]],
  ] as const) {
    for (let i = 0; i + 1 < drizzle.length; i++) {
      const [ax, ay] = drizzle[i];
      const [bx, by] = drizzle[i + 1];
      lineR(r, ax, ay + 1, bx, by + 1, T.honey.shade);
      lineR(r, ax, ay, bx, by, T.honey.base);
      r.set(bx, by, T.honey.light);
    }
  }
  dots(r, [[10, 2], [24, 3], [8, 14], [23, 15]], WHITE);
}

/** Gorgonzola: creamy craggy chunks streaked with blue-green veins. */
export function binGorgonzola(r: Raster): void {
  bed(r, T.gorgonzola, 267, T.vein.base);
  for (const [x, y, rx, ry] of [[9, 7, 9, 7], [26, 6, 9, 6], [40, 9, 6, 8], [10, 20, 10, 7], [29, 20, 9, 7]] as const) {
    piece(r, T.gorgonzola, (m) => {
      m.ellipse(x, y, rx, ry, 1);
      roughen(m, x * 13 + y, 0.3, 0.3);
    }, {
      line: '#6a6440',
      detail: (p, m) => {
        // blue-green veins: wandering streaks plus a few dots
        for (let k = 0; k < 6; k++) {
          let vx = x - rx + 2 + Math.round(hash2(k, x, 271) * (2 * rx - 4));
          let vy = y - ry + 2 + Math.round(hash2(k, y, 273) * (2 * ry - 4));
          for (let s = 0; s < 7; s++) {
            if (m.get(vx, vy)) p.set(vx, vy, s % 3 ? T.vein.base : T.vein.shade);
            if (s % 2 && m.get(vx + 1, vy)) p.set(vx + 1, vy, T.vein.base);
            vx += hash2(k, s, 277) < 0.6 ? 1 : 0;
            vy += hash2(k, s, 279) < 0.5 ? 1 : -1;
          }
        }
        specks(p, m, T.vein.light, 0.06, x + 281);
        dots(p, [[x - rx + 3, y - ry + 2], [x - rx + 4, y - ry + 2]], WHITE);
      },
    });
  }
}
