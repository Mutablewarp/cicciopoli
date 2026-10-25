/**
 * Pure attack scheduler of the BOSS-B lane (no Phaser, unit-tested): per phase a weighted list of attacks,
 * each run as rest -> TELEGRAPH (wind-up pose, flash, sound) -> ACTIVE (it fires) -> rest (recover).
 * Never the same attack twice in a row; a phase change drops the current attack and rests (transformation).
 */
export interface AttackDef<K extends string> {
  kind: K;
  /** wind-up before anything dangerous appears (>= MIN_TELEGRAPH_MS) */
  telegraphMs: number;
  /** how long the attack fires / moves */
  activeMs: number;
  /** breathing room after it */
  recoverMs: number;
  weight: number;
}

/** Every attack shows its wind-up at least this long (a phone player needs time to read it). */
export const MIN_TELEGRAPH_MS = 500;

export type SchedState = 'rest' | 'telegraph' | 'active' | 'stopped';
export interface SchedEvent<K extends string> {
  type: 'telegraph' | 'fire' | 'rest';
  kind: K;
}

export class Scheduler<K extends string> {
  state: SchedState = 'rest';
  current: AttackDef<K> | null = null;
  phase = 0;
  private left: number;
  private last: K | null = null;

  constructor(
    private readonly phases: readonly (readonly AttackDef<K>[])[],
    private readonly rng: () => number,
    startMs: number,
  ) {
    this.left = startMs;
  }

  /** New phase: forget the running attack and rest `pauseMs` (the transformation plays meanwhile). */
  setPhase(p: number, pauseMs: number): void {
    this.phase = Math.min(p, this.phases.length - 1);
    this.state = 'rest';
    this.current = null;
    this.left = pauseMs;
  }

  stop(): void {
    this.state = 'stopped';
    this.current = null;
  }

  /** Advance the clock; returns the transitions that happened (in order). */
  update(dtMs: number): SchedEvent<K>[] {
    const out: SchedEvent<K>[] = [];
    if (this.state === 'stopped') return out;
    this.left -= dtMs;
    while (this.left <= 0) {
      if (this.state === 'rest') {
        const next = this.pick();
        this.current = next;
        this.state = 'telegraph';
        this.left += Math.max(MIN_TELEGRAPH_MS, next.telegraphMs);
        out.push({ type: 'telegraph', kind: next.kind });
      } else if (this.state === 'telegraph' && this.current) {
        this.state = 'active';
        this.left += this.current.activeMs;
        out.push({ type: 'fire', kind: this.current.kind });
      } else if (this.current) {
        this.state = 'rest';
        this.left += this.current.recoverMs;
        this.last = this.current.kind;
        out.push({ type: 'rest', kind: this.current.kind });
      } else break;
    }
    return out;
  }

  private pick(): AttackDef<K> {
    const all = this.phases[this.phase];
    const pool = all.length > 1 ? all.filter((a) => a.kind !== this.last) : all;
    const total = pool.reduce((s, a) => s + a.weight, 0);
    let roll = this.rng() * total;
    for (const a of pool) {
      roll -= a.weight;
      if (roll < 0) return a;
    }
    return pool[pool.length - 1];
  }
}

/** Pure delayed-callback list driven by the boss update (pauses with the round, cleared on a phase change). */
export class Later {
  private items: { at: number; fn: () => void }[] = [];
  private now = 0;

  add(ms: number, fn: () => void): void {
    this.items.push({ at: this.now + ms, fn });
  }

  clear(): void {
    this.items = [];
  }

  update(dtMs: number): void {
    this.now += dtMs;
    const due = this.items.filter((i) => i.at <= this.now);
    if (!due.length) return;
    this.items = this.items.filter((i) => i.at > this.now);
    for (const d of due.sort((a, b) => a.at - b.at)) d.fn();
  }
}
