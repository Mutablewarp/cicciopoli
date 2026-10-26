/**
 * 'rush-truck' 40x64 x 9: the Ciccio's burger truck seen from above-behind, facing UP
 * (ref/truck_top.png). Sprinter cab in front, matte-black box with the chrome trim, the white
 * "Ciccio's" script + burger across the roof (the shot the player sees all run), red checkered
 * bands, the roof A/C unit, the face logo on the rear door, light clusters, tyres peeking out.
 * Frames: 0-1 drive, 2-3 lean L/R, 4 brake, 5 hit, 6-8 rocket-booster flight.
 * Also 'rush-truck-shadow' 40x24, and 'rush-truck-x' (v9 side view of a landscape screen): the same
 * frames, but the roof vinyl and the door face are turned a quarter turn so they read upright once the
 * camera turns the truck to face right (the burger over the "Ciccio's" script, a checker line along
 * each long edge, the A/C unit moved to the rear corner out of the script's way).
 */
import { Raster, outlineRaster } from '../hills/raster';
import { lineR, rectR, washR } from '../rampage/draw';
import { RU } from './colors';
import { BURGER_S, FACE_S, ROOF_SCRIPT, face, turnRows, vinyl } from './lettering';

export const TRUCK_W = 40;
export const TRUCK_H = 64;

/** Roof of the box (inclusive), rear door below it, cab above it. */
const BOX = { x0: 3, x1: 36, y0: 16, y1: 48 };
const REAR_Y1 = 60;

interface Pose {
  /** wheel tread phase (drive animation) */
  tread: 0 | 1;
  /** cab rocks 1 px on the engine */
  cabDy: 0 | 1;
  brake: boolean;
  lean: -1 | 0 | 1;
  /** booster flame frame, -1 = no boosters */
  boost: number;
  /** v9 side view: roof vinyl and door face turned to read upright on a turned camera */
  turned: boolean;
}

/**
 * The turned roof lettering, top-left corners on screen once the truck faces right: screen x runs
 * from the rear (frame row BOX.y1) to the cab, screen y from the frame's left edge (BOX.x0).
 */
export const TURNED = { burger: { sx: 10, sy: 5 }, script: { sx: 2, sy: 17 } } as const;
const TURNED_SCRIPT = turnRows(ROOF_SCRIPT);
const TURNED_BURGER = turnRows(BURGER_S);
const TURNED_FACE = turnRows(FACE_S);

/** Frame x, y of the top-left corner of turned art (w x h on screen) whose screen top-left is (sx, sy). */
export function turnedOrigin(sx: number, sy: number, w: number): readonly [number, number] {
  return [BOX.x0 + sy, BOX.y1 - sx - (w - 1)];
}

/** 2x2 red / black checkers inside the rect; `phase` swaps the colours. */
export function checker(r: Raster, x: number, y: number, w: number, h: number, phase = 0, cell = 2): void {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const on = (Math.floor(i / cell) + Math.floor(j / cell) + phase) % 2 === 0;
      r.set(x + i, y + j, on ? RU.check : RU.bodyDark);
    }
  }
}

function tyre(r: Raster, x: number, y: number, w: number, h: number, tread: number): void {
  rectR(r, x, y, w, h, RU.tyre);
  for (let j = (tread % 2); j < h; j += 2) rectR(r, x, y + j, w, 1, RU.tyreLight);
}

function cab(r: Raster, dy: number): void {
  rectR(r, 8, dy, 24, 2, RU.tyreLight); // front bumper
  rectR(r, 6, 1 + dy, 28, 5, RU.body);
  r.set(6, 1 + dy, null);
  r.set(33, 1 + dy, null);
  rectR(r, 7, 1 + dy, 3, 2, RU.plate); // headlights
  rectR(r, 30, 1 + dy, 3, 2, RU.plate);
  rectR(r, 14, 1 + dy, 12, 1, RU.bodyDark); // grille
  rectR(r, 7, 4 + dy, 26, 1, RU.bodyLight); // hood crease catching the light
  // windshield: a trapezoid, the light streak runs diagonally, wipers at the bottom
  for (let j = 0; j < 5; j++) {
    const inset = j === 0 ? 3 : j === 1 ? 2 : 1;
    rectR(r, 6 + inset, 5 + j + dy, 28 - inset * 2, 1, j === 4 ? RU.glassDark : RU.glass);
  }
  lineR(r, 11, 8 + dy, 14, 5 + dy, RU.glassLight);
  lineR(r, 14, 8 + dy, 17, 5 + dy, RU.glassLight);
  lineR(r, 10, 9 + dy, 15, 8 + dy, RU.bodyDark);
  lineR(r, 21, 9 + dy, 26, 8 + dy, RU.bodyDark);
  rectR(r, 7, 10 + dy, 26, 6 - dy, RU.body); // cab roof
  rectR(r, 8, 10 + dy, 2, 6 - dy, RU.bodyLight);
  rectR(r, 30, 10 + dy, 2, 6 - dy, RU.bodyShade);
  rectR(r, 7, 10 + dy, 1, 5, RU.glassDark); // door windows along the cab sides
  rectR(r, 32, 10 + dy, 1, 5, RU.glassDark);
  rectR(r, 3, 7 + dy, 3, 2, RU.body); // mirrors
  rectR(r, 34, 7 + dy, 3, 2, RU.body);
  r.set(3, 7 + dy, RU.chromeShade);
  r.set(36, 7 + dy, RU.chromeShade);
}

