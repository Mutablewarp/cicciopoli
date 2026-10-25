/**
 * Pure attack scheduler shared by the BOSS-C bosses (THE OLD SCHOOL, DOUBLE TRIPLE); no Phaser, unit-tested.
 * Each phase has a deck of attacks drawn from a shuffled bag (every attack once per cycle, never the same one
 * twice in a row). One attack = TELEGRAPH (wind-up pose, flash, sound: nothing can hurt yet) -> ACT (volleys
 * fired at fixed offsets) -> REST (a breather before the next wind-up).
 */
export const MIN_TELE_MS = 500;

export interface AttackDef<A extends string> {
  readonly id: A;
  /** readable wind-up before anything can hurt (>= MIN_TELE_MS) */
  readonly teleMs: number;
  /** how long the attack runs after the telegraph */
  readonly actMs: number;
  /** breather after it */
  readonly restMs: number;
  /** volley offsets in ms from the end of the telegraph, ascending, each < actMs */
  readonly fireAt: readonly number[];
}

export type SchedEvent<A extends string> =
  | { readonly kind: 'tele'; readonly id: A }
  | { readonly kind: 'fire'; readonly id: A; readonly n: number }
  | { readonly kind: 'end'; readonly id: A };

/** What a boss plays for one attack (or a story beat): the runtime advances t and forwards 'fire'. */
export interface Move {
  /** ms since the move began */
  t: number;
  fire(n: number): void;
  update(dtMs: number): void;
}

type Stage = 'rest' | 'tele' | 'act' | 'off';

export class Scheduler<A extends string> {
  private stage: Stage = 'rest';
  /** ms left in the current stage */
  private left: number;
  /** ms into the act */
  private t = 0;
  private cur: AttackDef<A> | null = null;
  private fired = 0;
  private bag: AttackDef<A>[] = [];
  private last: A | null = null;

  constructor(
    private deck: readonly AttackDef<A>[],
    private readonly rng: () => number,
    firstRestMs: number,
  ) {
    this.left = firstRestMs;
  }

  /** the attack being telegraphed or played, null while resting */
  get attack(): A | null {
    return this.stage === 'tele' || this.stage === 'act' ? (this.cur?.id ?? null) : null;
  }

  /** the next phase: drop the attack in progress and rest pauseMs (the transformation plays meanwhile) */
  setDeck(deck: readonly AttackDef<A>[], pauseMs: number): void {
    this.deck = deck;
    this.bag = [];
    this.cur = null;
    this.stage = 'rest';
    this.left = pauseMs;
  }

  /** knockout: no more events */
  stop(): void {
    this.stage = 'off';
  }

  update(dtMs: number): SchedEvent<A>[] {
    const out: SchedEvent<A>[] = [];
    let dt = dtMs;
    while (dt > 0 && this.stage !== 'off') {
      const step = Math.min(dt, this.left);
      this.left -= step;
      dt -= step;
      if (this.stage === 'act') this.t += step;
      const cur = this.cur;
      if (this.stage === 'act' && cur) this.fire(cur, out);
      if (this.left > 0) break;
      if (this.stage === 'rest') {
        const next = this.draw();
        this.cur = next;
        this.stage = 'tele';
        this.left = next.teleMs;
        out.push({ kind: 'tele', id: next.id });
      } else if (this.stage === 'tele' && cur) {
        this.stage = 'act';
        this.left = cur.actMs;
        this.t = 0;
        this.fired = 0;
        this.fire(cur, out);
      } else if (cur) {
        out.push({ kind: 'end', id: cur.id });
        this.stage = 'rest';
        this.left = cur.restMs;
      }
    }
    return out;
  }

  private fire(cur: AttackDef<A>, out: SchedEvent<A>[]): void {
    while (this.fired < cur.fireAt.length && cur.fireAt[this.fired] <= this.t) {
      out.push({ kind: 'fire', id: cur.id, n: this.fired });
      this.fired++;
    }
  }

  private draw(): AttackDef<A> {
    if (this.bag.length === 0) {
      const bag = [...this.deck];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.length > 1 && bag[0].id === this.last) [bag[0], bag[1]] = [bag[1], bag[0]];
      this.bag = bag;
    }
    const next = this.bag.shift();
    if (!next) throw new Error('empty attack deck');
    this.last = next.id;
    return next;
  }
}
