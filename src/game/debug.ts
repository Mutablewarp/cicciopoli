/**
 * Automation hooks, only with ?debug=1 (or 2): window.__game exposes state and a few
 * cheats for scripted browser tests.
 */
import type Phaser from 'phaser';
import { TILE } from '../art/keys';
import type { PowerState } from '../contracts';
import type { Flow } from './flow';
import type { Interactions } from './interactions';
import type { LevelRun } from './run';
import type { PickupKind } from './rules';

export interface DebugState {
  x: number;
  y: number;
  hearts: number;
  score: number;
  powers: PowerState;
  onGround: boolean;
  phase: string;
  timeMs: number;
  /** remaining invulnerability (blink) */
  invulnMs: number;
  /** movement mode id ('platformer' | 'flight') */
  mode: string;
}

export interface DebugApi {
  scene: Phaser.Scene;
  state(): DebugState;
  teleport(tileX: number, tileY: number): void;
  /** pixel-precise teleport: feet at (x, bottom) */
  place(x: number, bottom: number): void;
  give(power: keyof PowerState | PickupKind): void;
  hurt(): void;
  win(): void;
  /** live enemies: kind, feet position, awake flag */
  enemies(): { kind: string; x: number; y: number; awake: boolean }[];
  /** freezes Ciccio's sprite on one sheet frame (null = back to normal) to inspect attachments */
  pose(frame: number | null): void;
  /** camera visible rect (world px) */
  view(): { x: number; y: number; w: number; h: number };
}

const GIVE: Record<string, PickupKind> = { nugget: 'nugget', brie: 'brie', goat: 'goat', thai: 'thai', wings: 'crunchy', crunchy: 'crunchy', burger: 'burger', fries: 'fries' };

export function debugEnabled(): boolean {
  return new URLSearchParams(window.location.search).has('debug');
}

export function installDebug(r: LevelRun, ix: Interactions, flow: Flow): void {
  if (!debugEnabled()) return;
  const api: DebugApi = {
    scene: r.scene,
    state: () => ({
      x: Math.round(r.player.x),
      y: Math.round(r.player.bottom),
      hearts: r.run.hearts,
      score: r.run.score,
      powers: { ...r.run.powers },
      onGround: r.player.onGround,
      phase: r.phase,
      timeMs: Math.round(r.timeMs),
      invulnMs: Math.round(r.player.invuln.remaining),
      mode: r.player.mode.id,
    }),
    teleport: (tileX, tileY) => {
      r.player.teleport(tileX * TILE + TILE / 2, (tileY + 1) * TILE);
      r.rig.snapTo(r.followTarget());
    },
    place: (x, bottom) => {
      r.player.teleport(x, bottom);
      r.rig.snapTo(r.followTarget());
    },
    give: (power) => {
      const kind = GIVE[power];
      if (kind) ix.grant(kind, r.player.x, r.player.top);
    },
    hurt: () => {
      r.player.invuln.stop();
      ix.damage(r.player.x + r.player.facing * 10);
    },
    enemies: () =>
      r.enemies.alive().map((e) => ({ kind: e.kind, x: Math.round(e.sprite.x), y: Math.round(e.body.bottom), awake: e.awake })),
    pose: (frame) => {
      r.view.auto = frame === null;
      if (frame === null) return;
      r.view.sprite.anims.stop();
      r.view.sprite.setFrame(frame).setVisible(true);
    },
    view: () => r.rig.view(),
    win: () => {
      r.player.teleport(r.goal.x, r.goal.surfaceY);
      flow.win();
    },
  };
  (window as unknown as { __game?: DebugApi }).__game = api;
}

export function uninstallDebug(): void {
  delete (window as unknown as { __game?: DebugApi }).__game;
}