function roof(r: Raster, turned: boolean): void {
  const { x0, x1, y0, y1 } = BOX;
  rectR(r, x0, y0, x1 - x0 + 1, y1 - y0 + 1, RU.body);
  rectR(r, x0 + 1, y0 + 1, 2, y1 - y0 - 1, RU.bodyLight); // light from the top-left
  rectR(r, x1 - 2, y0 + 1, 2, y1 - y0 - 1, RU.bodyShade);
  // chrome trim round the roof edge (the real box has it)
  rectR(r, x0, y0, x1 - x0 + 1, 1, RU.chrome);
  rectR(r, x0, y0, 1, y1 - y0 + 1, RU.chrome);
  rectR(r, x1, y0, 1, y1 - y0 + 1, RU.chromeShade);
  rectR(r, x0, y1, x1 - x0 + 1, 1, RU.chromeShade);
  if (turned) {
    turnedRoof(r);
    return;
  }
  // checkered bands along both edges, broken where the script runs across
  for (const [y, h] of [[18, 10], [43, 4]] as const) {
    checker(r, 5, y, 4, h, 0);
    checker(r, 31, y, 4, h, 1);
  }
  vinyl(r, BURGER_S, 14, 18);
  vinyl(r, ROOF_SCRIPT, 5, 30);
  // the roof A/C unit
  rectR(r, 15, 43, 10, 4, RU.bodyDark);
  rectR(r, 15, 43, 10, 1, RU.bodyLight);
  rectR(r, 18, 44, 4, 2, RU.tyreLight);
  r.set(19, 44, RU.chromeShade);
  r.set(20, 45, RU.chromeShade);
}

/** v9: checker line along each long edge, the burger over the script (both turned), A/C at the rear corner. */
function turnedRoof(r: Raster): void {
  checker(r, 5, 18, 2, 29, 0);
  checker(r, 33, 18, 2, 29, 1);
  vinyl(r, TURNED_BURGER, ...turnedOrigin(TURNED.burger.sx, TURNED.burger.sy, BURGER_S[0].length));
  vinyl(r, TURNED_SCRIPT, ...turnedOrigin(TURNED.script.sx, TURNED.script.sy, ROOF_SCRIPT[0].length));
  rectR(r, 8, 42, 8, 5, RU.bodyDark);
  rectR(r, 8, 42, 1, 5, RU.bodyLight);
  rectR(r, 10, 43, 4, 3, RU.tyreLight);
  r.set(11, 44, RU.chromeShade);
  r.set(12, 43, RU.chromeShade);
}

function rear(r: Raster, brake: boolean, turned: boolean): void {
  const { x0, x1, y1 } = BOX;
  rectR(r, x0, y1 + 1, x1 - x0 + 1, REAR_Y1 - y1, RU.bodyShade);
  rectR(r, x0, y1 + 1, x1 - x0 + 1, 1, RU.body);
  // door frame + face logo
  rectR(r, 12, y1 + 2, 1, 10, RU.chromeShade);
  rectR(r, 27, y1 + 2, 1, 10, RU.chromeShade);
  if (turned) face(r, TURNED_FACE, 14, y1 + 2, RU.bodyLight);
  else face(r, FACE_S, 15, y1 + 1, RU.bodyLight);
  // light clusters: tall red lamps in the rear corners, a white reverse lamp under each
  for (const x of [x0 + 1, x1 - 3]) {
    rectR(r, x, 52, 3, 5, brake ? RU.brake : RU.check);
    rectR(r, x, 57, 3, 1, RU.plate);
    if (brake) {
      rectR(r, x + 1, 53, 1, 3, RU.brakeHot);
      r.set(x, 51, RU.brake);
      r.set(x + 2, 51, RU.brake);
    } else {
      rectR(r, x, 52, 3, 1, RU.checkLight);
    }
  }
  rectR(r, x0, REAR_Y1, x1 - x0 + 1, 1, RU.bodyDark);
}

