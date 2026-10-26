/**
 * DOUBLE TRIPLE attacks over time: on the scheduler's 'tele' each move strikes its wind-up (pose, warm
 * flash, whoosh, glint / held patty / whip pull-back, stub and dashed lane / landing shadows), on 'fire' it plays the volley.
 * Phase 1 the big burger acts; phase 2 mini A (index 0, shades) and mini B (index 1) share the work.
 */
import type Phaser from 'phaser';
import { ARENA, type Vec } from '../../api';
import { CWAVE } from './bits';
import { LEG, POSE } from './look';
import { bigRig, handL as rigHand, miniRig, rigTop } from './rig';
import { arc, ballistic, ease } from '../oldschool/kit/geometry';
import { SHOCK } from '../oldschool/kit/fxart';
import { part } from '../oldschool/kit/rig';
import type { Move } from '../oldschool/kit/scheduler';
import { bands, frisbeeThrow, frisbeeY, hopCount, hopTarget, salsaVolley, stompStops, whipBox, type DtAttack } from './pattern';
import { DT } from './tuning';
import type { DtCtx, DtPose, MiniPose } from './types';
const F = ARENA.floorY;

export function shake(c: DtCtx, i: number, ms: number): void {
  if (!c.world.reducedMotion) c.world.shake(i, ms);
}

/** world position of the big burger's glove (the left hand, toward the player) in a pose */
function handL(p: DtPose, pose: number): Vec {
  return rigHand(bigRig(p), 1, pose);
}

function miniHand(m: MiniPose, pose: number): Vec {
  return rigHand(miniRig(m), DT.mini.scale, pose);
}

function wave(c: DtCtx, x: number, dir: -1 | 1, pink: boolean, speed: number): void {
  const w = DT.cheddar;
  const h = c.world.spawnHazard({ x, y: F - CWAVE.h / 2 + 2, vx: dir * speed, w: w.w, h: w.h, texture: c.keys.wave, frame: pink ? 3 : 0, anim: pink ? c.keys.wavePinkAnim : c.keys.waveAnim, pink, lifeMs: 4000 });
  h.sprite.setFlipX(dir > 0);
}

function shockwave(c: DtCtx, x: number, dir: -1 | 1): void {
  const h = c.world.spawnHazard({ x, y: F - SHOCK.h / 2, vx: dir * DT.stomp.waveSpeed, w: 38, h: 26, texture: c.keys.shock, anim: c.keys.shockAnim, lifeMs: 3600 });
  h.sprite.setFlipX(dir > 0);
}

function frisbee(c: DtCtx): Move {
  const f = DT.frisbee;
  const mini = c.phase > 0;
  const order = bands(() => c.world.rng());
  const tele = mini ? f.teleMs - 50 : f.teleMs;
  const handAt = (pose: number): Vec => (mini ? miniHand(c.pose.m[1], pose) : handL(c.pose, pose));
  let at = -1;
  let fired = -1;
  const windUp = mini ? POSE.upL : POSE.across;
  const held = part(c.world.scene, c.keys.frisbee, c.world.k, DT.depth.armL + 0.5);
  c.temps.add(held, tele + f.gapMs, (s) => {
    const h = handAt(windUp);
    s.setPosition(h.x, h.y - 4).setVisible(fired < 1);
  });
  c.world.sfx('dash');
  c.flash.tele(tele, mini ? [c.parts.minis[1], c.parts.miniArms[1]] : [...c.parts.big]);
  const g0 = handAt(windUp);
  c.fx.glint(g0.x, g0.y - 10);
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
      const from = handAt(POSE.throw);
      const th = frisbeeThrow(from.x);
      const laneY = frisbeeY(order[n]);
      c.world.spawnHazard({
        x: from.x, y: from.y, vx: th.vx, ax: th.ax, w: f.w, h: f.h, texture: c.keys.frisbee, anim: c.keys.frisbeeAnim, lifeMs: th.lifeMs,
        update: (hz, dt) => {
          hz.y += (laneY - hz.y) * (1 - Math.exp(-dt / f.glideMs));
        },
      });
      c.world.sfx('lob');
      if (n === 1) held.setVisible(false);
    },
    update() {
      const pose = fired >= 0 && m.t - at < 200 ? POSE.throw : fired >= 1 ? POSE.hangL : windUp;
      if (mini) {
        c.pose.m[1].arm = pose;
      } else {
        c.pose.armL = pose;
      }
    },
  };
  return m;
}

