/**
 * Pointer input of level 7 on the game host (CSS px of the host), pointer events only (a real iPhone sends
 * them for touch; the host gets touch-action none so the browser never pans, zooms or delays them). One
 * pointer at a time: press -> (drag) -> release. A release that barely moved is a tap at the press point;
 * one that moved from a draggable press is a drop; a mostly horizontal flick from anywhere else switches the
 * kitchen page.
 */
import { PAGER, TOUCH } from './config';
import type { Point } from './framing';

export interface PointerHandlers {
  /** pressed at (x, y); true = what is under it can be dragged */
  press(x: number, y: number): boolean;
  /** moved while a draggable press is held */
  drag(x: number, y: number): void;
  tap(x: number, y: number): void;
  drop(x: number, y: number): void;
  /** 1 = flicked left (the page on the right), 0 = right */
  swipe(page: 0 | 1): void;
  /** the press ended without a tap, drop or swipe */
  cancel(): void;
}

/** Listens on `host`; returns the function that stops listening. */
export function listenPointer(host: HTMLElement, h: PointerHandlers): () => void {
  let press: (Point & { id: number; drag: boolean; dragging: boolean }) | null = null;
  const css = (e: PointerEvent): Point => {
    const r = host.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: PointerEvent): void => {
    if (press || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const p = css(e);
    try {
      host.setPointerCapture(e.pointerId);
    } catch {
      // the pointer is already gone (a very short tap): the release still arrives
    }
    press = { ...p, id: e.pointerId, drag: false, dragging: false };
    press.drag = h.press(p.x, p.y);
  };
  const onMove = (e: PointerEvent): void => {
    if (!press || e.pointerId !== press.id || !press.drag) return;
    const p = css(e);
    if (!press.dragging && Math.hypot(p.x - press.x, p.y - press.y) < TOUCH.dragPx) return;
    press.dragging = true;
    h.drag(p.x, p.y);
  };
  const onUp = (e: PointerEvent): void => {
    const from = press;
    if (!from || e.pointerId !== from.id) return;
    press = null;
    const p = css(e);
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    if (Math.hypot(dx, dy) < PAGER.tapPx) h.tap(from.x, from.y);
    else if (from.dragging) h.drop(p.x, p.y);
    else if (!from.drag && Math.abs(dx) >= PAGER.swipePx && Math.abs(dx) > 1.5 * Math.abs(dy)) h.swipe(dx < 0 ? 1 : 0);
    else h.cancel();
  };
  const onCancel = (e: PointerEvent): void => {
    if (!press || e.pointerId !== press.id) return;
    press = null;
    h.cancel();
  };
  const touchAction = host.style.touchAction;
  host.style.touchAction = 'none';
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onCancel);
  return () => {
    host.style.touchAction = touchAction;
    host.removeEventListener('pointerdown', onDown);
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onUp);
    host.removeEventListener('pointercancel', onCancel);
  };
}
