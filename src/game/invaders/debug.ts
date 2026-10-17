/**
 * Automation hooks for level 3, only with ?debug=1: window.__game exposes state and cheats.
 */
import type Phaser from 'phaser';
import type { Battle } from './battle';
import { RULES } from './config';
import type { Story } from './story';

export interface InvadersDebugState {
  phase: string;
  wave: number;
  hearts: number;
  score: number;
  charges: number;
  alive: number;
  x: number;
  invulnMs: number;
  bombs: number;
  shots: number;
  foods: number;
  capsules: number;
  caught: number;
  ufo: boolean;
  timeMs: number;
  /** bottom edge of the lowest invader (world y) */
  lowest: number;
}

export interface InvadersDebugApi {
  scene: Phaser.Scene;
  state(): InvadersDebugState;
  give(what: 'bolt' | 'heart'): void;
  clearWave(): void;
  win(): void;
  hurt(): void;
  /** fires FULMINE now (returns false when it could not) */
  bolt(): boolean;
  /** world position of every alive invader */
  invaders(): { x: number; y: number; kind: string }[];
  /** world position of every falling food / capsule */
  drops(): { x: number; y: number; food: boolean }[];
  /** world position of every enemy bomb */
  bombs(): { x: number; y: number }[];
}

type Win = { __game?: InvadersDebugApi };

export function installInvadersDebug(scene: Phaser.Scene, b: Battle, story: Story): void {
  if (!new URLSearchParams(window.location.search).has('debug')) return;
  const api: InvadersDebugApi = {
    scene,
    state: () => ({
      phase: b.phase,
      wave: b.wave + 1,
      hearts: b.hearts,
      score: b.score,
      charges: b.charges,
      alive: b.swarm.alive().length,
      x: Math.round(b.jet.x),
      invulnMs: Math.round(b.jet.invulnMs),
      bombs: b.shots.bombs.length,
      shots: b.shots.shots.length,
      foods: b.pickups.foods.length,
      capsules: b.pickups.capsules.length,
      caught: b.pickups.caught,
      ufo: b.ufo.sprite !== null,
      timeMs: Math.round(b.timeMs),
      lowest: Math.round(b.swarm.lowest()),
    }),
    give: (what) => {
      if (what === 'bolt') b.charges = Math.min(RULES.maxCharges, b.charges + 1);
      else b.hearts = Math.min(RULES.hearts, b.hearts + 1);
    },
    clearWave: () => story.clearWave(),
    win: () => story.win(),
    hurt: () => b.damage(true),
    bolt: () => b.fulmine(),
    invaders: () => b.swarm.alive().map((i) => ({ ...b.swarm.pos(i), kind: i.kind })),
    bombs: () => b.shots.bombs.map((x) => ({ x: x.sprite.x, y: x.sprite.y })),
    drops: () => [
      ...b.pickups.foods.map((f) => ({ x: f.sprite.x, y: f.sprite.y, food: true })),
      ...b.pickups.capsules.map((c) => ({ x: c.x, y: c.y, food: false })),
    ],
  };
  (window as unknown as Win).__game = api;
}

export function uninstallInvadersDebug(): void {
  delete (window as unknown as Win).__game;
}
