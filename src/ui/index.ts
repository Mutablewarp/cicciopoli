// STUB (integrator) — replaced by the UI agent. Full-screen game host + keyboard-only input.
import type { EdgeAction, GameInput, GameUI } from '../contracts';

function createKeyboardInput(): GameInput {
  const held = new Set<string>();
  const latch = new Set<EdgeAction>();
  let lastDir: -1 | 1 = 1;
  const map: Record<string, string> = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'down', KeyS: 'down',
    KeyJ: 'fire', KeyX: 'fire', KeyK: 'club', KeyC: 'club', Escape: 'pause', KeyP: 'pause',
  };
  const input: GameInput = {
    enabled: true,
    get axisX() {
      if (!input.enabled) return 0;
      const l = held.has('left');
      const r = held.has('right');
      if (l && r) return lastDir;
      return l ? -1 : r ? 1 : 0;
    },
    get upHeld() { return input.enabled && held.has('jump'); },
    get downHeld() { return input.enabled && held.has('down'); },
    get jumpHeld() { return input.enabled && held.has('jump'); },
    get fireHeld() { return input.enabled && held.has('fire'); },
    get clubHeld() { return input.enabled && held.has('club'); },
    consume(a: EdgeAction) {
      const had = latch.has(a);
      latch.delete(a);
      return had && (input.enabled || a === 'pause');
    },
    reset() { held.clear(); latch.clear(); },
  };
  window.addEventListener('keydown', (e) => {
    const a = map[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;
    held.add(a);
    if (a === 'left') lastDir = -1;
    if (a === 'right') lastDir = 1;
    if (a === 'jump' || a === 'fire' || a === 'club' || a === 'pause') latch.add(a);
  });
  window.addEventListener('keyup', (e) => {
    const a = map[e.code];
    if (a) held.delete(a);
  });
  return input;
}

export function createUI(root: HTMLElement): { ui: GameUI; input: GameInput } {
  const host = document.createElement('div');
  host.style.cssText = 'position:absolute;inset:0;overflow:hidden;';
  root.appendChild(host);
  const noop = (): void => undefined;
  const ui: GameUI = {
    setLoading: noop,
    showTitle: noop,
    hideTitle: noop,
    showHud: noop,
    updateHud: noop,
    setControls: noop,
    banner: noop,
    showPause: (h) => h.onResume(),
    showVictory: (_i, h) => h.onMenu(),
    showGameOver: (_i, h) => h.onRetry(),
    hideOverlays: noop,
    onPauseButton: noop,
    gameHost: host,
    titleRunnerCanvas: null,
  };
  return { ui, input: createKeyboardInput() };
}