function cheddar(c: DtCtx): Move {
  const ch = DT.cheddar;
  const mini = c.phase > 0;
  const tele = mini ? ch.teleMs - 100 : ch.teleMs;
  let at = -1;
  let fired = -1;
  c.world.sfx('dash');
  c.flash.tele(tele, mini ? [...c.parts.minis] : [...c.parts.big]);
  c.fx.glint(mini ? DT.minis[1].x : c.pose.bx, F - (mini ? 90 : 175));
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
      const who = n % 2 === 0 ? 1 : 0;
      const x = mini ? c.pose.m[who].x - 45 : c.pose.bx + ch.fromDx;
      wave(c, x, -1, n === ch.n - 1, ch.speed);
      c.fx.dust(x + 10, F);
      shake(c, 3, 160);
      c.world.sfx('blast');
    },
    update() {
      const slam = fired >= 0 && m.t - at < 260;
      const u = fired < 0 ? ease(m.t / tele) : slam ? 1 - (m.t - at) / 260 : 0;
      if (mini) {
        c.pose.m.forEach((mp, i) => {
          const hit = slam && (fired % 2 === 0 ? 1 : 0) === i;
          mp.sx = hit ? 1.18 : 1 + 0.06 * u;
          mp.sy = hit ? 0.8 : 1 - 0.08 * u;
        });
        return;
      }
      const p = c.pose;
      p.armL = slam ? POSE.downL : POSE.upL;
      p.armR = slam ? POSE.downR : POSE.upR;
      p.legs = LEG.crouch;
      p.sx = slam ? 1.12 : 1 + 0.04 * u;
      p.sy = slam ? 0.86 : 1 - 0.06 * u;
    },
  };
  return m;
}

/** The dashed lane the next whip will cover, stretching out of the hand until it cracks (lifeMs later). */
function whipLane(c: DtCtx, originX: () => number, y: number, lifeMs: number): void {
  const w = DT.whip;
  const k = c.world.k;
  const tick = (s: Phaser.GameObjects.Sprite, t: number): void => {
    const age = t * lifeMs;
    const grow = 0.15 + 0.85 * ease(age / w.growMs);
    const a = c.world.reducedMotion ? 0.95 : 0.8 + 0.2 * Math.sin(age * 0.03);
    s.setPosition(originX() + w.fromDx, y).setScale(grow / k, 1 / k).setAlpha(a);
  };
  // behind the burgers: in phase 2 the lane runs past the other mini without covering its face
  const s = part(c.world.scene, c.keys.lane, k, DT.depth.legs - 1, 0, 1, 0.5);
  tick(s, 0);
  c.temps.add(s, lifeMs, tick);
}

