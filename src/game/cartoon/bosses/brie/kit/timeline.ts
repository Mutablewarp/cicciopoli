/**
 * Pure boss "brain" for the BOSS-A lane (no Phaser): the attack timeline state machine
 * (intro → telegraph → active → recover → telegraph … , transform between phases, ko at the end) and the
 * data shapes an attack plan is made of. The Phaser runner (runner.ts) only plays what this decides,
 * so the fairness of every pattern is unit-tested on the very same plans (fairness.ts).
 */
import type { Box, Vec } from '../../../api';
import type { SfxName } from '../../../../../contracts';
import type { Path } from './paths';

export type Stage = 'intro' | 'telegraph' | 'active' | 'recover' | 'transform' | 'ko';

export interface AttackSpec<A extends string> {
  id: A;
  /** wind-up pose + flash + sound before anything dangerous moves (≥ 500 ms) */
  telegraphMs: number;
  /** from the end of the wind-up until every hazard of the attack is gone */
  activeMs: number;
  /** breathing room before the next wind-up */
  recoverMs: number;
  phases: readonly number[];
  weight: number;
}

/** Where the boss stands: feet centre in world units, s = scale (< 1 = up in the background), f = facing. */
export interface Pose {
  x: number;
  y: number;
  s: number;
  /** -1 faces left (towards the hero, the drawings' default), 1 faces right */
  f: 1 | -1;
}

/** What an attack may aim at, frozen when its wind-up starts (the telegraph shows the aim). */
export interface PlanCtx {
  phase: number;
  playerX: number;
  from: Pose;
  rng: () => number;
  /** the phase opener (Brain.openers): a boss may play it gentler, so a newcomer learns it before it bites */
  opening?: boolean;
}

export interface HazardPlan {
  /** spawn time after the active stage starts */
  atMs: number;
  /** texture role, mapped to a texture key by the boss */
  kind: string;
  frame?: number;
  pink?: boolean;
  r?: number;
  w?: number;
  h?: number;
  /** degrees / s */
  spin?: number;
  /** turn the sprite along its path (javelins) */
  aim?: boolean;
  lifeMs: number;
  path: Path;
}

/** A beat inside the active stage: a sound, a screen shake (landings, stomps). */
export interface Cue {
  atMs: number;
  sfx?: SfxName;
  shake?: number;
}

export interface AttackPlan {
  hazards: HazardPlan[];
  /** the boss's own motion during the active stage (charges, hops); rest pose otherwise */
  move?: (tMs: number) => Pose;
  /** floor marks shown from the wind-up (landing spots, javelin targets) … */
  marks: Vec[];
  /** … until this time of the active stage (default: its end) */
  marksMs?: number;
  cues: Cue[];
  /** wind-up sound instead of the boss's usual one (a bicycle bell …) */
  sfx?: SfxName;
}

/** Everything pure about one boss: patterns, rest motion, hit boxes, transform / knockout motion. */
export interface Brain<A extends string> {
  attacks: readonly AttackSpec<A>[];
  introMs: number;
  transformMs: number;
  koMs: number;
  /** the first attack of a phase (the easiest one, so the player learns the boss) */
  openers: Readonly<Partial<Record<number, A>>>;
  plan(id: A, ctx: PlanCtx): AttackPlan;
  /** idle position while not attacking (may drift / skate); phaseMs = ms since the phase began */
  rest(phase: number, phaseMs: number): Pose;
  /** after a move ends at pose p: the phaseMs at which rest() continues from there (null = keep going) */
  resume?(phase: number, p: Pose): number | null;
  /** motion during the phase change, starting from where the boss was */
  transformPose(tMs: number, from: Pose): Pose;
  koPose(tMs: number, from: Pose): Pose;
  boxes(p: Pose, phase: number): { hurt: Box[]; body: Box[] };
}

export interface Timeline<A extends string> {
  readonly phase: number;
  readonly stage: Stage;
  readonly attack: A | null;
  /** ms spent in the current stage */
  readonly t: number;
  readonly last: A | null;
  /** attacks started so far */
  readonly n: number;
  /** the current attack is the phase opener */
  readonly opening: boolean;
}

export interface StageEvent<A extends string> {
  stage: Stage;
  attack: A | null;
}

export function newTimeline<A extends string>(): Timeline<A> {
  return { phase: 0, stage: 'intro', attack: null, t: 0, last: null, n: 0, opening: false };
}

/** Weighted pick among the attacks of this phase, never the same one twice in a row (when possible). */
export function pickAttack<A extends string>(specs: readonly AttackSpec<A>[], phase: number, last: A | null, r: number): A {
  const pool = specs.filter((s) => s.phases.includes(phase));
  const fresh = pool.filter((s) => s.id !== last);
  const from = fresh.length ? fresh : pool;
  const total = from.reduce((a, s) => a + s.weight, 0);
  let x = r * total;
  for (const s of from) {
    x -= s.weight;
    if (x < 0) return s.id;
  }
  const end = from[from.length - 1];
  if (!end) throw new Error(`no attack for phase ${phase}`);
  return end.id;
}

function spec<A extends string>(specs: readonly AttackSpec<A>[], id: A | null): AttackSpec<A> | undefined {
  return specs.find((s) => s.id === id);
}

type Clock<A extends string> = Pick<Brain<A>, 'attacks' | 'introMs' | 'transformMs' | 'openers'>;

function stageMs<A extends string>(tl: Timeline<A>, brain: Clock<A>): number {
  const s = spec(brain.attacks, tl.attack);
  switch (tl.stage) {
    case 'intro':
      return brain.introMs;
    case 'transform':
      return brain.transformMs;
    case 'telegraph':
      return s?.telegraphMs ?? 0;
    case 'active':
      return s?.activeMs ?? 0;
    case 'recover':
      return s?.recoverMs ?? 0;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

/** Advance the timeline by dt; returns the new state and every stage that began during the step. */
export function stepTimeline<A extends string>(
  tl: Timeline<A>,
  brain: Clock<A>,
  dtMs: number,
  rnd: () => number,
): { tl: Timeline<A>; events: StageEvent<A>[] } {
  let cur: Timeline<A> = { ...tl, t: tl.t + dtMs };
  const events: StageEvent<A>[] = [];
  for (let guard = 0; guard < 8; guard++) {
    const dur = stageMs(cur, brain);
    if (cur.t < dur) break;
    const t = cur.t - dur;
    if (cur.stage === 'telegraph') cur = { ...cur, stage: 'active', t };
    else if (cur.stage === 'active') cur = { ...cur, stage: 'recover', t };
    else {
      const opener = cur.stage === 'recover' ? undefined : brain.openers[cur.phase];
      const next = opener ?? pickAttack(brain.attacks, cur.phase, cur.last, rnd());
      cur = { ...cur, stage: 'telegraph', attack: next, last: next, n: cur.n + 1, opening: opener !== undefined, t };
    }
    events.push({ stage: cur.stage, attack: cur.attack });
  }
  return { tl: cur, events };
}

/** The boss changes phase: drop the current attack and play the transformation. */
export function enterPhase<A extends string>(tl: Timeline<A>, phase: number): Timeline<A> {
  if (tl.stage === 'ko') return tl;
  return { ...tl, phase, stage: 'transform', attack: null, t: 0 };
}

export function enterKo<A extends string>(tl: Timeline<A>): Timeline<A> {
  return { ...tl, stage: 'ko', attack: null, t: 0 };
}
