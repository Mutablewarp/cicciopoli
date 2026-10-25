/**
 * QA auto-player (debug bot(on)): a careful stand-in player. Every frame it reads the hazards and the
 * boss body (velocities from their last positions, after a short reaction delay), lets the look-ahead
 * of logic/dodge.ts pick the safest plan, parries pink things in mid-air, aims at the boss, picks the
 * weapon that reaches it (PROVOLA in line, NUGGETS otherwise), spends EX cards now and then and the super.
 * It also reads the boss warnings a player watches (Tuma's sun-beam columns, Double Triple's whip stub)
 * as hazards still to come, so the fairness sweep covers those attacks too.
 */
import type Phaser from 'phaser';
import type { Box } from './api';
import { DT } from './bosses/doubletriple/tuning';
import { TEX as DT_TEX } from './bosses/doubletriple/textures';
import { TK, TUMA_CFG } from './bosses/tuma/config';
import { HERO_MUZZLE } from './hero';
import { centerOf } from './logic/rules';
import { choosePlan, preferredX, type SimBody, type SimHazard } from './logic/dodge';
import type { Round, RoundControls } from './round';
import type { Hazard } from './world';
import type { CartoonWeapon } from '../../contracts';
import { CT_BOT, CT_CARDS, CT_FLOW, CT_PLAYER } from '../../config/cartoon';

function union(boxes: readonly Box[]): Box | null {
  if (boxes.length === 0) return null;
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
}

/** A boss warning sprite: when (from its first sight) and where its hazard comes. */
interface Telegraph {
  key: string;
  /** only this sheet frame is the warning (the live hazard reuses the sheet) */
  frame?: number;
  /** ms from the first sight to the hazard, and from a move of the warning to the next one */
  leadMs: number;
  nextMs: number;
  liveMs: number;
  box(s: Phaser.GameObjects.Sprite): Box;
}

const BEAMS = TUMA_CFG.attacks.flat().filter((a) => a.kind === 'beam');
const W = DT.whip;
const TELEGRAPHS: readonly Telegraph[] = [
  {
    key: TK.beam,
    frame: 0,
    leadMs: Math.min(...BEAMS.map((a) => a.telegraphMs)),
    nextMs: 0,
    liveMs: Math.max(...BEAMS.map((a) => a.activeMs)),
    box: (s) => ({ x: s.x - TUMA_CFG.beam.w / 2, y: s.y - s.displayHeight / 2, w: TUMA_CFG.beam.w, h: s.displayHeight }),
  },
  {
    key: DT_TEX.stub,
    leadMs: W.teleMs,
    nextMs: W.gapMs,
    liveMs: W.liveMs,
    box: (s) => ({ x: s.x + CT_BOT.whipStubDx - W.len, y: s.y - W.h / 2, w: W.len, h: W.h }),
  },
];

export class Bot {
  private seen = new WeakMap<Hazard, { x: number; y: number }>();
  /** warning sprites: where and when first seen, how many times they moved (the next whip) */
  private warned = new WeakMap<Phaser.GameObjects.Sprite, { y: number; at: number; moves: number }>();
  private bodies: Box[] = [];
  private weaponMs = 0;
  private want: CartoonWeapon = 'provola';
  /** it never stands still: attacks aimed at where it stood then miss (a human watches the telegraphs) */
  private wanderMs = 0;
  private wander: 1 | -1 = 1;

