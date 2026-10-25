/**
 * Monsieur Brie's puppet: the bicycle (its own sprite, so it can roll away), and a container with the
 * legs, the wedge, the throwing arm, the beret and the knockout puddle. Picks frames and squash /
 * stretch from the runner's frame: pedalling and blinking at rest, readable wind-up poses, the wheelie,
 * the flight off the bike, the melt.
 */
import { ARENA, type BossWorld } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { part, placeAt, type Rig, type RigFrame } from './kit/runner';
import { BRIE as C } from './config';
import { ARM, BERET, LEGS, PUDDLE, WEDGE } from './art-body';
import { BIKE } from './art-bike';
import { STAR } from './art-props';
import { KEY } from './look';
import type { BrieAttack } from './patterns';

const F = ARENA.floorY;
const EX = { idle: 0, blink: 1, windup: 2, shout: 3, hurt: 4, angry: 5, angryBlink: 6, dizzy: 7, angryShout: 8 } as const;
const AR = { grip: 0, raise: 1, throw: 2, twirl: 3, basket: 4, bundle: 5, fist: 6, limp: 7 } as const;
const LG = { stand: 0, stepL: 1, stepR: 2, crouch: 3, tuck: 4, splat: 5 } as const;
const HAZARD: Record<string, { texture: string; anim?: string }> = {
  baguette: { texture: KEY.baguette },
  wheel: { texture: KEY.wheel },
  beret: { texture: KEY.beret },
  wave: { texture: KEY.wave, anim: KEY.waveAnim },
};

type Mode = 'bike' | 'skid' | 'fly' | 'foot' | 'ko';
/** how long a landing squash lasts */
const LAND_MS = 260;

