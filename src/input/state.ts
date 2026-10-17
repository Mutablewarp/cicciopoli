/**
 * Pure input arbitration (no DOM): every physical source (a key code, a touch pointer)
 * holds at most one action. Keyboard and touch feed the same state, so releasing one
 * source never cancels another and the most recently pressed direction wins.
 */
import type { EdgeAction, GameInput } from '../contracts';

export type HoldAction = 'left' | 'right' | 'down' | 'jump' | 'fire' | 'club' | 'pause';

interface Hold {
  action: HoldAction;
  seq: number;
}

function isEdge(a: HoldAction): a is EdgeAction {
  return a === 'jump' || a === 'fire' || a === 'club' || a === 'pause';
}

export class InputState implements GameInput {
  enabled = true;
  private readonly holds = new Map<string, Hold>();
  private readonly latched = new Set<EdgeAction>();
  private readonly resetListeners: Array<() => void> = [];
  private seq = 0;

  /** Source starts (or switches to) holding `action`. Re-pressing the same action is ignored. */
  press(source: string, action: HoldAction): void {
    const prev = this.holds.get(source);
    if (prev && prev.action === action) return;
    this.holds.set(source, { action, seq: ++this.seq });
    if (isEdge(action) && (this.enabled || action === 'pause')) this.latched.add(action);
  }

  release(source: string): void {
    this.holds.delete(source);
  }

  /** True while the source is tracked (used by touch controls to ignore pointers dropped by reset). */
  has(source: string): boolean {
    return this.holds.has(source);
  }

  reset(): void {
    this.holds.clear();
    this.latched.clear();
    for (const cb of this.resetListeners) cb();
  }

  onReset(cb: () => void): void {
    this.resetListeners.push(cb);
  }

  consume(action: EdgeAction): boolean {
    const had = this.latched.delete(action);
    return had && (this.enabled || action === 'pause');
  }

  get axisX(): -1 | 0 | 1 {
    if (!this.enabled) return 0;
    let best: Hold | null = null;
    for (const h of this.holds.values()) {
      if ((h.action === 'left' || h.action === 'right') && (!best || h.seq > best.seq)) best = h;
    }
    if (!best) return 0;
    return best.action === 'left' ? -1 : 1;
  }

  /** Up shares the jump sources (↑ / W / Space / SALTA): rising in flight = holding jump. */
  get upHeld(): boolean {
    return this.held('jump');
  }
  get downHeld(): boolean {
    return this.held('down');
  }
  get jumpHeld(): boolean {
    return this.held('jump');
  }
  get fireHeld(): boolean {
    return this.held('fire');
  }
  get clubHeld(): boolean {
    return this.held('club');
  }

  private held(action: HoldAction): boolean {
    if (!this.enabled) return false;
    for (const h of this.holds.values()) if (h.action === action) return true;
    return false;
  }
}
