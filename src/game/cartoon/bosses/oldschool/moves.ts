/**
 * THE OLD SCHOOL attacks over time: each starts with its wind-up (pose + warm flash + whoosh + glint or
 * landing shadows) on the scheduler's 'tele' event, then plays its volleys on 'fire'. They write the pose
 * runtime.ts draws each frame, after the idle pose.
 */
import { ARENA, type Vec } from '../../api';
import { ARM_POSE, FACE, SAUCE, SAUCE_COLOR } from './art';
import { COUNTER } from './arena';
import { FIST_POSE } from './hand';
import { aim, arc, ballistic, ease, lerp } from './kit/geometry';
import { SHOCK } from './kit/fxart';
import type { Move } from './kit/scheduler';
import { hopCount, hopStops1, hopTarget, poundStage, sauceVolley, sweepFrom, SWEEP_SLIDE_MS, type OsAttack } from './pattern';
import { OS } from './tuning';
import type { OsCtx, OsPose } from './types';
const F = ARENA.floorY;

export function shake(c: OsCtx, intensity: number, ms: number): void {
  if (!c.world.reducedMotion) c.world.shake(intensity, ms);
}

/** where the fist floats in phase 2 at time T */
export function fistHome(T: number): Vec {
  return { x: OS.fistHome.x + Math.sin(T / 820) * 10, y: OS.fistHome.y + Math.sin(T / 430) * 5 };
}

/** tip of the burger's little arm (throw pose) */
function armTip(p: OsPose): Vec {
  return { x: p.bx - 46 * p.bsx - 30, y: p.by - 57 * p.bsy + 2 };
}

function wave(c: OsCtx, x: number, dir: -1 | 1, speed: number): void {
  const h = c.world.spawnHazard({ x, y: F - SHOCK.h / 2, vx: dir * speed, w: OS.wave.w, h: OS.wave.h, texture: c.keys.shock, anim: c.keys.shockAnim, lifeMs: 3600 });
  h.sprite.setFlipX(dir > 0);
}

function slam(c: OsCtx): Move {
  const s = OS.slam;
  let fired = -1;
  let at = 0;
  let impact = -1;
  c.world.sfx('dash');
  c.flash.tele(s.teleMs, [...c.parts.hand, c.parts.burger]);
  c.fx.glint(OS.grip.x + 34, OS.grip.y - 96);
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
    },
    update() {
      const p = c.pose;
      p.face = FACE.shout;
      if (fired < 0) {
        const u = ease(m.t / s.teleMs);
        p.handDy = -s.liftPx * u + Math.sin(m.t * 0.09) * 1.8 * u;
        p.handAngle = 5 * u;
        return;
      }
      const tt = m.t - at;
      if (tt < s.downMs) {
        const u = tt / s.downMs;
        p.handDy = lerp(-s.liftPx, s.dropPx, u * u);
        p.handAngle = 5 * (1 - u);
        return;
      }
      if (impact < fired) {
        impact = fired;
        wave(c, s.waveAt, -1, s.waveSpeed);
        c.fx.dust(s.waveAt, F);
        c.fx.dust(s.waveAt + 40, F, true);
        shake(c, 6, 240);
        c.world.sfx('blast');
      }
      const back = tt - s.downMs - 220;
      const last = fired >= 1;
      p.handDy = back < 0 ? s.dropPx : lerp(s.dropPx, last ? 0 : -s.liftPx, ease(back / 420));
      p.handAngle = 0;
      p.bsx = back < 0 ? 1.12 : 1;
      p.bsy = back < 0 ? 0.86 : 1;
    },
  };
  return m;
}

function flick(c: OsCtx): Move {
  const f = OS.flick;
  let fired = -1;
  let at = 0;
  c.world.sfx('dash');
  c.flash.tele(f.teleMs, [c.parts.arm, c.parts.burger]);
  c.fx.glint(c.pose.bx - 44, c.pose.by - 80);
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
      const from = armTip(c.pose);
      const v = aim(from, { x: c.world.player.x, y: c.world.player.y - 18 }, f.speed);
      const pink = n === 2;
      c.world.spawnHazard({ x: from.x, y: from.y, vx: v.x, vy: v.y, r: f.r, texture: c.keys.bacon, frame: pink ? 1 : 0, pink, spin: f.spin, lifeMs: 4200 });
      c.world.sfx('lob');
    },
    update() {
      const p = c.pose;
      p.face = FACE.shout;
      p.arm = fired >= 0 && m.t - at < 170 ? ARM_POSE.throw : fired >= 2 ? ARM_POSE.waveA : ARM_POSE.windUp;
    },
  };
  return m;
}

