/**
 * Pure input arbitration (no DOM): every physical source (a key code, a touch pointer)
 * holds at most one action. Keyboard and touch feed the same state, so releasing one
 * source never cancels another and the most recently pressed direction wins.
 */
import type { Dir4, EdgeAction, GameInput } from '../contracts';

/** 'up' = ↑ / W / cross-pad up: a direction (axisY) that also counts as jump. */
export type HoldAction = 'left' | 'right' | 'up' | 'down' | 'jump' | 'fire' | 'club' | 'pause';

interface Hold {
  action: HoldAction;
  seq: number;
}

const EDGE: Partial<Record<HoldAction, EdgeAction>> = { jump: 'jump', up: 'jump', fire: 'fire', club: 'club', pause: 'pause' };

function isDir(a: HoldAction): a is Dir4 {
  return a === 'left' || a === 'right' || a === 'up' || a === 'down';
}

export class InputState implements GameInput {
  enabled = true;
  private readonly holds = new Map<string, Hold>();
  private readonly latched = new Set<EdgeAction>();
  private readonly resetListeners: Array<() => void> = [];
  private seq = 0;
  private dir: Dir4 | null = null;

  /**
   * Source starts (or switches to) holding `action`. Re-pressing the same action is ignored.
   * latch=false re-acquires a hold silently (a key still held after a reset): no edge, no dir.
   */
  press(source: string, action: HoldAction, latch = true): void {
    const prev = this.holds.get(source);
    if (prev && prev.action === action) return;
    this.holds.set(source, { action, seq: ++this.seq });
    if (!latch) return;
    const edge = EDGE[action];
    if (edge && (this.enabled || edge === 'pause')) this.latched.add(edge);
    if (isDir(action)) this.pushDir(action);
  }

  release(source: string): void {
    this.holds.delete(source);
  }

  /** A direction press with no hold (swipe on the game area). */
  pushDir(d: Dir4): void {
    if (this.enabled) this.dir = d;
  }

  /** True while the source is tracked (used by touch controls to ignore pointers dropped by reset). */
  has(source: string): boolean {
    return this.holds.has(source);
  }

  reset(): void {
    this.holds.clear();
    this.latched.clear();
    this.dir = null;
    for (const cb of this.resetListeners) cb();
  }

  onReset(cb: () => void): void {
    this.resetListeners.push(cb);
  }

  consume(action: EdgeAction): boolean {
    const had = this.latched.delete(action);
    return had && (this.enabled || action === 'pause');
  }

  consumeDir(): Dir4 | null {
    const d = this.dir;
    this.dir = null;
    return this.enabled ? d : null;
  }

  get axisX(): -1 | 0 | 1 {
    const a = this.newest('left', 'right');
    return a === 'left' ? -1 : a === 'right' ? 1 : 0;
  }

  get axisY(): -1 | 0 | 1 {
    const a = this.newest('up', 'down');
    return a === 'up' ? -1 : a === 'down' ? 1 : 0;
  }

  /** Up shares the jump sources (↑ / W / Space / SALTA): rising in flight = holding jump. */
  get upHeld(): boolean {
    return this.held('jump') || this.held('up');
  }
  get downHeld(): boolean {
    return this.held('down');
  }
  get jumpHeld(): boolean {
    return this.upHeld;
  }
  get fireHeld(): boolean {
    return this.held('fire');
  }
  get clubHeld(): boolean {
    return this.held('club');
  }

  private newest(a: HoldAction, b: HoldAction): HoldAction | null {
    if (!this.enabled) return null;
    let best: Hold | null = null;
    for (const h of this.holds.values()) {
      if ((h.action === a || h.action === b) && (!best || h.seq > best.seq)) best = h;
    }
    return best ? best.action : null;
  }

  private held(action: HoldAction): boolean {
    if (!this.enabled) return false;
    for (const h of this.holds.values()) if (h.action === action) return true;
    return false;
  }
}
