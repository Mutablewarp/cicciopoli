/**
 * Publishes how much of the game host the overlaid UI covers, as CSS vars on the play area
 * (inherited by .game-host, where main.ts reads them into ViewportInfo):
 *   --play-inset-t  HUD bar height when it overlays the canvas (landscape / desktop), else 0
 *   --play-inset-b  height from the host bottom to the top of the highest visible touch
 *                   control when the controls overlay the canvas (landscape), else 0;
 *                   includes the safe-area bottom.
 * main.ts only re-reads them on resize events, so a change outside a resize dispatches one.
 */
const CONTROL_PARTS = '.cc-dpad, .cc-cross, .cc-lane, .cc-act:not([hidden])';

export interface Insets {
  /** Re-measure now; dispatches a window resize if a value changed. */
  update(): void;
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
        if (r.height > 0) bottom = Math.max(bottom, h.bottom - r.top);
      }
    }
    const key = `${Math.ceil(top)}|${Math.ceil(bottom)}`;
    if (key === last) return false;
    last = key;
    play.style.setProperty('--play-inset-t', `${Math.ceil(top)}px`);
    play.style.setProperty('--play-inset-b', `${Math.ceil(bottom)}px`);
    return true;
  }

  // Runs before main.ts's own resize listener (registered later), so it reads fresh values.
  window.addEventListener('resize', () => measure());
  const observer = new ResizeObserver(() => update());
  observer.observe(host);
  observer.observe(hud);
  function update(): void {
    if (measure()) window.dispatchEvent(new Event('resize'));
  }
  return { update };
}
