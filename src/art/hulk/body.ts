/**
 * Renders one hero frame from a Pose: sculpt the torso / limbs (zbuf), tint them with the lime and purple ramps,
 * stamp the hand-drawn head, draw the dark seams where parts overlap, snap the feet to the bottom row and
 * wrap the silhouette in the black outline. Pure JS rasters (no DOM).
 */
import type { CiccioFrameAnchors } from '../../contracts';
import { bounds, type Raster } from '../ciccio/raster';
import { BRIDGE, gridColour, headRows, NECK } from './head';
import { armPrims, legPrims } from './limbs';
import { GREEN, INK, LILAC, M, SEAM, SHORTS } from './palette';
import { paintDetails } from './details';
import { impactRays } from './impact';
import { FRAME, HEAD_MAT, N4, toImg, type Img } from './img';
import { armJoints, chestLift, K, LAYER, torsoPt, type Pose } from './rig';
import { torsoPrims } from './torso';
import { resolve } from './zbuf';

export { FRAME };

const SHORTS_IDS: ReadonlySet<number> = new Set([M.shorts.id, M.shortsFar.id]);

/** Stamps the hand-drawn head features over the sculpted face (top layer, no outline of its own). */
function stampHead(img: Img, p: Pose, ox: number, oy: number): void {
  const rows = headRows(p.face);
  rows.forEach((row, gy) => {
    for (let gx = 0; gx < row.length; gx++) {
      const ch = row[gx];
      if (ch === '.') continue;
      const i = (oy + gy) * FRAME + ox + gx;
      if (ox + gx < 0 || ox + gx >= FRAME || oy + gy < 0 || oy + gy >= FRAME) continue;
      if (ch === 's' && img.mat[i] === M.face.id) continue;
      img.r.px[i] = gridColour(ch) ?? GREEN.base;
      img.mat[i] = img.r.px[i] === GREEN.base ? M.face.id : HEAD_MAT;
      img.layer[i] = LAYER.head;
    }
  });
}

/** Dark line on the back part wherever a front part overlaps it (muscle / limb separation). */
function seams(img: Img): void {
  const hits: [number, string][] = [];
  for (let y = 0; y < FRAME; y++) {
    for (let x = 0; x < FRAME; x++) {
      const i = y * FRAME + x;
      if (img.mat[i] < 0) continue;
      const back = SHORTS_IDS.has(img.mat[i]);
      for (const [dx, dy] of N4) {
        const j = (y + dy) * FRAME + x + dx;
        if (x + dx < 0 || y + dy < 0 || x + dx >= FRAME || y + dy >= FRAME || img.mat[j] < 0) continue;
        if (img.layer[j] <= img.layer[i]) continue;
        // an arm in front of the body or a leg is split from it even when both are lime skin
        if (img.mat[j] === img.mat[i] && !(img.layer[j] >= LAYER.armB && img.layer[i] <= LAYER.pelvis)) continue;
        if (SHORTS_IDS.has(img.mat[j])) continue;
        hits.push([i, back ? SHORTS.deep : SEAM]);
        break;
      }
    }
  }
  for (const [i, c] of hits) img.r.px[i] = c;
}

const BODY_MATS: ReadonlySet<number> = new Set([M.skin.id, M.skinFar.id, M.shorts.id, M.shortsFar.id]);

const N8: readonly (readonly [number, number])[] = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]];

/** Stray pixels and 2-px islands of a body tone take the colour that dominates their neighbourhood (cleaner pixel art). */
function despeckle(img: Img): void {
  const fixes: [number, string][] = [];
  const around: string[] = [];
  for (let y = 1; y < FRAME - 1; y++) {
    for (let x = 1; x < FRAME - 1; x++) {
      const i = y * FRAME + x;
      const c = img.r.px[i];
      if (c === null || !BODY_MATS.has(img.mat[i]) || img.layer[i] === LAYER.torso) continue;
      around.length = 0;
      for (const [dx, dy] of N8) {
        const n = img.r.px[i + dy * FRAME + dx];
        if (n !== null) around.push(n);
      }
      if (around.filter((n) => n === c).length > 2) continue;
      const best = around.find((n) => n !== INK && around.filter((m) => m === n).length >= 5);
      if (best !== undefined) fixes.push([i, best]);
    }
  }
  for (const [i, c] of fixes) img.r.px[i] = c;
}

