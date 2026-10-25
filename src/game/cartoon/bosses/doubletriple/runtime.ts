/**
 * DOUBLE TRIPLE live boss (BossRuntime): the big burger (legs, back arm, body, front arm) struts and
 * flashes its peace sign; phase 2 it splits into two minis (body, legs, small arm each). Runs the pure
 * scheduler, poses everything each frame (idle life, then the current move) and reports the boxes.
 */
import { ARENA, type BossRuntime, type BossWorld, type Box } from '../../api';
import { BODY, DT_FACE, SHOULDER } from './art';
import { MINI } from './bits';
import { LEG, LEGS, POSE } from './limbs';
import { FxPlayer } from '../oldschool/kit/fxplay';
import { Flash } from '../oldschool/kit/flash';
import { part, put, Temps, Timers } from '../oldschool/kit/rig';
import { Scheduler, type Move } from '../oldschool/kit/scheduler';
import { makeMove, miniShoulder } from './moves';
import { DECK1, DECK2, type DtAttack } from './pattern';
import { koMove, splitMove } from './story';
import { TEX } from './textures';
import { DT } from './tuning';
import type { DtCtx, DtPose, MiniPose } from './types';

const F = ARENA.floorY;

export function createDoubleTriple(world: BossWorld): BossRuntime {
  const { scene, k } = world;
  const d = DT.depth;
  const temps = new Temps();
  const timers = new Timers();
  const legs = part(scene, TEX.legs, k, d.legs, LEG.stand, 0.5, LEGS.hipY / LEGS.h);
  const armR = part(scene, TEX.arm, k, d.armR, POSE.peace);
  const body = part(scene, TEX.body, k, d.body, DT_FACE.cool, 0.5, BODY.footY / BODY.h);
  const armL = part(scene, TEX.arm, k, d.armL, POSE.hangL);
  const miniLegs = DT.minis.map(() => part(scene, TEX.legs, k, d.legs, LEG.stand, 0.5, LEGS.hipY / LEGS.h));
  const minis = DT.minis.map((_, i) => part(scene, TEX.mini, k, d.body, i * MINI.b, 0.5, MINI.footY / MINI.h));
  const miniArms = DT.minis.map(() => part(scene, TEX.arm, k, d.armL, POSE.hangL));
  const big = [legs, armR, body, armL];
  const small = [...miniLegs, ...minis, ...miniArms];
  const all = [...big, ...small];
  const flash = new Flash(() => all);
  const mini = (x: number): MiniPose => ({ x, y: F, sx: 1, sy: 1, face: DT_FACE.cool, arm: POSE.hangL, legs: LEG.stand });
  const pose: DtPose = {
    body: true,
    bx: DT.home.x,
    by: F,
    sx: 1,
    sy: 1,
    face: DT_FACE.cool,
    armL: POSE.hangL,
    armR: POSE.peace,
    legs: LEG.stand,
    minis: false,
    m: DT.minis.map((m) => mini(m.x)),
  };
  const c: DtCtx = {
    world,
    pose,
    fx: new FxPlayer(scene, k, TEX.fx, d.fx, temps, world.reducedMotion),
    flash,
    timers,
    temps,
    keys: { ...TEX, shock: TEX.fx.shock, shockAnim: TEX.fx.shockAnim },
    parts: { big, armL, minis, miniArms },
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
      p.face = DT_FACE.cool;
      p.armL = step % 6 < 3 ? POSE.hangL : POSE.hangR;
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
        mp.face = DT_FACE.cool;
        mp.legs = lift > 0.3 ? LEG.tuck : LEG.stand;
        mp.arm = i === 0 ? POSE.peace : POSE.hangL;
      });
    }
  }

  function draw(): void {
    const p = pose;
    const wob = Math.sin(T * 0.06) * 0.05 * wobble;
    for (const s of big) s.setVisible(p.body);
    for (const s of small) s.setVisible(p.minis);
    const hip = p.by - DT.legH;
    put(legs, k, p.bx, hip);
    legs.setFrame(p.legs);
    const bottom = hip + DT.hipOverlap;
    put(body, k, p.bx, bottom, p.sx + wob, p.sy - wob);
    body.setFrame(p.face);
    const sy = bottom + (SHOULDER.y - BODY.footY) * p.sy;
    put(armL, k, p.bx + (SHOULDER.lx - BODY.w / 2) * p.sx, sy);
    armL.setFrame(p.armL);
    put(armR, k, p.bx + (SHOULDER.rx - BODY.w / 2) * p.sx, sy);
    armR.setFrame(p.armR);
    p.m.forEach((mp, i) => {
      const ls = DT.mini.legScale;
      const mhip = mp.y - DT.legH * ls;
      put(miniLegs[i], k, mp.x, mhip, ls);
      miniLegs[i].setFrame(mp.legs);
      put(minis[i], k, mp.x, mhip + DT.hipOverlap * ls, mp.sx + wob, mp.sy - wob);
      minis[i].setFrame(i * MINI.b + mp.face);
      const sh = miniShoulder(mp);
      put(miniArms[i], k, sh.x, sh.y, DT.mini.armScale);
      miniArms[i].setFrame(mp.arm);
    });
  }

  function boxes(): Box[] {
    const p = pose;
    if (p.body) {
      const hip = p.by - DT.legH;
      const top = hip + DT.hipOverlap - 124 * p.sy;
      return [
        { x: p.bx - 54 * p.sx, y: top, w: 108 * p.sx, h: hip - top + 6 },
        { x: p.bx - 24, y: hip, w: 48, h: p.by - hip },
      ];
    }
    return p.m.map((mp) => {
      const top = mp.y - DT.legH * DT.mini.legScale - 74 * mp.sy;
      return { x: mp.x - 38 * mp.sx, y: top, w: 76 * mp.sx, h: mp.y - top };
    });
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