export function makeBrieRig(world: BossWorld): Rig<BrieAttack> {
  const { scene, k } = world;
  const T = C.transform;
  const shadow = worldSprite(scene, 0, F, KEY.shadow, k).setDepth(-1);
  const bike = part(scene, KEY.bike, k, BIKE.footX, BIKE.footY, BIKE.w, BIKE.h).setDepth(0);
  const legs = part(scene, KEY.legs, k, LEGS.footX, LEGS.footY, LEGS.w, LEGS.h);
  const wedge = part(scene, KEY.wedge, k, WEDGE.footX, WEDGE.footY, WEDGE.w, WEDGE.h);
  const arm = part(scene, KEY.arm, k, ARM.sx, ARM.sy, ARM.w, ARM.h);
  const beret = part(scene, KEY.beret, k, BERET.w / 2, BERET.h * 0.6, BERET.w, BERET.h);
  const puddle = part(scene, KEY.puddle, k, PUDDLE.footX, PUDDLE.footY, PUDDLE.w, PUDDLE.h);
  const stars = [0, 1, 2].map(() => part(scene, KEY.star, k, STAR.w / 2, STAR.h / 2, STAR.w, STAR.h));
  const body = scene.add.container(0, 0, [legs, wedge, arm, beret, puddle, ...stars]).setDepth(0);
  const puffs = [0, 1, 2, 3].map(() => worldSprite(scene, 0, 0, KEY.puff, k).setDepth(1).setVisible(false));
  let puffN = 0;
  let prevT = 0;
  let prevStage = '';
  let flyFrom = 0;

  const puff = (x: number, y: number): void => {
    const p = puffs[puffN++ % puffs.length];
    if (!p) return;
    p.setPosition(x, y - 10).setVisible(true).play(KEY.puffAnim);
    p.once('animationcomplete', () => p.setVisible(false));
  };

  const crossed = (at: number, t: number): boolean => prevT < at && at <= t;

  function modeOf(f: RigFrame<BrieAttack>): Mode {
    if (f.stage === 'ko') return 'ko';
    if (f.stage === 'transform') return f.t < T.skidMs ? 'skid' : f.t < T.skidMs + T.flyMs ? 'fly' : 'foot';
    return f.phase === 0 ? 'bike' : 'foot';
  }

  /** arm frame + wedge expression for the current attack beat */
  function act(f: RigFrame<BrieAttack>, onBike: boolean): [number, number] {
    const angry = !onBike;
    const tele = f.stage === 'telegraph';
    const active = f.stage === 'active';
    const hazards = f.plan?.hazards ?? [];
    const throwing = active && hazards.some((h) => f.t >= h.atMs && f.t < h.atMs + 220);
    const shout = angry ? EX.angryShout : EX.shout;
    const windup = angry ? EX.angryShout : EX.windup;
    switch (f.stage === 'telegraph' || active ? f.attack : null) {
      case 'baguette':
      case 'volley':
        return [throwing ? AR.throw : AR.raise, throwing ? shout : windup];
      case 'wheels':
        return [AR.basket, throwing ? shout : windup];
      case 'bounce':
        return [AR.fist, throwing ? shout : windup];
      case 'charge':
        return [AR.grip, tele ? EX.windup : EX.shout];
      case 'beret':
        return tele ? [AR.twirl, EX.windup] : [f.t < 300 ? AR.throw : AR.fist, EX.shout];
      case 'javelin':
        return [throwing ? AR.throw : AR.bundle, throwing ? shout : windup];
      case 'hop':
        return [AR.fist, shout];
      default: {
        const blink = (f.clock + 1700) % 3400 < 130;
        const idle = angry ? (blink ? EX.angryBlink : EX.angry) : blink ? EX.blink : EX.idle;
        return [onBike ? AR.grip : AR.limp, idle];
      }
    }
  }

  function draw(f: RigFrame<BrieAttack>): void {
    if (f.stage !== prevStage) {
      prevT = 0;
      prevStage = f.stage;
      if (f.stage === 'transform' || f.stage === 'ko') flyFrom = f.pose.x;
    }
    const mode = modeOf(f);
    const fs = f.pose.f === -1 ? 1 : -1;
    const onBike = mode === 'bike' || mode === 'skid' || (mode === 'ko' && f.phase === 0 && f.t < C.ko.wobbleMs);
    let [armF, ex] = act(f, onBike);
    if (f.hit < 130 && f.stage !== 'ko') ex = EX.hurt;
    let sx = 1;
    let sy = 1;
    let rot = 0;
    let px = 0;
    let py = -90;
    let legF: number = f.clock % 520 < 260 ? LG.stepL : LG.stepR;
    // wind-ups and moves
    if (f.attack === 'charge' && f.stage === 'telegraph') {
      rot = 0.24 * Math.min(1, f.t / 350);
      px = 52;
      py = 0;
      if (Math.floor(f.t / 220) !== Math.floor(prevT / 220)) puff(f.pose.x + 56 * fs, F);
    } else if (f.attack === 'charge' && f.stage === 'active' && f.plan?.move) {
      const a = f.plan.move(f.t);
      const b = f.plan.move(f.t + 30);
      rot = Math.max(-0.35, Math.min(0.35, ((a.y - b.y) / 30) * 0.5));
    } else if (f.attack === 'hop' && f.stage === 'telegraph') {
      legF = LG.crouch;
      sx = 1.12;
      sy = 0.84;
    } else if (f.attack === 'hop' && f.stage === 'active') {
      const h = C.hop;
      const back = h.outMs + h.holdMs + h.backMs;
      const since = f.t >= back ? f.t - back : f.t >= h.outMs ? f.t - h.outMs : -1;
      const airborne = (f.t < h.outMs) || (f.t >= h.outMs + h.holdMs && f.t < back);
      legF = airborne ? LG.tuck : since >= 0 && since < LAND_MS ? LG.splat : LG.stand;
      if (!airborne && since >= 0 && since < LAND_MS) {
        const u = 1 - since / LAND_MS;
        sx = 1 + 0.2 * u;
        sy = 1 - 0.2 * u;
      }
      if (!airborne && f.t >= back) [armF, ex] = [AR.limp, EX.angry];
    } else if (f.stage === 'telegraph') {
      sx = 1 + 0.04 * Math.sin(f.t / 60);
      sy = 2 - sx;
    }
    if (mode === 'skid') {
      rot = -0.1;
      px = -52;
      py = 0;
      ex = EX.shout;
      if (Math.floor(f.t / 110) !== Math.floor(prevT / 110)) puff(f.pose.x - 50, F);
    }
    if (mode === 'fly') {
      const u = (f.t - T.skidMs) / T.flyMs;
      rot = u * Math.PI * 2;
      legF = LG.tuck;
      armF = AR.fist;
      ex = EX.angryShout;
    }
    if (mode === 'foot' && f.stage === 'transform') {
      const u = (f.t - T.skidMs - T.flyMs) / (C.transformMs - T.skidMs - T.flyMs);
      legF = u < 0.4 ? LG.splat : LG.stand;
      sx = 1 + 0.2 * Math.max(0, 1 - u * 2.5);
      sy = 2 - sx;
      ex = EX.angryShout;
      armF = AR.fist;
      if (crossed(T.skidMs + T.flyMs, f.t)) {
        puff(f.pose.x - 20, F);
        puff(f.pose.x + 20, F);
      }
    }
    if (f.hit < 140 && f.stage !== 'ko') {
      const w = 0.035 * Math.sin(f.hit / 16);
      sx *= 1 + w;
      sy *= 1 - w;
    }
    // landings throw up dust
    if (f.stage === 'active' && f.plan) for (const c of f.plan.cues) if (c.sfx === 'blast' && crossed(c.atMs, f.t)) {
      puff(f.pose.x - 26, F);
      puff(f.pose.x + 26, F);
    }

    // the bicycle
    const pedal = Math.floor(f.clock / (f.attack === 'charge' && f.stage !== 'recover' ? 32 : 75)) % BIKE.frames;
    if (onBike) {
      bike.setVisible(true).setFrame(pedal);
      placeAt(bike, f.pose.x, f.pose.y, (sx * fs) / k, sy / k, rot * fs, px * k, py * k);
    } else if (f.stage === 'transform' || (mode === 'ko' && f.phase === 0)) {
      // the empty bike rolls away on its own: tumbling after the transformation, upright after a knockout
      const flung = f.stage === 'transform';
      const tt = flung ? f.t - T.skidMs : f.t - C.ko.wobbleMs;
      const x = flyFrom - (flung ? T.skidBack : 0) + Math.max(0, tt) * T.bikeRoll;
      bike.setVisible(x < ARENA.w + 120).setFrame(pedal);
      placeAt(bike, x, F, 1 / k, 1 / k, flung ? tt * T.bikeSpin : 0, 0, -27 * k);
    } else bike.setVisible(false);

    // the body
    const w = onBike ? C.rig.bikeWedge : C.rig.footWedge;
    const bob = onBike ? Math.sin(f.clock / 75 / 2) * 1.4 : Math.sin(f.clock / 300) * 1.2;
    const crouch = legF === LG.crouch || legF === LG.splat ? 8 : 0;
    const breathe = onBike ? 0 : Math.sin(f.clock / 300) * 0.03;
    legs.setVisible(!onBike && mode !== 'ko').setFrame(legF);
    wedge.setPosition(w.x, w.y + bob + crouch).setFrame(ex).setScale((1 + breathe) / k, (1 - breathe) / k).setRotation(onBike ? -0.05 : 0);
    const sh = { x: w.x + C.rig.shoulder.x, y: w.y + C.rig.shoulder.y + bob + crouch };
    arm.setPosition(sh.x, sh.y).setFrame(armF).setRotation(armF === AR.limp ? Math.sin(f.clock / 380) * 0.15 : 0);
    const beretOut = f.attack === 'beret' && f.stage === 'active';
    const twirl = f.attack === 'beret' && f.stage === 'telegraph';
    if (twirl) beret.setPosition(sh.x + C.rig.twirlHand.x, sh.y + C.rig.twirlHand.y - 6).setRotation((f.t / 1000) * C.beret.spin * (Math.PI / 180));
    else beret.setPosition(w.x + C.rig.beret.x, w.y + C.rig.beret.y + bob + crouch).setRotation(-0.15 + Math.sin(f.clock / 420) * 0.06);
    beret.setVisible(!beretOut);
    puddle.setVisible(false);
    for (const s of stars) s.setVisible(false);
    if (mode === 'ko') drawKo(f, onBike);
    placeAt(body, f.pose.x, f.pose.y, sx * fs, sy, rot * fs, px, py);

    const lift = Math.max(0, F - f.pose.y);
    shadow.setPosition(f.pose.x, F).setScale(((onBike ? 2.1 : 1.1) * Math.max(0.35, 1 - lift / 220)) / k, 1 / k);
    shadow.setVisible(mode !== 'ko' || f.t < C.ko.wobbleMs);
    prevT = f.t;
  }

  function drawKo(f: RigFrame<BrieAttack>, onBike: boolean): void {
    const K = C.ko;
    if (f.t < K.wobbleMs) {
      wedge.setFrame(EX.dizzy).setRotation(Math.sin(f.t / 45) * 0.12);
      arm.setFrame(AR.limp);
      legs.setVisible(!onBike).setFrame(LG.splat);
      return;
    }
    legs.setVisible(false);
    wedge.setVisible(false);
    arm.setVisible(false);
    const u = (f.t - K.wobbleMs) / K.meltMs;
    const frame = u < 0.33 ? 0 : u < 0.66 ? 1 : u < 1 ? 2 : 2 + (Math.floor(f.t / 160) % 2);
    puddle.setVisible(true).setFrame(frame).setPosition(0, 0);
    const b = Math.min(1, Math.max(0, (f.t - K.wobbleMs - K.meltMs * 0.5) / K.meltMs));
    beret
      .setVisible(true)
      .setPosition(Math.sin(f.t / 180) * 14 * (1 - b), K.beretFrom + (K.beretTo - K.beretFrom) * b)
      .setRotation(Math.sin(f.t / 180) * 0.5 * (1 - b) - 0.2);
    if (f.t > K.starsAt)
      stars.forEach((s, i) => {
        const a = f.t / 260 + (i / stars.length) * Math.PI * 2;
        s.setVisible(true).setPosition(Math.cos(a) * 30, -36 + Math.sin(a) * 8);
      });
  }

  return {
    parts: [bike, legs, wedge, arm, beret, puddle],
    draw(f): void {
      wedge.setVisible(true);
      arm.setVisible(true);
      draw(f);
    },
    hazard: (kind) => HAZARD[kind] ?? { texture: KEY.baguette },
    destroy(): void {
      body.destroy();
      bike.destroy();
      shadow.destroy();
      for (const p of puffs) p.destroy();
    },
  };
}
