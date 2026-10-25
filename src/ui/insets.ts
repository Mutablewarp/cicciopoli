/**
 * Publishes how much of the game host the overlaid UI covers, as CSS vars on the play area
 * (inherited by .game-host, where main.ts reads them into ViewportInfo):
 *   --play-inset-t  HUD bar height when it overlays the canvas (landscape / desktop), else 0;
 *                   level 7 portrait: down to the bottom of the order ticket slot (ticket + tutorial hint)
 *   --play-inset-b  height from the host bottom to the top of the highest visible touch
 *                   control when the controls overlay the canvas (landscape), else 0;
 *                   includes the safe-area bottom. Level 7 portrait: the action button area
 *   --play-inset-l  level 7 landscape: width of the ticket column (ticket, hint, action button; the ticket <= 30% and <= 260 px), else 0
 * Level 7 parts are the `[data-inset]` elements; CSS tells each one's side with `--dock: top | left | bottom`.
 * main.ts only re-reads them on resize events, so a change outside a resize dispatches one.
 */
const CONTROL_PARTS = '.cc-dpad, .cc-cross, .cc-lane, .cc-act:not([hidden]), .cc-tpad, .cc-tbtn:not([hidden])';

export interface Insets {
  /** Re-measure now; dispatches a window resize if a value changed. */
  update(): void;
}

interface Edges {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** Folds docked parts into the covered strips of `host` (CSS px, rounded up); empty parts (hidden) cover nothing. */
export function foldInsets(host: Edges, parts: ReadonlyArray<{ dock: string; rect: Edges }>, base: { t: number; b: number }): { t: number; l: number; b: number } {
  let { t, b } = base;
  let l = 0;
  for (const { dock, rect } of parts) {
    if (rect.right - rect.left < 1 || rect.bottom - rect.top < 1) continue;
    if (dock === 'top') t = Math.max(t, rect.bottom - host.top);
    else if (dock === 'left') l = Math.max(l, rect.right - host.left);
    else if (dock === 'bottom') b = Math.max(b, host.bottom - rect.top);
  }
  return { t: Math.ceil(Math.max(0, t)), l: Math.ceil(Math.max(0, l)), b: Math.ceil(Math.max(0, b)) };
}

export function trackInsets(play: HTMLElement, host: HTMLElement, hud: HTMLElement, controls: HTMLElement): Insets {
  let last = '';

  function measure(): boolean {
    const h = host.getBoundingClientRect();
    if (h.height < 8) return false;
    const top = getComputedStyle(hud).position === 'absolute' ? Math.max(0, hud.getBoundingClientRect().bottom - h.top) : 0;
    let bottom = 0;
    if (getComputedStyle(controls).position === 'absolute') {
      for (const n of controls.querySelectorAll<HTMLElement>(CONTROL_PARTS)) {
        const r = n.getBoundingClientRect();
        // level 8 landscape: the controls stand in columns beside the host, so they cover none of it
        if (r.height > 0 && r.right > h.left && r.left < h.right) bottom = Math.max(bottom, h.bottom - r.top);
      }
    }
    const parts = [...play.querySelectorAll<HTMLElement>('[data-inset]')].map((n) => ({
      dock: getComputedStyle(n).getPropertyValue('--dock').trim(),
      rect: n.getBoundingClientRect(),
    }));
    const v = foldInsets(h, parts, { t: top, b: bottom });
    const key = `${v.t}|${v.b}|${v.l}`;
    if (key === last) return false;
    last = key;
    play.style.setProperty('--play-inset-t', `${v.t}px`);
    play.style.setProperty('--play-inset-b', `${v.b}px`);
    play.style.setProperty('--play-inset-l', `${v.l}px`);
    return true;
  }

  // Runs before main.ts's own resize listener (registered later), so it reads fresh values.
  window.addEventListener('resize', () => measure());
  const observer = new ResizeObserver(() => update());
  observer.observe(host);
  observer.observe(hud);
  for (const n of play.querySelectorAll<HTMLElement>('[data-inset]')) observer.observe(n);
  function update(): void {
    if (measure()) window.dispatchEvent(new Event('resize'));
  }
  return { update };
}
