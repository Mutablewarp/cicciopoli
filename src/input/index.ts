import { bindKeyboard, type KeyInterceptor } from './keyboard';
import { InputState } from './state';

export { InputState, type HoldAction } from './state';
export type { KeyInterceptor } from './keyboard';

export interface InputHub {
  /** Implements GameInput; touch controls feed it with press/release per pointer. */
  readonly state: InputState;
  /** While set, every keydown goes to the menu first (overlays, title screen). */
  setInterceptor(fn: KeyInterceptor | null): void;
}

export function createInput(): InputHub {
  const state = new InputState();
  let interceptor: KeyInterceptor | null = null;
  bindKeyboard(state, () => interceptor);
  window.addEventListener('blur', () => state.reset());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) state.reset();
  });
  return {
    state,
    setInterceptor(fn) {
      interceptor = fn;
    },
  };
}
