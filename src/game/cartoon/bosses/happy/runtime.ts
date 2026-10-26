/**
 * HAPPY BOX in the ring (BossRuntime). Phase 0: spray clouds that settle and linger (one PINK smiley
 * every other spray), paint drips from the gutter, mini Happy boxes that hop at the player. Transformation:
 * he puffs up and bursts — bigger, paint splashed everywhere. Phase 1: the same, harder, plus the spray-can
 * rockets (low: jump, high: stay down). Knockout: dizzy, then he folds flat. Every attack: wind-up pose +
 * sparkle + sound >= 500 ms before anything dangerous appears.
 */
import type Phaser from 'phaser';
import { ARENA, type BossRuntime, type BossWorld, type Box, type HazardHandle } from '../../api';
import { Fx } from '../tuma/kit/fx';
import type { Shot } from '../tuma/kit/geom';
import { Rig } from '../tuma/kit/rig';
import { Later, Scheduler } from '../tuma/kit/sched';
import { HAPPY_CFG as C, HAPPY_LINES, HAPPY_RIG, HK, LANE, PINK, SPOT, type HappyAttack, type HappyPart, happyTex } from './config';
import { miniDrops, paintDrips, rocketLanes, sprayPuffs } from './plan';
import { type HappyPose, applyHappyPose } from './poses';

const F = ARENA.floorY;

