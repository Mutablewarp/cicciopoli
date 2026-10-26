/**
 * DON TUMA in the ring (BossRuntime): the mascot of the shirt, lounging in his deck chair the whole fight.
 * Phase 0: citrus lobbed from the waving glove, sun beams off his sunglasses, honey from the awning.
 * Transformation: he boils red with anger and bounces in the chair. Phase 1: faster citrus, three beams,
 * his folding deck chair comes alive and bites, the wheel of tuma he kicks rolls at the hero.
 * Knockout: dizzy, then he melts into the chair. Every attack: wind-up pose + glint + sound >= 500 ms first.
 */
import type Phaser from 'phaser';
import { ARENA, type BossRuntime, type BossWorld, type Box, type HazardHandle } from '../../api';
import { SHOT, SPOT, TK, TUMA_CFG as C, TUMA_LINES, TUMA_RIG, type TumaAttack, type TumaPart, tumaTex } from './config';
import { Fx } from './kit/fx';
import type { Shot, Span } from './kit/geom';
import { Rig } from './kit/rig';
import { Later, Scheduler } from './kit/sched';
import { SPLAT } from './kit/toon';
import { honeyRain, lemonVolley, sunBeams } from './plan';
import { type TumaPose, applyPose } from './poses';
import { BEAM, JAWS, SPLAT_OF } from './props';

const F = ARENA.floorY;
const SPLAT_BY_SHOT: Record<number, number> = { [SHOT.lemon]: SPLAT_OF.lemon, [SHOT.orange]: SPLAT_OF.orange, [SHOT.blood]: SPLAT_OF.blood, [SHOT.honey]: SPLAT_OF.honey };

