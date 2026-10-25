/**
 * DON TUMA in the ring (BossRuntime). Phase 0: lounging in the deck chair — citrus lobs, sun beams from
 * his sunglasses, honey rain. Transformation: he jumps out furious and the chair comes alive. Phase 1:
 * standing — faster citrus, three beams, the chair jaws, the cheese-wheel roll. Knockout: dizzy, then he
 * melts into a puddle under his coppola. Every attack: wind-up pose + sparkle + sound >= 500 ms first.
 */
import type Phaser from 'phaser';
import { ARENA, type BossRuntime, type BossWorld, type Box, type HazardHandle } from '../../api';
import { TF } from './art';
import { BALL, BODY, SHOT, TK, TUMA_CFG as C, TUMA_LINES, type TumaAttack } from './config';
import { Fx, ToonBody } from './kit/body';
import type { Shot, Span } from './kit/geom';
import { Later, Scheduler } from './kit/sched';
import { honeyRain, lemonVolley, sunBeams } from './plan';
import { SPLAT } from './kit/toon';
import { BEAM, JAWS, SPLAT_OF } from './props';

const F = ARENA.floorY;
const SPLAT_BY_SHOT: Record<number, number> = { [SHOT.lemon]: SPLAT_OF.lemon, [SHOT.orange]: SPLAT_OF.orange, [SHOT.blood]: SPLAT_OF.blood, [SHOT.honey]: SPLAT_OF.honey };

