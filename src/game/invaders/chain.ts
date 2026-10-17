/**
 * Pure lightning targeting: the bolt hits the target best aligned above the jet, then
 * chains greedily to the nearest untouched neighbours within a radius.
 */

export interface ChainTarget {
  id: number;
  x: number;
  y: number;
}

/** Strike order (ids). `hops` = extra targets after the first. Empty when nothing is above. */
export function pickChain(originX: number, originY: number, targets: readonly ChainTarget[], hops: number, radius: number): number[] {
  const above = targets.filter((t) => t.y < originY);
  if (above.length === 0) return [];
  // mostly horizontal alignment; among a column prefer the closest (lowest) one
  const score = (t: ChainTarget): number => Math.abs(t.x - originX) + (originY - t.y) * 0.12;
  let current = above.reduce((best, t) => (score(t) < score(best) ? t : best));
  const order = [current.id];
  const used = new Set(order);
  for (let i = 0; i < hops; i++) {
    let next: ChainTarget | null = null;
    let bestD = radius;
    for (const t of targets) {
      if (used.has(t.id)) continue;
      const d = Math.hypot(t.x - current.x, t.y - current.y);
      if (d <= bestD) {
        bestD = d;
        next = t;
      }
    }
    if (!next) break;
    order.push(next.id);
    used.add(next.id);
    current = next;
  }
  return order;
}
