/**
 * DOUBLE TRIPLE story beats: the phase-2 split (the stack shakes, POPS in a cloud and two minis bounce
 * apart) and the funny knockout (dizzy burgers with stars, a tired peace sign, then they flatten).
 */
import { ARENA } from '../../api';
import { DT_FACE } from './art';
import { LEG, POSE } from './limbs';
import { arc, ease } from '../oldschool/kit/geometry';
import type { Move } from '../oldschool/kit/scheduler';
import { shake } from './moves';
import { DT } from './tuning';
import type { DtCtx } from './types';

const F = ARENA.floorY;
const POP_MS = 700;
const FLY_MS = 600;

export function splitMove(c: DtCtx): Move {
  const startX = c.pose.bx;
  let popped = false;
  c.world.say('Doppio? Facciamo due!', 1800);
  const m: Move = {
    t: 0,
    fire() {},
    update() {
      const p = c.pose;
      const t = m.t;
      if (t < POP_MS) {
        const u = t / POP_MS;
        p.body = true;
        p.minis = false;
        p.bx = startX + Math.sin(t * 0.12) * 3 * u;
        p.by = F;
        p.face = t < 300 ? DT_FACE.hurt : DT_FACE.shout;
        p.armL = POSE.upL;
        p.armR = POSE.upR;
        p.legs = LEG.crouch;
        p.sx = 1 + 0.12 * u;
        p.sy = 1 + 0.08 * u;
        return;
      }
      if (!popped) {
        popped = true;
        for (const dx of [-40, 0, 40]) c.fx.dust(startX + dx, F - 60 - Math.abs(dx), dx > 0);
        c.fx.dust(startX, F);
        shake(c, 6, 260);
        c.world.sfx('blast');
      }
      p.body = false;
      p.minis = true;
      const u = Math.min(1, (t - POP_MS) / FLY_MS);
      p.m.forEach((mp, i) => {
        const pos = arc({ x: startX, y: F }, { x: DT.minis[i].x, y: F }, 60 + i * 30, u);
        mp.x = pos.x;
        mp.y = pos.y;
        mp.face = u < 1 ? DT_FACE.shout : DT_FACE.cool;
        mp.legs = u < 1 ? LEG.tuck : LEG.stand;
        mp.sx = u < 1 ? 0.95 : 1;
        mp.sy = u < 1 ? 1.08 : 1;
      });
    },
  };
  return m;
}

export function koMove(c: DtCtx): Move {
  const p = c.pose;
  const flat = (t: number): number => (t > DT.koMs - 900 ? ease((t - DT.koMs + 900) / 500) : 0);
  c.world.say('Pace, fratè... pace!', 2000);
  if (p.minis) p.m.forEach((mp) => c.fx.stars(() => ({ x: mp.x, y: mp.y - 100 * mp.sy }), DT.koMs));
  else c.fx.stars(() => ({ x: p.bx, y: p.by - 175 * p.sy }), DT.koMs);
  const groundY = (y: number, t: number): number => y + (F - y) * Math.min(1, t / 400);
  const x0 = p.bx;
  const mx = p.m.map((mp) => mp.x);
  const m: Move = {
    t: 0,
    fire() {},
    update() {
      const t = m.t;
      const fade = 1 - Math.min(1, t / DT.koMs);
      const wob = Math.sin(t * 0.02) * 0.08 * fade;
      const fl = flat(t);
      if (p.minis) {
        p.m.forEach((mp, i) => {
          mp.x = mx[i];
          mp.y = groundY(mp.y, t);
          mp.face = DT_FACE.ko;
          mp.legs = LEG.stand;
          mp.arm = i === 0 && t % 900 < 450 ? POSE.peace : POSE.limp;
          mp.sx = 1 + (i ? -wob : wob) + 0.2 * fl;
          mp.sy = 1 - (i ? -wob : wob) - 0.26 * fl;
        });
        return;
      }
      p.bx = x0;
      p.by = groundY(p.by, t);
      p.face = DT_FACE.ko;
      p.legs = LEG.stand;
      p.armL = POSE.limp;
      p.armR = t % 900 < 450 ? POSE.peace : POSE.limp;
      p.sx = 1 + wob + 0.18 * fl;
      p.sy = 1 - wob - 0.24 * fl;
    },
  };
  return m;
}
