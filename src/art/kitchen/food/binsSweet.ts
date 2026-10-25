/**
 * KITCHEN.binFill, sweet / crunchy toppings and sauces from above, the pan full (PAN 44x28): golden
 * caramelised pear slices (pear-shaped, pale core), fig jam filling the pan with two fig halves and a
 * spoon (purple-red, seedy), hazelnuts (small, round, pale tip, a few halved), walnut halves (big,
 * lobed, creased), and each sauce as a full black ramekin (the sauces pop on the dark ceramic).
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { lineR } from '../../rampage/draw';
import type { SAUCES } from '../keys';
import { bed, dots, inner, piece, roughen, scatter, specks } from './kit';
import { C, T, WHITE } from './palette';

/** Pere caramellate: lengthwise pear slices in two rows, pale juicy flesh, a golden caramel rim, the core with pips. */
export function binPere(r: Raster): void {
  bed(r, T.pear, 401, T.pear.dark);
  for (const [y, x0] of [[7, 5], [20, 0]] as const) {
    for (let x = x0; x < 48; x += 11) {
      piece(r, T.pear, (m) => {
        m.ellipse(x, y + 2, 5, 5, 1);
        m.ellipse(x, y - 4, 2, 3, 1);
      }, {
        line: '#5a3006',
        detail: (p, m) => {
          for (let yy = y - 3; yy <= y + 6; yy++) {
            for (let xx = x - 4; xx <= x + 4; xx++) if (inner(m, xx, yy) && Math.hypot((xx - x) / 3.6, (yy - y - 2) / 3.6) < 1) p.set(xx, yy, '#fff2b8');
          }
          lineR(p, x, y - 3, x, y + 1, '#e8c060'); // the core up the neck
          dots(p, [[x - 1, y + 2], [x + 1, y + 2], [x, y + 3]], '#e8c060');
          p.set(x, y + 2, '#6a3a10'); // a pip
          lineR(p, x, y - 7, x + 1, y - 9, '#6a3a10'); // stalk
          dots(p, [[x - 1, y - 5], [x - 3, y]], WHITE);
        },
      });
    }
  }
}

/** Confettura di fichi: glossy purple jam to the brim, two fig halves and a steel spoon on top. */
export function binFichi(r: Raster): void {
  piece(r, T.jam, (m) => m.rect(1, 1, 42, 26, 1), {
    line: T.jam.shade,
    detail: (p, m) => {
      specks(p, m, C.jamSeed, 0.1, 403);
      specks(p, m, T.jam.light, 0.08, 405);
      for (let k = 0; k < 12; k++) p.set(Math.round(22 + Math.cos(3.3 + k * 0.3) * 13), Math.round(15 + Math.sin(3.3 + k * 0.3) * 6), '#b05a94'); // glossy swirl
    },
  });
  for (const [x, y] of [[10, 9], [25, 18]] as const) {
    piece(r, T.figSkin, (m) => {
      m.ellipse(x, y + 1, 6, 5, 1);
      m.ellipse(x, y - 4, 2, 2, 1);
    }, {
      line: '#2a0a20',
      detail: (p, m) => {
        for (let yy = y - 5; yy <= y + 6; yy++) {
          for (let xx = x - 6; xx <= x + 6; xx++) {
            if (!m.get(xx, yy)) continue;
            const d = Math.hypot((xx - x) / 5, (yy - y - 1) / 4);
            if (d < 0.75) p.set(xx, yy, hash2(xx, yy, 407) < 0.3 ? C.seed : T.figFlesh.base);
            else if (d < 0.98) p.set(xx, yy, T.figFlesh.light); // the white pith ring
          }
        }
        dots(p, [[x - 4, y - 2], [x - 1, y - 5]], WHITE);
      },
    });
  }
  piece(r, T.steel, (m) => {
    m.rect(36, 6, 8, 2, 1);
    m.ellipse(33, 7, 3, 2, 1);
  }, { line: '#3a3e48', detail: (p) => dots(p, [[32, 6], [38, 6], [39, 6]], WHITE) });
}

/** Nocciole: a heap of round hazelnuts with pale pointed tips, a few cut in half (cream inside). */
export function binNocciole(r: Raster): void {
  bed(r, T.hazelnut, 409, T.hazelnut.dark);
  scatter(5, 4, 411, 2, 2, 42, 26).forEach(([x, y], i) => {
    const half = i % 7 === 3;
    piece(r, T.hazelnut, (m) => m.ellipse(x, y, 2, 2, 1), {
      line: '#2a1406',
      detail: (p) => {
        if (half) dots(p, [[x - 1, y], [x, y], [x + 1, y], [x, y - 1], [x, y + 1]], '#f8e6c0');
        else {
          p.set(x, y - 2, '#f0d0a0'); // pale pointed tip
          p.set(x - 1, y - 1, T.hazelnut.light);
          p.set(x, y + 1, T.hazelnut.shade);
        }
      },
    });
  });
}

/** Noci: walnut halves from above, two bumpy brain-like lobes either side of a dark crease. */
export function binNoci(r: Raster): void {
  bed(r, T.walnut, 413, T.walnut.dark);
  for (const [x, y] of scatter(11, 9, 415, 5, 5, 42, 24)) {
    piece(r, T.walnut, (m) => {
      m.ellipse(x - 3, y, 3, 5, 1);
      m.ellipse(x + 3, y, 3, 5, 1);
      m.set(x, y - 5, 0);
      m.set(x, y + 5, 0);
      roughen(m, x * 3 + y, 0.25, 0.3);
    }, {
      line: '#3a2410',
      detail: (p, m) => {
        const dark = T.walnut.dark ?? T.walnut.shade;
        specks(p, m, dark, 0.22, x + y * 9); // the wrinkles
        specks(p, m, T.walnut.light, 0.14, x * 9 + y);
        lineR(p, x, y - 4, x, y + 4, dark); // the crease between the halves
        p.set(x - 4, y - 3, WHITE);
      },
    });
  }
}

type SauceId = (typeof SAUCES)[number];
const RAMEKIN: Tone = { light: '#6a6a74', base: '#2e2e34', shade: '#1c1c20' };

/** A full black ramekin of the sauce, glossy swirl on top; jalapeño gets chopped green flecks. */
export function binSauce(r: Raster, id: SauceId): void {
  const sauce = T[id];
  piece(r, RAMEKIN, (m) => m.ellipse(22, 14, 21, 12, 1), {
    detail: (p, m) => {
      const inside = (x: number, y: number): number => Math.hypot((x - 22) / 18, (y - 14.5) / 9.5);
      for (let y = 0; y < m.h; y++) {
        for (let x = 0; x < m.w; x++) {
          const d = inside(x, y);
          if (d < 1) p.set(x, y, d > 0.86 && y > 14 ? sauce.shade : sauce.base);
        }
      }
      for (let k = 0; k < 14; k++) {
        const a = 3.3 + k * 0.24;
        p.set(Math.round(22 + Math.cos(a) * 11), Math.round(14 + Math.sin(a) * 5), sauce.light); // swirl
      }
      if (id === 'salsaJalapeno') specks(p, m, '#2e6014', 0.1, 417);
      if (id === 'salsaCiccios') specks(p, m, '#d85a34', 0.05, 419);
      dots(p, [[12, 9], [13, 9], [12, 10]], WHITE);
      for (let x = 6; x < 20; x++) if (inside(x, 4) >= 1 && m.get(x, 4)) p.set(x, 4, RAMEKIN.light); // rim glint
    },
  });
}