function sauce(c: OsCtx): Move {
  const s = OS.sauce;
  const count = s.counts[c.phase === 0 ? 0 : 1];
  const plan = sauceVolley(() => c.world.rng(), count);
  const bi = c.volleys++ % OS.bottles.length;
  const nozzle = { x: OS.bottles[bi].x, y: COUNTER.top - 52 };
  const tele = c.phase === 0 ? s.teleMs : s.teleMs - 100;
  plan.xs.forEach((x, i) => c.fx.shadow(x, tele + i * s.gapMs + s.flightMs, 0.8));
  c.world.sfx('dash');
  c.flash.tele(tele, [c.parts.bottles[bi]]);
  c.fx.glint(nozzle.x, nozzle.y);
  let fired = -1;
  let at = 0;
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
      const x = plan.xs[n];
      const v = ballistic(nozzle, x, F - 6, s.flightMs, s.g);
      const pink = n === plan.pink;
      const frame = pink ? SAUCE.pink : bi === 0 ? SAUCE.bbq : SAUCE.white;
      c.world.spawnHazard({ x: nozzle.x, y: nozzle.y, vx: v.x, vy: v.y, ay: s.g, r: s.r, texture: c.keys.sauce, frame, pink, lifeMs: s.flightMs });
      c.timers.after(s.flightMs, () => c.fx.dust(x, F, false, parseInt(SAUCE_COLOR[frame].slice(1), 16)));
      c.world.sfx('lob');
    },
    update() {
      const p = c.pose;
      p.face = FACE.shout;
      if (fired < 0) {
        p.bottle[bi] = -0.14 * ease(m.t / tele) + Math.sin(m.t * 0.1) * 0.02;
        return;
      }
      const squeezing = m.t - at < 130;
      p.bottle[bi] = squeezing ? 0.3 : 0;
      p.bottleFrame[bi] = OS.bottles[bi].frame + (squeezing ? 1 : 0);
    },
  };
  return m;
}

function hop(c: OsCtx): Move {
  const h = OS.hop;
  const phase = c.phase;
  const stops = hopStops1();
  const tele = phase === 0 ? h.teleMs : h.teleMs - 100;
  const last = hopCount(phase) - 1;
  let from: Vec = { x: c.pose.bx, y: c.pose.by };
  let to: Vec = phase === 0 ? stops[1] : hopTarget(c.world.player.x);
  let hopN = -1;
  let at = 0;
  let landed = true;
  c.fx.shadow(to.x, tele + h.ms, 2.1);
  c.world.sfx('dash');
  c.flash.tele(tele, [c.parts.burger]);
  const m: Move = {
    t: 0,
    fire(n) {
      from = { x: c.pose.bx, y: c.pose.by };
      if (n > 0) {
        to = phase === 0 ? stops[n + 1] : n < last ? hopTarget(c.world.player.x) : { ...OS.floorSpot };
        if (to.y >= F) c.fx.shadow(to.x, h.ms, 2.1);
      }
      hopN = n;
      at = m.t;
      landed = false;
      c.world.sfx('lob');
    },
    update() {
      const p = c.pose;
      p.face = FACE.shout;
      if (hopN < 0) {
        const u = ease(m.t / tele);
        p.bsx = 1 + 0.16 * u;
        p.bsy = 1 - 0.18 * u + Math.sin(m.t * 0.08) * 0.02;
        if (phase === 0) p.held = true;
        return;
      }
      const home = phase === 0 && hopN === last;
      p.held = home && landed;
      if (phase === 0) p.hand = home && landed ? 'grip' : 'open';
      if (p.hand === 'open') p.handAngle = Math.sin(m.t * 0.012) * 7;
      if (p.held) return;
      const s = (m.t - at) / h.ms;
      const apex = from.y < F || to.y < F ? h.firstApex : h.apex;
      const pos = arc(from, to, apex, s);
      p.bx = pos.x;
      p.by = pos.y;
      const air = 1 - Math.abs(2 * Math.min(1, s) - 1);
      p.bsx = s < 1 ? 1 - 0.08 * air : 1.16;
      p.bsy = s < 1 ? 1 + 0.12 * air : 0.84;
      p.arm = ARM_POSE.waveA;
      if (s >= 1 && !landed) {
        landed = true;
        if (to.y >= F) {
          c.fx.dust(to.x - 30, F);
          c.fx.dust(to.x + 30, F, true);
          shake(c, 3, 140);
        }
      }
    },
  };
  return m;
}

