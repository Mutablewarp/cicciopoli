/**
 * HAPPY BOX in the ring (BossRuntime). Phase 0: spray clouds that settle and linger (one PINK smiley
 * every other spray), paint drips from the gutter, mini Happy boxes that hop at the player. Transformation:
 * he puffs up and bursts — bigger, paint splashed everywhere. Phase 1: the same, harder, plus the spray-can
 * rockets (low: jump, high: stay down). Knockout: dizzy, then he folds flat. Every attack: wind-up pose +
 * sparkle + sound >= 500 ms before anything dangerous appears.
 */
import type Phaser from 'phaser';
import { ARENA, type BossRuntime, type BossWorld, type Box, type HazardHandle } from '../../api';
import { Fx, ToonBody } from '../tuma/kit/body';
import type { Shot } from '../tuma/kit/geom';
import { Later, Scheduler } from '../tuma/kit/sched';
import { HF, NOZZLE } from './art';
import { BODY, HAPPY_CFG as C, HAPPY_LINES, HK, LANE, PINK, type HappyAttack } from './config';
import { miniDrops, paintDrips, rocketLanes, sprayPuffs } from './plan';

const F = ARENA.floorY;

export function createHappy(world: BossWorld): BossRuntime {
  const scene: Phaser.Scene = world.scene;
  const texK = Math.min(world.k, C.kMax) * C.scale * C.grow;
  const rng = (): number => world.rng();
  const body = new ToonBody(scene, HK.body, texK, BODY, C.x, F, C.scale, 3);
  body.setLoop(HF.idle, 6);
  const mess = scene.add.sprite(C.x, F, HK.mess).setDepth(3.5).setVisible(false);
  const fx = new Fx(scene, world.k);
  const later = new Later();
  const sched = new Scheduler<HappyAttack>(C.attacks, rng, C.startMs);
  const decals: Phaser.GameObjects.Sprite[] = [];
  let phase = 0;
  let mode: 'fight' | 'rage' | 'ko' = 'fight';
  let modeMs = 0;
  let burst = false;
  let flat = false;
  let t = 0;
  let sprays = 0;
  let count = 0;
  let drops: Shot[] = [];
  let lanes: number[] = [];

  const at = (p: readonly [number, number]): { x: number; y: number } => body.at(p[0], p[1]);
  const glint = (x: number, y: number): void => {
    fx.add(HK.glint, x, y, 480, { frames: [0, 1], fps: 10, loop: true, depth: 8, tick: (s, p) => s.setAngle(p * 120).setAlpha(1 - p * p) });
  };
  const splat = (x: number, color: number): void => {
    fx.add(HK.splat, x, F - 5, 320, { frames: [color * 3, color * 3 + 1, color * 3 + 2], fps: 10, depth: 1 });
  };
  const poof = (x: number, y: number): void => {
    fx.add(HK.dust, x, y, 330, { frames: [0, 1, 2], fps: 10, depth: 8 });
  };
  const laneWarn = (y: number, ms: number): void => {
    const [a, b] = C.field[phase > 0 ? 1 : 0];
    fx.add(HK.lane, (a + b) / 2, y, ms, { depth: 1, scale: (b - a) / LANE.w, tick: (s, p) => s.setAlpha(0.35 + 0.65 * Math.abs(Math.sin(p * 11))) });
  };

  function puff(s: Shot): void {
    let settled = -1;
    world.spawnHazard({
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      ay: s.ay,
      r: s.r,
      texture: HK.puff,
      frame: s.frame,
      pink: s.pink,
      lifeMs: 9000,
      update(h: HazardHandle, dt: number): void {
        if (mode === 'ko') return h.destroy();
        if (settled < 0) {
          h.sprite.setScale(Math.min(1, 0.45 + Math.abs(h.x - s.x) / 120) / world.k);
          if (h.y < F - s.r) return;
          settled = 0;
          splat(h.x, s.frame);
        }
        settled += dt;
        h.vx = 0;
        h.vy = 0;
        h.y = F - s.r - Math.sin(settled / 160) * 1.5;
        const fade = settled - C.spray.lingerMs;
        h.sprite.setScale((1 + Math.sin(settled / 120) * 0.04) / world.k).setAlpha(fade > 0 ? 1 - fade / C.spray.fadeMs : 1);
        if (fade >= C.spray.fadeMs) h.destroy();
      },
    });
  }

  function drop(s: Shot): void {
    world.spawnHazard({
      x: s.x,
      y: s.y,
      ay: s.ay,
      r: s.r,
      texture: HK.drop,
      frame: s.frame,
      lifeMs: 5000,
      update(h: HazardHandle): void {
        if (mode === 'ko') return h.destroy();
        if (h.y < F - s.r) return;
        splat(h.x, s.frame);
        h.destroy();
      },
    });
  }

  function mini(x: number): void {
    const M = C.minis;
    const from = at([100, 48]);
    const fl = M.flightMs / 1000;
    let rest = 0;
    let age = 0;
    const m = world.spawnMinion({
      x: from.x,
      y: from.y,
      vx: (x - from.x) / fl,
      vy: (F - M.r - from.y - 0.5 * M.g * fl * fl) / fl,
      ay: M.g,
      r: M.r,
      hp: M.hp,
      texture: HK.mini,
      frame: 1,
      lifeMs: M.lifeMs + 2000,
      onDeath: () => splat(m.x, 1),
      update(h: HazardHandle, dt: number): void {
        age += dt;
        if (mode === 'ko' || age > M.lifeMs) {
          poof(h.x, h.y);
          return h.destroy();
        }
        if (rest <= 0 && h.vy > 0 && h.y >= F - M.r) rest = 170;
        if (rest > 0) {
          rest -= dt;
          h.vx = 0;
          h.vy = 0;
          h.y = F - M.r;
          h.sprite.setFrame(2);
          if (rest <= 0) {
            h.vy = -M.hopVy;
            h.vx = Math.sign(world.player.x - h.x || -1) * M.speed;
          }
        } else h.sprite.setFrame(1).setFlipX(h.vx > 0);
      },
    });
  }

  function rocket(y: number): void {
    const R = C.rocket;
    const x = at(NOZZLE.aim).x;
    poof(x, y);
    world.sfx('jet');
    world.spawnHazard({ x, y, vx: -R.speed, w: R.w, h: R.h, texture: HK.rocket, frame: 0, lifeMs: 4000, update: (h) => void (mode === 'ko' ? h.destroy() : h.sprite.setFrame(Math.floor(t / 60) % 2)) });
  }

  function telegraph(kind: HappyAttack, ms: number): void {
    if (++count % C.sayEvery === 0) world.say(HAPPY_LINES[kind], 1100);
    if (kind === 'spray') {
      body.hold(HF.shake, ms);
      glint(at([160, 40]).x, at([160, 40]).y);
      world.sfx('squeeze');
    } else if (kind === 'drips') {
      body.hold(HF.drips, ms + 500);
      glint(at(NOZZLE.drips).x, at(NOZZLE.drips).y);
      world.sfx('squeeze');
      drops = paintDrips(rng, phase, world.player.x);
      for (const d of drops) fx.add(HK.drop, d.x, d.y, ms + d.delayMs, { frames: [d.frame], depth: 6, tick: (s, p) => s.setScale((0.3 + 0.7 * Math.min(1, p * 1.5)) / world.k) });
    } else if (kind === 'minis') {
      body.hold(HF.minis, ms + 400);
      body.kick(-0.12);
      glint(at([100, 40]).x, at([100, 40]).y);
      world.sfx('dash');
    } else {
      body.hold(HF.aim, ms);
      lanes = rocketLanes(rng);
      laneWarn(lanes[0], ms);
      glint(at(NOZZLE.aim).x, at(NOZZLE.aim).y);
      world.sfx('cardFull');
    }
  }

  function fire(kind: HappyAttack): void {
    if (kind === 'spray') {
      body.hold(HF.spray, 700);
      body.kick(0.08);
      world.sfx('squeeze');
      for (const s of sprayPuffs(rng, phase, at(NOZZLE.spray), world.player.x, sprays++ % C.spray.pinkEvery === 1)) later.add(s.delayMs, () => puff(s));
    } else if (kind === 'drips') {
      for (const d of drops) later.add(d.delayMs, () => drop(d));
    } else if (kind === 'minis') {
      world.sfx('lob');
      miniDrops(rng, phase).forEach((x, i) => later.add(i * C.minis.gapMs, () => mini(x)));
    } else {
      body.hold(HF.launch, 500);
      body.kick(-0.15);
      rocket(lanes[0]);
      laneWarn(lanes[1], C.rocket.warnMs);
      later.add(C.rocket.warnMs, () => {
        body.hold(HF.launch, 500);
        rocket(lanes[1]);
      });
    }
  }

  function rage(dt: number): void {
    modeMs += dt;
    if (modeMs < 1000) {
      body.grow = 1 + 0.1 * (modeMs / 1000) + Math.sin(modeMs / 40) * 0.015;
      body.x = C.x + Math.sin(modeMs / 18) * 1.5;
      return;
    }
    if (!burst) {
      burst = true;
      body.grow = C.grow;
      body.x = C.x;
      body.kick(0.4);
      mess.setVisible(true);
      world.shake(7, 420);
      world.sfx('blast');
      for (let i = 0; i < 9; i++) {
        const d = scene.add.sprite(40 + rng() * 560, 70 + rng() * 200, HK.decal, i % 4).setDepth(-14).setAngle(rng() * 360);
        decals.push(d.setScale(0));
        fx.add(HK.drop, body.x, body.y - 120, 600, { frames: [i % PINK], depth: 8, tick: (s, p) => s.setPosition(body.x + (d.x - body.x) * p, body.y - 120 + (d.y - body.y + 120) * p - Math.sin(p * Math.PI) * 60) });
        later.add(600, () => d.setScale(0.9 / world.k));
      }
      for (let i = 0; i < 6; i++) later.add(600, () => splat(40 + rng() * 360, i % PINK));
    }
    if (modeMs >= C.transformMs) mode = 'fight';
  }

  function knockout(dt: number): void {
    modeMs += dt;
    if (modeMs < 1400) body.angle = Math.sin(modeMs / 110) * 7;
    else if (!flat) {
      flat = true;
      body.angle = 0;
      body.hold(HF.flat, 1e9);
      body.kick(0.5);
      mess.setVisible(false);
      world.sfx('blast');
      poof(body.x - 40, F - 10);
      poof(body.x + 40, F - 10);
    }
  }

  return {
    hurtBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : [body.box(...C.hurt)];
    },
    bodyBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : [body.box(56, 46, 96, 170)];
    },
    update(dt: number): void {
      t += dt;
      later.update(dt);
      fx.update(dt);
      if (mode === 'ko') knockout(dt);
      else {
        if (mode === 'rage') rage(dt);
        for (const e of sched.update(dt)) {
          if (e.type === 'telegraph') telegraph(e.kind, sched.current?.telegraphMs ?? 600);
          else if (e.type === 'fire') fire(e.kind);
        }
      }
      body.update(dt);
      const s = body.sprite;
      mess.setPosition(s.x, s.y).setOrigin(s.originX, s.originY).setScale(s.scaleX, s.scaleY).setAngle(s.angle);
    },
    onPhase(p: number): void {
      if (p <= phase || mode === 'ko') return;
      phase = p;
      mode = 'rage';
      modeMs = 0;
      sched.setPhase(p, C.transformMs);
      later.clear();
      body.hold(HF.puff, 1000);
      world.sfx('phase');
      world.shake(3, 900);
      world.say(HAPPY_LINES.rage, 1400);
    },
    onHit(): void {
      body.flash();
    },
    onKnockout(): void {
      mode = 'ko';
      modeMs = 0;
      sched.stop();
      later.clear();
      body.grow = phase > 0 ? C.grow : 1;
      body.release();
      body.setLoop(HF.dizzy, 5);
      world.say(HAPPY_LINES.ko, 1500);
    },
    get done(): boolean {
      return mode === 'ko' && modeMs >= C.koMs;
    },
    destroy(): void {
      later.clear();
      fx.clear();
      body.destroy();
      mess.destroy();
      for (const d of decals) d.destroy();
    },
  };
}
