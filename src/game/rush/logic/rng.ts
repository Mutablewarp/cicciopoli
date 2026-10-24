/** Seeded randomness of level 6: same seed = same road. */

/** Uniform [0, 1). */
export type Rng = () => number;

/** mulberry32: tiny, fast, good enough for gameplay. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An independent stream of one run seed (traffic, pickups, orders never disturb each other). */
export function streamRng(seed: number, salt: number): Rng {
  return mulberry32(Math.imul((seed ^ salt) >>> 0, 0x27d4eb2d) ^ salt);
}

export function randInt(rng: Rng, n: number): number {
  return Math.floor(rng() * n);
}

export function randRange(rng: Rng, range: readonly [number, number]): number {
  return range[0] + rng() * (range[1] - range[0]);
}

export function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, items.length)];
}

export function pickWeighted<T>(rng: Rng, items: readonly T[], weight: (item: T) => number): T {
  let total = 0;
  for (const it of items) total += weight(it);
  let r = rng() * total;
  for (const it of items) {
    r -= weight(it);
    if (r < 0) return it;
  }
  return items[items.length - 1];
}

/** Fisher-Yates on a copy. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Local calendar day "YYYY-MM-DD": the daily challenge key. */
export function dailyKey(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Same traffic for everybody today: FNV-1a of the day key. */
export function dailySeed(date: Date): number {
  let h = 0x811c9dc5;
  for (const ch of dailyKey(date)) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  return h >>> 0;
}
