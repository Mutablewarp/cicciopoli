import { describe, expect, it } from 'vitest';
import { nuggetFrames } from '../items/nugget';
import { RAMPAGE } from '../keys';
import { type Raster, packColor } from '../hills/raster';
import { RAMPAGE_IMAGES, RAMPAGE_SHEETS } from './assets';
import { RC } from './colors';
import { buildRampageTiles } from './tiles';

/** [frame width, frame height, frame count] required by RAMPAGE in keys.ts. */
const SHEET_SPEC: Readonly<Record<string, readonly [number, number, number]>> = {
  [RAMPAGE.brick]: [16, 16, 4],
  [RAMPAGE.flag]: [32, 64, 4],
  [RAMPAGE.flagCloth]: [32, 24, 4],
  [RAMPAGE.checkpoint]: [16, 32, 4],
  [RAMPAGE.brute]: [40, 40, 8],
  [RAMPAGE.megaburger]: [64, 64, 10],
};

const IMAGE_SPEC: Readonly<Record<string, readonly [number, number]>> = {
  [RAMPAGE.sky]: [16, 512],
  [RAMPAGE.clouds]: [512, 128],
  [RAMPAGE.far]: [512, 160],
  [RAMPAGE.near]: [512, 192],
  [RAMPAGE.crate]: [16, 16],
  [RAMPAGE.barrel]: [16, 16],
  [RAMPAGE.poleRipped]: [32, 64],
  [RAMPAGE.hole]: [32, 10],
  [RAMPAGE.lamp]: [16, 48],
  [RAMPAGE.cone]: [8, 12],
  [RAMPAGE.dumpster]: [32, 20],
  [RAMPAGE.sign]: [16, 16],
};

const sheets = new Map(RAMPAGE_SHEETS.map(([key, build]) => [key, build()]));
const images = new Map(RAMPAGE_IMAGES.map(([key, build]) => [key, build()]));
const tiles = buildRampageTiles();

const opaque = (r: Raster, x: number, y: number): boolean => r.get(x, y) !== 0;
const rowHasPixel = (r: Raster, y: number): boolean => {
  for (let x = 0; x < r.w; x++) if (opaque(r, x, y)) return true;
  return false;
};

