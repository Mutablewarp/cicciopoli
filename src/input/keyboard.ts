import type { HoldAction, InputState } from './state';

/** Physical key positions (KeyboardEvent.code), so WASD also works on AZERTY layouts. */
export const KEYMAP: Readonly<Record<string, HoldAction>> = {
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  ArrowUp: 'jump',
  KeyW: 'jump',
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

/** Returns true when the key was handled by an open menu and must not reach gameplay. */
export type KeyInterceptor = (e: KeyboardEvent) => boolean;

export function bindKeyboard(state: InputState, intercept: () => KeyInterceptor | null): void {
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // leave browser shortcuts alone
    const handler = intercept();
    if (handler && handler(e)) return;
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault(); // no page scroll on Space / arrows
    if (e.repeat) return;
    state.press(`k:${e.code}`, action);
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.code]) state.release(`k:${e.code}`);
  });
}
