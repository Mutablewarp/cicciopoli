import type { ControlsMode } from '../contracts';
import type { HoldAction, InputState } from './state';

/** Physical key positions (KeyboardEvent.code), so WASD also works on AZERTY layouts. */
export const KEYMAP: Readonly<Record<string, HoldAction>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'up',
  KeyW: 'up',
  Space: 'jump',
  ArrowDown: 'down',
  KeyS: 'down',
  KeyJ: 'fire',
  KeyX: 'fire',
  KeyK: 'club',
  KeyC: 'club',
  Escape: 'pause',
  KeyP: 'pause',
};

/** Keys of the level 7 action button (§9: Enter / Space). */
const KITCHEN_FIRE: ReadonlySet<string> = new Set(['Enter', 'NumpadEnter', 'Space']);

/**
 * Space fires in the shooter (BRIEF §6: Space/J/X = fuoco) and brakes in the driver (§8: ↓/S/Space);
 * Enter / Space press the kitchen's action button (§9).
 */
export function actionFor(code: string, mode: ControlsMode): HoldAction | undefined {
  if (code === 'Space' && mode === 'shooter') return 'fire';
  if (code === 'Space' && mode === 'driver') return 'down';
  if (mode === 'kitchen' && KITCHEN_FIRE.has(code)) return 'fire';
  return KEYMAP[code];
}

/**
 * Feeds one gameplay keydown into the state; returns false for unmapped keys.
 * An OS auto-repeat of a key the state no longer tracks (dropped by pause / rotation reset)
 * re-acquires the hold silently, so a direction held through a pause keeps working.
 * Kitchen: while the action button is not enabled (`fireOk` false) its keys are swallowed, not pressed.
 */
export function keyDown(state: InputState, code: string, repeat: boolean, mode: ControlsMode, fireOk = true): boolean {
  const action = actionFor(code, mode);
  if (!action) return false;
  if (mode === 'kitchen' && action === 'fire' && !fireOk) return true;
  const src = `k:${code}`;
  // the driver's brake is a hold, not a direction press: it must not replace a lane press in the same frame
  if (!repeat) state.press(src, action, !(mode === 'driver' && action === 'down'));
  else if (action !== 'pause' && !state.has(src)) state.press(src, action, false);
  return true;
}

/** Returns true when the key was handled by an open menu and must not reach gameplay. */
export type KeyInterceptor = (e: KeyboardEvent) => boolean;

export function bindKeyboard(state: InputState, intercept: () => KeyInterceptor | null, mode: () => ControlsMode, fireOk: () => boolean): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
    const handler = intercept();
    if (handler && handler(e)) return;
    if (keyDown(state, e.code, e.repeat, mode(), fireOk())) e.preventDefault(); // no page scroll on Space / arrows
  });
  // every source a key may hold (Enter is mapped only in the kitchen): releasing an untracked one is a no-op
  window.addEventListener('keyup', (e) => state.release(`k:${e.code}`));
}