function underside(r: Raster, tread: number): void {
  tyre(r, 4, 60, 5, 4, tread);
  tyre(r, 31, 60, 5, 4, tread);
  rectR(r, 9, 61, 22, 3, RU.tyreLight); // bumper
  rectR(r, 16, 62, 8, 2, RU.plate);
  rectR(r, 9, 61, 22, 1, RU.rim);
}

/** Rocket booster strapped to the box side: Ciccio's red-white stripes, flame pointing down. */
function booster(r: Raster, cx: number, flame: number): void {
  const x = cx - 2;
  rectR(r, x, 22, 4, 21, RU.white);
  for (let y = 25; y < 42; y += 4) rectR(r, x, y, 4, 2, RU.check);
  rectR(r, x, 22, 1, 21, RU.whiteShade);
  r.set(x + 1, 21, RU.check);
  r.set(x + 2, 21, RU.check);
  r.set(x + 1, 20, RU.checkDark);
  rectR(r, x - 1, 39, 1, 4, RU.checkDark); // fins
  rectR(r, x + 4, 39, 1, 4, RU.checkDark);
  rectR(r, x, 43, 4, 1, RU.tyreLight); // nozzle
  const len = [9, 12, 10][flame % 3];
  for (let j = 0; j < len; j++) {
    const t = j / len;
    const col = t < 0.25 ? RU.flameCore : t < 0.55 ? RU.flameYellow : t < 0.8 ? RU.flameOrange : RU.flameRed;
    const w = t < 0.6 ? 4 : t < 0.85 ? 2 : 1;
    const wob = flame % 2 === 0 || t < 0.5 ? 0 : 1;
    rectR(r, x + Math.floor((4 - w) / 2) + wob, 44 + j, w, 1, col);
  }
}

/** Shears the finished truck: the cab swings 2 px, the box 1 px, the rear stays planted. */
function lean(src: Raster, dir: -1 | 0 | 1): Raster {
  if (dir === 0) return src;
  const out = new Raster(TRUCK_W, TRUCK_H);
  for (let y = 0; y < TRUCK_H; y++) {
    const dx = y < BOX.y0 ? 2 * dir : y <= BOX.y1 ? dir : 0;
    for (let x = 0; x < TRUCK_W; x++) {
      const c = src.get(x, y);
      if (c !== 0) out.set(x + dx, y, c);
    }
  }
  return out;
}

function truckFrame(p: Pose): Raster {
  let r = new Raster(TRUCK_W, TRUCK_H);
  tyre(r, 4, 2, 2, 6, p.tread); // front wheels beside the hood
  tyre(r, 34, 2, 2, 6, p.tread);
  cab(r, p.cabDy);
  roof(r, p.turned);
  rear(r, p.brake, p.turned);
  underside(r, p.tread);
  r = lean(r, p.lean);
  if (p.boost >= 0) {
    booster(r, 2, p.boost);
    booster(r, 37, p.boost + 1);
  }
  outlineRaster(r, RU.ink);
  return r;
}

/** 'rush-truck' (`turned` false) or 'rush-truck-x' (true): the TRUCK_FRAME frames. */
export function buildTruck(turned = false): Raster[] {
  const base: Pose = { tread: 0, cabDy: 0, brake: false, lean: 0, boost: -1, turned };
  const hit = truckFrame(base);
  washR(hit, RU.white, 0.6);
  return [
    truckFrame(base),
    truckFrame({ ...base, tread: 1, cabDy: 1 }),
    truckFrame({ ...base, lean: -1 }),
    truckFrame({ ...base, lean: 1 }),
    truckFrame({ ...base, brake: true }),
    hit,
    truckFrame({ ...base, boost: 0 }),
    truckFrame({ ...base, tread: 1, boost: 1 }),
    truckFrame({ ...base, boost: 2 }),
  ];
}

export const buildTruckX = (): Raster[] => buildTruck(true);

/** 40x24 soft shadow: solid core, dithered rim (the scene draws it at low alpha). */
export function buildTruckShadow(): Raster {
  const r = new Raster(40, 24);
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 40; x++) {
      const d = ((x - 19.5) / 19.5) ** 2 + ((y - 11.5) / 11.5) ** 2;
      if (d <= 0.7 || (d <= 1 && (x + y) % 2 === 0)) r.set(x, y, RU.shadow);
    }
  }
  return r;
}
