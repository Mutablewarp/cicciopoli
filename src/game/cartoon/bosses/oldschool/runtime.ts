/**
 * THE OLD SCHOOL live boss (BossRuntime): builds the shirt's parts (the giant hand's back and front layers,
 * the burger, its little waving arm) and the two sauce bottles, runs the pure scheduler, poses everything each
 * frame (idle life first, then the current move) and reports hurt / body boxes in world units.
 */
import { ARENA, type BossRuntime, type BossWorld, type Box } from '../../api';
import { COUNTER } from './arena';
import { FxPlayer } from './kit/fxplay';
import { Flash } from './kit/flash';
import { part, put, Temps, Timers } from './kit/rig';
import { Scheduler, type Move } from './kit/scheduler';
import { ARM_POSE, BURGER_ORIGIN, HAND_POSE, originAt, PALM, SHOULDER, TIPS_FROM_PALM, turn } from './look';
import { fistHome, makeMove } from './moves';
import { DECK1, DECK2, type OsAttack } from './pattern';
import { koMove, transformMove } from './story';
import { TEX } from './textures';
import { OS } from './tuning';
import type { OsCtx, OsPose } from './types';

const F = ARENA.floorY;
const B = OS.box;

/** where the free hand's palm and finger tips are (world), and its whole turn (deg) */
export function freeHand(p: OsPose): { tips: { x: number; y: number }; angle: number } {
  const angle = OS.freeHand.angle[p.fistFrame] + p.fistAngle;
  const v = turn(TIPS_FROM_PALM, p.fistFlip ? -angle : angle, p.fistFlip);
  return { tips: { x: p.fx + v.x * OS.freeHand.scale, y: p.fy + v.y * OS.freeHand.scale }, angle };
}

