/**
 * THE OLD SCHOOL live boss (BossRuntime): builds the part sprites (hand back / front, burger, little arm,
 * floating fist, the two sauce bottles), runs the pure scheduler, poses everything each frame (idle life
 * first, then the current move) and reports hurt / body boxes in world units.
 */
import { ARENA, type BossRuntime, type BossWorld, type Box } from '../../api';
import { ARM, ARM_POSE, BURGER, FACE } from './art';
import { COUNTER } from './arena';
import { FIST_POSE, GRIP, HAND } from './hand';
import { FxPlayer } from './kit/fxplay';
import { Flash } from './kit/flash';
import { part, put, Temps, Timers } from './kit/rig';
import { Scheduler, type Move } from './kit/scheduler';
import { fistHome, makeMove } from './moves';
import { DECK1, DECK2, type OsAttack } from './pattern';
import { koMove, transformMove } from './story';
import { TEX } from './textures';
import { OS } from './tuning';
import type { OsCtx, OsPose } from './types';

const F = ARENA.floorY;

export function createOldSchool(world: BossWorld): BossRuntime {
  const { scene, k } = world;
  const d = OS.depth;
  const temps = new Temps();
  const timers = new Timers();
  const handBack = part(scene, TEX.handBack, k, d.handBack, 0, GRIP.x / HAND.w, GRIP.y / HAND.h);
  const handFront = part(scene, TEX.handFront, k, d.handFront, 0, GRIP.x / HAND.w, GRIP.y / HAND.h);
  const burger = part(scene, TEX.burger, k, d.burger, FACE.smile, 0.5, BURGER.footY / BURGER.h);
  const arm = part(scene, TEX.arm, k, d.arm, 0, ARM.sx / ARM.w, ARM.sy / ARM.h);
  const fist = part(scene, TEX.fist, k, d.fist, 0).setVisible(false);
  const bottles = OS.bottles.map((b) => part(scene, TEX.bottle, k, d.bottles, b.frame, 0.5, 55 / 56));
  const all = [handBack, handFront, burger, arm, fist, ...bottles];
  const flash = new Flash(() => all, () => [handBack, handFront, burger, arm, fist]);
  const pose: OsPose = {
    handDy: 0,
    handAngle: 0,
    hand: 'grip',
    held: true,
    bx: OS.grip.x,
    by: OS.grip.y,
    bsx: 1,
    bsy: 1,
    face: FACE.smile,
    arm: ARM_POSE.waveA,
    fist: false,
    fistSafe: false,
    fx: OS.fistHome.x,
    fy: OS.fistHome.y,
    fistFrame: FIST_POSE.left,
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
    parts: { burger, arm, hand: [handBack, handFront], fist, bottles },
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

  function idle(): void {
    const p = pose;
    const b = Math.sin(T / OS.idle.breatheMs) * 0.03;
    if (c.phase === 0) {
      p.hand = 'grip';
      p.held = true;
      p.handDy = Math.sin(T / OS.idle.bobMs) * 3;
      p.handAngle = Math.sin(T / OS.idle.swayMs) * 2;
      p.face = FACE.smile;
      p.arm = Math.floor(T / OS.idle.waveMs) % 2 ? ARM_POSE.waveA : ARM_POSE.waveB;
      p.bsx = 1 + b;
      p.bsy = 1 - b;
    } else {
      const ph = (T % OS.idle.hopEveryMs) / OS.idle.hopEveryMs;
      const lift = Math.sin(ph * Math.PI);
      const contact = ph < 0.08 || ph > 0.92;
      p.hand = 'gone';
      p.held = false;
      p.face = FACE.angry;
      p.arm = Math.floor(T / OS.idle.waveMs) % 2 ? ARM_POSE.waveA : ARM_POSE.waveB;
      p.bx = OS.floorSpot.x;
      p.by = F - 10 * lift;
      p.bsx = contact ? 1.1 : 1 - 0.04 * lift;
      p.bsy = contact ? 0.9 : 1 + 0.06 * lift;
      const h = fistHome(T);
      p.fist = true;
      p.fistSafe = false;
      p.fx = h.x;
      p.fy = h.y;
      p.fistFrame = FIST_POSE.left;
      p.fistFlip = false;
      p.fistAngle = Math.sin(T / 500) * 6;
    }
    p.bottle = OS.bottles.map((_, i) => Math.sin(T / 300 + i * 1.6) * 0.03);
    p.bottleFrame = OS.bottles.map((bt) => bt.frame);
  }

  function draw(): void {
    const p = pose;
    const hy = OS.grip.y + p.handDy;
    handBack.setVisible(p.hand !== 'gone');
    handFront.setVisible(p.hand === 'grip' && p.held);
    put(handBack, k, OS.grip.x, hy, 1, 1, p.handAngle);
    put(handFront, k, OS.grip.x, hy, 1, 1, p.handAngle);
    if (p.held) {
      p.bx = OS.grip.x;
      p.by = hy;
    }
    const wob = Math.sin(T * 0.06) * 0.05 * wobble;
    put(burger, k, p.bx, p.by, p.bsx + wob, p.bsy - wob);
    burger.setFrame(p.face);
    put(arm, k, p.bx - 46 * p.bsx, p.by - 57 * p.bsy);
    arm.setFrame(p.arm);
    fist.setVisible(p.fist);
    put(fist, k, p.fx, p.fy, 1, 1, p.fistAngle);
    fist.setFrame(p.fistFrame).setFlipX(p.fistFlip);
    bottles.forEach((s, i) => {
      const q = p.bottle[i];
      put(s, k, OS.bottles[i].x, COUNTER.top + 1, q >= 0 ? 1 + q * 0.5 : 1 - q * 0.6, q >= 0 ? 1 - q : 1 - q * 0.6);
      s.setFrame(p.bottleFrame[i]);
    });
  }

  function boxes(): Box[] {
    const p = pose;
    const out: Box[] = [{ x: p.bx - 50 * p.bsx, y: p.by - 88 * p.bsy, w: 100 * p.bsx, h: 86 * p.bsy }];
    if (p.hand !== 'gone') {
      const top = OS.grip.y + p.handDy - 36;
      out.push({ x: OS.grip.x + 6, y: top, w: ARENA.w - OS.grip.x - 6, h: F - top });
    }
    if (p.fist && !p.fistSafe) {
      if (p.fistFrame === FIST_POSE.flat) out.push({ x: p.fx - (p.fistFlip ? 38 : 58), y: F - OS.sweep.h - 2, w: OS.sweep.w, h: OS.sweep.h });
      else out.push({ x: p.fx - OS.fist.r, y: p.fy - OS.fist.r, w: OS.fist.r * 2, h: OS.fist.r * 2 + 4 });
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
