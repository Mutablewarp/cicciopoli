/**
 * Keyboard / mouse / touch navigation for a list of menu buttons, plus an activation
 * guard: end screens ignore taps for a moment (no accidental "next level" from a
 * finger still hammering SALTA) and a navigating action fires only once per opening.
 */
export interface MenuOptions {
  /** Esc / P */
  onBack?: () => void;
  /** Activation is ignored for this long after opening. */
  armMs?: number;
  initial?: number;
}

export class Menu {
  private items: HTMLButtonElement[] = [];
  private sel = 0;
  private armedAt = 0;
  private done = false;
  private onBack: (() => void) | undefined;

  open(items: HTMLButtonElement[], opts: MenuOptions = {}): void {
    this.items = items;
    this.armedAt = performance.now() + (opts.armMs ?? 0);
    this.done = false;
    this.onBack = opts.onBack;
    items.forEach((b, i) => {
      b.onpointerenter = (e) => {
        if (e.pointerType === 'mouse') this.select(i, false);
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

  /** Keyboard handler while this menu is on top; swallows every key so gameplay never sees it. */
  handleKey(e: KeyboardEvent): boolean {
    switch (e.code) {
      case 'ArrowDown':
      case 'ArrowRight':
      case 'KeyS':
      case 'KeyD':
        this.select(this.sel + 1);
        break;
      case 'ArrowUp':
      case 'ArrowLeft':
      case 'KeyW':
      case 'KeyA':
        this.select(this.sel - 1);
        break;
      case 'Tab':
        this.select(this.sel + (e.shiftKey ? -1 : 1));
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
