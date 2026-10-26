/**
 * Pure placement of the edge arrows (v8): a thing outside the view (a hazard coming closer, the boss) gets an
 * arrow on the view edge, at the nearest edge point, pointing at it; the nearest `max` within `range` units.
 */
import type { Box } from '../api';

export type RadarKind = 'hazard' | 'pink' | 'boss';

/** Something the arrows may point at: its box and speed (world units, units / s). */
export interface RadarThing {
  box: Box;
  vx: number;
  vy: number;
  kind: RadarKind;
}

export interface EdgeArrow {
  /** the arrow tip (world units), inside the view by `inset` */
  x: number;
  y: number;
  /** radians, 0 = pointing right */
  angle: number;
  kind: RadarKind;
  /** 1 = at the view edge, 0 = `range` away */
  near: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** The arrows for `things` outside `view` (`inset`, `range` in world units). */
export function edgeArrows(view: Box, things: readonly RadarThing[], inset: number, range: number, max: number): EdgeArrow[] {
  const l = view.x + inset;
  const t = view.y + inset;
  const r = view.x + view.w - inset;
  const b = view.y + view.h - inset;
  const out: Array<{ a: EdgeArrow; d: number }> = [];
  for (const th of things) {
    const o = th.box;
    // any part in view: no arrow
    if (o.x < view.x + view.w && o.x + o.w > view.x && o.y < view.y + view.h && o.y + o.h > view.y) continue;
    const cx = o.x + o.w / 2;
    const cy = o.y + o.h / 2;
    const gx = Math.max(view.x - (o.x + o.w), o.x - (view.x + view.w), 0);
    const gy = Math.max(view.y - (o.y + o.h), o.y - (view.y + view.h), 0);
    const d = Math.hypot(gx, gy);
    if (d > range) continue;
    const x = clamp(cx, l, r);
    const y = clamp(cy, t, b);
    // a hazard flying away from the view needs no warning; one standing still does (the boss always gets its arrow)
    if (th.kind !== 'boss' && th.vx * (x - cx) + th.vy * (y - cy) < 0) continue;
    out.push({ a: { x, y, angle: Math.atan2(cy - y, cx - x), kind: th.kind, near: 1 - d / range }, d });
  }
  out.sort((p, q) => p.d - q.d);
  return out.slice(0, max).map((o) => o.a);
}