export function createOldSchool(world: BossWorld): BossRuntime {
  const { scene, k } = world;
  const d = OS.depth;
  const temps = new Temps();
  const timers = new Timers();
  const palmSrc = OS.art.palm;
  const handBack = part(scene, TEX.handBack, k, d.handBack, 0, ...originAt('handBack', palmSrc));
  const handFront = part(scene, TEX.handFront, k, d.handFront, 0, ...originAt('handFront', palmSrc));
  const burger = part(scene, TEX.burger, k, d.burger, 0, ...BURGER_ORIGIN);
  const arm = part(scene, TEX.arm, k, d.arm, 0, ...originAt('arm', OS.art.shoulder));
  const bottles = OS.bottles.map((b) => part(scene, TEX.bottle, k, d.bottles, b.frame, 0.5, 55 / 56));
  const hand = [handBack, handFront];
  const all = [...hand, burger, arm, ...bottles];
  const flash = new Flash(() => all, () => [...hand, burger, arm]);
  const pose: OsPose = {
    handDy: 0,
    handAngle: 0,
    hand: 'grip',
    held: true,
    bx: OS.grip.x,
    by: OS.grip.y,
    bsx: 1,
    bsy: 1,
    bAngle: 0,
    arm: ARM_POSE.waveA,
    fist: false,
    fistSafe: false,
    fx: OS.fistHome.x,
    fy: OS.fistHome.y,
    fistFrame: HAND_POSE.rest,
    fistFlip: false,
    fistAngle: 0,
    bottle: OS.bottles.map(() => 0),
    bottleFrame: OS.bottles.map((b) => b.frame),
  };
  const c: OsCtx = {
    world,
    pose,
    fx: new FxPlayer(scene, k, TEX.fx, d.fx, temps, world.reducedMotion),
    flash,
    timers,
    keys: { bacon: TEX.bacon, sauce: TEX.sauce, shock: TEX.fx.shock, shockAnim: TEX.fx.shockAnim },
    parts: { burger, arm, hand, bottles },
    phase: 0,
    volleys: 0,
  };
  const sched = new Scheduler<OsAttack>(DECK1, () => world.rng(), OS.firstRestMs);
  let T = 0;
  let wobble = 0;
  let ko = false;
  let move: Move | null = null;
  let story: Move | null = null;
  const clock = (): number => T;
  const wave = (): number => (Math.floor(T / OS.idle.waveMs) % 2 ? ARM_POSE.waveA : ARM_POSE.waveB);

  function idle(): void {
    const p = pose;
    const b = Math.sin(T / OS.idle.breatheMs) * 0.03;
    p.arm = wave();
    p.bAngle = 0;
    if (c.phase === 0) {
      p.hand = 'grip';
      p.held = true;
      p.handDy = Math.sin(T / OS.idle.bobMs) * 3;
      p.handAngle = Math.sin(T / OS.idle.swayMs) * 2;
      p.bsx = 1 + b;
      p.bsy = 1 - b;
    } else {
      const ph = (T % OS.idle.hopEveryMs) / OS.idle.hopEveryMs;
      const lift = Math.sin(ph * Math.PI);
      const contact = ph < 0.08 || ph > 0.92;
      p.hand = 'gone';
      p.held = false;
      p.bx = OS.floorSpot.x;
      p.by = F - 10 * lift;
      p.bsx = contact ? 1.1 : 1 - 0.04 * lift;
      p.bsy = contact ? 0.9 : 1 + 0.06 * lift;
      const h = fistHome(T);
      p.fist = true;
      p.fistSafe = false;
      p.fx = h.x;
      p.fy = h.y;
      p.fistFrame = HAND_POSE.rest;
      p.fistFlip = false;
      p.fistAngle = Math.sin(T / 500) * 6;
    }
    p.bottle = OS.bottles.map((_, i) => Math.sin(T / 300 + i * 1.6) * 0.03);
    p.bottleFrame = OS.bottles.map((bt) => bt.frame);
  }

  function draw(): void {
    const p = pose;
    const hy = OS.grip.y + p.handDy;
    const free = p.hand === 'gone';
    for (const s of hand) s.setVisible(!free || p.fist);
    if (free) {
      const { angle } = freeHand(p);
      const sc = OS.freeHand.scale;
      for (const s of hand) put(s, k, p.fx, p.fy, p.fistFlip ? -sc : sc, sc, p.fistFlip ? -angle : angle);
      handBack.setDepth(d.free);
      handFront.setDepth(d.free + 0.1);
    } else {
      for (const s of hand) put(s, k, OS.grip.x + PALM.x, hy + PALM.y, 1, 1, p.handAngle);
      handBack.setDepth(d.handBack);
      handFront.setDepth(d.handFront);
    }
    if (p.held) {
      p.bx = OS.grip.x;
      p.by = hy;
    }
    const wob = Math.sin(T * 0.06) * 0.05 * wobble;
    put(burger, k, p.bx, p.by, p.bsx + wob, p.bsy - wob, p.bAngle);
    const sh = turn({ x: SHOULDER.x * p.bsx, y: SHOULDER.y * p.bsy }, p.bAngle);
    put(arm, k, p.bx + sh.x, p.by + sh.y, 1, 1, OS.armAngle[p.arm] + p.bAngle);
    bottles.forEach((s, i) => {
      const q = p.bottle[i];
      put(s, k, OS.bottles[i].x, COUNTER.top + 1, q >= 0 ? 1 + q * 0.5 : 1 - q * 0.6, q >= 0 ? 1 - q : 1 - q * 0.6);
      s.setFrame(p.bottleFrame[i]);
    });
  }

  function boxes(): Box[] {
    const p = pose;
    const out: Box[] = [{ x: p.bx - B.burgerHalfW * p.bsx, y: p.by - B.burgerTop * p.bsy, w: 2 * B.burgerHalfW * p.bsx, h: (B.burgerTop - 4) * p.bsy }];
    if (p.hand !== 'gone') {
      const px = OS.grip.x + PALM.x;
      const top = OS.grip.y + p.handDy + PALM.y - B.handTop;
      out.push({ x: px - B.handLeft, y: top, w: B.handLeft + B.handRight, h: F - top });
    } else if (p.fist && !p.fistSafe) {
      const { tips } = freeHand(p);
      const pad = B.freePad;
      const x0 = Math.min(p.fx, tips.x) - pad;
      const x1 = Math.max(p.fx, tips.x) + pad;
      if (p.fistFrame === HAND_POSE.flat) out.push({ x: x0, y: F - OS.sweep.h, w: x1 - x0, h: OS.sweep.h });
      else out.push({ x: x0, y: Math.min(p.fy, tips.y) - pad, w: x1 - x0, h: Math.abs(p.fy - tips.y) + 2 * pad });
    }
    return out;
  }

  // the round does not update the boss during the title card: pose it once now
  idle();
  draw();

  return {
    hurtBoxes: () => (ko ? [] : boxes()),
    bodyBoxes: () => (ko ? [] : boxes()),
    update(dtMs: number): void {
      T += dtMs;
      wobble = Math.max(0, wobble - dtMs / 260);
      timers.update(dtMs);
      temps.update(dtMs);
      if (!ko) {
        for (const e of sched.update(dtMs)) {
          if (e.kind === 'tele') move = makeMove(e.id, c, clock);
          else if (e.kind === 'fire') move?.fire(e.n);
          else move = null;
        }
      }
      idle();
      if (move) {
        move.t += dtMs;
        move.update(dtMs);
      }
      if (story) {
        story.t += dtMs;
        story.update(dtMs);
        if (!ko && story.t >= OS.transformMs) story = null;
      }
      draw();
      flash.update(dtMs);
    },
    onPhase(phase: number): void {
      if (phase < 1 || ko || c.phase >= 1) return;
      c.phase = 1;
      move = null;
      timers.clear();
      sched.setDeck(DECK2, OS.transformMs);
      story = transformMove(c, clock);
    },
    onHit(): void {
      flash.hit();
      wobble = 1;
    },
    onKnockout(): void {
      if (ko) return;
      ko = true;
      sched.stop();
      move = null;
      timers.clear();
      story = koMove(c);
    },
    get done(): boolean {
      return ko && story !== null && story.t >= OS.koMs;
    },
    destroy(): void {
      temps.clear();
      timers.clear();
      for (const s of all) s.destroy();
    },
  };
}
