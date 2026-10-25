/**
 * Pointer input of level 7 on the game host (CSS px of the host): a tap acts at once on pointer down,
 * except where swipes count (a paged kitchen): there it acts on release when the pointer barely
 * moved, and a vertical swipe (PAGER.swipePx, mostly vertical) switches the page instead.
 */
import { PAGER } from './config';
import type { Point } from './layout';

export interface PointerHandlers {
  tap(x: number, y: number): void;
  /** 1 = swiped up (the page under), 0 = down */
  swipe(page: 0 | 1): void;
  /** swipes count now (taps wait for the release) */
  swipes(): boolean;
}

/** Listens on `host`; returns the function that stops listening. */
export function listenPointer(host: HTMLElement, h: PointerHandlers): () => void {
  let press: Point | null = null;
  const css = (e: PointerEvent): Point => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: PointerEvent): void => {
    const p = css(e);
    press = h.swipes() ? p : null;
    if (!press) h.tap(p.x, p.y);
  };
  const onUp = (e: PointerEvent): void => {
    const from = press;
    press = null;
    if (!from) return;
    const p = css(e);
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    if (Math.abs(dy) >= PAGER.swipePx && Math.abs(dy) > 1.5 * Math.abs(dx)) h.swipe(dy < 0 ? 1 : 0);
    else if (Math.hypot(dx, dy) < PAGER.tapPx) h.tap(from.x, from.y);
  };
  const onCancel = (): void => {
    press = null;
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onCancel);
  return () => {
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onCancel);
  };
}
