/**
 * Torso sculpt: a short neck that widens through a long trapezius slope into very broad shoulders, a steep V-taper
 * down to a ~22 px waist, two pecs, a single ab row and the belt block of the baggy purple trousers. Built from lit
 * primitives (zbuf.ts) in torso-local coordinates (origin = hip line, y down); the trouser legs are in limbs.ts.
 */
import { M } from './palette';
import { chestLift, LAYER, pelvisAngle, rad, torsoPt, type Pose } from './rig';
import { ellipsoid, profile, type EllipsoidOpts, type Prim, type ProfileKey } from './zbuf';

/**
 * Half widths of the bare torso: [local y, half width]. A vertical neck (rows 19-22 with the idle head), then the
 * trapezius rises ~3 px per row on each side out to the shoulders, then the ribcage falls steeply to the waist.
 */
const TORSO: readonly (readonly [number, number])[] = [
  [-21.5, 5.4], [-15.5, 5.6], [-14.5, 6.8], [-13.5, 9.6], [-12.5, 12.8], [-11.5, 16], [-10.5, 18.6], [-9.5, 20.2],
  [-8.3, 20.8], [-6.8, 18.6], [-5.2, 14.6], [-4, 11], [-1, 10.4], [1, 10.4],
];

/** Pelvis block of the shorts: waistband to the crotch (the legs of the shorts are drawn with the thighs). */
const SHORTS: readonly (readonly [number, number])[] = [[-4.6, 10], [-3, 10.2], [0, 10.6], [3, 11], [5.6, 11.6]];

/** Local y of the ragged hem of the pelvis block: an arch over the crotch that drops to the outer thigh (two trouser legs). */
const hemY = (lx: number): number => 1.9 + 0.2 * Math.abs(lx) + 0.45 * Math.abs((((lx + 60) / 3) % 2) - 1);

export function torsoPrims(p: Pose): Prim[] {
  const tw = p.twist ?? 0;
  const br = p.breath ?? 0;
  const up = chestLift(p);
  const a = rad(p.lean);
  const wx = 1 - 0.3 * Math.abs(tw);
  const sh = 1 + 3 * tw;
  const [ox, oy] = torsoPt(p, 0, 0);
  // the centre line leans toward the facing side from the chest up to the neck
  const keys = (src: readonly (readonly [number, number])[], flare: number): ProfileKey[] =>
    src.map(([y, w]) => [y < -8 ? y - up : y, w * wx + (y > -14 && y < -5 ? flare : 0), sh * (0.3 + 0.5 * Math.min(1, Math.max(0, (-10 - y) / 9)))] as ProfileKey);
  const skin = (lx: number, ly: number, rx: number, ry: number, rz: number, o: EllipsoidOpts = {}): Prim => {
    const [x, y] = torsoPt(p, lx, ly);
    return ellipsoid(M.skin, LAYER.torso, x, y, rx, ry, rz, { angle: a, ...o });
  };
  const pa = pelvisAngle(p);
  const aboveHem = (x: number, y: number): boolean => {
    const dx = x - ox;
    const dy = y - oy;
    return -dx * Math.sin(pa) + dy * Math.cos(pa) < hemY(dx * Math.cos(pa) + dy * Math.sin(pa));
  };
  const flatKeys = SHORTS.map(([y, w]) => [y, w * wx, 0.1 * sh] as ProfileKey);
  const prims: Prim[] = [
    profile(M.skin, LAYER.torso, ox, oy, keys(TORSO, br * 0.4), { angle: a }),
    // pecs: two big plates with a shadowed under-edge
    skin(sh - 6.4 * wx, -9.6 - up, 6.6 * wx, 3.7 + br * 0.3, 5.6, { lift: 10, bias: 0.03 }),
    skin(sh + 6.4 * wx, -9.6 - up, 6.6 * wx, 3.7 + br * 0.3, 5.6, { lift: 10 }),
    profile(M.shorts, LAYER.pelvis, ox, oy, flatKeys, { angle: pa, lift: -3, flat: 0.7, clip: aboveHem }),
  ];
  for (const side of [-1, 1]) prims.push(skin(sh * 0.55 + side * 2.6 * wx, -5.6, 2.5, 1.1, 4, { lift: 14 }));
  return prims;
}