export function createHappy(world: BossWorld): BossRuntime {
  const scene: Phaser.Scene = world.scene;
  const rng = (): number => world.rng();
  const rig = new Rig<HappyPart>(scene, HAPPY_RIG, C.scale, happyTex(world.k), C.x, F, 3);
  const fx = new Fx(scene, world.k);
  const later = new Later();
  const sched = new Scheduler<HappyAttack>(C.attacks, rng, C.startMs);
  const decals: Phaser.GameObjects.Sprite[] = [];
  let phase = 0;
  let mode: 'fight' | 'rage' | 'ko' = 'fight';
  let modeMs = 0;
  let burst = false;
  let flat = false;
  let pose: HappyPose = 'idle';
  let poseMs = 0;
  let t = 0;
  let sprays = 0;
  let count = 0;
  let drops: Shot[] = [];
  let lanes: number[] = [];

  const hold = (p: HappyPose, ms: number): void => {
    pose = p;
    poseMs = ms;
  };
  const nozzle = (): { x: number; y: number } => rig.live('armR', SPOT.nozzle[0], SPOT.nozzle[1]);
  const boxTop = (): { x: number; y: number } => rig.live('body', SPOT.boxTop[0], SPOT.boxTop[1]);
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
    const from = boxTop();
    const fl = M.flightMs / 1000;
    // the mini texture is the whole rig at minis.scale (index.ts): shown at 1 / k, squashed on landing
    const sc = 1 / world.k;
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
      lifeMs: M.lifeMs + 2000,
      onDeath: () => splat(m.x, 1),
      update(h: HazardHandle, dt: number): void {
        age += dt;
        if (mode === 'ko' || age > M.lifeMs) {
          poof(h.x, h.y);
          return h.destroy();
        }
        if (rest <= 0 && h.vy > 0 && h.y >= F - M.r) rest = M.squashMs;
        if (rest > 0) {
          rest -= dt;
          h.vx = 0;
          h.vy = 0;
          h.y = F - M.r;
          h.sprite.setScale(sc * 1.2, sc * 0.82);
          if (rest <= 0) {
            h.vy = -M.hopVy;
            h.vx = Math.sign(world.player.x - h.x || -1) * M.speed;
          }
        } else h.sprite.setScale(sc * (h.vx > 0 ? -0.92 : 0.92), sc * 1.1);
      },
    });
    m.sprite.setScale(sc);
  }

  function rocket(y: number): void {
    const R = C.rocket;
    const x = nozzle().x;
    poof(x, y);
    world.sfx('jet');
    world.spawnHazard({ x, y, vx: -R.speed, w: R.w, h: R.h, texture: HK.rocket, frame: 0, lifeMs: 4000, update: (h) => void (mode === 'ko' ? h.destroy() : h.sprite.setFrame(Math.floor(t / 60) % 2)) });
  }

  function telegraph(kind: HappyAttack, ms: number): void {
    if (++count % C.sayEvery === 0) world.say(HAPPY_LINES[kind], 1100);
    if (kind === 'spray') {
      hold('shake', ms);
      later.add(120, () => glint(nozzle().x, nozzle().y));
      world.sfx('squeeze');
    } else if (kind === 'drips') {
      hold('drips', ms + 500);
      later.add(120, () => glint(boxTop().x, boxTop().y));
      world.sfx('squeeze');
      drops = paintDrips(rng, phase, world.player.x);
      for (const d of drops) fx.add(HK.drop, d.x, d.y, ms + d.delayMs, { frames: [d.frame], depth: 6, tick: (sp, p) => sp.setScale((0.3 + 0.7 * Math.min(1, p * 1.5)) / world.k) });
    } else if (kind === 'minis') {
      hold('minis', ms + 400);
      rig.kick(-0.12);
      later.add(150, () => glint(boxTop().x, boxTop().y));
      world.sfx('dash');
    } else {
      hold('aim', ms);
      lanes = rocketLanes(rng);
      laneWarn(lanes[0], ms);
      later.add(150, () => glint(nozzle().x, nozzle().y));
      world.sfx('cardFull');
    }
  }

  function fire(kind: HappyAttack): void {
    if (kind === 'spray') {
      hold('spray', 700);
      rig.kick(0.08);
      world.sfx('squeeze');
      for (const p of sprayPuffs(rng, phase, nozzle(), world.player.x, sprays++ % C.spray.pinkEvery === 1)) later.add(p.delayMs, () => puff(p));
    } else if (kind === 'drips') {
      for (const d of drops) later.add(d.delayMs, () => drop(d));
    } else if (kind === 'minis') {
      world.sfx('lob');
      miniDrops(rng, phase).forEach((x, i) => later.add(i * C.minis.gapMs, () => mini(x)));
    } else {
      hold('launch', 500);
      rig.kick(-0.15);
      rocket(lanes[0]);
      laneWarn(lanes[1], C.rocket.warnMs);
      later.add(C.rocket.warnMs, () => {
        hold('launch', 500);
        rocket(lanes[1]);
      });
    }
  }

  function rage(dt: number): void {
    modeMs += dt;
    if (modeMs < 1000) {
      rig.grow = 1 + (C.grow - 1) * 0.6 * (modeMs / 1000) + Math.sin(modeMs / 40) * 0.012;
      rig.x = C.x + Math.sin(modeMs / 18) * 1.5;
      return;
    }
    if (!burst) {
      burst = true;
      rig.grow = C.grow;
      rig.x = C.x;
      rig.kick(0.4);
      world.shake(7, 420);
      world.sfx('blast');
      const top = boxTop();
      for (let i = 0; i < 9; i++) {
        const d = scene.add.sprite(40 + rng() * 560, 70 + rng() * 200, HK.decal, i % 4).setDepth(-14).setAngle(rng() * 360);
        decals.push(d.setScale(0));
        fx.add(HK.drop, top.x, top.y, 600, { frames: [i % PINK], depth: 8, tick: (sp, p) => sp.setPosition(top.x + (d.x - top.x) * p, top.y + (d.y - top.y) * p - Math.sin(p * Math.PI) * 60) });
        later.add(600, () => d.setScale(0.9 / world.k));
      }
      for (let i = 0; i < 6; i++) later.add(600, () => splat(40 + rng() * 360, i % PINK));
    }
    if (modeMs >= C.transformMs) mode = 'fight';
  }

  function knockout(dt: number): void {
    modeMs += dt;
    if (modeMs < 1400 || flat) return;
    flat = true;
    hold('flat', 1e9);
    rig.kick(0.5);
    world.sfx('blast');
    poof(rig.x - 40, F - 10);
    poof(rig.x + 40, F - 10);
  }

  return {
    hurtBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : [rig.box(...C.hurt)];
    },
    bodyBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : [rig.box(...C.bodyBox)];
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
      if (poseMs > 0) poseMs -= dt;
      const now: HappyPose = poseMs > 0 ? pose : mode === 'ko' ? 'dizzy' : 'idle';
      applyHappyPose(rig, now, t, phase > 0);
      rig.update(dt);
    },
    onPhase(p: number): void {
      if (p <= phase || mode === 'ko') return;
      phase = p;
      mode = 'rage';
      modeMs = 0;
      sched.setPhase(p, C.transformMs);
      later.clear();
      hold('puff', 1000);
      world.sfx('phase');
      world.shake(3, 900);
      world.say(HAPPY_LINES.rage, 1400);
    },
    onHit(): void {
      rig.flash();
    },
    onKnockout(): void {
      mode = 'ko';
      modeMs = 0;
      sched.stop();
      later.clear();
      rig.grow = phase > 0 ? C.grow : 1;
      rig.x = C.x;
      hold('idle', 0);
      world.say(HAPPY_LINES.ko, 1500);
    },
    get done(): boolean {
      return mode === 'ko' && modeMs >= C.koMs;
    },
    destroy(): void {
      later.clear();
      fx.clear();
      rig.destroy();
      for (const d of decals) d.destroy();
    },
  };
}
