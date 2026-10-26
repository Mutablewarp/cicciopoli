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
import type { Box } from './api';

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
  /** the camera now: the world rect in view and CSS px per world unit */
  cam: { x: number; y: number; w: number; h: number; cssPerUnit: number };
  /** the boss hurt + body boxes in one (world units), null outside a round */
  bossBox: Box | null;
  /** the boss body's smoothed speed (units / s, boss time: CT_PLAYER.bump), null outside a round */
  bossSpeed: number | null;
  autopilot: boolean;
  /** the SPARA AUTO setting */
  autoFire: boolean;
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
  /** the last boss, knocked out as soon as its fight starts: the GOLDEN TICKET finale and the golden results */
  golden(): Promise<void>;
  /** the QA bot plays */
  bot(on?: boolean): void;
  /** back to the boss map */
  map(): void;
}

type Win = { __game?: CartoonDebugApi };

function camOf(scene: Phaser.Scene): CartoonDebugState['cam'] {
  const c = scene.cameras.main;
  const v = c.worldView;
  return { x: Math.round(v.x), y: Math.round(v.y), w: Math.round(v.width), h: Math.round(v.height), cssPerUnit: c.zoom * scene.scale.zoom };
}

function unionOf(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

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
        cam: camOf(scene),
        bossBox: r ? unionOf([...r.boss.hurtBoxes(), ...r.boss.bodyBoxes()]) : null,
        bossSpeed: r ? Math.round(r.bossSpeed) : null,
        autopilot: session.autopilot,
        autoFire: session.progress.data.settings.autoFire,
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
      // knocked out once the fight runs, as in play: the controls came up, so the finale gets the whole screen
      await new Promise<void>((resolve) => {
        const check = (): void => {
          if (session.round?.state === 'intro') return;
          scene.events.off('postupdate', check);
          resolve();
        };
        scene.events.on('postupdate', check);
      });
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
