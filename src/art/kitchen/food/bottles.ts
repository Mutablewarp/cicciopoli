/**
 * KITCHEN.drink (14x26, frame = DRINKS index) and KITCHEN.sauce (14x34, frame = SAUCES index).
 * Drinks are generic: colour + shape only, never a logo (docs/BRIEF.md §9): clear 50cl water bottles
 * (blue cap naturale, red cap frizzante with bubbles), Fuze Tea bottles (peach / lemon label),
 * 33cl cans all of one generic motif (plain body in the drink's colour, a straight bare-metal band,
 * silver lid and rim: lemon soda yellow, sprite green, fanta orange, cola red, cola zero black; no
 * waves, script or logo shapes), chinotto in a small dark glass bottle. Sauces: squeeze bottles filled
 * with the sauce colour, black cap and nozzle, label band.
 */
import type { Mask, Tone } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { mix } from '../../pixel';
import { DRINKS, SAUCES, type DrinkId } from '../keys';
import { cylLevel, inkEdge, piece } from './kit';
import { C, INK, T, WHITE } from './palette';

type Ramp = readonly [string, string, string, string];
const ramp = (t: Tone): Ramp => [t.dark ?? mix(t.shade, INK, 0.4), t.shade, t.base, t.light];
const tone = (light: string, base: string, shade: string, dark: string): Tone => ({ light, base, shade, dark });

/** Paints mask pixels of material `id` (or any, id 0) as a cylinder between x0..x1. */
function cyl(p: Raster, m: Mask, x0: number, x1: number, rp: Ramp, id = 0, y0 = 0, y1 = m.h - 1): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const v = m.get(x, y);
      if (v !== 0 && (id === 0 || v === id)) p.set(x, y, rp[cylLevel((x - x0 + 0.5) / (x1 - x0 + 1))]);
    }
  }
}

const SILVER = tone('#ffffff', '#d4d8e0', '#9aa0ac', '#5e6470');

/** Body colour of each can: the only thing that tells them apart besides the name under the rack. */
const CANS: Readonly<Partial<Record<DrinkId, Tone>>> = {
  lemonSoda: tone('#fff48a', '#f8d81e', '#c8a00c', '#7a5c04'),
  sprite: tone('#6ae09a', '#20a85a', '#147a3e', '#0a4a24'),
  fanta: tone('#ffbc50', '#ff8a10', '#d06008', '#8a3c04'),
  cocaCola: tone('#ff6a5a', '#e01c1c', '#a40c12', '#6a060a'),
  cocaZero: tone('#6a6a74', '#2a2a30', '#18181c', '#0a0a0c'),
};
/** First row of the straight bare-metal band every can shares, and its height. */
const BAND = { y: 14, h: 3 } as const;

function can(r: Raster, body: Tone): void {
  piece(r, body, (m) => {
    m.span(4, 9, 6, 2);
    m.span(3, 10, 7, 2);
    for (let y = 8; y <= 24; y++) m.span(2, 11, y, 1);
    m.span(3, 10, 25, 2);
  }, {
    detail: (p, m) => {
      cyl(p, m, 2, 11, ramp(SILVER), 2);
      cyl(p, m, 2, 11, ramp(body), 1);
      for (let x = 2; x <= 11; x++) for (let y = BAND.y; y < BAND.y + BAND.h; y++) p.set(x, y, ramp(SILVER)[cylLevel((x - 1.5) / 10)]);
      for (let x = 2; x <= 11; x++) p.set(x, 8, ramp(SILVER)[cylLevel((x - 1.5) / 10)]); // rolled neck
      for (const y of [9, 10, 11, 19, 20, 21]) p.set(4, y, WHITE); // metal glint above and below the band
      p.set(5, 6, INK); // ring pull
    },
  });
}

interface BottleLook { glass: Tone; cap: string; label: Tone; top: number; bubbles: boolean }

const WATER = tone('#ffffff', C.glass, C.glassShade, C.glassDark);
const BOTTLES: Readonly<Partial<Record<DrinkId, BottleLook>>> = {
  acquaNaturale: { glass: WATER, cap: '#2a6ae0', label: tone('#ffffff', '#3a7ae8', '#1e4aa8', '#12306a'), top: 0, bubbles: false },
  acquaFrizzante: { glass: WATER, cap: '#e02a2a', label: tone('#ffffff', '#e83a3a', '#a81e1e', '#6a1212'), top: 0, bubbles: true },
  fuzePesca: { glass: tone('#ffc88a', '#f0944a', '#c0642a', '#7a3a14'), cap: '#ff7a5a', label: tone('#ffe0d0', '#ffb08e', '#e07a5a', '#9a4a30'), top: 3, bubbles: false },
  fuzeLimone: { glass: tone('#fff0a0', '#f2c844', '#c49418', '#7a5c08'), cap: '#a8d430', label: tone('#fffab0', '#ffe638', '#d0b010', '#7a6a06'), top: 3, bubbles: false },
};