function whip(c: DtCtx): Move {
  const w = DT.whip;
  const mini = c.phase > 0;
  const order = bands(() => c.world.rng());
  const originX = (): number => (mini ? c.pose.m[0].x + 20 : c.pose.bx);
  const bandY = (n: number): number => (order[n] === 'low' ? w.low : w.high);
  let next = 0;
  let at = -1;
  const stub = part(c.world.scene, c.keys.stub, c.world.k, DT.depth.fx);
  const count = mini ? 1 : 2;
  c.temps.add(stub, w.teleMs + (count - 1) * w.gapMs, (s) => {
    s.setPosition(originX() + w.fromDx - 30, bandY(Math.min(next, count - 1))).setScale(1 / c.world.k, (1 + Math.sin(c.world.timeMs * 0.03) * 0.25) / c.world.k);
    s.setVisible(next < count);
  });
  whipLane(c, originX, bandY(0), w.teleMs);
  c.world.sfx('dash');
  c.flash.tele(w.teleMs, mini ? [c.parts.minis[0]] : [...c.parts.big]);
  const m: Move = {
    t: 0,
    fire(n) {
      at = m.t;
      next = n + 1;
      const box = whipBox(originX(), order[n]);
      const h = c.world.spawnHazard({ x: box.x + box.w / 2, y: box.y + box.h / 2, w: box.w, h: box.h, texture: c.keys.whip, frame: 1, lifeMs: w.liveMs });
      c.timers.after(70, () => h.alive && h.sprite.setFrame(0));
      c.fx.glint(box.x + 6, box.y + box.h / 2, 240);
      shake(c, 2, 120);
      c.world.sfx('dash');
      if (next < count) whipLane(c, originX, bandY(next), w.gapMs);
    },
    update() {
      const cracking = at >= 0 && m.t - at < w.liveMs;
      // wind-up: the arm pulls back high (stay down) or low (jump), the body rears away from the player and shivers
      const cocked = !cracking && next < count;
      const u = cocked ? ease((m.t - (at < 0 ? 0 : at + w.liveMs)) / w.growMs) : 0;
      const shiver = cocked && !c.world.reducedMotion ? Math.sin(m.t * 0.09) * 0.012 : 0;
      const arm = cracking ? POSE.throw : !cocked ? POSE.across : order[next] === 'high' ? POSE.cockHigh : POSE.downR;
      if (mini) {
        const p = c.pose.m[0];
        p.arm = arm;
        p.x += w.leanDx * 0.6 * u;
        p.sx = cracking ? 1.1 : 1 - 0.07 * u + shiver;
        p.sy = cocked ? 1 + 0.07 * u : 1;
        return;
      }
      const p = c.pose;
      p.armL = arm;
      p.bx += cracking ? -w.leanDx / 2 : w.leanDx * u;
      p.sx = cracking ? 1.08 : 1 - 0.06 * u + shiver;
      p.sy = cocked ? 1 + 0.05 * u - shiver : p.sy;
    },
  };
  return m;
}

function stomp(c: DtCtx): Move {
  const s = DT.stomp;
  const stops = stompStops();
  let leg = -1;
  let at = 0;
  let landed = true;
  c.fx.shadow(stops[1].x, s.teleMs + s.flightMs, 2.4);
  c.world.sfx('dash');
  c.flash.tele(s.teleMs, [...c.parts.big]);
  const m: Move = {
    t: 0,
    fire(n) {
      leg = n;
      at = m.t;
      landed = false;
      if (n > 0) c.fx.shadow(stops[2].x, s.flightMs, 2.4);
      c.world.sfx('lob');
    },
    update() {
      const p = c.pose;
      if (leg < 0) {
        const u = ease(m.t / s.teleMs);
        p.legs = LEG.crouch;
        p.sy = 1 - 0.16 * u + Math.sin(m.t * 0.08) * 0.015;
        p.sx = 1 + 0.1 * u;
        p.armL = POSE.upL;
        p.armR = POSE.upR;
        return;
      }
      const from = stops[leg];
      const to = stops[leg + 1];
      const u = (m.t - at) / s.flightMs;
      if (u < 1) {
        const pos = arc(from, to, s.apex, u);
        p.bx = pos.x;
        p.by = pos.y;
        p.legs = LEG.tuck;
        p.sy = 1.08;
        p.sx = 0.94;
        p.armL = POSE.upL;
        p.armR = POSE.upR;
        return;
      }
      p.bx = to.x;
      p.by = F;
      if (!landed) {
        landed = true;
        if (leg === 0) shockwave(c, to.x + 56, 1);
        shockwave(c, to.x - 56, -1);
        c.fx.dust(to.x - 40, F);
        c.fx.dust(to.x + 40, F, true);
        shake(c, 6, 240);
        c.world.sfx('blast');
      }
      const squash = m.t - at - s.flightMs < 220;
      p.sx = squash ? 1.16 : 1;
      p.sy = squash ? 0.82 : 1;
      p.legs = squash ? LEG.crouch : LEG.stand;
      p.armR = POSE.peace;
    },
  };
  return m;
}

