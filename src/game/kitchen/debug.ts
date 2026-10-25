/**
 * Automation hooks for level 7, only with ?debug=1: window.__game exposes the state and cheats.
 * autoCook() hands the kitchen to the careful bot; skipTo fast-forwards on it; cssOf gives the
 * screen point of a station for scripted taps.
 */
import type Phaser from 'phaser';
import { toCss, type Point } from './layout';
import type { KitchenSnapshot, KitchenTarget } from './logic/types';
import type { KitchenSession, SessionState } from './session';
import type { KitchenView } from './view';

export interface KitchenDebugState extends Partial<KitchenSnapshot> {
  session: SessionState;
  orient: string;
  zoom: number;
  slide: number;
  /** paged kitchen: the page shown and how many there are */
  page: number;
  pages: number;
  autopilot: boolean;
}

export interface KitchenDebugApi {
  scene: Phaser.Scene;
  state(): KitchenDebugState;
  /** GIOCA ORA from the setup panel (normal options) */
  play(): void;
  /** a new shift on this seed (tutorial on / off, AIUTI on) */
  seed(n: number, tutorial?: boolean): void;
  /** the careful bot plays until this customer (0..7) walks in */
  skipTo(customerIndex: number): void;
  /** the careful bot plays the orders (false = hands back) */
  autoCook(on?: boolean): void;
  /** this seed's shift replayed by the careful bot to its end: a real 3-star TURNO FINITO, the YOU ARE SO GOLDEN finale, the results */
  golden(): void;
  /** the end of the shift now (results with what was served) */
  endShift(): void;
  /** CSS px on the game host of a kitchen target, with the kitchen on screen (scripted taps) */
  cssOf(t: KitchenTarget): Point | null;
  /** paged kitchen: shows page 0 (MONTAGGIO) / 1 (COTTURA) */
  page(n: number): void;
}

type Win = { __game?: KitchenDebugApi };

export function installKitchenDebug(scene: Phaser.Scene, session: KitchenSession, view: KitchenView): void {
  if (!new URLSearchParams(window.location.search).has('debug')) return;
  const api: KitchenDebugApi = {
    scene,
    state: () => ({
      ...(session.shift?.snapshot ?? {}),
      session: session.state,
      orient: view.framing.orient,
      zoom: view.framing.zoom,
      slide: view.slide,
      page: view.page,
      pages: view.framing.pages.length,
      autopilot: session.autopilot,
    }),
    play: () => session.start(session.progress.optionsFor(Date.now() >>> 0)),
    seed: (n, tutorial = false) => session.start({ seed: n >>> 0, tutorial, hints: true }),
    skipTo: (i) => session.fastForward(i),
    autoCook: (on = true) => {
      session.autopilot = on;
    },
    golden: () => {
      session.start({ seed: session.shift?.options.seed ?? Date.now() >>> 0, tutorial: false, hints: true });
      session.fastForward(Infinity);
    },
    endShift: () => session.forceEnd(),
    page: (n) => view.showPage(n, true),
    cssOf: (t) => {
      const r = view.targetWorld(t, null);
      if (!r) return null;
      // kitchen targets: world rect of the kitchen view, measured with the camera on it (on its page: a
      // target on the other page of a paged kitchen gives its tab)
      const p = toCss(view.framing, r.x + r.w / 2 - view.station.root.x, r.y + r.h / 2 - (view.framing.pages[view.page] ?? 0));
      return { x: Math.round(p.x), y: Math.round(p.y) };
    },
  };
  (window as unknown as Win).__game = api;
}

export function uninstallKitchenDebug(): void {
  delete (window as unknown as Win).__game;
}
