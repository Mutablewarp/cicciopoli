/**
 * KITCHEN.binFill, proteins and cured pork seen from above, the pan full to the brim (PAN 44x28):
 * raw beef patties stacked on parchment squares (red, marbled), veggie patties (green-brown with
 * peas / carrot / corn), the three raw chickens by shape (long glossy battered fillets, round
 * craggy crumbed fillets, golden flaky panko thigh cutlets), streaky bacon strips, guanciale cubes
 * (pale fat, meat band, pepper crust), pancetta dolce rolls (pink spirals).
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { lineR } from '../../rampage/draw';
import { pankoFlakes, thighMask } from './fried';
import { bed, capsuleMask, dots, piece, roughen, scatter, specks } from './kit';
import { C, T, WHITE } from './palette';

/** Back row then the front row (the front patties overlap the back ones), centres of the top faces. */
const PATTIES = [[8, 6], [22, 5], [36, 6], [1, 18], [15, 18], [29, 18], [43, 18]] as const;

/** Patties stacked in the pan: each one's side band under its marbled top face. */
function patties(r: Raster, tone: Tone, line: string, flecks: readonly (readonly [string, number])[], seed: number): void {
  const side: Tone = { light: tone.shade, base: tone.shade, shade: line };
  bed(r, tone, seed);
  PATTIES.forEach(([x, y], i) => {
    piece(r, side, (m) => m.ellipse(x, y + 2, 8, 5, 1), { line });
    piece(r, tone, (m) => m.ellipse(x, y, 8, 5, 1), {
      line,
      detail: (p, m) => {
        flecks.forEach(([col, prob], k) => specks(p, m, col, prob, seed + i * 5 + k));
        dots(p, [[x - 5, y - 3], [x - 4, y - 3], [x - 3, y - 4]], tone.light);
      },
    });
  });
}

export function binManzo(r: Raster): void {
  patties(r, T.beefRaw, '#5a1018', [[C.marbling, 0.2], [T.beefRaw.shade, 0.18], [T.beefRaw.light, 0.06]], 201);
}

export function binVegetale(r: Raster): void {
  patties(r, T.veggieRaw, '#2e3410', [[C.pea, 0.12], [C.carrot, 0.1], [C.corn, 0.08], [T.veggieRaw.shade, 0.12]], 211);
}

/** Raw chicken under wet batter: pink-cream, glossy. */
const BATTERED: Tone = { light: '#fff6ec', base: '#f8dccc', shade: '#dcaa98' };

/** Pollo pastellato: long chicken fillets dipped in wet, glossy batter, lying every which way, pink meat showing through. */
export function binPastellato(r: Raster): void {
  bed(r, T.batterRaw, 215, '#f6c8bc');
  const fillets = [[2, 2, 19, 8], [41, 2, 24, 7], [4, 15, 20, 11], [24, 14, 41, 19], [19, 25, 3, 20], [26, 25, 42, 23]] as const;
  for (const [ax, ay, bx, by] of fillets) {
    piece(r, BATTERED, (m) => capsuleMask(m, ax, ay, bx, by, 4.2, 2.6), {
      line: '#8a5a44',
      detail: (p, m) => {
        specks(p, m, T.batterRaw.base, 0.2, ax + by);
        const sx = Math.sign(bx - ax);
        lineR(p, ax + sx * 2, ay - 2, Math.round((ax + bx) / 2), Math.round((ay + by) / 2) - 2, WHITE); // wet batter shine
        dots(p, [[ax - sx, ay - 2], [bx - sx * 2, by - 1]], WHITE);
      },
    });
  }
}

/** Pollo croccante: round fillets in a craggy, tan breadcrumb coat. */
export function binCroccante(r: Raster): void {
  bed(r, T.crumbRaw, 217);
  for (const [x, y] of [[9, 7], [26, 6], [41, 8], [3, 19], [20, 20], [36, 19]] as const) {
    piece(r, T.crumbRaw, (m) => {
      m.ellipse(x, y, 9, 6, 1);
      roughen(m, x * 7 + y, 0.55, 0.25);
    }, {
      line: '#4a3418',
      detail: (p, m) => {
        specks(p, m, '#a88a5a', 0.2, x + 3 * y);
        specks(p, m, '#fff6e0', 0.12, x + 5 * y);
        dots(p, [[x - 5, y - 3], [x - 4, y - 4]], WHITE);
      },
    });
  }
}