  controls(r: Round, dtMs: number): RoundControls {
    const p = r.player;
    const dt = Math.max(1, Math.min(dtMs, CT_FLOW.maxStepMs)) / 1000;
    const hazards = [...this.read(r.world.hazards, dt), ...this.telegraphs(r)];
    const bodyNow = r.boss.bodyBoxes();
    const bodies: SimBody[] = bodyNow.map((box, i) => {
      const prev = this.bodies.length === bodyNow.length ? this.bodies[i] : null;
      return { box, vx: prev ? (box.x - prev.x) / dt : 0, vy: prev ? (box.y - prev.y) / dt : 0 };
    });
    this.bodies = bodyNow.map((b) => ({ ...b }));
    const hurt = r.boss.hurtBoxes();
    const boss = union(bodyNow.length > 0 ? bodyNow : hurt);
    const target = hurt[0] ? centerOf(hurt[0]) : boss ? centerOf(boss) : { x: p.x + 100, y: p.y };
    const side: 1 | -1 = target.x >= p.x ? 1 : -1;
    this.wanderMs -= dtMs;
    if (this.wanderMs <= 0) {
      this.wanderMs = CT_BOT.wanderMs;
      this.wander = this.wander === 1 ? -1 : 1;
    }
    const best = choosePlan(
      { x: p.x, y: p.y, vx: p.vx, vy: p.vy, onGround: p.onGround, facing: p.facing, canDash: p.canDash, safeMs: p.safeMs },
      hazards,
      bodies,
      preferredX(p.x, boss) + this.wander * CT_BOT.wander,
      side,
    );
    const plan = best.plan;
    const jump = (plan.jumpAt === 0 && p.onGround) || (!p.onGround && this.parryNow(r, hazards));
    // the forward line: does a straight shot meet a hurt box?
    const muzzleY = p.y + HERO_MUZZLE.forward.y;
    const inLine = hurt.some((b) => b.y <= muzzleY && muzzleY <= b.y + b.h);
    const facing = plan.axisX === 0 ? p.facing : plan.axisX;
    const aimUp = !inLine && target.y < muzzleY;
    this.weaponMs -= dtMs;
    if (this.weaponMs <= 0) {
      this.weaponMs = CT_BOT.weaponEveryMs;
      this.want = inLine && facing === side ? 'provola' : 'nuggets';
    }
    const ex = r.cards >= CT_CARDS.ex && inLine && facing === side && Math.random() < CT_BOT.exChance;
    return {
      axisX: plan.axisX,
      aimUp,
      jumpHeld: jump || (p.onGround ? plan.jumpAt === 0 : plan.hold),
      jump,
      dash: plan.dash,
      fire: true,
      swap: r.weapon !== this.want,
      super: r.cards >= CT_CARDS.super || ex,
    };
  }

  /** Hazards with velocities measured from their last position (new ones are not seen yet). */
  private read(list: readonly Hazard[], dt: number): SimHazard[] {
    const out: SimHazard[] = [];
    for (const h of list) {
      if (!h.alive) continue;
      const prev = this.seen.get(h);
      this.seen.set(h, { x: h.x, y: h.y });
      if (h.age < CT_BOT.reactMs) continue;
      const s = h.spec;
      out.push({
        x: h.x,
        y: h.y,
        vx: prev ? (h.x - prev.x) / dt : h.vx,
        vy: prev ? (h.y - prev.y) / dt : h.vy,
        ax: s.ax ?? 0,
        ay: s.ay ?? 0,
        r: h.r,
        w: h.w,
        h: h.h,
        pink: h.pink,
      });
    }
    return out;
  }

  /** The boss warnings on screen as hazards still to come, each live only in its expected window. */
  private telegraphs(r: Round): SimHazard[] {
    const now = r.world.timeMs;
    const slack = CT_BOT.telegraphSlackMs;
    const out: SimHazard[] = [];
    for (const o of r.world.scene.children.list) {
      if (o.type !== 'Sprite') continue;
      const s = o as Phaser.GameObjects.Sprite;
      const t = s.visible ? TELEGRAPHS.find((d) => d.key === s.texture.key && (d.frame === undefined || String(d.frame) === String(s.frame.name))) : undefined;
      // a warning still at its spawn point (placed on its first update) would count as a move later
      if (!t || (s.x === 0 && s.y === 0)) continue;
      let w = this.warned.get(s);
      if (!w || Math.abs(w.y - s.y) > 1) w = { y: s.y, at: now, moves: w ? w.moves + 1 : 0 };
      this.warned.set(s, w);
      const due = (w.moves === 0 ? t.leadMs : t.nextMs) - (now - w.at);
      const b = t.box(s);
      out.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, vx: 0, vy: 0, ax: 0, ay: 0, w: b.w, h: b.h, pink: false, fromMs: due - slack, toMs: due + t.liveMs + slack });
    }
    return out;
  }

  /** A pink thing reaches the parry box within the next few frames. */
  private parryNow(r: Round, hazards: readonly SimHazard[]): boolean {
    const b = r.player.box;
    const pad = CT_PLAYER.parryPad;
    const lead = CT_PLAYER.parryWindowMs / 2000;
    return hazards.some((h) => {
      if (!h.pink) return false;
      const x = h.x + h.vx * lead;
      const y = h.y + h.vy * lead;
      const half = h.w !== undefined ? h.w / 2 : (h.r ?? 6);
      const halfH = h.h !== undefined ? h.h / 2 : (h.r ?? 6);
      return x + half > b.x - pad && x - half < b.x + b.w + pad && y + halfH > b.y - pad && y - halfH < b.y + b.h + pad;
    });
  }
}
