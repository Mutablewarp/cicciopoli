import type { ControlsMode, SwipeSetting } from '../contracts';
import { bindKeyboard, type KeyInterceptor } from './keyboard';
import { InputState } from './state';
import { LaneSwipe, SwipeTracker, swipeMin } from './swipe';

export { InputState, type HoldAction } from './state';
export type { KeyInterceptor } from './keyboard';

export interface InputHub {
  /** Implements GameInput; touch controls feed it with press/release per pointer. */
  readonly state: InputState;
  /** While set, every keydown goes to the menu first (overlays, title screen). */
  setInterceptor(fn: KeyInterceptor | null): void;
  /**
   * Current controls mode: keyboard mapping (Space = fire in the shooter, brake in the driver, Enter / Space =
   * the action button in the kitchen while `fire` is true) and game-area swipes (maze, driver) at the given
   * sensitivity (false = off).
   */
  setMode(mode: ControlsMode, swipe?: SwipeSetting, fire?: boolean): void;
  /** Swipes on this element steer in maze mode and change lane in driver mode (one finger at a time). */
  bindSwipe(area: HTMLElement): void;
}

export function createInput(): InputHub {
  const state = new InputState();
  let interceptor: KeyInterceptor | null = null;
  let mode: ControlsMode = 'platform';
  let swipe: SwipeSetting = 'mid';
  let fireOk = true;
  bindKeyboard(state, () => interceptor, () => mode, () => fireOk);
  window.addEventListener('blur', () => state.reset());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.reset();
  });
  return {
    state,
    setInterceptor(fn) {
      interceptor = fn;
    },
    setMode(m, s = 'mid', fire = true) {
      mode = m;
      swipe = s;
      fireOk = fire;
    },
    bindSwipe(area) {
      let tracker: SwipeTracker | LaneSwipe | null = null;
      let finger: number | null = null;
      area.addEventListener('pointerdown', (e) => {
        const min = swipeMin(swipe);
        if ((mode !== 'maze' && mode !== 'driver') || min === null || finger !== null || (e.pointerType === 'mouse' && e.button !== 0)) return;
        finger = e.pointerId;
        tracker = mode === 'maze' ? new SwipeTracker(min) : new LaneSwipe(min);
        tracker.start(e.clientX, e.clientY);
        try {
          area.setPointerCapture(e.pointerId);
        } catch {
          // pointer already gone
        }
      });
      area.addEventListener('pointermove', (e) => {
        if (e.pointerId !== finger || !tracker) return;
        const d = tracker.move(e.clientX, e.clientY);
        if (d) state.pushDir(d);
      });
      const end = (e: PointerEvent): void => {
        if (e.pointerId === finger) finger = null;
      };
      for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) area.addEventListener(t, end);
    },
  };
}
