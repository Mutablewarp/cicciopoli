/**
 * DOUBLE TRIPLE live boss (BossRuntime): the shirt's walking double burger (legs, peace arm, glove arm, body)
 * struts and flashes its peace sign; phase 2 it splits into two minis (the same rig, smaller). Runs the pure
 * scheduler, poses everything each frame (idle life, then the current move) and reports the boxes.
 */
import { ARENA, type BossRuntime, type BossWorld, type Box } from '../../api';
import { FxPlayer } from '../oldschool/kit/fxplay';
import { Flash } from '../oldschool/kit/flash';
import { Temps, Timers } from '../oldschool/kit/rig';
import { Scheduler, type Move } from '../oldschool/kit/scheduler';
import { LEG, POSE } from './look';
import { makeMove } from './moves';
import { DECK1, DECK2, type DtAttack } from './pattern';
import { bigRig, makeRig, miniRig, placeRig, rigBoxes } from './rig';
import { koMove, splitMove } from './story';
import { TEX } from './textures';
import { DT } from './tuning';
import type { DtCtx, DtPose, MiniPose } from './types';

const F = ARENA.floorY;

export function createDoubleTriple(world: BossWorld): BossRuntime {
  const { scene, k } = world;
  const temps = new Temps();
  const timers = new Timers();
  const big = makeRig(scene, k, true);
  const minis = DT.minis.map(() => makeRig(scene, k, false));
  const small = minis.flatMap((m) => m.all);
  const all = [...big.all, ...small];
  const flash = new Flash(() => all);
  const mini = (x: number): MiniPose => ({ x, y: F, sx: 1, sy: 1, arm: POSE.hangL, legs: LEG.stand });
  const pose: DtPose = {
    body: true,
    bx: DT.home.x,
    by: F,
    sx: 1,
    sy: 1,
    armL: POSE.hangL,
    armR: POSE.peace,
    legs: LEG.stand,
    minis: false,
    m: DT.minis.map((m) => mini(m.x)),
  };
  const c: DtCtx = {
    world,
    pose,
    fx: new FxPlayer(scene, k, TEX.fx, DT.depth.fx, temps, world.reducedMotion),
    flash,
    timers,
    temps,
    keys: { ...TEX, shock: TEX.fx.shock, shockAnim: TEX.fx.shockAnim },
    parts: { big: big.all, armL: big.armL, minis: minis.map((m) => m.body), miniArms: minis.map((m) => m.armL) },
    phase: 0,
  };
  const sched = new Scheduler<DtAttack>(DECK1, () => world.rng(), DT.firstRestMs);
  let T = 0;
  let wobble = 0;
  let ko = false;
  let move: Move | null = null;
  let story: Move | null = null;

  function idle(): void {
    const p = pose;
    const step = Math.floor((T * DT.strut.stepFps) / 1000);
    if (c.phase === 0) {
      p.body = true;
      p.minis = false;
      p.bx = DT.home.x + Math.sin((T / DT.strut.ms) * Math.PI * 2) * DT.strut.amp;
      p.by = F - Math.abs(Math.sin((T * DT.strut.stepFps * Math.PI) / 3000)) * 2;
      p.legs = step % LEG.walkN;
      p.armL = step % 6 < 3 ? POSE.hangL : POSE.swingL;
      p.armR = POSE.peace;
      const b = Math.sin(T / 240) * 0.025;
      p.sx = 1 + b;
      p.sy = 1 - b;
    } else {
      p.body = false;
      p.minis = true;
      p.m.forEach((mp, i) => {
        const ph = ((T + i * 410) % DT.mini.bounceMs) / DT.mini.bounceMs;
        const lift = Math.sin(ph * Math.PI);
        const contact = ph < 0.08 || ph > 0.92;
        mp.x = DT.minis[i].x;
        mp.y = F - 8 * lift;
        mp.sx = contact ? 1.1 : 1 - 0.04 * lift;
        mp.sy = contact ? 0.9 : 1 + 0.06 * lift;
        mp.legs = lift > 0.3 ? LEG.tuck : LEG.stand;
        mp.arm = i === 0 ? POSE.upL : POSE.hangL;
      });
    }
  }

  function draw(): void {
    const p = pose;
    const wob = Math.sin(T * 0.06) * 0.05 * wobble;
    for (const s of big.all) s.setVisible(p.body);
    for (const s of small) s.setVisible(p.minis);
    placeRig(big, bigRig(p), 1, k, wob);
    p.m.forEach((mp, i) => placeRig(minis[i], miniRig(mp), DT.mini.scale, k, wob));
  }

  function boxes(): Box[] {
    const p = pose;
    if (p.body) return rigBoxes(bigRig(p), 1);
    return p.m.flatMap((mp) => rigBoxes(miniRig(mp), DT.mini.scale));
  }

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
          if (e.kind === 'tele') move = makeMove(e.id, c);
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
        if (!ko && story.t >= DT.transformMs) story = null;
      }
      draw();
      flash.update(dtMs);
    },
    onPhase(phase: number): void {
      if (phase < 1 || ko || c.phase >= 1) return;
      move = null;
      timers.clear();
      temps.clear(); // the dropped move's warnings must not outlive it
      sched.setDeck(DECK2, DT.transformMs);
      story = splitMove(c);
      c.phase = 1;
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
      temps.clear();
      story = koMove(c);
    },
    get done(): boolean {
      return ko && story !== null && story.t >= DT.koMs;
    },
    destroy(): void {
      temps.clear();
      timers.clear();
      for (const s of all) s.destroy();
    },
  };
}
