/**
 * Level 7 action button (ControlsMode 'kitchen'): one big pixel button labelled ControlsLayout.actionLabel
 * (PRENDI L'ORDINE, SERVI …) whose state is layout.fire. One finger (or the mouse) landing on it is ONE 'fire'
 * press, released on lift: a held finger never repeats it and a reset never re-presses it. Enter / Space do the
 * same from the keyboard (input/keyboard.ts). Lives in the kitchen HUD's zone, so it docks with the ticket.
 * A hidden button keeps its room: the covered strips (insets) do not change between customers.
 */
import type { ButtonState, ControlsLayout } from '../../contracts';
import type { InputState } from '../../input';
import { el } from '../dom';
import { capture, primary, touchSrc } from '../dpad';

const POP: Keyframe[] = [{ transform: 'scale(0.7)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }];

export interface KitchenAction {
  readonly root: HTMLElement;
  /** null or another mode hides it */
  set(layout: ControlsLayout | null): void;
}

export function createKitchenAction(input: InputState): KitchenAction {
  const root = el('div', 'cc-btn cc-btn--primary cc-kact');
  root.setAttribute('role', 'button');
  root.dataset.state = 'hidden';
  const label = el('span', 'cc-btn__label cc-kact__label');
  root.append(label, el('span', 'cc-kact__key', 'INVIO'));
  let state: ButtonState = 'hidden';
  let finger: number | null = null;

  root.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // no focus: Space / Enter stay the game's
    if (state !== 'enabled' || !primary(e) || finger !== null) return;
    finger = e.pointerId;
    capture(root, e.pointerId);
    input.press(touchSrc(e.pointerId), 'fire');
    root.classList.add('is-pressed');
  });
  const lift = (): void => {
    if (finger !== null) input.release(touchSrc(finger));
    finger = null;
    root.classList.remove('is-pressed');
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    root.addEventListener(t, (e) => {
      if (e.pointerId === finger) lift();
    });
  }

  return {
    root,
    set(layout) {
      const next: ButtonState = layout?.mode === 'kitchen' ? layout.fire : 'hidden';
      const text = layout?.mode === 'kitchen' ? (layout.actionLabel ?? '') : label.textContent ?? '';
      const relabel = text !== label.textContent;
      if (relabel) {
        label.textContent = text;
        root.setAttribute('aria-label', text);
      }
      const prev = state;
      if (next !== prev) {
        state = next;
        if (next !== 'enabled') lift();
        root.dataset.state = next;
        root.setAttribute('aria-disabled', String(next !== 'enabled'));
      }
      if (next === 'enabled' && (prev !== 'enabled' || relabel)) root.animate(POP, { duration: 320, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    },
  };
}