export function createTuma(world: BossWorld): BossRuntime {
  const scene: Phaser.Scene = world.scene;
  const texK = Math.min(world.k, C.kMax) * C.scale;
  const rng = (): number => world.rng();
  const chair = scene.add.sprite(C.seatX, F, TK.chair).setOrigin(0.5, BODY.footY / BODY.h).setScale(C.scale / texK).setDepth(2);
  const body = new ToonBody(scene, TK.body, texK, BODY, C.seatX, F, C.scale, 3);
  body.setLoop(TF.idle, 6);
  const jawsY = F - (JAWS.footY - JAWS.h / 2);
  const pet = scene.add.sprite(C.jaws.restX, jawsY, TK.jaws, 1).setScale(1 / world.k).setDepth(2).setVisible(false);
  const fx = new Fx(scene, world.k);
  const later = new Later();
  const sched = new Scheduler<TumaAttack>(C.attacks, rng, C.startMs);
  let phase = 0;
  let mode: 'seat' | 'rage' | 'stand' | 'ko' = 'seat';
  let modeMs = 0;
  let upright = false;
  let landed = false;
  let melted = false;
  let t = 0;
  let volleys = 0;
  let count = 0;
  let rollDir = 0;
  let petState: 'home' | 'tele' | 'out' = 'home';
  let beams: Span[] = [];
  let drops: Shot[] = [];

  const glint = (x: number, y: number): void => {
    fx.add(TK.glint, x, y, 480, { frames: [0, 1], fps: 10, loop: true, depth: 8, tick: (s, p) => s.setAngle(p * 120).setAlpha(1 - p * p) });
  };
  const dust = (x: number): void => {
    for (const dx of [-24, 24]) fx.add(TK.dust, x + dx, F - 10, 330, { frames: [0, 1, 2], fps: 10, depth: 4, tick: (s, p) => s.setX(x + dx * (1 + p)) });
  };
  const splat = (x: number, base: number): void => {
    fx.add(TK.splat, x, F - SPLAT.h / 2 + 3, 300, { frames: [base, base + 1, base + 2], fps: 10, depth: 1 });
  };
  const hand = (): { x: number; y: number } => (upright ? body.at(150, 18) : body.at(88, 10));

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
    petState = 'out';
    pet.setVisible(false);
    const J = C.jaws;
    world.sfx('chomp');
    world.spawnHazard({
      x: dir < 0 ? J.restX : J.outX,
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
        } else if (dir > 0 && h.x >= J.restX) {
          h.destroy();
          petState = 'home';
          pet.setVisible(true);
        }
      },
    });
  }

  function telegraph(kind: TumaAttack, ms: number): void {
    // the sun beams always get their balloon: the column warning alone is easy to miss on a phone
    if (++count % C.sayEvery === 0 || kind === 'beam') world.say(TUMA_LINES[kind], 1100);
    if (kind === 'lemons') {
      body.hold(upright ? TF.sReach : TF.reach, ms);
      body.kick(-0.08);
      glint(hand().x, hand().y);
      world.sfx('dash');
    } else if (kind === 'beam') {
      body.hold(upright ? TF.sReach : TF.glint, ms + 700);
      const p = upright ? hand() : body.at(105, 102);
      glint(p.x, p.y);
      world.sfx('cardFull');
      beams = sunBeams(rng, phase, world.player.x);
      for (const [a, b] of beams) fx.add(TK.beam, (a + b) / 2, F - BEAM.h / 2, ms, { frames: [0], depth: 1, tick: (s, p) => s.setAlpha(0.6 + 0.4 * Math.abs(Math.cos(p * 9))) });
    } else if (kind === 'honey') {
      body.hold(TF.honey, ms + 700);
      world.sfx('squeeze');
      drops = honeyRain(rng, world.player.x);
      for (const d of drops) fx.add(TK.shot, d.x, d.y, ms + d.delayMs, { frames: [SHOT.honey], depth: 6, tick: (s, p) => s.setScale((0.3 + 0.7 * Math.min(1, p * 1.5)) / world.k) });
    } else if (kind === 'jaws') {
      petState = 'tele';
      body.hold(TF.sThrow, ms);
      glint(pet.x - 24, pet.y - 34);
      world.sfx('chomp');
    } else {
      body.hold(TF.crouch, ms);
      body.kick(0.14);
      dust(body.x);
      world.sfx('dash');
    }
  }

  function fire(kind: TumaAttack): void {
    if (kind === 'lemons') {
      const from = hand();
      body.hold(upright ? TF.sThrow : TF.throw, 600);
      body.kick(0.1);
      world.sfx('lob');
      for (const s of lemonVolley(rng, phase, from, world.player.x, volleys++ % C.lemon.pinkEvery === 1)) later.add(s.delayMs, () => shoot(s));
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
      rollDir = -1;
      body.pivot(BALL.y);
      body.hold(TF.ball, 60000);
      world.sfx('blast');
    }
  }

  function roll(dt: number): void {
    const d = (C.spin.speed * dt) / 1000;
    body.x += rollDir * d;
    body.angle += ((rollDir * d) / (BALL.r * C.scale)) * (180 / Math.PI);
    if (rollDir < 0 && body.x <= C.spin.minX) {
      rollDir = 1;
      world.shake(4, 160);
      world.sfx('blast');
      body.kick(0.25);
    } else if (rollDir > 0 && body.x >= C.standX) {
      rollDir = 0;
      body.x = C.standX;
      body.angle = 0;
      body.pivot(BODY.footY);
      body.release();
      body.kick(0.2);
      dust(body.x);
    }
  }

  function rage(dt: number): void {
    modeMs += dt;
    if (modeMs < 900) {
      body.x = C.seatX + Math.sin(modeMs / 16) * 2;
      return;
    }
    if (modeMs < 1400) {
      const p = (modeMs - 900) / 500;
      if (!upright) {
        upright = true;
        chair.setVisible(false);
        pet.setVisible(true).setFrame(2);
        dust(C.seatX);
        world.sfx('chomp');
        body.setLoop(TF.angry, 6);
        body.release();
      }
      body.x = C.seatX + (C.standX - C.seatX) * p;
      body.lift = Math.sin(p * Math.PI) * 56;
      return;
    }
    if (!landed) {
      landed = true;
      body.lift = 0;
      body.x = C.standX;
      body.kick(0.3);
      world.shake(5, 220);
      dust(body.x);
    }
    if (modeMs >= C.transformMs) mode = 'stand';
  }

  function knockout(dt: number): void {
    modeMs += dt;
    if (modeMs < 1400) {
      body.angle = Math.sin(modeMs / 110) * 7;
    } else if (!melted) {
      melted = true;
      body.angle = 0;
      body.hold(TF.melt, 1e9);
      body.kick(0.5);
      world.sfx('melt');
      for (const dx of [-40, 0, 40]) splat(body.x + dx, SPLAT_OF.honey);
    }
    if (pet.visible) pet.setAngle(Math.max(-90, -modeMs / 6)).setY(jawsY + Math.min(20, modeMs / 40));
  }

  function petIdle(): void {
    if (!pet.visible || mode === 'ko') return;
    if (petState === 'tele') {
      pet.setFrame(Math.floor(t / 60) % 2 ? 2 : 1);
      pet.x = C.jaws.restX + Math.sin(t / 22) * 2.5;
    } else {
      pet.setFrame(Math.floor(t / 380) % 3 === 0 ? 0 : 1);
      pet.x = C.jaws.restX;
    }
  }

  const ballBox = (): Box => body.box(BALL.x - BALL.r * 0.9, BALL.y - BALL.r * 0.9, BALL.r * 1.8, BALL.r * 1.8);

  return {
    hurtBoxes(): readonly Box[] {
      if (mode === 'ko') return [];
      if (rollDir !== 0) return [ballBox()];
      return (upright ? C.hurt.stand : C.hurt.seat).map(([x, y, w, h]) => body.box(x, y, w, h));
    },
    bodyBoxes(): readonly Box[] {
      if (mode === 'ko') return [];
      if (rollDir !== 0) return [ballBox()];
      return upright ? [body.box(62, 50, 88, 146)] : [body.box(86, 66, 84, 100), body.box(26, 148, 66, 40)];
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
        if (rollDir !== 0) roll(dt);
        petIdle();
      }
      body.update(dt);
    },
    onPhase(p: number): void {
      if (p <= phase || mode === 'ko') return;
      phase = p;
      mode = 'rage';
      modeMs = 0;
      sched.setPhase(p, C.transformMs);
      later.clear();
      body.hold(TF.rage, 900);
      body.kick(-0.2);
      world.shake(5, 500);
      world.sfx('phase');
      world.say(TUMA_LINES.rage, 1400);
    },
    onHit(): void {
      body.flash();
    },
    onKnockout(): void {
      mode = 'ko';
      modeMs = 0;
      sched.stop();
      later.clear();
      rollDir = 0;
      upright = true;
      chair.setVisible(false);
      body.angle = 0;
      body.lift = 0;
      body.pivot(BODY.footY);
      body.release();
      body.setLoop(TF.dizzy, 5);
      pet.setVisible(upright && phase > 0).setFrame(1).setX(C.jaws.restX);
      world.say(TUMA_LINES.ko, 1500);
    },
    get done(): boolean {
      return mode === 'ko' && modeMs >= C.koMs;
    },
    destroy(): void {
      later.clear();
      fx.clear();
      body.destroy();
      chair.destroy();
      pet.destroy();
    },
  };
}
