/**
 * Traffic pattern library per zone (BRIEF §8). A pattern is a short scene of vehicles and
 * hazards in canonical lanes; the generator flips / moves it, then the validator decides.
 * `at` = px of d after the pattern start where the item meets the truck.
 */
import type { RushZone } from '../../../art/rush/keys';
import { RUSH_KINDS, type TrafficKind } from '../../../config/rush';
import { pickWeighted, randInt, type Rng } from './rng';
import type { Lane } from './types';

export interface PatternItem {
  readonly k: TrafficKind;
  readonly lane: Lane;
  readonly at: number;
  /** scooter: cuts into this lane (blinker first) when it is `swerveAt` px ahead of the truck */
  readonly to?: Lane;
  readonly swerveAt?: number;
}

export interface Pattern {
  readonly id: string;
  /** pick weight per zone; missing = never there */
  readonly w: Partial<Record<RushZone, number>>;
  readonly items: readonly PatternItem[];
  /** 'mirror': may be flipped lane 0 <-> 2 · 'any': one-lane pattern moved to any lane */
  readonly shape: 'mirror' | 'any';
  /** empty road after it (sauce: room to recover from a slip) */
  readonly tail?: number;
}

const one = (id: string, k: TrafficKind, w: Pattern['w'], tail?: number): Pattern => ({
  id,
  w,
  items: [{ k, lane: 1, at: 0 }],
  shape: 'any',
  tail,
});

export const PATTERNS: readonly Pattern[] = [
  one('car', 'car', { centro: 5, stadio: 2, mare: 1 }),
  one('suv', 'suv', { centro: 2, stadio: 2, mare: 1 }),
  one('van', 'van', { centro: 2, stadio: 2, mare: 1 }),
  one('ape', 'ape', { centro: 2, stadio: 1, mare: 1 }),
  one('scooter', 'scooter', { centro: 2, stadio: 2, mare: 1 }),
  one('bus', 'bus', { centro: 1, stadio: 2, mare: 1 }),
  one('barrier', 'barrier', { centro: 1, stadio: 2, mare: 1 }),
  one('sauce', 'sauce', { centro: 1, stadio: 2, mare: 2 }, 120),
  { id: 'parked', w: { centro: 3, stadio: 2, mare: 2 }, items: [{ k: 'parked', lane: 0, at: 0 }], shape: 'mirror' },
  {
    id: 'works',
    w: { stadio: 3, mare: 1 },
    items: [
      { k: 'cone', lane: 1, at: 0 },
      { k: 'works', lane: 1, at: 46 },
    ],
    shape: 'any',
  },
  {
    id: 'swerve',
    w: { centro: 1, stadio: 2, mare: 2 },
    items: [{ k: 'scooter', lane: 0, at: 0, to: 1, swerveAt: 170 }],
    shape: 'mirror',
  },
  {
    id: 'swerveOut',
    w: { centro: 1, stadio: 1, mare: 2 },
    items: [{ k: 'scooter', lane: 1, at: 0, to: 2, swerveAt: 160 }],
    shape: 'mirror',
  },
  {
    id: 'cut',
    w: { stadio: 1, mare: 2 },
    items: [
      { k: 'scooter', lane: 1, at: 0, to: 0, swerveAt: 150 },
      { k: 'car', lane: 2, at: 30 },
    ],
    shape: 'mirror',
  },
  {
    id: 'parkedCar',
    w: { stadio: 2, mare: 2 },
    items: [
      { k: 'parked', lane: 0, at: 0 },
      { k: 'car', lane: 1, at: 100 },
    ],
    shape: 'mirror',
  },
  {
    id: 'pair',
    w: { centro: 1, stadio: 2, mare: 3 },
    items: [
      { k: 'car', lane: 0, at: 0 },
      { k: 'suv', lane: 1, at: 0 },
    ],
    shape: 'mirror',
  },
  {
    id: 'stagger',
    w: { centro: 2, stadio: 2, mare: 2 },
    items: [
      { k: 'car', lane: 0, at: 0 },
      { k: 'van', lane: 2, at: 140 },
    ],
    shape: 'mirror',
  },
  {
    id: 'slalom',
    w: { stadio: 1, mare: 2 },
    items: [
      { k: 'car', lane: 0, at: 0 },
      { k: 'suv', lane: 2, at: 170 },
      { k: 'car', lane: 0, at: 340 },
    ],
    shape: 'mirror',
  },
  {
    id: 'busScooter',
    w: { stadio: 1, mare: 2 },
    items: [
      { k: 'bus', lane: 0, at: 0 },
      { k: 'scooter', lane: 2, at: 30 },
    ],
    shape: 'mirror',
  },
  {
    id: 'closure',
    w: { stadio: 2, mare: 1 },
    items: [
      { k: 'cone', lane: 2, at: 0 },
      { k: 'cone', lane: 2, at: 36 },
      { k: 'cone', lane: 2, at: 72 },
      { k: 'barrier', lane: 2, at: 108 },
      { k: 'car', lane: 0, at: 40 },
    ],
    shape: 'mirror',
  },
  {
    id: 'sauceCar',
    w: { stadio: 1, mare: 2 },
    items: [
      { k: 'sauce', lane: 1, at: 0 },
      { k: 'car', lane: 0, at: 10 },
    ],
    shape: 'mirror',
    tail: 120,
  },
  {
    id: 'wall',
    w: { stadio: 1, mare: 2 },
    items: [
      { k: 'car', lane: 0, at: 0 },
      { k: 'van', lane: 1, at: 0 },
      { k: 'suv', lane: 1, at: 300 },
      { k: 'car', lane: 2, at: 300 },
    ],
    shape: 'mirror',
  },
  {
    id: 'apeCar',
    w: { centro: 1, stadio: 1, mare: 1 },
    items: [
      { k: 'ape', lane: 1, at: 0 },
      { k: 'car', lane: 0, at: 70 },
    ],
    shape: 'mirror',
  },
];

/** A pattern item on the road: concrete lanes, meeting distance, colour. */
export interface PlacedItem {
  readonly k: TrafficKind;
  readonly lane: Lane;
  readonly to: Lane | null;
  readonly meetD: number;
  /** scooter swerve start (d), NaN when it keeps its lane */
  readonly swerveD: number;
  readonly variant: number;
}

export function pickPattern(rng: Rng, zone: RushZone): Pattern {
  return pickWeighted(rng, PATTERNS, (p) => p.w[zone] ?? 0);
}

/** Road covered by the pattern items (the gap to the next pattern starts after it). */
export function patternLength(p: Pattern): number {
  return Math.max(...p.items.map((it) => it.at)) + (p.tail ?? 0);
}

export function placePattern(rng: Rng, p: Pattern, start: number): PlacedItem[] {
  const anyLane = randInt(rng, 3) as Lane;
  const flip = rng() < 0.5;
  const map = (l: Lane): Lane => (p.shape === 'any' ? anyLane : flip ? ((2 - l) as Lane) : l);
  return p.items.map((it) => {
    const meetD = start + it.at;
    const rate = RUSH_KINDS[it.k].rate;
    return {
      k: it.k,
      lane: map(it.lane),
      to: it.to === undefined ? null : map(it.to),
      meetD,
      swerveD: it.swerveAt === undefined ? NaN : meetD - it.swerveAt / (1 - rate),
      variant: randInt(rng, RUSH_KINDS[it.k].variants),
    };
  });
}
