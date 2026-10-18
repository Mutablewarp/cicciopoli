/**
 * Tiny software sculptor for the hero: z-buffered ellipsoids and tapered capsules, lit from the top-left,
 * rasterised at SS x supersampling and boiled down to one palette tone per pixel. Overlapping primitives
 * of one layer crease against each other (pecs over chest, biceps over arm) the way real muscle does, and
 * a higher layer always wins over a lower one (far leg < torso < shorts < near arm).
 * Pure JS (no DOM); consumed by src/art/hulk/body.ts.
 */
import type { Tones } from '../ciccio/palette';

const SS = 2;

/** Surface material: a 4-step ramp plus an identity used by the line pass (same material = no seam line). */
export interface Mat {
  readonly tones: Tones;
  readonly id: number;
}

export interface Hit {
  z: number;
  lam: number;
}

export interface Prim {
  readonly mat: Mat;
  readonly layer: number;
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
  hit(x: number, y: number, out: Hit): boolean;
}

const LIGHT = (() => {
  const v = [-0.58, -0.72, 0.42];
  const n = Math.hypot(v[0], v[1], v[2]);
  return v.map((k) => k / n);
})();

function lambert(nx: number, ny: number, nz: number, bias: number): number {
  const n = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / n + bias;
}

const LAYER_Z = 60;

/** Light added to every surface that does not set its own bias, so flat areas sit on the base tone instead of flickering at a threshold. */
const BIAS = 0.16;

export interface EllipsoidOpts {
  angle?: number;
  bias?: number;
  /** extra depth so a primitive sits proud of its neighbours of the same layer */
  lift?: number;
  clip?: (x: number, y: number) => boolean;
}

/** Ellipsoid with in-plane radii rx / ry (rotated by `angle`, clockwise radians) and depth radius rz. */
export function ellipsoid(
  mat: Mat, layer: number, cx: number, cy: number, rx: number, ry: number, rz: number, o: EllipsoidOpts = {},
): Prim {
  const ca = Math.cos(o.angle ?? 0);
  const sa = Math.sin(o.angle ?? 0);
  const ext = Math.max(rx, ry) + 1;
  const bias = o.bias ?? BIAS;
  const base = layer * LAYER_Z + (o.lift ?? 0);
  return {
    mat,
    layer,
    x0: cx - ext,
    y0: cy - ext,
    x1: cx + ext,
    y1: cy + ext,
    hit(x, y, out) {
      const dx = x - cx;
      const dy = y - cy;
      const ux = (dx * ca + dy * sa) / rx;
      const uy = (-dx * sa + dy * ca) / ry;
      const d2 = ux * ux + uy * uy;
      if (d2 >= 1) return false;
      if (o.clip && !o.clip(x, y)) return false;
      const w = Math.sqrt(1 - d2);
      // surface normal in the rotated frame, turned back to the screen frame
      const lx = ux / rx;
      const ly = uy / ry;
      out.z = base + w * rz;
      out.lam = lambert(lx * ca - ly * sa, lx * sa + ly * ca, w / rz, bias);
      return true;
    },
  };
}

export interface CapsuleOpts {
  bias?: number;
  lift?: number;
  /** depth radius as a fraction of the local radius (default 0.9) */
  flat?: number;
  /** gaussian swellings along the axis: [t, extra radius, width in t units] */
  bumps?: readonly (readonly [number, number, number])[];
  /** reject a sample by axis position t (0..1, clamped) and signed side distance */
  clip?: (t: number, side: number) => boolean;
  /** leave the cap at the start point out (a thigh begins flat under the pelvis instead of bulging above the hip) */
  flatStart?: boolean;
}

/** Tapered capsule (round cone) from a (radius ra) to b (radius rb). */
export function capsule(
  mat: Mat, layer: number, ax: number, ay: number, bx: number, by: number, ra: number, rb: number, o: CapsuleOpts = {},
): Prim {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy || 1;
  const len = Math.sqrt(len2);
  const bumps = o.bumps ?? [];
  const rmax = Math.max(ra, rb) + bumps.reduce((m, b) => Math.max(m, b[1]), 0) + 1;
  const flat = o.flat ?? 0.9;
  const bias = o.bias ?? BIAS;
  const base = layer * LAYER_Z + (o.lift ?? 0);
  return {
    mat,
    layer,
    x0: Math.min(ax, bx) - rmax,
    y0: Math.min(ay, by) - rmax,
    x1: Math.max(ax, bx) + rmax,
    y1: Math.max(ay, by) + rmax,
    hit(x, y, out) {
      const raw = ((x - ax) * vx + (y - ay) * vy) / len2;
      if (o.flatStart && raw < 0.08) return false;
      const t = Math.max(0, Math.min(1, raw));
      const px = ax + vx * t;
      const py = ay + vy * t;
      let r = ra + (rb - ra) * t;
      for (const [t0, amp, wd] of bumps) r += amp * Math.exp(-(((t - t0) / wd) ** 2));
      const dx = x - px;
      const dy = y - py;
      const d2 = (dx * dx + dy * dy) / (r * r);
      if (d2 >= 1) return false;
      if (o.clip) {
        const side = ((x - ax) * -vy + (y - ay) * vx) / len;
        if (!o.clip(t, side)) return false;
      }
      const w = Math.sqrt(1 - d2);
      out.z = base + w * r * flat;
      out.lam = lambert(dx / r, dy / r, w / flat, bias);
      return true;
    },
  };
}

export interface ProfileOpts {
  /** clockwise rotation (radians) of the local frame around (ox, oy) */
  angle?: number;
  bias?: number;
  lift?: number;
  /** depth radius as a fraction of the local half width (default 0.75) */
  flat?: number;
  clip?: (x: number, y: number) => boolean;
}

