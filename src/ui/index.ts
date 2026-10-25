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
import './rush/hud.css';
import './pads.css';
import './controls.css';
import './rush/driver.css';
import './screens.css';
import './hero.css';
import './overlays.css';
import './rush/play.css';
import './rush/stage.css';
import './rush/setup.css';
import './rush/results.css';
import './rush/panels.css';
import './kitchen/hud.css';
import './kitchen/play.css';
import './kitchen/screens.css';
import './kitchen/results.css';
import './title.css';
import './title-short.css';
import './cartoon/toon.css';
import './cartoon/stage.css';
import './cartoon/controls.css';
import './cartoon/tablet.css';
import './cartoon/hud.css';
import './cartoon/map.css';
import './cartoon/acts.css';
import './cartoon/panels.css';
import './cartoon/results.css';
import './cartoon/finale.css';
import type { GameInput, GameUI } from '../contracts';
import { CT_VIEW } from '../config/cartoon';
import { createInput } from '../input';
import { createBanner } from './banner';
import { showCartoonMap } from './cartoon/map';
import { showCartoonResults } from './cartoon/results';
import { createControls } from './controls';
import { el } from './dom';
import { createHud } from './hud';
import { trackInsets } from './insets';
import { trackPointerMode } from './layout';
import { createLoading } from './loading';
import { showRushResults } from './rush/results';
import { showRushSetup } from './rush/setup';
import { showKitchenResults } from './kitchen/results';
import { showKitchenSetup } from './kitchen/setup';
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
  // level 7: ticket, bubble and hint over the game, its action button docked with them (insets measure them all)
  play.append(gameHost, hud.kitchen.root, bannerLayer);
  const controls = createControls(input, (m, swipe, fire) => hub.setMode(m, swipe, fire));
  hud.kitchen.zone.append(controls.kitchen);
  stage.append(hud.root, play, controls.root);
  hub.bindSwipe(gameHost);

  // level 8 restyles the whole stage (1930s HUD, controls band sized to the arena, vintage cards): `.is-l8` on the root
  const level8 = (on: boolean): void => {
    shell.classList.toggle('is-l8', on);
  };
  // the portrait game host follows the core camera framing (cartoon/stage.css)
  shell.style.setProperty('--l8-push', String(CT_VIEW.push.max));
  shell.style.setProperty('--l8-zmin', String(CT_VIEW.push.minZoomCss));
  shell.style.setProperty('--l8-m', `${CT_VIEW.marginCss}px`);

  // Level 6 / 8 finales: the driver / cartoon controls go away with no screen opening (only the cinematic does
  // that), so the HUD and controls bands collapse and the space shot / golden ticket fills a portrait screen too.
  let driving = false;
  const cinematic = (on: boolean): void => {
    stage.classList.toggle('is-cinematic', on);
  };

  // Any open screen disables gameplay input and owns the keyboard; closing the last one restores it.
  let wasBlocked = false;
  const sync = (): void => {
    const top = modal.open ? modal.menu : title.open ? title.menu : null;
    hub.setInterceptor(top ? (e) => top.handleKey(e) : null);
    if (top) {
      if (stage.classList.contains('is-cinematic')) {
        cinematic(false);
        insets.update(); // a screen opening in the same task as the collapse: the ResizeObserver sees no change
      }
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
  const banner = createBanner(bannerLayer);
  // levels 6-7 "movimento ridotto": remembered from the setup panel for the results card (and the level 7 HUD)
  let calm = false;
  const reducedMotion = (): boolean => calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setCalm = (on: boolean): void => {
    calm = on;
    hud.kitchen.setCalm(reducedMotion());
  };
  hud.kitchen.setCalm(reducedMotion());
  trackPointerMode(shell, () => insets.update());

  const ui: GameUI = {
    setLoading: (p, msg) => loading.set(p, msg),
    showTitle: (info, h) => {
      level8(false);
      driving = false;
      cinematic(false);
      title.show(info, h);
    },
    hideTitle: () => {
      title.hide();
      if (!modal.open) {
        input.enabled = true;
        input.reset();
      }
    },
    showHud: (v) => hud.setVisible(v),
    updateHud: (s) => {
      if (s.level !== undefined) level8(s.level === 8);
      hud.update(s);
    },
    setControls: (layout) => {
      if (layout) level8(layout.level === 8);
      cinematic(!layout && driving && !modal.open && !title.open);
      driving = layout?.mode === 'driver' || layout?.mode === 'cartoon';
      controls.set(layout);
      insets.update();
    },
    banner: banner.show,
    // every scene pauses through showPause and resumes (or leaves) through hideOverlays
    showPause: (h, muted) => {
      banner.freeze();
      modal.showPause(h, muted);
      if (shell.classList.contains('is-l8')) modal.root.querySelector('.cc-pause-card')?.classList.add('cc-toon');
    },
    showVictory: (info, h) => modal.showVictory(info, h),
    showGameOver: (info, h) => modal.showGameOver(info, h),
    hideOverlays: () => {
      banner.thaw();
      modal.hide();
      // Contract: closing overlays always hands control back (even if they were already closed).
      if (!title.open) {
        input.enabled = true;
        input.reset();
      }
    },
    showRushSetup: (info, h) => {
      setCalm(info.settings.reducedMotion);
      showRushSetup(modal, info, {
        ...h,
        onSettings: (s) => {
          setCalm(s.reducedMotion);
          h.onSettings(s);
        },
      });
    },
    showRushResults: (info, h) => showRushResults(modal, info, h, reducedMotion()),
    showKitchenSetup: (info, h) => {
      setCalm(info.settings.reducedMotion);
      showKitchenSetup(modal, info, {
        ...h,
        onSettings: (s) => {
          setCalm(s.reducedMotion);
          h.onSettings(s);
        },
      });
    },
    showKitchenResults: (info, h) => showKitchenResults(modal, info, h, reducedMotion()),
    showCartoonMap: (info, h) => {
      level8(true);
      setCalm(info.settings.reducedMotion);
      showCartoonMap(
        modal,
        info,
        {
          ...h,
          onSettings: (s) => {
            setCalm(s.reducedMotion);
            h.onSettings(s);
          },
        },
        reducedMotion,
      );
    },
    showCartoonResults: (info, h) => {
      level8(true);
      showCartoonResults(modal, info, h, reducedMotion());
    },
    onPauseButton: (cb) => hud.onPause(cb),
    gameHost,
    titleRunnerCanvas: title.canvas,
  };
  return { ui, input };
}
