/**
 * The background half-pipe of Pancetta's phase 1 (pure geometry, shared by the brain, the rig and the
 * arena drawing): two quarter-circle walls joined by a flat bottom. u = 0 left lip … 1 right lip.
 */
import type { Vec } from '../../api';
import { PANCETTA as C } from './config';

const P = C.pipe;
export const PIPE_TOP = P.bottom - P.R;
const ARC = (Math.PI / 2) * P.R;
const FLAT = P.r - P.l - 2 * P.R;
const LEN = ARC * 2 + FLAT;

/** Point on the riding surface. */
export function pipeAt(u: number): Vec {
  const d = Math.max(0, Math.min(1, u)) * LEN;
  if (d < ARC) {
    const th = Math.PI - (d / ARC) * (Math.PI / 2);
    return { x: P.l + P.R + Math.cos(th) * P.R, y: PIPE_TOP + Math.sin(th) * P.R };
  }
  if (d < ARC + FLAT) return { x: P.l + P.R + (d - ARC), y: P.bottom };
  const th = Math.PI / 2 - ((d - ARC - FLAT) / ARC) * (Math.PI / 2);
  return { x: P.r - P.R + Math.cos(th) * P.R, y: PIPE_TOP + Math.sin(th) * P.R };
}

/** How much a rider standing on the surface at x leans (radians; + = clockwise, up the left wall). */
export function pipeTilt(x: number): number {
  if (x < P.l + P.R) return Math.asin(Math.max(-1, Math.min(1, (P.l + P.R - x) / P.R)));
  if (x > P.r - P.R) return -Math.asin(Math.max(-1, Math.min(1, (x - (P.r - P.R)) / P.R)));
  return 0;
}

/** The rider's "up" direction at x (the surface normal pointing into the pipe). */
export function pipeUp(x: number): Vec {
  const t = pipeTilt(x);
  return { x: Math.sin(t), y: -Math.cos(t) };
}
