/**
 * Level 8 first-fight coach (BRIEF v8 point 4): during the first fight on this device the touch controls are named one
 * at a time (◀ ▶, ▲, SALTA, SPARA, SCATTO, ARMA, EX): the control glows and one paper tag says its name and what it
 * does. The tag has a fixed place in free space beside the controls (above the ◀ ▶ pad upright, above ARMA in the left
 * column sideways, between the pad and the discs on tablets: cartoon/coach.css), so it never covers a control or the
 * arena. A control that has been used is skipped; the coach ends once every control has had its turn (or has been
 * tried), and then never comes back (a flag in localStorage; without storage it shows once per page). Callers:
 * cartoon/controls.ts (mounts `el` in the disc zone, tags the discs; shown / hidden with the controls layout),
 * cartoon/pad.ts (tags the ◀ ▶ pill and the ▲ cap).
 */
import { el } from '../dom';

export type CoachKey = 'move' | 'up' | 'jump' | 'fire' | 'dash' | 'swap' | 'super';

/** stepMs: each control's turn (every control gets one turn, then the coach is over for good). */
export const COACH = { stepMs: 2400, key: 'cicciopoli.cartoon.coach.v1' } as const;

/** Title (the control's own label) and what it does, short enough for one line on a 360 px phone. SPARA has two:
 * auto-fire on / off. */
export const COACH_TAGS: Readonly<Record<CoachKey | 'fireManual', readonly [string, string]>> = {
  move: ['CORRI', 'tieni premuto ◀ o ▶'],
  up: ['MIRA IN ALTO', 'scivola su col pollice'],
  jump: ['SALTA', 'in aria, para il rosa'],
  fire: ['SPARO AUTO', 'tocca per spegnerlo'],
  fireManual: ['SPARA', 'tienilo o tocca AUTO'],
  dash: ['SCATTO', 'niente ti colpisce'],
  swap: ['ARMA', 'cambia arma'],
  super: ['EX', 'ogni carta, un colpo'],
};

const KEYS: readonly CoachKey[] = ['move', 'up', 'jump', 'fire', 'dash', 'swap', 'super'];
const POP: Keyframe[] = [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }];

/** The coach's bookkeeping, pure: which controls are left to name, in order; done after one round of them. */
export class CoachPlan {
  private readonly left = new Set<CoachKey>(KEYS);

  constructor(public done: boolean) {}

  /** A control was used: it is not named any more; the coach is done when every control has been tried. */
  use(key: CoachKey): void {
    this.left.delete(key);
    if (this.left.size === 0) this.done = true;
  }

  /** The control named after `after` (null = the first), in KEYS order; past the last one the coach is done. */
  next(after: CoachKey | null): CoachKey | null {
    const from = after === null ? 0 : KEYS.indexOf(after) + 1;
    const k = this.done ? undefined : KEYS.slice(from).find((key) => this.left.has(key));
    if (k === undefined) this.done = true;
    return k ?? null;
  }
}

export interface Coach {
  /** The tag (cartoon/controls.ts mounts it; it lets every touch through). */
  readonly el: HTMLElement;
  /** `host` is the control that glows while `key` is named. */
  tag(key: CoachKey, host: HTMLElement): void;
  /** SPARA's tag follows the auto-fire switch. */
  setAuto(on: boolean): void;
  /** The controls are on screen (`on`) or gone; `visible` = they are drawn at all (touch mode). */
  show(on: boolean, visible: boolean): void;
  used(key: CoachKey): void;
}

type Store = Pick<Storage, 'getItem' | 'setItem'>;

function storage(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createCoach(store: Store | null = storage()): Coach {
  let seen = false;
  try {
    seen = store?.getItem(COACH.key) === '1';
  } catch {
    // storage blocked: show it once per page
  }
  const plan = new CoachPlan(seen);
  const hosts = new Map<CoachKey, HTMLElement>();
  const slot = el('div', 'cc-coach');
  const card = el('span', 'cc-coach__tag');
  const title = el('b', 'cc-coach__title');
  const note = el('span', 'cc-coach__note');
  card.append(title, note);
  slot.append(card);
  slot.setAttribute('aria-hidden', 'true');
  slot.hidden = true;
  let current: CoachKey | null = null;
  let auto = false;
  let timer = 0;

  const draw = (): void => {
    for (const [key, host] of hosts) host.classList.toggle('is-coached', key === current);
    slot.hidden = current === null;
    if (current === null) return;
    slot.dataset.key = current;
    [title.textContent, note.textContent] = COACH_TAGS[current === 'fire' && !auto ? 'fireManual' : current];
  };
  /** Names `key` for one step (null: nothing named; when the plan is done, the flag is saved for good). */
  const name = (key: CoachKey | null): void => {
    window.clearTimeout(timer);
    current = key;
    timer = key === null ? 0 : window.setTimeout(() => name(plan.next(key)), COACH.stepMs);
    if (key === null && plan.done) {
      try {
        store?.setItem(COACH.key, '1');
      } catch {
        // storage blocked: done for this page only
      }
    }
    draw();
    if (key !== null && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      card.animate(POP, { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    }
  };

  return {
    el: slot,
    tag(key, host) {
      hosts.set(key, host);
    },
    setAuto(on) {
      auto = on;
      if (current === 'fire') draw();
    },
    show(on, visible) {
      // hidden mid-way (round over, pause): it starts again from the first control left next time
      if (!on || !visible || plan.done) {
        if (current !== null) name(null);
      } else if (current === null) name(plan.next(null));
    },
    used(key) {
      if (plan.done) return;
      plan.use(key);
      if (plan.done) name(null);
      else if (key === current) name(plan.next(key));
    },
  };
}