function pound(c: OsCtx, T: () => number): Move {
  const p0 = OS.pound;
  let fired = -1;
  let at = 0;
  let x = c.pose.fx;
  let stageSeen = '';
  c.world.sfx('dash');
  c.flash.tele(p0.teleMs, [c.parts.fist]);
  c.fx.glint(c.pose.fx, c.pose.fy - 30);
  const m: Move = {
    t: 0,
    fire(n) {
      fired = n;
      at = m.t;
      stageSeen = '';
    },
    update(dt) {
      const p = c.pose;
      p.fistFrame = FIST_POSE.down;
      p.fistAngle = 0;
      const home = fistHome(T());
      if (fired < 0) {
        const u = ease(m.t / p0.teleMs);
        p.fy = home.y - 18 * u;
        p.fx = x + Math.sin(m.t * 0.1) * 2 * u;
        return;
      }
      const { stage, u } = poundStage(m.t - at);
      const first = stage !== stageSeen;
      stageSeen = stage;
      const low = F - 34;
      if (stage === 'track') {
        x += (c.world.player.x - x) * (1 - Math.exp(-dt * p0.follow));
        p.fx = x;
        p.fy = home.y - 18;
      } else if (stage === 'lock') {
        if (first) {
          c.fx.shadow(x, p0.lockMs + p0.slamMs, 1.3);
          c.flash.tele(p0.lockMs, [c.parts.fist]);
        }
        p.fx = x + Math.sin(m.t * 0.12) * 2.2;
        p.fy = home.y - 18 - 10 * u;
      } else if (stage === 'slam') {
        p.fx = x;
        p.fy = lerp(home.y - 28, low, u * u);
      } else if (stage === 'hold') {
        if (first) {
          wave(c, x - 30, -1, p0.waveSpeed);
          wave(c, x + 30, 1, p0.waveSpeed);
          c.fx.dust(x - 24, F);
          c.fx.dust(x + 24, F, true);
          shake(c, 6, 220);
          c.world.sfx('blast');
        }
        p.fx = x;
        p.fy = low;
      } else {
        const e = ease(u);
        p.fx = lerp(x, home.x, e);
        p.fy = lerp(low, home.y, e);
        if (u >= 1) x = home.x;
      }
    },
  };
  return m;
}

function sweep(c: OsCtx, T: () => number): Move {
  const s = OS.sweep;
  const { x0, x1 } = sweepFrom(c.world.player.x);
  const dir = Math.sign(x1 - x0);
  const flatY = F - 52;
  const start = { x: c.pose.fx, y: c.pose.fy };
  let at = -1;
  c.world.sfx('dash');
  const m: Move = {
    t: 0,
    fire() {
      at = m.t;
      c.world.sfx('dash');
    },
    update() {
      const p = c.pose;
      p.fistFlip = dir > 0;
      if (at < 0) {
        if (m.t < s.flyMs) {
          const pos = arc(start, { x: x0, y: flatY }, s.flyApex, m.t / s.flyMs);
          p.fx = pos.x;
          p.fy = pos.y;
          p.fistSafe = true;
          p.fistFrame = FIST_POSE.left;
          return;
        }
        if (p.fistSafe) {
          c.flash.tele(s.teleMs - s.flyMs, [c.parts.fist]);
          c.fx.dust(x0 - dir * 30, F, dir > 0);
        }
        p.fistSafe = false;
        p.fistFrame = FIST_POSE.flat;
        p.fx = x0 - dir * 6 * ease((m.t - s.flyMs) / 200) + Math.sin(m.t * 0.13) * 1.5;
        p.fy = flatY;
        return;
      }
      const tt = m.t - at;
      if (tt < SWEEP_SLIDE_MS + 200) {
        p.fistFrame = FIST_POSE.flat;
        p.fx = lerp(x0, x1, Math.min(1, tt / SWEEP_SLIDE_MS));
        p.fy = flatY;
        return;
      }
      const u = (tt - SWEEP_SLIDE_MS - 200) / s.homeMs;
      const pos = arc({ x: x1, y: flatY }, fistHome(T()), s.flyApex, u);
      p.fistSafe = true;
      p.fistFrame = FIST_POSE.left;
      p.fistFlip = false;
      p.fx = pos.x;
      p.fy = pos.y;
    },
  };
  return m;
}

/** The move for a scheduler 'tele' event. T = the runtime clock (ms). */
export function makeMove(id: OsAttack, c: OsCtx, T: () => number): Move {
  if (id === 'slam') return slam(c);
  if (id === 'flick') return flick(c);
  if (id === 'sauce') return sauce(c);
  if (id === 'hop') return hop(c);
  if (id === 'pound') return pound(c, T);
  return sweep(c, T);
}
