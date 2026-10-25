/**
 * KITCHEN.binFill, the vegetables from above, the pan full (PAN 44x28): songino (a carpet of small
 * dark-green spoon-leaf rosettes) vs lattuga (a few big pale ruffled leaves), pomodoro (red slices
 * with seed chambers) vs capuliato (chopped glossy cherry tomato), caramelised onion (glossy brown
 * tangle) vs crispy onion (golden rings and crumbs), peperoncino (red rings with seeds plus whole chillies).
 */
import { Raster, hash2 } from '../../hills/raster';
import { lineR } from '../../rampage/draw';
import { bed, capsuleMask, dots, inner, piece, roughen, scatter } from './kit';
import { C, T, WHITE } from './palette';

/** Songino: rosettes of five little spoon-shaped leaves, glossy dark green, packed edge to edge. */
export function binSongino(r: Raster): void {
  bed(r, T.songino, 301, T.songino.dark);
  for (const [x, y] of scatter(7, 5, 303, 2, 2, 42, 26)) {
    const turn = hash2(x, y, 305) * 1.2;
    piece(r, T.songino, (m) => {
      for (let k = 0; k < 5; k++) {
        const a = turn + (k * Math.PI * 2) / 5;
        capsuleMask(m, x + 0.5, y + 0.5, x + 0.5 + Math.cos(a) * 3.2, y + 0.5 + Math.sin(a) * 2.6, 0.7, 1.6);
      }
    }, {
      line: '#0a240c',
      detail: (p) => {
        p.set(x, y, T.songino.light);
        p.set(x - 2, y - 1, '#8cd070');
        p.set(x + 1, y - 2, T.songino.light);
      },
    });
  }
}

/** Lattuga: big pale lime leaves, ruffled edges, a white midrib and lighter veins. */
export function binLattuga(r: Raster): void {
  bed(r, T.lattuga, 307, T.lattuga.shade);
  for (const [x, y, flip] of [[11, 7, 1], [32, 6, -1], [4, 19, -1], [22, 19, 1], [40, 20, -1]] as const) {
    piece(r, T.lattuga, (m) => {
      m.ellipse(x, y, 11, 7, 1);
      roughen(m, x * 31 + y, 0.55, 0.12);
    }, {
      line: '#2c5a10',
      detail: (p) => {
        lineR(p, x - 9 * flip, y + 3, x + 9 * flip, y - 3, C.veinLight); // midrib
        for (const s of [-6, -2, 2, 6]) lineR(p, x + s * flip, y - Math.round(s / 3), x + (s + 3) * flip, y - Math.round(s / 3) - 4, T.lattuga.light);
        dots(p, [[x - 8, y - 4], [x - 7, y - 5], [x - 6, y - 5]], WHITE);
      },
    });
  }
}

/** Pomodoro: round slices shingled in two rows, pink flesh, chamber walls, yellow seeds in the gel. */
export function binPomodoro(r: Raster): void {
  bed(r, T.tomato, 309, T.tomatoFlesh.shade);
  for (const [x, y] of [[8, 7], [22, 6], [36, 7], [1, 19], [15, 19], [29, 19], [43, 19]] as const) {
    piece(r, T.tomato, (m) => m.ellipse(x, y, 7, 6, 1), {
      line: '#5a0a04',
      detail: (p) => {
        for (let yy = y - 5; yy <= y + 5; yy++) {
          for (let xx = x - 6; xx <= x + 6; xx++) if (Math.hypot((xx - x) / 7, (yy - y) / 6) < 0.7) p.set(xx, yy, T.tomatoFlesh.base);
        }
        // chamber walls from the core to the rim, gel with yellow seeds in between
        for (const [dx, dy] of [[0, -4], [4, 2], [-4, 2]] as const) lineR(p, x, y, x + dx, y + dy, T.tomato.base);
        dots(p, [[x - 2, y - 1], [x + 2, y - 1], [x - 1, y + 3], [x + 1, y + 3], [x - 3, y], [x + 3, y]], C.seed);
        p.set(x, y, T.tomatoFlesh.light);
        dots(p, [[x - 5, y - 3], [x - 4, y - 4]], WHITE);
      },
    });
  }
}

