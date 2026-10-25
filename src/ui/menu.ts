/**
 * Keyboard / mouse / touch navigation for a list of menu buttons, plus an activation
 * guard: end screens ignore taps for a moment (no accidental "next level" from a
 * finger still hammering SALTA) and a navigating action fires only once per opening.
 * Up / down follow the buttons as drawn (grid rows, the wide title card), left / right step by one.
 */
import { verticalTarget } from './spatial';

export interface MenuOptions {
  /** Esc / P */
  onBack?: () => void;
  /** Activation is ignored for this long after opening. */
  armMs?: number;
  initial?: number;
}

export class Menu {
  private items: HTMLElement[] = [];
  private sel = 0;
  private armedAt = 0;
  private done = false;
  private onBack: (() => void) | undefined;
  /** Last mouse position seen anywhere on the page. */
  private mouse = { x: NaN, y: NaN };

  constructor() {
    const track = (e: PointerEvent): void => {
      if (e.pointerType === 'mouse') this.mouse = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('pointermove', track, { capture: true, passive: true });
    window.addEventListener('pointerdown', track, { capture: true, passive: true });
  }

  /** Buttons (or links) in reading order; Enter / Space click the selected one. */
  open(items: HTMLElement[], opts: MenuOptions = {}): void {
    this.items = items;
    this.armedAt = performance.now() + (opts.armMs ?? 0);
    this.done = false;
    this.onBack = opts.onBack;
    // a button that opens under a resting cursor (the one that clicked) is not a hover: wait for the mouse to move
    let rest: { x: number; y: number } | null = this.mouse;
    items.forEach((b, i) => {
      b.onpointermove = (e) => {
        if (e.pointerType !== 'mouse' || i === this.sel) return;
        if (rest && e.clientX === rest.x && e.clientY === rest.y) return;
        rest = null;
        this.select(i, false);
      };
    });
    this.select(opts.initial ?? 0, false);
  }

  /** Wraps a click handler. `once` = the action leaves the screen (start, menu, retry…). */
  guard(fn: () => void, once = true): () => void {
    return () => {
      if (performance.now() < this.armedAt || this.done) return;
      if (once) this.done = true;
      fn();
    };
  }

  select(i: number, focus = true): void {
    if (!this.items.length) return;
    this.sel = (i + this.items.length) % this.items.length;
    this.items.forEach((b, j) => b.classList.toggle('is-selected', j === this.sel));
    if (focus) this.items[this.sel].focus({ preventScroll: true });
  }

  /** Moves the selection; keys held from gameplay (auto-repeat, arm time) never navigate. */
  private nav(e: KeyboardEvent, target: () => number): void {
    if (e.repeat || performance.now() < this.armedAt) return;
    this.select(target());
  }

  /** One row down / up as drawn; a menu laid out on a single row steps by one instead. */
  private vertical(dir: 1 | -1): number {
    const to = verticalTarget(this.items.map((b) => b.getBoundingClientRect()), this.sel, dir);
    return to >= 0 ? to : this.sel + dir;
  }

  /** Keyboard handler while this menu is on top; swallows every key so gameplay never sees it. */
  handleKey(e: KeyboardEvent): boolean {
    switch (e.code) {
      case 'ArrowDown':
      case 'KeyS':
        this.nav(e, () => this.vertical(1));
        break;
      case 'ArrowUp':
      case 'KeyW':
        this.nav(e, () => this.vertical(-1));
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.nav(e, () => this.sel + 1);
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.nav(e, () => this.sel - 1);
        break;
      case 'Tab':
        this.nav(e, () => this.sel + (e.shiftKey ? -1 : 1));
        break;
      case 'Enter':
      case 'NumpadEnter':
      case 'Space':
        if (!e.repeat) this.items[this.sel]?.click();
        break;
      case 'Escape':
      case 'KeyP':
        if (!e.repeat && this.onBack) this.guard(this.onBack)();
        break;
      default:
        return true;
    }
    e.preventDefault();
    return true;
  }
}