/** One key of a profile: local y (down), half width and centre x offset. */
export type ProfileKey = readonly [number, number, number?];

/**
 * Extruded silhouette with an elliptic cross-section: the half width (and centre) follow `keys` along the local
 * y axis (linear between keys). Gives clean V tapers for the torso and the shorts; local origin = (ox, oy).
 */
export function profile(
  mat: Mat, layer: number, ox: number, oy: number, keys: readonly ProfileKey[], o: ProfileOpts = {},
): Prim {
  const ca = Math.cos(o.angle ?? 0);
  const sa = Math.sin(o.angle ?? 0);
  const flat = o.flat ?? 0.75;
  const bias = o.bias ?? BIAS;
  const base = layer * LAYER_Z + (o.lift ?? 0);
  const ext = keys.reduce((m, k) => Math.max(m, Math.abs(k[0]), k[1] + Math.abs(k[2] ?? 0)), 0) + 1;
  const yTop = keys[0][0];
  const yBot = keys[keys.length - 1][0];
  return {
    mat,
    layer,
    x0: ox - ext,
    y0: oy - ext,
    x1: ox + ext,
    y1: oy + ext,
    hit(x, y, out) {
      const lx = (x - ox) * ca + (y - oy) * sa;
      const ly = -(x - ox) * sa + (y - oy) * ca;
      if (ly < yTop || ly >= yBot) return false;
      let i = 1;
      while (keys[i][0] <= ly) i++;
      const [y0, w0, c0 = 0] = keys[i - 1];
      const [y1, w1, c1 = 0] = keys[i];
      const t = (ly - y0) / (y1 - y0);
      const hw = w0 + (w1 - w0) * t;
      const dx = lx - (c0 + (c1 - c0) * t);
      const u = dx / hw;
      if (u * u >= 1) return false;
      if (o.clip && !o.clip(x, y)) return false;
      const w = Math.sqrt(1 - u * u);
      const rz = hw * flat;
      const slope = (w1 - w0) / (y1 - y0);
      const nx = u / hw;
      const ny = (-u * u * slope) / hw;
      out.z = base + w * rz;
      out.lam = lambert(nx * ca - ny * sa, nx * sa + ny * ca, w / rz, bias);
      return true;
    },
  };
}

/** Tone step 0 (highlight) .. 3 (deep) for a lambert value. */
function toneIndex(lam: number): number {
  if (lam > 0.82) return 0;
  if (lam > 0.46) return 1;
  if (lam > 0.14) return 2;
  return 3;
}

export interface Resolved {
  readonly w: number;
  readonly h: number;
  /** material index into `mats`, -1 = empty */
  readonly mat: Int16Array;
  readonly layer: Int8Array;
  readonly tone: Uint8Array;
  readonly mats: readonly Mat[];
}

/** Rasterises primitives (painter order irrelevant: the z-buffer decides) into one tone per pixel. */
export function resolve(prims: readonly Prim[], w: number, h: number): Resolved {
  const W = w * SS;
  const H = h * SS;
  const zbuf = new Float32Array(W * H).fill(-1e9);
  const owner = new Int16Array(W * H).fill(-1);
  const lams = new Float32Array(W * H);
  const mats: Mat[] = [];
  // one "combo" per distinct (material, layer): the unit a pixel votes for
  const combos: { mat: number; layer: number }[] = [];
  const comboOf = prims.map((p) => {
    let mi = mats.indexOf(p.mat);
    if (mi < 0) mi = mats.push(p.mat) - 1;
    let ci = combos.findIndex((c) => c.mat === mi && c.layer === p.layer);
    if (ci < 0) ci = combos.push({ mat: mi, layer: p.layer }) - 1;
    return ci;
  });
  const hit: Hit = { z: 0, lam: 0 };
  prims.forEach((p, pi) => {
    const x0 = Math.max(0, Math.floor(p.x0 * SS));
    const x1 = Math.min(W - 1, Math.ceil(p.x1 * SS));
    const y0 = Math.max(0, Math.floor(p.y0 * SS));
    const y1 = Math.min(H - 1, Math.ceil(p.y1 * SS));
    for (let sy = y0; sy <= y1; sy++) {
      for (let sx = x0; sx <= x1; sx++) {
        if (!p.hit((sx + 0.5) / SS, (sy + 0.5) / SS, hit)) continue;
        const i = sy * W + sx;
        if (hit.z <= zbuf[i]) continue;
        zbuf[i] = hit.z;
        owner[i] = pi;
        lams[i] = hit.lam;
      }
    }
  });
  const mat = new Int16Array(w * h).fill(-1);
  const layer = new Int8Array(w * h);
  const tone = new Uint8Array(w * h);
  const count = new Int16Array(combos.length);
  const lamSum = new Float32Array(combos.length);
  const half = (SS * SS) / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      count.fill(0);
      lamSum.fill(0);
      let covered = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const si = (y * SS + j) * W + x * SS + i;
          const o = owner[si];
          if (o < 0) continue;
          covered++;
          count[comboOf[o]]++;
          lamSum[comboOf[o]] += lams[si];
        }
      }
      if (covered < half) continue;
      let best = 0;
      for (let c = 1; c < combos.length; c++) if (count[c] > count[best]) best = c;
      mat[y * w + x] = combos[best].mat;
      layer[y * w + x] = combos[best].layer;
      tone[y * w + x] = toneIndex(lamSum[best] / count[best]);
    }
  }
  return { w, h, mat, layer, tone, mats };
}