/** Cipolla caramellata: the pan full of a dark glossy tangle of long golden-brown strands. */
export function binCipollaCaramellata(r: Raster): void {
  piece(r, T.onion, (m) => {
    m.rect(1, 1, 42, 26, 1);
    roughen(m, 311, 0, 0.2);
  }, {
    line: '#2e1404',
    detail: (p, m) => {
      for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) if (inner(m, x, y)) p.set(x, y, T.onion.dark ?? T.onion.shade);
      // long soft strands wandering across the pile, lit along their top
      for (let k = 0; k < 26; k++) {
        let x = 1 + Math.round(hash2(k, 1, 313) * 18);
        const y0 = 2 + Math.round(hash2(k, 2, 313) * 23);
        const ph = hash2(k, 3, 313) * 6;
        for (let s = 0; s < 24; s++, x++) {
          const y = Math.round(y0 + Math.sin(s * 0.45 + ph) * 2);
          if (inner(m, x, y)) p.set(x, y, s % 5 === 1 ? T.onion.light : k % 3 === 0 ? '#c87a30' : T.onion.base);
        }
      }
      dots(p, [[6, 5], [14, 4], [22, 6], [33, 5], [10, 12], [19, 13], [28, 11], [37, 14], [8, 20], [17, 22], [30, 21], [39, 22]], '#f8d8a0');
    },
  });
}

/** Cipolla croccante: a heap of golden fried rings and crumbs. */
export function binCipollaCroccante(r: Raster): void {
  bed(r, T.crispyOnion, 321, T.crispyOnion.dark);
  scatter(5, 4, 323, 2, 2, 42, 26).forEach(([x, y], i) => {
    const rad = i % 3 === 0 ? 3 : 2;
    piece(r, T.crispyOnion, (m) => {
      m.ellipse(x, y, rad, rad - (i & 1), 1);
      roughen(m, x + y * 7, 0.2, 0.1);
    }, {
      line: '#4a2806',
      detail: (p) => {
        p.set(x, y, T.crispyOnion.dark ?? T.crispyOnion.shade); // the ring's hole
        if (rad === 3) p.set(x + 1, y, T.crispyOnion.dark ?? T.crispyOnion.shade);
        p.set(x - 1, y - rad, T.crispyOnion.light);
      },
    });
  });
}

/** Capuliato: chunky chopped cherry tomato in its pink juice, flesh and seeds showing, olive-oil sheen. */
export function binCapuliato(r: Raster): void {
  bed(r, T.tomatoFlesh, 331, C.seed);
  for (const [x, y] of scatter(5, 4, 333, 2, 2, 42, 26)) {
    piece(r, T.capuliato, (m) => {
      m.rect(x - 2, y - 1, 5, 4, 1);
      roughen(m, x * 5 + y, 0.3, 0.2);
    }, {
      line: '#4a0804',
      detail: (p) => {
        dots(p, [[x, y], [x + 1, y], [x, y + 1]], T.tomatoFlesh.base);
        p.set(x + 1, y + 1, hash2(x, y, 335) < 0.5 ? C.seed : T.tomatoFlesh.light);
        if (hash2(x, y, 339) < 0.7) p.set(x - 1, y - 1, '#ffeec0'); // olive-oil sheen
      },
    });
  }
}

/** Peperoncino: sliced red rings with yellow seeds, three whole chillies with green stems on top. */
export function binPeperoncino(r: Raster): void {
  bed(r, T.chilli, 341);
  for (const [x, y] of scatter(5, 4, 343, 2, 2, 42, 26)) {
    piece(r, T.chilli, (m) => m.ellipse(x, y, 2, 2, 1), {
      line: '#4a0404',
      detail: (p) => {
        p.set(x, y, C.seed);
        p.set(x - 1, y - 1, T.chilli.light);
      },
    });
  }
  for (const [ax, ay, bx, by] of [[4, 6, 22, 9], [40, 12, 22, 15], [8, 21, 26, 22]] as const) {
    piece(r, T.chilli, (m) => capsuleMask(m, ax, ay, bx, by, 2.6, 0.7), {
      line: '#4a0404',
      detail: (p) => {
        lineR(p, ax, ay, ax - Math.sign(bx - ax) * 3, ay - 2, C.stem);
        lineR(p, ax + Math.sign(bx - ax) * 3, ay - 1, ax + Math.sign(bx - ax) * 8, ay - 1, T.chilli.light);
        p.set(ax + Math.sign(bx - ax) * 3, ay - 1, WHITE);
      },
    });
  }
}