/** PET bottle from row `top`: cap, neck ring, shoulders, body, a label band; frizzante bubbles. */
function bottle(r: Raster, b: BottleLook): void {
  const t = b.top;
  piece(r, b.glass, (m) => {
    m.span(5, 8, t, 3);
    m.span(5, 8, t + 1, 3);
    m.span(4, 9, t + 2, 3);
    for (let y = t + 3; y <= t + 4; y++) m.span(5, 8, y, 1);
    m.span(4, 9, t + 5, 1);
    m.span(3, 10, t + 6, 1);
    for (let y = t + 7; y <= 24; y++) m.span(2, 11, y, 1);
    m.span(3, 10, 25, 1);
  }, {
    detail: (p, m) => {
      cyl(p, m, 2, 11, ramp(b.glass), 1);
      for (let x = 4; x <= 9; x++) for (let y = t; y <= t + 2; y++) if (m.get(x, y)) p.set(x, y, x < 6 ? mix(b.cap, WHITE, 0.4) : x > 7 ? mix(b.cap, INK, 0.35) : b.cap);
      const l0 = t + 10;
      for (let x = 2; x <= 11; x++) {
        const lv = cylLevel((x - 1.5) / 10);
        for (let y = l0; y < l0 + 6; y++) p.set(x, y, y === l0 || y === l0 + 5 ? ramp(b.label)[Math.min(lv, 2)] : lv >= 2 ? WHITE : mix(WHITE, b.label.shade, 0.35));
        p.set(x, l0 + 2, ramp(b.label)[lv]);
        p.set(x, l0 + 3, ramp(b.label)[lv]);
      }
      for (let y = t + 6; y <= 23; y += 3) if (y < l0 || y > l0 + 5) p.set(4, y, WHITE);
      if (b.bubbles) for (let y = t + 7; y <= 24; y++) for (let x = 5; x <= 10; x++) if ((y < l0 || y > l0 + 5) && hash2(x, y, 801) < 0.14) p.set(x, y, WHITE);
    },
  });
}

/** Chinotto 20cl: small dark glass bottle, long neck, crown cap, cream label with an orange band. */
function chinotto(r: Raster): void {
  const glass = tone('#9a6440', '#4a2414', '#2c140a', '#160804');
  piece(r, glass, (m) => {
    m.span(5, 8, 5, 2);
    for (let y = 6; y <= 11; y++) m.span(5, 8, y, 1);
    m.span(4, 9, 12, 1);
    m.span(3, 10, 13, 1);
    for (let y = 14; y <= 24; y++) m.span(3, 10, y, 1);
    m.span(4, 9, 25, 1);
  }, {
    detail: (p, m) => {
      cyl(p, m, 3, 10, ramp(glass), 1);
      for (let x = 5; x <= 8; x++) p.set(x, 5, x === 5 ? '#ffe08a' : '#d8a028'); // crown cap
      for (let x = 3; x <= 10; x++) {
        const lv = cylLevel((x - 2.5) / 8);
        for (let y = 17; y <= 21; y++) p.set(x, y, lv >= 2 ? '#fff2d8' : '#e0caa4');
        p.set(x, 19, lv >= 2 ? '#f08a28' : '#b8601a');
      }
      for (const y of [7, 9, 14, 15, 23]) p.set(5, y, WHITE);
    },
  });
}

function drink(id: DrinkId): Raster {
  const r = new Raster(14, 26);
  const c = CANS[id];
  const b = BOTTLES[id];
  if (c) can(r, c);
  else if (b) bottle(r, b);
  else chinotto(r);
  inkEdge(r);
  return r;
}

export function buildDrinks(): Raster[] {
  return DRINKS.map(drink);
}

type SauceId = (typeof SAUCES)[number];
const CAP = tone('#5a5a64', '#2a2a30', '#18181c', '#0a0a0c');

/** Squeeze bottle full of the sauce: black cap with grip ridges, pointed nozzle, label band. */
function sauceBottle(id: SauceId): Raster {
  const r = new Raster(14, 34);
  const sauce = T[id];
  const label = id === 'salsaWhite' ? '#26262c' : C.label;
  piece(r, sauce, (m) => {
    m.span(6, 7, 0, 2);
    for (let y = 1; y <= 2; y++) m.span(6, 7, y, 2);
    for (let y = 3; y <= 5; y++) m.span(5, 8, y, 2);
    for (let y = 6; y <= 9; y++) m.span(3, 10, y, 2);
    m.span(2, 11, 10, 1);
    for (let y = 11; y <= 32; y++) m.span(1, 12, y, 1);
    m.span(2, 11, 33, 1);
  }, {
    detail: (p, m) => {
      cyl(p, m, 1, 12, ramp(CAP), 2);
      cyl(p, m, 1, 12, ramp(sauce), 1);
      p.set(6, 0, sauce.base); // a bead of sauce on the tip
      p.set(7, 0, sauce.shade);
      for (const x of [4, 6, 8]) for (let y = 6; y <= 9; y++) p.set(x, y, CAP.base); // grip ridges
      for (let x = 1; x <= 12; x++) {
        const lv = cylLevel((x - 0.5) / 12);
        for (let y = 19; y <= 26; y++) p.set(x, y, y === 19 || y === 26 ? ramp(sauce)[Math.max(0, lv - 1)] : lv >= 2 ? label : mix(label, INK, 0.25));
        p.set(x, 22, ramp(sauce)[lv]);
        p.set(x, 23, ramp(sauce)[lv]);
      }
      for (const y of [12, 13, 15, 29, 30]) p.set(3, y, WHITE);
    },
  });
  inkEdge(r);
  return r;
}

export function buildSauces(): Raster[] {
  return SAUCES.map(sauceBottle);
}
