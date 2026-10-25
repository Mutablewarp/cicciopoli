/**
 * Boot + app lifecycle. OWNER: integrator.
 *
 * - Canvas backing store is sized in device pixels (crisp pixel art at any DPR),
 *   CSS size follows ui.gameHost. Rotation / resize never recreates the game.
 * - Services are shared with scenes through the Phaser registry (SERVICES_KEY).
 * - URL params: ?level=1|2 autostarts a level, &debug=1 enables debug hooks.
 */
import Phaser from 'phaser';
import type { AppControl, LevelId, Services, ViewportInfo } from './contracts';
import { LEVEL_IDS, LEVEL_SCENE, SERVICES_KEY } from './contracts';
import { createUI } from './ui';
import { createAudio } from './audio';
import { createSave } from './game/save';
import { BootScene, BASE_PACKS_KEY } from './game/BootScene';
import { GameScene } from './game/GameScene';
import { InvadersScene } from './game/invaders/InvadersScene';
import { MazeScene } from './game/maze/MazeScene';
import { RushScene } from './game/rush/RushScene';
import { KitchenScene } from './game/kitchen/KitchenScene';
import { CartoonScene } from './game/cartoon/CartoonScene';
import { buildCiccioArt } from './art/ciccio';
import { buildItemsArt } from './art/items';
import { effectiveDpr } from './game/viewport';
import { startTitleRunner } from './titleRunner';

const params = new URLSearchParams(location.search);
const appRoot = document.getElementById('app') as HTMLElement;

const { ui, input } = createUI(appRoot);
ui.setLoading(0.05, 'Accendo la piastra…');

const save = createSave();
const audio = createAudio();
audio.setMuted(save.data.muted);

const host = ui.gameHost;
const viewport: ViewportInfo = { cssW: 0, cssH: 0, dpr: 1, portrait: false, insetBottom: 0, insetTop: 0, insetLeft: 0 };

function measure(): boolean {
  const r = host.getBoundingClientRect();
  const w = Math.round(r.width);
  const h = Math.round(r.height);
  if (w < 8 || h < 8) return false; // transient zero size while the phone rotates
  viewport.cssW = w;
  viewport.cssH = h;
  viewport.dpr = effectiveDpr(window.devicePixelRatio);
  viewport.portrait = window.innerHeight > window.innerWidth;
  const style = getComputedStyle(host);
  const inset = parseFloat(style.getPropertyValue('--play-inset-b'));
  viewport.insetBottom = Number.isFinite(inset) ? Math.min(inset, h * 0.4) : 0;
  const top = parseFloat(style.getPropertyValue('--play-inset-t'));
  viewport.insetTop = Number.isFinite(top) ? Math.min(top, h * 0.3) : 0;
  const left = parseFloat(style.getPropertyValue('--play-inset-l'));
  viewport.insetLeft = Number.isFinite(left) ? Math.min(left, w * 0.4) : 0;
  return true;
}
if (!measure()) {
  viewport.cssW = Math.max(320, window.innerWidth);
  viewport.cssH = Math.max(240, window.innerHeight);
  viewport.dpr = effectiveDpr(window.devicePixelRatio);
}

const ciccioPack = buildCiccioArt();
const itemsPack = buildItemsArt();
ui.setLoading(0.35, 'Impasto i panini…');

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: host,
  backgroundColor: '#000000',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  banner: false,
  disableContextMenu: true,
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round(viewport.cssW * viewport.dpr),
    height: Math.round(viewport.cssH * viewport.dpr),
    zoom: 1 / viewport.dpr,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, fps: 60, fixedStep: true, tileBias: 24, debug: params.get('debug') === '2' },
  },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  audio: { noAudio: true },
  render: { antialias: false, powerPreference: 'high-performance' },
  scene: [BootScene, GameScene, InvadersScene, MazeScene, RushScene, KitchenScene, CartoonScene],
});

let currentLevel: LevelId | null = null;
let stopRunner: (() => void) | null = null;

/** Stops whichever level scene is running (platform, shooter or maze). */
function stopLevelScenes(): void {
  for (const key of new Set(Object.values(LEVEL_SCENE))) {
    if (game.scene.isActive(key) || game.scene.isPaused(key)) game.scene.stop(key);
  }
}

const app: AppControl = {
  startLevel(level: LevelId) {
    // only inside a gesture: an AudioContext created without one stays blocked (and warns)
    if (navigator.userActivation?.isActive ?? true) audio.unlock();
    stopRunner?.();
    stopRunner = null;
    ui.hideTitle();
    ui.hideOverlays();
    input.reset();
    currentLevel = level;
    stopLevelScenes();
    game.scene.start(LEVEL_SCENE[level], { level });
  },
  toMenu() {
    currentLevel = null;
    stopLevelScenes();
    input.reset();
    input.enabled = false;
    ui.hideOverlays();
    ui.showHud(false);
    ui.setControls(null);
    showTitle();
  },
};