/** Top-left silhouette edges catch the light: one highlight pixel along them (lime skin, lilac shorts). */
function rimLight(img: Img): void {
  const lit: [number, string][] = [];
  for (let y = 1; y < FRAME; y++) {
    for (let x = 1; x < FRAME; x++) {
      const i = y * FRAME + x;
      if (img.r.px[i - 1] !== null && img.r.px[i - FRAME] !== null) continue;
      if (img.mat[i] === M.skin.id && img.r.px[i] === GREEN.base) lit.push([i, GREEN.hi]);
      else if (img.mat[i] === M.shorts.id && img.r.px[i] !== SHORTS.deep) lit.push([i, LILAC]);
    }
  }
  for (const [i, c] of lit) img.r.px[i] = c;
}

/** Moves the sprite down so the lowest opaque row is `row`; returns the shift. */
function snapFeet(r: Raster, row: number): number {
  const b = bounds(r);
  if (!b || b.y1 === row) return 0;
  const dy = row - b.y1;
  const src = r.px.slice();
  r.px.fill(null);
  for (let y = 0; y < FRAME; y++) {
    const ny = y + dy;
    if (ny < 0 || ny >= FRAME) continue;
    for (let x = 0; x < FRAME; x++) r.px[ny * FRAME + x] = src[y * FRAME + x];
  }
  return dy;
}

/** 1-px black ring around the whole silhouette. */
function outline(r: Raster): void {
  const ring: number[] = [];
  for (let y = 0; y < FRAME; y++) {
    for (let x = 0; x < FRAME; x++) {
      if (r.get(x, y) !== null) continue;
      if (N4.some(([dx, dy]) => r.get(x + dx, y + dy) !== null)) ring.push(y * FRAME + x);
    }
  }
  for (const i of ring) r.px[i] = INK;
}

export function renderPose(p: Pose): { raster: Raster; anchors: CiccioFrameAnchors } {
  const sh = 1 + 3 * (p.twist ?? 0);
  const [nx, ny] = torsoPt(p, 0.8 * sh, K.neckY + 0.5 - chestLift(p));
  const off = p.head ?? [0, 0];
  const ox = Math.round(nx + off[0] - NECK.x);
  const oy = Math.round(ny + off[1] - NECK.y);
  const prims = [
    ...armPrims(p, p.armB, false),
    ...legPrims(p, p.legB, false),
    ...legPrims(p, p.legF, true),
    ...armPrims(p, p.armF, true),
    ...torsoPrims(p),
  ];
  const img = toImg(resolve(prims, FRAME, FRAME));
  despeckle(img);
  paintDetails(img, p);
  rimLight(img);
  stampHead(img, p, ox, oy);
  seams(img);
  const dy = snapFeet(img.r, FRAME - 2);
  outline(img.r);

  const j = armJoints(p, p.armF, true);
  let hx = Math.round(j.fist[0] + j.fd[0] * 2);
  let hy = Math.round(j.fist[1] + j.fd[1] * 2 + dy);
  if (img.r.get(hx, hy) === null) {
    hx = Math.round(j.fist[0]);
    hy = Math.round(j.fist[1] + dy);
  }
  if (p.impact) impactRays(img.r, hx, hy);
  const [cx, cy] = torsoPt(p, 1.2 * sh, -10);
  const [bx, by] = torsoPt(p, -9, -11);
  return {
    raster: img.r,
    anchors: {
      hand: { x: hx, y: hy },
      chest: { x: Math.round(cx), y: Math.round(cy + dy) },
      back: { x: Math.round(bx), y: Math.round(by + dy) },
      head: { x: ox + BRIDGE.x, y: oy + BRIDGE.y + dy },
    },
  };
}
