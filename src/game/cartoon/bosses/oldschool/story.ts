/**
 * THE OLD SCHOOL story beats: the phase-2 transformation (the hand drops the burger, clenches into a fist
 * with a puff and floats up) and the funny knockout (dizzy burger with stars, the glove waves a diner
 * napkin to surrender).
 */
import { ARENA, type Vec } from '../../api';
import { ARM_POSE, FACE } from './art';
import { FIST_POSE } from './hand';
import { arc, ease, lerp } from './kit/geometry';
import type { Move } from './kit/scheduler';
import { fistHome, shake } from './moves';
import { OS } from './tuning';
import type { OsCtx } from './types';

const F = ARENA.floorY;
/** the palm centre while the hand holds the burger (where the fist appears) */
const PALM = { x: OS.grip.x + 46, y: OS.grip.y + 4 } as const;

export function transformMove(c: OsCtx, T: () => number): Move {
  let dropped = false;
  let clenched = false;
  c.world.say('Basta coccole: adesso parla il pugno!', 1800);
  const m: Move = {
    t: 0,
    fire() {},
    update() {
      const p = c.pose;
      const t = m.t;
      p.face = t < 450 ? FACE.hurt : FACE.angry;
      p.arm = ARM_POSE.windUp;
      p.fist = t >= 1100;
      if (t < 500) {
        p.hand = 'grip';
        p.held = true;
        p.handAngle = Math.sin(t * 0.09) * 4;
        return;
      }
      if (t < 1100) {
        p.hand = 'open';
        p.held = false;
        const pos = arc({ x: OS.grip.x, y: OS.grip.y }, OS.floorSpot, 50, (t - 500) / 600);
        p.bx = pos.x;
        p.by = pos.y;
        return;
      }
      if (!dropped) {
        dropped = true;
        c.fx.dust(OS.floorSpot.x - 34, F);
        c.fx.dust(OS.floorSpot.x + 34, F, true);
        shake(c, 4, 160);
      }
      p.bx = OS.floorSpot.x;
      p.by = F;
      if (!clenched) {
        clenched = true;
        c.fx.dust(PALM.x, PALM.y + 20);
        c.fx.dust(PALM.x + 20, PALM.y + 10, true);
        c.world.sfx('blast');
        shake(c, 5, 220);
      }
      p.hand = 'gone';
      p.fist = true;
      p.fistSafe = true;
      p.fistFrame = FIST_POSE.left;
      const u = ease((t - 1100) / 1300);
      const pos = arc(PALM, fistHome(T()), 40, u);
      p.fx = pos.x;
      p.fy = pos.y;
      p.fistAngle = Math.sin(t * 0.03) * 12 * (1 - u);
    },
  };
  return m;
}

export function koMove(c: OsCtx): Move {
  const p = c.pose;
  const fall: Vec = { x: p.bx, y: p.by };
  const fistFrom: Vec = p.hand === 'gone' ? { x: p.fx, y: p.fy } : { ...PALM };
  c.world.say('Mi arrendo, mi arrendo!', 2000);
  c.fx.stars(() => ({ x: p.bx, y: p.by - 92 * p.bsy }), OS.koMs);
  const m: Move = {
    t: 0,
    fire() {},
    update() {
      const t = m.t;
      p.face = FACE.ko;
      p.arm = ARM_POSE.limp;
      p.hand = 'gone';
      p.held = false;
      const u = Math.min(1, t / 500);
      const pos = arc(fall, { x: fall.x, y: F }, 18, u);
      p.bx = pos.x;
      p.by = pos.y;
      const fade = 1 - Math.min(1, t / OS.koMs);
      const flat = t > OS.koMs - 900 ? ease((t - OS.koMs + 900) / 500) : 0;
      p.bsx = 1 + Math.sin(t * 0.02) * 0.08 * fade + 0.18 * flat;
      p.bsy = 1 - Math.sin(t * 0.02) * 0.08 * fade - 0.24 * flat;
      p.fist = true;
      p.fistSafe = true;
      p.fistFrame = FIST_POSE.surrender;
      p.fistFlip = false;
      const e = ease(t / 700);
      p.fx = lerp(fistFrom.x, 470, e);
      p.fy = lerp(fistFrom.y, 150, e);
      p.fistAngle = Math.sin(t * 0.012) * 16;
    },
  };
  return m;
}