export function createTuma(world: BossWorld): BossRuntime {
  const scene: Phaser.Scene = world.scene;
  const rng = (): number => world.rng();
  const rig = new Rig<TumaPart>(scene, TUMA_RIG, C.scale, tumaTex(world.k), C.x, F, 3);
  const jawsY = F - (JAWS.footY - JAWS.h / 2);
  const pet = scene.add.sprite(C.jaws.restX, jawsY, TK.jaws, 1).setScale(1 / world.k).setDepth(2).setVisible(false);
  const fx = new Fx(scene, world.k);
  const later = new Later();
  const sched = new Scheduler<TumaAttack>(C.attacks, rng, C.startMs);
  let phase = 0;
  let mode: 'fight' | 'rage' | 'ko' = 'fight';
  let modeMs = 0;
  let pose: TumaPose = 'idle';
  let poseMs = 0;
  let melted = false;
  let t = 0;
  let volleys = 0;
  let count = 0;
  let beams: Span[] = [];
  let drops: Shot[] = [];

  const hold = (p: TumaPose, ms: number): void => {
    pose = p;
    poseMs = ms;
  };
  const glint = (x: number, y: number): void => {
    fx.add(TK.glint, x, y, 480, { frames: [0, 1], fps: 10, loop: true, depth: 8, tick: (s, p) => s.setAngle(p * 120).setAlpha(1 - p * p) });
  };
  const dust = (x: number, y = F - 10): void => {
    for (const dx of [-24, 24]) fx.add(TK.dust, x + dx, y, 330, { frames: [0, 1, 2], fps: 10, depth: 4, tick: (s, p) => s.setX(x + dx * (1 + p)) });
  };
  const splat = (x: number, base: number): void => {
    fx.add(TK.splat, x, F - SPLAT.h / 2 + 3, 300, { frames: [base, base + 1, base + 2], fps: 10, depth: 1 });
  };
  const glove = (): { x: number; y: number } => rig.live('wave', SPOT.glove[0], SPOT.glove[1]);
  const glasses = (): { x: number; y: number } => rig.live('body', SPOT.glasses[0], SPOT.glasses[1]);

  function shoot(s: Shot): void {
    world.spawnHazard({
      x: s.x,
      y: s.y,
      vx: s.vx,
      vy: s.vy,
      ay: s.ay,
      r: s.r,
      texture: TK.shot,
      frame: s.frame,
      pink: s.pink,
      spin: s.frame === SHOT.honey ? 0 : 280,
      lifeMs: 6000,
      update(h: HazardHandle): void {
        if (mode === 'ko') return h.destroy();
        if (h.y < F - s.r) return;
        splat(h.x, SPLAT_BY_SHOT[s.frame]);
        h.destroy();
      },
    });
  }

  function launchPet(dir: -1 | 1): void {
    pet.setVisible(false);
    const J = C.jaws;
    world.sfx('chomp');
    world.spawnHazard({
      x: dir < 0 ? J.restX - 60 : J.outX,
      y: jawsY,
      vx: dir * J.speed,
      w: J.w,
      h: J.h,
      texture: TK.jaws,
      frame: 0,
      lifeMs: 8000,
      update(h: HazardHandle): void {
        if (mode === 'ko') return h.destroy();
        h.sprite.setFrame(Math.floor(t / 110) % 2).setFlipX(dir > 0);
        h.y = jawsY - Math.abs(Math.sin(t / 110)) * 5;
        if (dir < 0 && h.x <= J.outX) {
          h.destroy();
          later.add(J.pauseMs, () => {
            glint(26, jawsY - 30);
            world.sfx('chomp');
            later.add(J.warnMs, () => launchPet(1));
          });
        } else if (dir > 0 && h.x >= J.restX - 60) h.destroy();
      },
    });
  }

  function rollWheel(): void {
    const S = C.spin;
    let dir = -1;
    dust(S.fromX);
    world.sfx('blast');
    world.spawnHazard({
      x: S.fromX,
      y: F - S.r,
      vx: -S.speed,
      r: S.r * 0.9,
      texture: TK.wheel,
      lifeMs: 9000,
      update(h: HazardHandle, dt: number): void {
        if (mode === 'ko') return h.destroy();
        h.sprite.setAngle(h.sprite.angle + ((dir * S.speed * dt) / 1000 / S.r) * (180 / Math.PI));
        h.y = F - S.r;
        if (dir < 0 && h.x <= S.minX) {
          dir = 1;
          h.vx = S.speed;
          world.shake(4, 160);
          world.sfx('blast');
        } else if (dir > 0 && h.x >= S.fromX + 30) h.destroy();
      },
    });
  }

  function telegraph(kind: TumaAttack, ms: number): void {
    // the sun beams always get their balloon: the column warning alone is easy to miss on a phone
    if (++count % C.sayEvery === 0 || kind === 'beam') world.say(TUMA_LINES[kind], 1100);
    if (kind === 'lemons') {
      hold('reach', ms);
      rig.kick(-0.08);
      later.add(150, () => glint(glove().x, glove().y));
      world.sfx('dash');
    } else if (kind === 'beam') {
      hold('glint', ms + 700);
      later.add(200, () => glint(glasses().x, glasses().y));
      world.sfx('cardFull');
      beams = sunBeams(rng, phase, world.player.x);
      for (const [a, b] of beams) fx.add(TK.beam, (a + b) / 2, F - BEAM.h / 2, ms, { frames: [0], depth: 1, tick: (s, p) => s.setAlpha(0.6 + 0.4 * Math.abs(Math.cos(p * 9))) });
    } else if (kind === 'honey') {
      hold('honey', ms + 700);
      world.sfx('squeeze');
      drops = honeyRain(rng, world.player.x);
      for (const d of drops) fx.add(TK.shot, d.x, d.y, ms + d.delayMs, { frames: [SHOT.honey], depth: 6, tick: (s, p) => s.setScale((0.3 + 0.7 * Math.min(1, p * 1.5)) / world.k) });
    } else if (kind === 'jaws') {
      hold('whistle', ms);
      pet.setVisible(true).setX(C.jaws.restX - 40);
      glint(pet.x - 24, pet.y - 34);
      world.sfx('chomp');
    } else {
      hold('windup', ms);
      rig.kick(0.12);
      glint(C.spin.fromX, F - C.spin.r * 2);
      world.sfx('dash');
    }
  }

  function fire(kind: TumaAttack): void {
    if (kind === 'lemons') {
      const from = glove();
      hold('throw', 600);
      rig.kick(0.1);
      world.sfx('lob');
      const first = volleys === 0;
      for (const s of lemonVolley(rng, phase, from, world.player.x, volleys++ % C.lemon.pinkEvery === 1, first)) later.add(s.delayMs, () => shoot(s));
    } else if (kind === 'beam') {
      world.sfx('ex');
      world.shake(3, 220);
      const life = sched.current?.activeMs ?? 800;
      for (const [a, b] of beams) {
        world.spawnHazard({ x: (a + b) / 2, y: F - BEAM.h / 2, w: b - a, h: BEAM.h, texture: TK.beam, frame: 1, lifeMs: life, update: (h) => void h.sprite.setFrame(Math.floor(t / 70) % 2 ? 1 : 2) });
      }
    } else if (kind === 'honey') {
      for (const d of drops) later.add(d.delayMs, () => shoot(d));
    } else if (kind === 'jaws') {
      launchPet(-1);
    } else {
      hold('kick', 500);
      rig.kick(0.2);
      rollWheel();
    }
  }

  function rage(dt: number): void {
    modeMs += dt;
    rig.lift = Math.abs(Math.sin(modeMs / 140)) * 10 * Math.max(0, 1 - modeMs / C.transformMs);
    if (Math.floor(modeMs / 280) !== Math.floor((modeMs - dt) / 280)) {
      rig.kick(0.18);
      dust(C.x - 60);
      fx.add(TK.dust, glasses().x + 30, glasses().y - 60, 500, { frames: [0, 1, 2], fps: 6, depth: 8, tick: (s, p) => s.setY(glasses().y - 60 - p * 30).setAlpha(1 - p) });
    }
    if (modeMs >= C.transformMs) {
      mode = 'fight';
      rig.lift = 0;
      hold('idle', 0);
    }
  }

  function knockout(dt: number): void {
    modeMs += dt;
    if (modeMs >= 1400 && !melted) {
      melted = true;
      hold('melt', 1e9);
      rig.kick(0.5);
      world.sfx('melt');
      for (const dx of [-40, 0, 40]) splat(C.x + dx - 40, SPLAT_OF.honey);
    }
  }

  const boxes = (list: readonly (readonly number[])[]): Box[] => list.map(([x, y, w, h]) => rig.box(x, y, w, h));

  return {
    hurtBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : boxes(C.hurt);
    },
    bodyBoxes(): readonly Box[] {
      return mode === 'ko' ? [] : boxes(C.bodyBox);
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
      const now: TumaPose = mode === 'ko' && !melted ? 'dizzy' : poseMs > 0 ? pose : mode === 'rage' ? 'rage' : 'idle';
      applyPose(rig, now, t, phase > 0);
      rig.update(dt);
    },
    onPhase(p: number): void {
      if (p <= phase || mode === 'ko') return;
      phase = p;
      mode = 'rage';
      modeMs = 0;
      sched.setPhase(p, C.transformMs);
      later.clear();
      pet.setVisible(false);
      hold('idle', 0);
      rig.setTint(C.angryTint);
      rig.kick(-0.2);
      world.shake(5, 500);
      world.sfx('phase');
      world.say(TUMA_LINES.rage, 1400);
    },
    onHit(): void {
      rig.flash();
    },
    onKnockout(): void {
      mode = 'ko';
      modeMs = 0;
      sched.stop();
      later.clear();
      rig.lift = 0;
      hold('idle', 0);
      pet.setVisible(false);
      world.say(TUMA_LINES.ko, 1500);
    },
    get done(): boolean {
      return mode === 'ko' && modeMs >= C.koMs;
    },
    destroy(): void {
      later.clear();
      fx.clear();
      rig.destroy();
      pet.destroy();
    },
  };
}
