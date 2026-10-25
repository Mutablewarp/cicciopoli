/**
 * DON TUMA patterns as pure data (no Phaser, unit-tested): where the citrus lands, where the sun strikes,
 * where the honey drips. Each plan keeps a SAFE_W stretch of floor free (see plan.test.ts).
 */
import { ARENA, type Vec } from '../../api';
import { type Shot, type Span, lob, spread } from './kit/geom';
import { SHOT, TUMA_CFG } from './config';

const C = TUMA_CFG;

/** Citrus lobbed in arcs from the hand: n landing spots with a hole away from the player. */
export function lemonVolley(rng: () => number, phase: number, from: Vec, playerX: number, pink: boolean): Shot[] {
  const L = C.lemon;
  const n = L.n[Math.min(phase, 1)];
  const fp = L.r + L.splash;
  const xs = spread(rng, n, C.field[0] + fp, C.field[1] - fp, C.safeW + fp * 2 + 4, fp * 2 + 10, playerX);
  return xs.map((x, i) => {
    const ms = L.flightMs[Math.min(phase, 1)] + (rng() - 0.5) * 120;
    const v = lob(from.x, from.y, x, ARENA.floorY - L.r, ms, L.g);
    const frame = pink && i === n - 1 ? SHOT.blood : i % 2 ? SHOT.orange : SHOT.lemon;
    return { delayMs: i * L.gapMs, x: from.x, y: from.y, vx: v.vx, vy: v.vy, ay: L.g, r: L.r, frame, pink: frame === SHOT.blood };
  });
}

/** Sun beams: one on the player, the rest elsewhere, always leaving a hole. Returns floor spans. */
export function sunBeams(rng: () => number, phase: number, playerX: number): Span[] {
  const n = C.beam.n[Math.min(phase, 1)];
  const w = C.beam.w;
  const [a, b] = C.field;
  const apart = (s: Span, spans: readonly Span[]): boolean => spans.every(([p, q]) => s[0] > q + C.safeW || s[1] < p - C.safeW);
  const slots = (spans: readonly Span[]): Span[] => {
    const out: Span[] = [];
    for (let x = a + w / 2; x <= b - w / 2; x += 4) if (apart([x - w / 2, x + w / 2], spans)) out.push([x - w / 2, x + w / 2]);
    return out;
  };
  // a slot is only good if the beams still to place fit after it (look-ahead keeps n reachable)
  const fits = (spans: readonly Span[], left: number): boolean => left === 0 || slots(spans).some((s) => fits([...spans, s], left - 1));
  const first = Math.min(b - w / 2, Math.max(a + w / 2, playerX));
  const spans: Span[] = [[first - w / 2, first + w / 2]];
  while (spans.length < n) {
    const good = slots(spans).filter((s) => fits([...spans, s], n - spans.length - 1));
    if (!good.length) break;
    spans.push(good[Math.floor(rng() * good.length)]);
  }
  return spans;
}

/** Honey drops falling from the awning in columns, staggered, with a hole. */
export function honeyRain(rng: () => number, playerX: number): Shot[] {
  const H = C.honey;
  const fp = H.r + H.splash;
  const xs = spread(rng, H.n, C.field[0] + fp, C.field[1] - fp, C.safeW + fp * 2 + 4, fp * 2 + 14, playerX);
  return xs.map((x, i) => ({ delayMs: ((i * 3) % H.n) * H.staggerMs, x, y: H.top, vx: 0, vy: 0, ay: H.g, r: H.r, frame: SHOT.honey, pink: false }));
}
