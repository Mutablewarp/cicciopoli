/**
 * Floating labels of level 6 stack by the truck: the newest one sits at its spot, the ones still up in its column
 * are pushed up the screen above it (placing the new one above an older one would meet it as the older one rises).
 * Screen boxes: centre x, y, width, height (device px).
 */
export interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** How far (device px, >= 0) each of `boxes` moves up so that none overlaps `b` or the ones pushed before it. */
export function pushUp(boxes: readonly Box[], b: Box, gap: number): number[] {
  const lift = boxes.map(() => 0);
  let limit = b.y - b.h / 2 - gap;
  const column = boxes.map((o, i) => ({ o, i })).filter(({ o }) => Math.abs(o.x - b.x) * 2 < o.w + b.w && o.y - o.h / 2 < b.y + b.h / 2);
  for (const { o, i } of column.sort((p, q) => q.o.y - p.o.y)) {
    lift[i] = Math.max(0, o.y + o.h / 2 - limit);
    limit = Math.min(limit, o.y - lift[i] - o.h / 2 - gap);
  }
  return lift;
}