/** Coscia panko: boneless thigh cutlets in a pale-gold coat of big panko flakes. */
export function binPanko(r: Raster): void {
  bed(r, T.pankoRaw, 219);
  for (const [x, y, seed] of [[11, 7, 221], [32, 6, 223], [13, 19, 225], [33, 20, 227]] as const) {
    piece(r, T.pankoRaw, (m) => {
      thighMask(m, x, y, 1.25);
      roughen(m, seed, 0.35, 0.12);
    }, {
      line: '#4a3010',
      detail: (p, m) => {
        pankoFlakes(p, m, T.pankoRaw, seed);
        dots(p, [[x - 7, y - 3], [x - 6, y - 3]], WHITE);
      },
    });
  }
}

/** Raw streaky bacon: wavy strips side by side, white fat stripes running along pink-red meat. */
export function binBacon(r: Raster): void {
  [1, 6, 11, 16, 21].forEach((y0, i) => {
    const wave = (x: number): number => y0 + Math.round(Math.sin(x * 0.3 + i * 1.3));
    piece(r, T.baconRaw, (m) => {
      for (let x = 1; x <= 42; x++) for (let k = 0; k < 6; k++) m.set(x, wave(x) + k, 1);
    }, {
      line: '#5a1018',
      detail: (p) => {
        for (let x = 1; x <= 42; x++) {
          p.set(x, wave(x), T.fatRaw.light);
          p.set(x, wave(x) + 3, hash2(x, i, 231) < 0.25 ? T.fatRaw.shade : T.fatRaw.base);
          p.set(x, wave(x) + 5, T.baconRaw.shade);
        }
      },
    });
  });
}

/** Guanciale: thick cubes seen 3/4, pale fat on top, a meat band and a black-pepper crust on the front face. */
export function binGuanciale(r: Raster): void {
  bed(r, T.guancialeFat, 239, T.baconRaw.base);
  for (let row = 0; row < 3; row++) {
    for (let col = -1; col < 5; col++) {
      const x = 1 + col * 9 + (row & 1 ? 4 : 0) + Math.round(hash2(col, row, 243));
      const y = 1 + row * 8 + Math.round(hash2(row, col, 245));
      piece(r, T.guancialeFat, (m) => m.rect(x, y, 9, 9, 1), {
        line: '#6a3a30',
        detail: (p) => {
          for (let i = 1; i < 8; i++) {
            p.set(x + i, y + 5, T.baconRaw.base);
            p.set(x + i, y + 6, T.baconRaw.shade);
            if (hash2(x + i, y, 241) < 0.6) p.set(x + i, y + 7, '#3a2a24'); // pepper crust
            if (hash2(x + i, y, 247) < 0.3) p.set(x + i, y + 8, '#3a2a24');
          }
          p.set(x + 1, y + 1, WHITE);
          p.set(x + 2, y + 1, WHITE);
        },
      });
    }
  }
}

/** Pancetta dolce: rolled slices packed tight, pink and white spirals. */
export function binPancetta(r: Raster): void {
  bed(r, T.pancetta, 249, T.fatRaw.base);
  for (const [x, y] of scatter(10, 8, 251, 4, 5, 42, 23)) {
    piece(r, T.pancetta, (m) => m.ellipse(x, y, 5, 5, 1), {
      line: '#8a3a44',
      detail: (p, m) => {
        for (let yy = y - 5; yy <= y + 5; yy++) {
          for (let xx = x - 5; xx <= x + 5; xx++) {
            if (m.get(xx, yy) && Math.floor(Math.hypot(xx - x, yy - y) * 0.8) % 2 === 1) p.set(xx, yy, T.fatRaw.base);
          }
        }
        dots(p, [[x - 2, y - 4], [x - 3, y - 3]], WHITE);
      },
    });
  }
}
