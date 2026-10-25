/**
 * Automation hooks for level 8, only with ?debug=1: window.__game exposes the state and cheats for QA
 * and the screenshot scripts (scripts/shot.mjs steps {"eval": "__game.boss('brie')"}).
 */
import type Phaser from 'phaser';
import type { CartoonBossId, CartoonWeapon } from '../../contracts';
import { LAST_BOSS, type CartoonSession, type SessionState } from './session';
import type { RoundState } from './round';
import { heroScale } from './assets';
import type { CartoonView } from './view';

export interface CartoonDebugState {
  session: SessionState;
  boss: CartoonBossId | null;
  round: RoundState | null;
  hp: number | null;
  bossHp: number | null;
  cards: number | null;
  weapon: CartoonWeapon | null;
  phase: number | null;
  parries: number | null;
  timeMs: number | null;
  /** the hero: feet position, current animation, texture scale of its sheet */
  hero: { x: number; y: number; onGround: boolean; anim: string | null; k: number } | null;
  /** what hit the hero this round (hazard textures, 'body') */
  hurtBy: string[];
  k: number;
  zoom: number;
  arenaCss: { x: number; y: number; w: number; h: number };
  autopilot: boolean;
}

export interface CartoonDebugApi {
  scene: Phaser.Scene;
  state(): CartoonDebugState;
  /** start this boss now (skips the map) */
  boss(id: CartoonBossId): Promise<void>;
  /** the hero takes no damage */
  god(on?: boolean): void;
  /** knockout the current boss now (AL TAPPETO! and the real results) */
  kill(): void;
  cards(n: number): void;
  weapon(w: CartoonWeapon): void;
  /** the last boss, knocked out at once: the GOLDEN TICKET finale and the golden results */
  golden(): Promise<void>;
  /** the QA bot plays */
  bot(on?: boolean): void;
  /** back to the boss map */
  map(): void;
}

type Win = { __game?: CartoonDebugApi };

export function installCartoonDebug(scene: Phaser.Scene, session: CartoonSession, view: CartoonView): void {
  if (!new URLSearchParams(window.location.search).has('debug')) return;
  const api: CartoonDebugApi = {
    scene,
    state: () => {
      const r = session.round;
      return {
        session: session.state,
        boss: r?.def.id ?? null,
        round: r?.state ?? null,
        hp: r?.player.hp ?? null,
        bossHp: r ? Math.max(0, Math.round(r.bossHp)) : null,
        cards: r ? Math.round(r.cards * 100) / 100 : null,
        weapon: r?.weapon ?? null,
        phase: r?.phase ?? null,
        parries: r?.parries ?? null,
        timeMs: r ? Math.round(r.timeMs) : null,
        hero: r ? { x: Math.round(r.player.x), y: Math.round(r.player.y), onGround: r.player.onGround, anim: r.player.sprite.anims.currentAnim?.key ?? null, k: heroScale() } : null,
        hurtBy: r ? [...r.hurtBy] : [],
        k: view.framing.k,
        zoom: view.framing.zoom,
        arenaCss: view.framing.css,
        autopilot: session.autopilot,
      };
    },
    boss: (id) => session.play(id),
    god: (on = true) => {
      if (session.round) session.round.god = on;
    },
    kill: () => session.round?.knockout(),
    cards: (n) => {
      if (session.round) session.round.cards = Math.max(0, Math.min(5, n));
    },
    weapon: (w) => {
      if (session.round) session.round.weapon = w;
    },
    golden: async () => {
      await session.play(LAST_BOSS);
      session.round?.knockout();
    },
    bot: (on = true) => {
      session.autopilot = on;
    },
    map: () => session.showMap(),
  };
  (window as unknown as Win).__game = api;
}

export function uninstallCartoonDebug(): void {
  delete (window as unknown as Win).__game;
}
