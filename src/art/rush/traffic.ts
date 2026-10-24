/**
 * Palermo traffic, top-down facing UP with the slight rear tilt (we see roofs and a strip of the
 * rear face): city cars in 6 colours, SUVs, vans, the orange city bus. Bright bodies + ink outline
 * so they pop on the dark asphalt; the truck is the only black vehicle on the road.
 */
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, outlineRaster } from '../hills/raster';
import { shade } from '../pixel';
import { lineR, rectR } from '../rampage/draw';
import { RU } from './colors';

export const CAR_COLOURS = ['#d8342e', '#3a6ad6', '#ecebe4', '#f2c230', '#3fa24e', '#a6acb6'] as const;
const SUV_COLOURS = ['#7c8ca4', '#e6e6e0', '#a02a34'] as const;
const VAN_COLOURS = ['#f0f0ea', '#8a9098'] as const;

export function tones(base: string): Tone {
  return { light: shade(base, 0.3), base, shade: shade(base, -0.22), dark: shade(base, -0.42) };
}

interface Body {
  w: number;
  h: number;
  /** body rect inside the frame */
  x0: number;
  x1: number;
  colour: string;
  /** rows (frame y) where the windscreen starts / ends, the rear window starts / ends */
  screen: readonly [number, number];
  rear: readonly [number, number];
  /** rows of the rear face strip at the bottom (tilt) */
  face: number;
}

/** A generic road vehicle seen from above-behind: rounded body, glass, roof, rear face, lamps. */
function vehicle(b: Body): Raster {
  const r = new Raster(b.w, b.h);
  const top = 1;
  const bottom = b.h - 2;
  const faceY = bottom - b.face + 1;
  const m = new Mask(b.w, b.h);
  m.rect(b.x0, top + 2, b.x1 - b.x0 + 1, faceY - top - 3, 1);
  m.rect(b.x0 + 1, top + 1, b.x1 - b.x0 - 1, faceY - top - 1, 1);
  m.rect(b.x0 + 2, top, b.x1 - b.x0 - 3, 1, 1);
  paintMask(m, r, { 1: tones(b.colour) }, { shadeDepth: 1 });
  // tyres peeking out at the four corners
  for (const y of [top + 4, faceY - 7]) {
    rectR(r, b.x0 - 1, y, 1, 4, RU.tyre);
    rectR(r, b.x1 + 1, y, 1, 4, RU.tyre);
  }
  const glass = (y0: number, y1: number, inset: number): void => {
    for (let y = y0; y <= y1; y++) {
      const k = y === y0 ? inset + 1 : inset;
      rectR(r, b.x0 + k, y, b.x1 - b.x0 + 1 - k * 2, 1, y === y0 ? RU.glassLight : RU.glass);
    }
    lineR(r, b.x0 + inset + 2, y1, b.x0 + inset + 2 + (y1 - y0), y0 + 1, RU.glassLight);
  };
  glass(b.screen[0], b.screen[1], 2);
  glass(b.rear[0], b.rear[1], 2);
  // cabin: side windows framing a slightly darker roof with a lit left edge
  const roofH = b.rear[0] - b.screen[1] - 1;
  rectR(r, b.x0 + 1, b.screen[1] + 1, 1, roofH, RU.glassDark);
  rectR(r, b.x1 - 1, b.screen[1] + 1, 1, roofH, RU.glassDark);
  rectR(r, b.x0 + 2, b.screen[1] + 1, b.x1 - b.x0 - 3, roofH, shade(b.colour, -0.08));
  rectR(r, b.x0 + 2, b.screen[1] + 1, 1, roofH, tones(b.colour).light);
  // rear face: darker band, tail lights at the corners, the number plate
  rectR(r, b.x0, faceY, b.x1 - b.x0 + 1, b.face, shade(b.colour, -0.35));
  rectR(r, b.x0, faceY, 3, 2, RU.check);
  rectR(r, b.x1 - 2, faceY, 3, 2, RU.check);
  r.set(b.x0 + 1, faceY, RU.checkLight);
  r.set(b.x1 - 1, faceY, RU.checkLight);
  const mid = Math.floor((b.x0 + b.x1) / 2);
  rectR(r, mid - 2, faceY + 1, 5, 2, RU.plate);
  rectR(r, b.x0 + 1, bottom + 1, b.x1 - b.x0 - 1, 1, RU.tyreLight); // bumper
  // headlights + mirrors
  r.set(b.x0 + 1, top + 1, RU.plate);
  r.set(b.x1 - 1, top + 1, RU.plate);
  r.set(b.x0 - 1, b.screen[1], b.colour);
  r.set(b.x1 + 1, b.screen[1], b.colour);
  outlineRaster(r, RU.ink);
  return r;
}

export function buildCars(): Raster[] {
  return CAR_COLOURS.map((colour) => vehicle({ w: 24, h: 40, x0: 3, x1: 20, colour, screen: [9, 13], rear: [26, 29], face: 4 }));
}

export function buildSuvs(): Raster[] {
  return SUV_COLOURS.map((colour) => {
    const r = vehicle({ w: 28, h: 48, x0: 3, x1: 24, colour, screen: [10, 14], rear: [33, 36], face: 6 });
    rectR(r, 6, 16, 1, 16, RU.tyreLight); // roof rails
    rectR(r, 21, 16, 1, 16, RU.tyreLight);
    rectR(r, 11, 41, 6, 3, RU.tyre); // spare wheel on the tailgate
    rectR(r, 13, 42, 2, 1, RU.rim);
    return r;
  });
}

export function buildVans(): Raster[] {
  return VAN_COLOURS.map((colour, i) => {
    const r = vehicle({ w: 28, h: 56, x0: 3, x1: 24, colour, screen: [7, 11], rear: [49, 49], face: 5 });
    for (let y = 16; y < 46; y += 6) rectR(r, 5, y, 18, 1, shade(colour, -0.12)); // roof ribs
    rectR(r, 13, 49, 1, 5, shade(colour, -0.5)); // split rear doors
    if (i === 0) rectR(r, 6, 22, 16, 10, shade(colour, -0.06)); // roof hatch on the white van
    return r;
  });
}

/** 32x96 orange city bus: roof with A/C units and hatches, window bands down both sides. */
export function buildBus(): Raster {
  const colour = '#f07a1c';
  const r = vehicle({ w: 32, h: 96, x0: 2, x1: 29, colour, screen: [3, 8], rear: [86, 88], face: 5 });
  for (let y = 12; y < 86; y += 8) {
    rectR(r, 2, y, 1, 6, RU.glassDark);
    rectR(r, 29, y, 1, 6, RU.glassDark);
  }
  for (const y of [18, 54]) {
    rectR(r, 8, y, 16, 12, RU.whiteShade);
    rectR(r, 8, y, 16, 1, RU.white);
    for (let x = 10; x < 23; x += 3) rectR(r, x, y + 3, 2, 7, RU.rim);
  }
  for (const y of [38, 74]) rectR(r, 12, y, 8, 6, shade(colour, -0.25));
  rectR(r, 3, 10, 26, 1, shade(colour, -0.2));
  return r;
}
