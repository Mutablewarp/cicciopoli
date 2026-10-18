/**
 * Up / down target for a menu laid out as a grid, from the boxes as drawn (so it follows rotation and
 * the wide level-5 card, which spans several columns). Caller: Menu.handleKey (menu.ts).
 */
export interface Box {
  left: number;
  right: number;
  top: number;
}

/** Boxes whose tops differ by less than this are on the same row (px). */
const SAME_ROW = 2;

/**
 * Index to select one row down (`dir` 1) or up (-1) from `from`: the next row in that direction, and in it
 * the box whose centre is closest to the current one (the lower index on a tie). Past the last row it wraps
 * to the opposite end. Returns -1 when every box sits on one row: the caller then steps by one.
 */
export function verticalTarget(boxes: readonly Box[], from: number, dir: 1 | -1): number {
  const cur = boxes[from];
  if (!cur) return -1;
  const ahead = (i: number): number => (boxes[i].top - cur.top) * dir; // > 0: in the direction of travel
  const all = boxes.map((_, i) => i);
  const further = all.filter((i) => ahead(i) > SAME_ROW);
  const pool = further.length ? further : all.filter((i) => ahead(i) < -SAME_ROW); // nothing ahead: wrap
  if (!pool.length) return -1;
  // the nearest row ahead, or when wrapping the farthest row behind: both have the smallest `ahead`
  const rowAhead = Math.min(...pool.map(ahead));
  const gap = (i: number): number => Math.abs(boxes[i].left + boxes[i].right - cur.left - cur.right);
  return pool.filter((i) => ahead(i) - rowAhead <= SAME_ROW).reduce((best, i) => (gap(i) < gap(best) ? i : best));
}
