/**
 * DOM UI: stage (game host + HUD + banner), touch controls and full-screen screens.
 * Built once; rotation is pure CSS and only resizes .game-host.
 */
import '@fontsource/press-start-2p/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/600.css';
import '@fontsource/pixelify-sans/700.css';
import './styles.css';
import './hud.css';
import './pads.css';
import './controls.css';
import './screens.css';
import './overlays.css';
import './title.css';
import type { GameInput, GameUI } from '../contracts';
import { createInput } from '../input';
import { createBanner } from './banner';
import { createControls } from './controls';
import { el } from './dom';
import { createHud } from './hud';
import { trackInsets } from './insets';
import { trackPointerMode } from './layout';
import { createLoading } from './loading';
import { createModal } from './screens';
import { createTitle } from './title';

export function createUI(root: HTMLElement): { ui: GameUI; input: GameInput } {
  const hub = createInput();
  const input = hub.state;

  const shell = el('div', 'cc-root');
  const stage = el('div', 'cc-stage');
  const hud = createHud();
  const play = el('div', 'cc-play');
  const gameHost = el('div', 'game-host');
  const bannerLayer = el('div', 'cc-banner-layer');
  play.append(gameHost, bannerLayer);
  const controls = createControls(input, (m) => hub.setMode(m));
  stage.append(hud.root, play, controls.root);
  hub.bindSwipe(gameHost);

  // Any open screen disables gameplay input and owns the keyboard; closing the last one restores it.
  let wasBlocked = false;
  const sync = (): void => {
    const top = modal.open ? modal.menu : title.open ? title.menu : null;
    hub.setInterceptor(top ? (e) => top.handleKey(e) : null);
    if (top) {
      input.enabled = false;
    } else if (wasBlocked) {
      input.enabled = true;
      input.reset();
      const active = document.activeElement;
      if (active instanceof HTMLElement && shell.contains(active)) active.blur();
    }
    wasBlocked = top !== null;
  };
  const modal = createModal(sync, () => hud.level);
  const title = createTitle(sync);
  const loading = createLoading(
    () => title.open,
    () => {
      if (title.open) title.root.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 320, easing: 'ease-out' });
    },
  );
  shell.append(stage, modal.root, title.root, loading.root);
  root.appendChild(shell);
  document.getElementById('cc-splash')?.remove(); // static splash from index.html
  const insets = trackInsets(play, gameHost, hud.root, controls.root);
  trackPointerMode(shell, () => insets.update());

  const ui: GameUI = {
    setLoading: (p, msg) => loading.set(p, msg),
    showTitle: (info, h) => title.show(info, h),
    hideTitle: () => {
      title.hide();
      if (!modal.open) {
        input.enabled = true;
        input.reset();
      }
    },
    showHud: (v) => hud.setVisible(v),
    updateHud: (s) => hud.update(s),
    setControls: (layout) => {
      controls.set(layout);
      insets.update();
    },
    banner: createBanner(bannerLayer),
    showPause: (h, muted) => modal.showPause(h, muted),
    showVictory: (info, h) => modal.showVictory(info, h),
    showGameOver: (info, h) => modal.showGameOver(info, h),
    hideOverlays: () => {
      modal.hide();
      // Contract: closing overlays always hands control back (even if they were already closed).
      if (!title.open) {
        input.enabled = true;
        input.reset();
      }
    },
    onPauseButton: (cb) => hud.onPause(cb),
    gameHost,
    titleRunnerCanvas: title.canvas,
  };
  return { ui, input };
}