const services: Services = { ui, input, audio, save, app, viewport };
game.registry.set(SERVICES_KEY, services);
game.registry.set(BASE_PACKS_KEY, [ciccioPack, itemsPack]);

function showTitle(): void {
  audio.music('title');
  ui.showTitle(
    { best: save.data.best, muted: audio.muted },
    {
      onStart: (level) => {
        audio.sfx('select');
        app.startLevel(level);
      },
      onToggleMute: () => {
        audio.unlock();
        audio.setMuted(!audio.muted);
        save.setMuted(audio.muted);
        return audio.muted;
      },
    },
  );
  if (ui.titleRunnerCanvas) {
    stopRunner?.();
    stopRunner = startTitleRunner(ui.titleRunnerCanvas, ciccioPack);
  }
}

game.events.once('boot-ready', () => {
  ui.setLoading(null);
  const auto = Number(params.get('level')) as LevelId;
  if (LEVEL_IDS.includes(auto)) app.startLevel(auto);
  else showTitle();
});

/* ------------------------------------------------------------- resizing */
let lastKey = '';
let rafId = 0;
function applyResize(): void {
  rafId = 0;
  if (!measure()) {
    window.setTimeout(scheduleResize, 120);
    return;
  }
  const key = `${viewport.cssW}x${viewport.cssH}@${viewport.dpr}+${viewport.insetBottom}+${viewport.insetTop}+${viewport.insetLeft}`;
  if (key === lastKey || !game.isBooted) return;
  lastKey = key;
  const w = Math.round(viewport.cssW * viewport.dpr);
  const h = Math.round(viewport.cssH * viewport.dpr);
  if (w !== game.scale.width || h !== game.scale.height) {
    game.scale.setZoom(1 / viewport.dpr);
    game.scale.resize(w, h);
  }
  game.canvas.style.width = `${viewport.cssW}px`;
  game.canvas.style.height = `${viewport.cssH}px`;
  game.events.emit('viewport-changed', viewport);
}
function scheduleResize(): void {
  if (!rafId) rafId = requestAnimationFrame(applyResize);
}
game.events.once(Phaser.Core.Events.READY, () => {
  lastKey = '';
  scheduleResize();
});
new ResizeObserver(scheduleResize).observe(host);
window.addEventListener('resize', scheduleResize);
window.visualViewport?.addEventListener('resize', scheduleResize);
window.addEventListener('orientationchange', () => {
  input.reset();
  scheduleResize();
  // iOS reports the final size late; re-check once the rotation settles.
  [150, 400, 800].forEach((ms) => window.setTimeout(scheduleResize, ms));
});

/* ------------------------------------------------- focus / visibility */
window.addEventListener('blur', () => {
  input.reset();
  // notification shade / Control Center / call overlay: pause once focus is really gone
  window.setTimeout(() => {
    if (!document.hasFocus() && currentLevel !== null) game.events.emit('app-hidden');
  }, 0);
});
// A lazy level chunk that fails (weak signal, redeploy while open): reload once, not placeholders.
window.addEventListener('vite:preloadError', (e) => {
  // a failed optional prefetch on the title (card thumbnails) or no network: keep the page, never reload
  if (currentLevel === null || navigator.onLine === false) return;
  try {
    if (sessionStorage.getItem('cc-reloaded') === '1') return;
    sessionStorage.setItem('cc-reloaded', '1');
  } catch {
    return; // storage blocked: never risk a reload loop
  }
  e.preventDefault();
  location.reload();
});
window.setTimeout(() => {
  try {
    sessionStorage.removeItem('cc-reloaded');
  } catch {
    /* storage blocked */
  }
}, 10000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    input.reset();
    audio.suspend();
    if (currentLevel !== null) game.events.emit('app-hidden');
  } else {
    audio.resume();
    lastKey = '';
    scheduleResize();
  }
});
window.addEventListener('pageshow', () => {
  lastKey = '';
  scheduleResize();
});

/* ------------------------------------------- audio unlock + page guards */
const unlock = (): void => audio.unlock();
window.addEventListener('pointerdown', unlock, { capture: true, passive: true });
// the first touch switches the UI to touch mode (overlay controls): re-read the inset
window.addEventListener('pointerdown', () => window.setTimeout(scheduleResize, 0), { passive: true });
window.addEventListener('keydown', unlock, { capture: true });
window.addEventListener('touchend', unlock, { capture: true, passive: true });
// iOS Safari pinch / double-tap zoom and rubber-band scroll.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
document.addEventListener(
  'touchmove',
  (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('[data-scrollable]')) return;
    e.preventDefault();
  },
  { passive: false },
);

if (params.get('debug')) {
  (window as unknown as Record<string, unknown>).__app = { game, services, app };
}
