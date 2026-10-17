import type { ControlsMode } from '../contracts';
import { bindKeyboard, type KeyInterceptor } from './keyboard';
import { InputState } from './state';
import { SwipeTracker } from './swipe';

export { InputState, type HoldAction } from './state';
export type { KeyInterceptor } from './keyboard';

export interface InputHub {
  /** Implements GameInput; touch controls feed it with press/release per pointer. */
  readonly state: InputState;
  /** While set, every keydown goes to the menu first (overlays, title screen). */
  setInterceptor(fn: KeyInterceptor | null): void;
  /** Current controls mode: keyboard mapping (Space = fire in the shooter) and maze swipes. */
  setMode(mode: ControlsMode): void;
  /** Swipes on this element steer in maze mode (one finger at a time). */
  bindSwipe(area: HTMLElement): void;
}

export function createInput(): InputHub {
  const state = new InputState();
  let interceptor: KeyInterceptor | null = null;
  let mode: ControlsMode = 'platform';
  bindKeyboard(state, () => interceptor, () => mode);
  window.addEventListener('blur', () => state.reset());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.reset();
  });
  return {
    state,
    setInterceptor(fn) {
      interceptor = fn;
    },
    setMode(m) {
      mode = m;
    },
    bindSwipe(area) {
      const swipe = new SwipeTracker();
      let finger: number | null = null;
      area.addEventListener('pointerdown', (e) => {
        if (mode !== 'maze' || finger !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        finger = e.pointerId;
        swipe.start(e.clientX, e.clientY);
        try {
          area.setPointerCapture(e.pointerId);
        } catch {
          // pointer already gone
        }
      });
      area.addEventListener('pointermove', (e) => {
        if (e.pointerId !== finger) return;
        const d = swipe.move(e.clientX, e.clientY);
        if (d) state.pushDir(d);
      });
      const end = (e: PointerEvent): void => {
        if (e.pointerId === finger) finger = null;
      };
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) area.addEventListener(t, end);
    },
  };
}
