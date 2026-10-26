/**
 * Street life on the side strips (v9 detail pass): people walking on the sidewalk, alone or in
 * pairs, a few café dehors (a square parasol over a table and chairs) and Vespas parked at the kerb.
 * Seen from above at the level's scale: a person is a 3x3 head-and-shoulders with a soft shadow.
 * Drawn before trees, palms and lamps (their canopies cover the people) and never on `avoid` rows
 * (storefronts, kiosks, landmarks), so the plain strips still match the strips with the shop.
 */
import { hash2 } from '../hills/raster';
import { shade } from '../pixel';
import { RU } from './colors';
import type { Strip } from './strip';

const SHIRTS = ['#d84a3a', '#3a6ab0', '#f0d040', '#2e8a5a', '#f0ece0', '#a83a6a', '#e08a30', '#5ab0c8'] as const;
const HAIR = ['#2a1e14', '#5a3a1e', '#141414', '#c8a060', '#9a9a96'] as const;
const VESPA = ['#7ab8a8', '#e8d8b0', '#c83a2e', '#3a6ab0'] as const;
const DEHORS = ['#f0ece0', '#e8c060', '#c8483a'] as const;
/** rows between two things on the sidewalk */
const STEP = 9;

export type Rows = readonly (readonly [y: number, len: number])[];

const clear = (y: number, h: number, avoid: Rows, pad: number): boolean => avoid.every(([a, len]) => y + h + pad <= a || y - pad >= a + len);

function person(s: Strip, d: number, y: number, seed: number, shirts: readonly string[]): void {
  const shirt = shirts[Math.floor(hash2(d, y, seed) * shirts.length)];
  const hair = HAIR[Math.floor(hash2(y, d, seed + 1) * HAIR.length)];
  const walk = s.pal.walkShade;
  for (const [i, j] of [[0, 1], [1, 2], [2, 1], [1, 3]] as const) s.screen(s.x(d) + i, y + j, walk); // shadow
  s.screen(s.x(d) - 1, y + 1, shirt);
  s.screen(s.x(d) + 1, y + 1, shirt);
  s.screen(s.x(d), y + 2, shade(shirt, -0.2));
  s.screen(s.x(d), y, hair);
  s.screen(s.x(d), y + 1, hair);
}

function dehors(s: Strip, y: number, seed: number): void {
  const c = DEHORS[Math.floor(hash2(y, 0, seed) * DEHORS.length)];
  for (const dy of [-1, 5]) for (const dd of [6, 9]) s.px(dd, y + dy, RU.bodyLight); // chairs peeking out
  for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) s.px(5 + i, y + j, (i + j) % 2 === 0 ? c : shade(c, -0.12));
  s.px(7, y + 2, RU.white);
  for (let j = 1; j < 6; j++) s.px(s.side === 'L' ? 4 : 11, y + j, s.pal.walkShade); // its shadow, screen-right
}

function vespa(s: Strip, y: number, seed: number): void {
  const c = VESPA[Math.floor(hash2(y, 1, seed) * VESPA.length)];
  s.rect(3, y, 2, 5, c);
  s.px(3, y, RU.rimLight); // headlamp / handlebar
  s.px(4, y, RU.bodyDark);
  s.rect(3, y + 2, 2, 2, RU.bodyDark); // the seat
}

/** People, dehors and Vespas along the whole strip, clear of `avoid` (`shirts`: e.g. the fans' rosanero). */
export function streetLife(s: Strip, seed: number, avoid: Rows = [], shirts: readonly string[] = SHIRTS): void {
  for (let y = 2 + Math.floor(hash2(0, 0, seed) * STEP); y < s.h - 8; y += STEP + Math.floor(hash2(y, 2, seed) * STEP)) {
    const h = hash2(y, 3, seed);
    if (h < 0.1 && clear(y, 8, avoid, 2)) dehors(s, y, seed);
    else if (h < 0.18 && clear(y, 5, avoid, 1)) vespa(s, y, seed);
    else if (clear(y, 4, avoid, 1)) {
      const d = 5 + Math.floor(hash2(y, 4, seed) * 6);
      person(s, d, y, seed, shirts);
      if (h > 0.8) person(s, d > 7 ? d - 3 : d + 3, y + 1, seed + 5, shirts); // walking in pairs
    }
  }
}