describe('rampage art pack (sizes from src/art/keys.ts)', () => {
  it('produces every RAMPAGE key exactly once', () => {
    const wanted = Object.values(RAMPAGE).filter((k) => k !== RAMPAGE.tiles).sort();
    expect([...sheets.keys(), ...images.keys()].sort()).toEqual(wanted);
  });

  it('sheets have the contracted frame sizes and counts', () => {
    for (const [key, [w, h, n]] of Object.entries(SHEET_SPEC)) {
      const frames = sheets.get(key) ?? [];
      expect(frames, key).toHaveLength(n);
      for (const f of frames) expect([f.w, f.h], key).toEqual([w, h]);
    }
  });

  it('images have the contracted sizes', () => {
    for (const [key, [w, h]] of Object.entries(IMAGE_SPEC)) {
      const r = images.get(key);
      expect([r?.w, r?.h], key).toEqual([w, h]);
    }
  });

  it('tileset is 8x2 tiles of 16x16 and every tile has pixels', () => {
    expect([tiles.w, tiles.h]).toEqual([8 * 16, 2 * 16]);
    for (let i = 0; i < 16; i++) {
      let n = 0;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (opaque(tiles, (i % 8) * 16 + x, Math.floor(i / 8) * 16 + y)) n++;
      expect(n, `tile ${i}`).toBeGreaterThan(120);
    }
  });

  it('walkable tops start with an ink row, so the surface is at the tile top', () => {
    const ink = packColor(RC.ink);
    for (const i of [1, 13, 9, 12]) expect(tiles.get((i % 8) * 16 + 5, Math.floor(i / 8) * 16), `tile ${i}`).toBe(ink);
  });

  it('skies are smooth: each row is one colour, dark purple on top, warm at the horizon', () => {
    const sky = images.get(RAMPAGE.sky);
    expect(sky).toBeDefined();
    if (!sky) return;
    for (let y = 0; y < sky.h; y++) for (let x = 1; x < sky.w; x++) expect(sky.get(x, y)).toBe(sky.get(0, y));
    const channel = (y: number, shift: number): number => (sky.get(0, y) >>> shift) & 255;
    expect(channel(0, 16)).toBeLessThan(channel(511, 16));
    expect(channel(0, 8)).toBeLessThan(channel(511, 8));
  });

  it('parallax layers wrap horizontally and the skyline fills down to its bottom row', () => {
    for (const key of [RAMPAGE.clouds, RAMPAGE.far, RAMPAGE.near]) expect(images.get(key)?.wrapX, key).toBe(true);
    for (const key of [RAMPAGE.far, RAMPAGE.near]) {
      const r = images.get(key);
      let filled = 0;
      for (let x = 0; x < (r?.w ?? 0); x++) if (r && opaque(r, x, r.h - 1)) filled++;
      expect(filled, key).toBeGreaterThan(400);
    }
  });

  it('flag, ripped pole and checkpoint share the pole base at (8,63) / bottom row', () => {
    for (const f of sheets.get(RAMPAGE.flag) ?? []) expect(opaque(f, 8, 63)).toBe(true);
    expect(opaque(images.get(RAMPAGE.poleRipped) as Raster, 8, 63)).toBe(true);
    for (const f of sheets.get(RAMPAGE.checkpoint) ?? []) expect(rowHasPixel(f, 31)).toBe(true);
  });

  it('brick wall gets more cracked with every stage', () => {
    const ink = packColor(RC.ink);
    const cracks = (f: Raster): number => {
      let n = 0;
      for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) if (f.get(x, y) === ink) n++;
      return n;
    };
    const counts = (sheets.get(RAMPAGE.brick) ?? []).map(cracks);
    expect(counts[0]).toBe(0);
    expect(counts[1]).toBeGreaterThan(counts[0]);
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[3]).toBeGreaterThan(counts[2]);
  });

  it('standing enemies touch the bottom row and face left (eye whites left of centre)', () => {
    const white = packColor(RC.eyeWhite);
    for (const key of [RAMPAGE.brute, RAMPAGE.megaburger]) {
      for (const f of (sheets.get(key) ?? []).slice(0, 4)) {
        expect(rowHasPixel(f, f.h - 1), key).toBe(true);
        let sum = 0;
        let n = 0;
        for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.get(x, y) === white) { sum += x; n++; }
        expect(n, key).toBeGreaterThan(0);
        expect(sum / n, key).toBeLessThan(f.w / 2);
      }
    }
  });

  it('is deterministic', () => {
    for (const [key, build] of RAMPAGE_SHEETS) {
      (sheets.get(key) ?? []).forEach((f, i) => expect(Array.from(build()[i].px), `${key}#${i}`).toEqual(Array.from(f.px)));
    }
    for (const [key, build] of RAMPAGE_IMAGES) expect(Array.from(build().px), key).toEqual(Array.from(images.get(key)?.px ?? []));
    expect(Array.from(buildRampageTiles().px)).toEqual(Array.from(tiles.px));
  });
});

const luma = (r: number, g: number, b: number): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const hexLuma = (hex: string): number => luma(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));

describe('near skyline readability (BRIEF: pickups outrank background)', () => {
  const near = images.get(RAMPAGE.near) as Raster;

  it('has no hit-burst / pickup colours: no magenta, white or lime baked into the street front', () => {
    const banned = new Set([RC.drum, RC.drumLight, RC.white, RC.lime].map(packColor));
    for (let y = 0; y < near.h; y++) for (let x = 0; x < near.w; x++) expect(banned.has(near.get(x, y)), `(${x},${y})`).toBe(false);
  });

  it('lit windows are dimmer than the average nugget pixel', () => {
    const f = nuggetFrames()[0];
    let sum = 0;
    let n = 0;
    for (let y = 1; y < f.h - 1; y++) {
      for (let x = 1; x < f.w - 1; x++) {
        if (f.alpha(x, y) === 0 || [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f.alpha(x + dx, y + dy) === 0)) continue;
        const i = (y * f.w + x) * 4;
        sum += luma(f.data[i], f.data[i + 1], f.data[i + 2]);
        n++;
      }
    }
    expect(n).toBeGreaterThan(20);
    expect(hexLuma(RC.winLit)).toBeLessThan(sum / n);
    expect(hexLuma(RC.winLitHi)).toBeLessThan(sum / n);
  });
});
