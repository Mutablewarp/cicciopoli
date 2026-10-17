/** Inferno sky layers: gradient sky, spinning fire vortex, amber pixel clouds. */
import { ctxOf, makeCanvas, rng, smoothGradient } from '../pixel';
import { CLEAR, PixBuf, ditherIndex, fsin, rgba } from './buf';

/** Smooth (undithered): the sky is stretched across the view, dither would smear into streaks. */
export function buildSky(): HTMLCanvasElement {
  const c = makeCanvas(16, 512);
  smoothGradient(ctxOf(c), 0, 0, 16, 512, [
    { at: 0, color: '#2a0610' },
    { at: 0.2, color: '#3c0a18' },
    { at: 0.38, color: '#560f20' },
    { at: 0.54, color: '#741626' },
    { at: 0.68, color: '#962030' },
    { at: 0.8, color: '#b82e36' },
    { at: 0.9, color: '#d6463e' },
    { at: 1, color: '#ee6e4c' },
  ]);
  return c;
}

/* ---------------------------------------------------------------- VORTEX */

const VS = 256;
const ARMS = 3;
const TWIST = 5.4;
const R_SOLID = 84; // inside: arms + dark gaps; outside: only arm tails, gaps transparent
const R_MAX = 124;
// gap (maroon) -> dark red -> red -> orange -> amber -> yellow -> hot white
const V_RAMP = ['#5a1226', '#7c1a26', '#a82622', '#d4401e', '#f07222', '#f8a23a', '#fcd25e', '#fff0a8'].map((h) => rgba(h));

interface Polar { u: Float32Array; r: Float32Array }

function polarField(): Polar {
  const u = new Float32Array(VS * VS);
  const r = new Float32Array(VS * VS);
  const c = VS / 2 - 0.5;
  for (let y = 0; y < VS; y++) {
    for (let x = 0; x < VS; x++) {
      const dx = x - c;
      const dy = (y - c) * 1.08; // slightly squashed like the box swirl
      const rr = Math.sqrt(dx * dx + dy * dy);
      r[y * VS + x] = rr;
      u[y * VS + x] = ARMS * Math.atan2(dy, dx) + TWIST * Math.log(rr + 6);
    }
  }
  return { u, r };
}

/** Brightness profile across one arm: f in [0,1) is the position inside the band. */
function armProfile(f: number): number {
  const t = f / 0.6;
  return t >= 1 ? 0 : Math.sin(Math.PI * Math.pow(t, 0.75));
}

function vortexFrame(buf: PixBuf, p: Polar, phase: number): void {
  const TAU = Math.PI * 2;
  for (let y = 0; y < VS; y++) {
    for (let x = 0; x < VS; x++) {
      const i = y * VS + x;
      const r = p.r[i];
      if (r > R_MAX) continue;
      const u = p.u[i] - phase;
      // flame-like ragged edges: noise periodic in u so it travels with the arms
      const n = 0.07 * fsin(2 * u + r * 0.21) + 0.05 * fsin(5 * u - r * 0.13) + 0.035 * fsin(11 * u + r * 0.4);
      let f = (u / TAU + n) % 1;
      if (f < 0) f += 1;
      const arm = armProfile(f);
      const inner = Math.max(0, 1 - r / R_MAX);
      const core = Math.max(0, 1 - r / 14);
      if (r > R_SOLID) {
        const edge = (R_MAX - r) / (R_MAX - R_SOLID);
        if (arm * edge * 1.7 < 0.5) continue;
      }
      const v = Math.max(core * 1.1, arm * (0.42 + 0.62 * inner) + n * 1.4);
      const idx = ditherIndex(V_RAMP.length, v, x, y, 0.45);
      buf.set(x, y, V_RAMP[idx]);
    }
  }
}

export function buildVortex(frames = 8): HTMLCanvasElement {
  const p = polarField();
  const buf = new PixBuf(VS * frames, VS);
  const frame = new PixBuf(VS, VS);
  for (let k = 0; k < frames; k++) {
    frame.px.fill(CLEAR);
    vortexFrame(frame, p, (Math.PI * 2 * k) / frames);
    for (let y = 0; y < VS; y++) buf.px.set(frame.px.subarray(y * VS, (y + 1) * VS), y * buf.w + k * VS);
  }
  return buf.toCanvas();
}

/* ---------------------------------------------------------------- CLOUDS */

const CLOUD = {
  top: rgba('#fee8b4'),
  light: rgba('#fac878'),
  body: rgba('#f0a04a'),
  side: rgba('#e08840'),
  under: rgba('#cc6a36'),
  rim: rgba('#a8442c'),
  notch: rgba('#b4562f'),
};

interface Bump { cx: number; rx: number; ry: number }

/** Which bump (frontmost) covers (x,y), or -1. Bumps are flat-topped superellipse halves. */
function bumpAt(bumps: readonly Bump[], x: number, y: number, base: number): number {
  for (let k = bumps.length - 1; k >= 0; k--) {
    const b = bumps[k];
    const nx = (x + 0.5 - b.cx) / b.rx;
    const ny = (base - y - 0.5) / b.ry;
    if (ny >= 0 && nx ** 4 + ny ** 4 <= 1) return k;
  }
  return -1;
}

/** Flat-bottomed amber cloud like the box: a low slab plus overlapping rounded bumps. */
function cloud(buf: PixBuf, x0: number, base: number, w: number, seed: number): void {
  const r = rng(seed);
  const H = 40;
  const n = 3 + Math.floor(r() * 2);
  const bumps: Bump[] = [{ cx: w / 2, rx: w / 2, ry: 6 }];
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n;
    const big = 1 - Math.abs(t - 0.5) * 1.2;
    bumps.push({ cx: t * w + (r() - 0.5) * 6, rx: w * (0.16 + 0.08 * r()) + 4, ry: 9 + big * (10 + r() * 9) });
  }
  const bottom = H - 1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < w; x++) {
      const k = bumpAt(bumps, x, y, bottom + 1);
      if (k < 0) continue;
      const b = bumps[k];
      const nx = (x + 0.5 - b.cx) / b.rx;
      const above = bumpAt(bumps, x, y - 1, bottom + 1);
      let c = CLOUD.body;
      if (above < 0) c = CLOUD.top;
      else if (above !== k || bumpAt(bumps, x, y - 2, bottom + 1) < 0 || nx < -0.82) c = CLOUD.light;
      else if (nx > 0.8) c = CLOUD.side;
      if (y === bottom) c = CLOUD.rim;
      else if (y >= bottom - 2 || (y >= bottom - 4 && (x + y) % 2 === 0 && c === CLOUD.body)) c = CLOUD.under;
      buf.setW(x0 + x, base - H + 1 + y, c);
    }
  }
  // darker dents along the underside, like the notches on the box cloud
  for (let k = 0; k < Math.floor(w / 14); k++) {
    const nx = Math.floor(r() * (w - 10)) + 5;
    buf.setW(x0 + nx, base - 2, CLOUD.notch);
    buf.setW(x0 + nx + 1, base - 2, CLOUD.notch);
    buf.setW(x0 + nx, base - 3, CLOUD.under);
  }
}

export function buildClouds(): HTMLCanvasElement {
  const buf = new PixBuf(512, 128);
  cloud(buf, 18, 52, 96, 11);
  cloud(buf, 168, 104, 58, 23);
  cloud(buf, 280, 40, 74, 37);
  cloud(buf, 396, 90, 112, 41);
  cloud(buf, 488, 122, 44, 53);
  return buf.toCanvas();
}