function hop(c: DtCtx): Move {
  const h = DT.hop;
  const last = hopCount() - 1;
  const mp = (): MiniPose => c.pose.m[0];
  let from: Vec = { x: mp().x, y: F };
  let to = hopTarget(c.world.player.x);
  let at = -1;
  let landed = true;
  c.fx.shadow(to.x, h.teleMs + h.ms, 1.7);
  c.world.sfx('dash');
  c.flash.tele(h.teleMs, [c.parts.minis[0]]);
  let cur: Vec = { ...from };
  const m: Move = {
    t: 0,
    fire(n) {
      from = { ...cur };
      if (n > 0) {
        to = n < last ? hopTarget(c.world.player.x) : { x: DT.minis[0].x, y: F };
        c.fx.shadow(to.x, h.ms, 1.7);
      }
      at = m.t;
      landed = false;
      c.world.sfx('lob');
    },
    update() {
      const p = mp();
      if (at < 0) {
        const u = ease(m.t / h.teleMs);
        p.sx = 1 + 0.14 * u;
        p.sy = 1 - 0.16 * u;
        p.legs = LEG.crouch;
        return;
      }
      const u = (m.t - at) / h.ms;
      cur = arc(from, to, h.apex, u);
      p.x = cur.x;
      p.y = cur.y;
      p.legs = u < 1 ? LEG.tuck : LEG.stand;
      p.sx = u < 1 ? 0.94 : 1.14;
      p.sy = u < 1 ? 1.1 : 0.86;
      if (u >= 1 && !landed) {
        landed = true;
        c.fx.dust(to.x - 24, F);
        c.fx.dust(to.x + 24, F, true);
        shake(c, 3, 140);
      }
    },
  };
  return m;
}

function salsa(c: DtCtx): Move {
  const s = DT.salsa;
  const plan = salsaVolley(() => c.world.rng());
  const nozzle = (): Vec => ({ x: c.pose.m[1].x, y: rigTop(miniRig(c.pose.m[1]), DT.mini.scale) + 8 });
  plan.xs.forEach((x, i) => c.fx.shadow(x, s.teleMs + i * s.gapMs + s.flightMs, 0.8));
  c.world.sfx('dash');
  c.flash.tele(s.teleMs, [c.parts.minis[1]]);
  c.fx.glint(nozzle().x, nozzle().y);
  let at = -1;
  const m: Move = {
    t: 0,
    fire(n) {
      at = m.t;
      const from = nozzle();
      const x = plan.xs[n];
      const v = ballistic(from, x, F - 6, s.flightMs, s.g);
      const pink = n === plan.pink;
      c.world.spawnHazard({ x: from.x, y: from.y, vx: v.x, vy: v.y, ay: s.g, r: s.r, texture: c.keys.salsa, frame: pink ? 1 : 0, pink, lifeMs: s.flightMs });
      c.timers.after(s.flightMs, () => c.fx.dust(x, F, false, pink ? 0xff5fa8 : 0xe8774c));
      c.world.sfx('lob');
    },
    update() {
      const p = c.pose.m[1];
      const squeeze = at >= 0 && m.t - at < 120;
      const u = at < 0 ? ease(m.t / s.teleMs) : 0;
      p.sx = squeeze ? 1.16 : 1 + 0.1 * u;
      p.sy = squeeze ? 0.84 : 1 + 0.1 * u;
      p.arm = POSE.upL;
    },
  };
  return m;
}

export function makeMove(id: DtAttack, c: DtCtx): Move {
  if (id === 'frisbee') return frisbee(c);
  if (id === 'cheddar') return cheddar(c);
  if (id === 'whip') return whip(c);
  if (id === 'stomp') return stomp(c);
  if (id === 'hop') return hop(c);
  return salsa(c);
}
