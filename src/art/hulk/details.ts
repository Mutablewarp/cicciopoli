/**
 * Pixel-level details laid over the sculpt: finger gaps and a knuckle glint on the fists, toe gaps and a kneecap on the
 * legs, the sternum and ab grooves, a wrist crease, the waistband seam and the folds of the trousers. They only recolour pixels that already belong to skin, so silhouettes never change.
 */
import { GREEN, GREEN_FAR, M, SHORTS } from './palette';
import { type Img, tintIn } from './img';
import { armJoints, chestLift, LAYER, legJoints, pelvisPt, rad, torsoPt, type ArmPose, type LegPose, type Pose, type Pt } from './rig';

const SKIN: ReadonlySet<number> = new Set([M.skin.id, M.skinFar.id]);
const CLOTH: ReadonlySet<number> = new Set([M.shorts.id, M.shortsFar.id]);

function fistDetails(img: Img, p: Pose, a: ArmPose, front: boolean): void {
  if (a.hand === 'claw') return;
  const j = armJoints(p, a, front);
  const tones = front ? GREEN : GREEN_FAR;
  const layer = a.behind ? LAYER.armBehind : front ? LAYER.armF : LAYER.armB;
  const [fx, fy] = j.fist;
  if (a.hand === 'wrap') {
    // creases between the four fingers rolled round the pole
    for (const k of [-2.6, 0, 2.6]) for (const dx of [1.4, 2.4, 3.4, 4.4]) tintIn(img, fx + dx, fy + k, SKIN, tones.deep, layer);
    return;
  }
  const [dx, dy] = j.fd;
  const [nx, ny] = [-dy, dx];
  // gaps between the four fingers, running along the forearm direction over the knuckle end
  for (const k of [-1.9, 0, 1.9]) {
    for (const s of [1.2, 2.2, 3.1]) tintIn(img, fx + dx * s + nx * k, fy + dy * s + ny * k, SKIN, tones.deep, layer);
  }
  // wrist crease and a glint on the knuckle ridge
  for (const k of [-2.6, -1.3, 0, 1.3, 2.6]) tintIn(img, fx - dx * 3.4 + nx * k, fy - dy * 3.4 + ny * k, SKIN, tones.sh, layer);
  tintIn(img, fx + dx * 4.3 - nx * 1, fy + dy * 4.3 - ny * 1, SKIN, tones.hi, layer);
}

function footDetails(img: Img, p: Pose, l: LegPose, front: boolean): void {
  const j = legJoints(p, l, front);
  const tones = front ? GREEN : GREEN_FAR;
  const f = rad(j.foot);
  const c = Math.cos(f);
  const s = Math.sin(f);
  const fp = (lx: number, ly: number): Pt => [j.ankle[0] + lx * c - ly * s, j.ankle[1] + lx * s + ly * c];
  // two toe gaps at the front of the foot
  for (const lx of [6.2, 7.8]) {
    const [x, y] = fp(lx, 2.6);
    tintIn(img, x, y, SKIN, tones.deep, front ? LAYER.nearLeg : LAYER.farLeg);
  }
}

/** Sternum, the lower edge of each pec and the obliques (torso layer only, so arms in front stay clean). */
function torsoDetails(img: Img, p: Pose): void {
  const tw = p.twist ?? 0;
  const wx = 1 - 0.3 * Math.abs(tw);
  const sh = 1 + 3 * tw;
  const cx = 0.55 * sh;
  const lift = chestLift(p);
  const mark = (lx: number, ly: number, c: string): void => {
    const [x, y] = torsoPt(p, lx, ly);
    tintIn(img, x, y, SKIN, c, LAYER.torso);
  };
  for (let ly = -11; ly <= -5.4; ly += 0.5) mark(cx, ly, GREEN.deep);
  for (const side of [-1, 1]) {
    // the lower edge of the pec: a shaded arc with a lit ridge above it
    for (let t = 0.25; t <= 2.9; t += 0.12) {
      const lx = sh + side * 6.4 * wx + 6.2 * wx * Math.cos(t) * side * (side > 0 ? 1 : -1);
      const ly = -9.6 - lift + 3.7 * Math.sin(t) + 0.5;
      mark(lx, ly, GREEN.deep);
      mark(lx, ly + 1, GREEN.sh);
      mark(lx, ly - 1.3, GREEN.hi);
    }
    for (let ly = -6.4; ly <= -5; ly += 0.5) mark(cx + side * 8.4 * wx, ly, GREEN.sh);
  }
}

/** A one-pixel kneecap highlight (a fixed-direction crease under it would read as a stray tick on a bent leg). */
function kneeDetails(img: Img, p: Pose, l: LegPose, front: boolean): void {
  const j = legJoints(p, l, front);
  const tones = front ? GREEN : GREEN_FAR;
  tintIn(img, j.knee[0] - 1, j.knee[1] - 1, SKIN, tones.hi, front ? LAYER.nearLeg : LAYER.farLeg);
}

/** Trousers: a lit waistband with a seam under it, the crotch seam and one lilac fold running down each thigh toward the torn hem. */
function shortsDetails(img: Img, p: Pose): void {
  const wx = 1 - 0.3 * Math.abs(p.twist ?? 0);
  const cloth = (lx: number, ly: number, c: string, layer: number = LAYER.pelvis): void => {
    const [x, y] = pelvisPt(p, 0.2 + lx * wx, ly);
    tintIn(img, x, y, CLOTH, c, layer);
  };
  for (let k = -13; k <= 13; k += 0.5) {
    cloth(k, -4, SHORTS.hi);
    cloth(k, -2.9, SHORTS.deep);
  }
  for (const [leg, front] of [[p.legB, false], [p.legF, true]] as const) {
    const j = legJoints(p, leg, front);
    const [vx, vy] = [j.knee[0] - j.hip[0], j.knee[1] - j.hip[1]];
    const len = Math.hypot(vx, vy) || 1;
    const [nx, ny] = [-vy / len, vx / len];
    const layer = front ? LAYER.nearLeg : LAYER.farLeg;
    // fold: starts at the outer hip and leans toward the inseam; a dark crease beside it
    for (let t = 0.1; t <= 0.5; t += 0.03) {
      const side = (front ? 1 : -1) * (5 - 14 * (t - 0.1));
      tintIn(img, j.hip[0] + vx * t + nx * side, j.hip[1] + vy * t + ny * side, CLOTH, front ? SHORTS.hi : SHORTS.sh, layer);
      tintIn(img, j.hip[0] + vx * t + nx * (side + 1), j.hip[1] + vy * t + ny * (side + 1), CLOTH, SHORTS.deep, layer);
    }
  }
}

export function paintDetails(img: Img, p: Pose): void {
  torsoDetails(img, p);
  shortsDetails(img, p);
  kneeDetails(img, p, p.legB, false);
  kneeDetails(img, p, p.legF, true);
  fistDetails(img, p, p.armB, false);
  fistDetails(img, p, p.armF, true);
  footDetails(img, p, p.legB, false);
  footDetails(img, p, p.legF, true);
}
