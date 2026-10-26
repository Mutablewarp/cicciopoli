/**
 * Automation hooks for level 6, only with ?debug=1: window.__game exposes the state and cheats.
 * god(true) hands the wheel to the oracle autopilot (it never hits); skipTo / win fast-forward
 * on it. give / booster drop the crate right in front of the truck.
 */
import type Phaser from 'phaser';
import type { SaveStore } from '../../contracts';
import { TRUCK_LEN } from './config';
import { roadCss } from './framing';
import { POWER_PICKUP } from './logic/powerups';
import { settleRun } from './logic/results';
import { RUSH_TEXT } from './logic/strings';
import type { PowerId, RushSnapshot } from './logic/types';
import type { RushSession, SessionState } from './session';
import type { RushView } from './view';

/** Snapshot without the live entity objects, plus the scene side. */
export interface RushDebugState extends Omit<RushSnapshot, 'entities'> {
  session: SessionState;
  entities: { id: number; kind: string; lane: number; x: number; y: number; ttcMs: number }[];
  zoom: number;
  ahead: number;
  autopilot: boolean;
  /** v9 side view (camera turned, truck drives right) */
  side: boolean;
  /** road + kerbs across, and the truck's length, in CSS px */
  roadCss: number;
  truckCss: number;
}

export interface RushDebugApi {
  scene: Phaser.Scene;
  state(): RushDebugState | { session: SessionState };
  /** GIOCA ORA from the setup panel (daily = SFIDA DEL GIORNO) */
  play(daily?: boolean): void;
  /** a new run on this seed (standard driver, no hints) */
  seed(n: number): void;
  skipTo(seconds: number): void;
  god(on: boolean): void;
  give(power: PowerId): void;
  booster(): void;
  /** the ROADCOASTER cinematic now, then the results of the run so far */
  finale(): void;
  /** autopilot to the end of the run (all three deliveries: the real finale) */
  win(): void;
}

type Win = { __game?: RushDebugApi };

const PAD_PX = 40;

export function installRushDebug(scene: Phaser.Scene, session: RushSession, view: RushView, save: SaveStore): void {
  if (!new URLSearchParams(window.location.search).has('debug')) return;
  const drop = (kind: 'booster' | (typeof POWER_PICKUP)[PowerId]): void => {
    const run = session.run;
    if (!run || session.state !== 'run') return;
    const s = run.snapshot;
    run.traffic.addPickup(kind, s.truck.target, s.distance + PAD_PX);
  };
  const api: RushDebugApi = {
    scene,
    state: () => {
      const run = session.run;
      if (!run) return { session: session.state };
      const s = run.snapshot;
      return {
        ...s,
        session: session.state,
        entities: s.entities.map((e) => ({ id: e.id, kind: e.kind, lane: e.lane, x: e.x, y: Math.round(e.y), ttcMs: Math.round(e.ttcMs) })),
        zoom: view.framing.zoom,
        ahead: Math.round(view.framing.ahead),
        autopilot: session.autopilot,
        side: view.framing.side,
        roadCss: Math.round(roadCss(view.framing, view.dpr)),
        truckCss: Math.round((TRUCK_LEN * view.framing.zoom) / view.dpr),
      };
    },
    play: (daily = false) => session.start(session.progress.optionsFor(daily, new Date(), Date.now() >>> 0)),
    seed: (n) => session.start({ seed: n >>> 0, driver: 'riflessi', daily: false, hints: false }),
    skipTo: (seconds) => session.fastForward(seconds * 1000),
    god: (on) => {
      session.autopilot = on;
    },
    give: (power) => drop(POWER_PICKUP[power]),
    booster: () => drop('booster'),
    finale: () => {
      const run = session.run;
      if (!run || session.state !== 'run') return;
      session.playFinale(RUSH_TEXT.roadcoaster, RUSH_TEXT.card, settleRun(run.summary(), session.progress, save, new Date()));
    },
    win: () => session.fastForward(Infinity),
  };
  (window as unknown as Win).__game = api;
}

export function uninstallRushDebug(): void {
  delete (window as unknown as Win).__game;
}
