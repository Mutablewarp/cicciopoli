/**
 * Pure motion paths (no Phaser) for the BOSS-A lane: a hazard or the boss itself follows a closed-form
 * position over time, so the runtime and the fairness tests see exactly the same trajectory.
 * Speeds in world units / s, gravity in units / s², times in ms.
 */
import type { Vec } from '../../../api';

export type Path = (tMs: number) => Vec;

/** Deterministic 0..1 generator (mulberry32) so every texture is drawn the same way each time. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const s = (ms: number): number => ms / 1000;

/** Straight line at constant speed. */
export function line(x0: number, y0: number, vx: number, vy = 0): Path {
  return (t) => ({ x: x0 + vx * s(t), y: y0 + vy * s(t) });
}


export const easeInOut = (u: number): number => u * u * (3 - 2 * u);
export const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));

/** From a to b in ms (eased), then holds b. */
export function lerp(a: Vec, b: Vec, ms: number, ease: (u: number) => number = easeInOut): Path {
  return (t) => {
    const u = ease(clamp01(t / ms));
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };
}

/** Parabolic leap from a to b in ms peaking `apex` units above the higher end; holds b afterwards. */
export function leap(a: Vec, b: Vec, ms: number, apex: number): Path {
  return (t) => {
    const u = clamp01(t / ms);
    const top = Math.min(a.y, b.y) - apex;
    // y(u) = quadratic through a.y (u=0), b.y (u=1) with its minimum at `top`
    const da = a.y - top;
    const db = b.y - top;
    const m = Math.sqrt(da) / (Math.sqrt(da) + Math.sqrt(db));
    const y = u <= m ? top + da * ((m - u) / m) ** 2 : top + db * ((u - m) / (1 - m)) ** 2;
    return { x: a.x + (b.x - a.x) * u, y };
  };
}

/** Elliptic arc around c from angle a0 to a1 (radians) in ms; holds the end. */
export function orbit(c: Vec, rx: number, ry: number, a0: number, a1: number, ms: number): Path {
  return (t) => {
    const a = a0 + (a1 - a0) * easeInOut(clamp01(t / ms));
    return { x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry };
  };
}

/** Moving along x at vx while its height follows a sine fixed in space (the safe valleys stay put). */
export function sineLine(x0: number, yc: number, vx: number, amp: number, wavelength: number, phase = 0): Path {
  return (t) => {
    const x = x0 + vx * s(t);
    return { x, y: yc + amp * Math.sin(((x - x0) / wavelength) * Math.PI * 2 + phase) };
  };
}

/**
 * Bouncing ball: starts at (x0, y0) with (vx, vy) under g; each time its centre comes down to `floor`
 * (the floor line minus its radius) it hops again with upward speed hopVy (constant hops, readable rhythm).
 */
export function bounce(x0: number, y0: number, vx: number, vy: number, g: number, floor: number, hopVy: number): Path {
  return (t) => {
    let left = s(t);
    let y = y0;
    let v = vy;
    for (let i = 0; i < 64; i++) {
      // time to reach the floor from (y, v): y + v τ + g τ² / 2 = floor
      const disc = v * v + 2 * g * (floor - y);
      const tau = (-v + Math.sqrt(Math.max(0, disc))) / g;
      if (left <= tau || tau <= 0) break;
      left -= tau;
      y = floor;
      v = -hopVy;
    }
    return { x: x0 + vx * s(t), y: Math.min(floor, y + v * left + 0.5 * g * left * left) };
  };
}

/** Segments one after the other (each segment's time starts at 0); holds the last end. */
export function chain(parts: readonly { ms: number; path: Path }[]): Path {
  return (t) => {
    let left = t;
    for (const p of parts) {
      if (left <= p.ms) return p.path(left);
      left -= p.ms;
    }
    const last = parts[parts.length - 1];
    return last ? last.path(last.ms) : { x: 0, y: 0 };
  };
}

/** Stays at p. */
export function hold(p: Vec): Path {
  return () => ({ x: p.x, y: p.y });
}

