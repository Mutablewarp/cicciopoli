/**
 * Monsieur Brie's puppet, rebuilt from the shirt cut-outs: the bicycle group (rear wheel, front wheel, the
 * frame with his pedalling legs as printed, and the basket in front of him), the wedge with its face
 * frames, the beret, and rubber-hose arms / legs drawn live between the cut gloves and feet. Pedalling
 * spokes, bob and squash at rest, readable wind-up poses, the wheelie, the flight off the bike, the melt.
 */
import type Phaser from 'phaser';
import { ARENA, type BossWorld, type Vec } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { part, placeAt, type Rig, type RigFrame } from './kit/runner';
import { hex, hose, pinned, toLocal, type HoseStyle } from './kit/bits';
import { BRIE as C, type ArmPose } from './config';
import { PUDDLE, SHIRT } from './art';
import { STAR } from './art-props';
import { KEY } from './look';
import { BRIE_ART as A } from './sheet';
import { pickPose, type Mode } from './poses';
import type { BrieAttack } from './patterns';

const F = ARENA.floorY;
const PX = A.pxPerUnit;
const L = (c: Vec): Vec => toLocal(A.origin, PX, c);
const FACE = Object.fromEntries(A.faces.map((f, i) => [f, i])) as Record<(typeof A.faces)[number], number>;
const HAZARD: Record<string, { texture: string; anim?: string }> = {
  baguette: { texture: KEY.baguette },
  wheel: { texture: KEY.wheel },
  beret: { texture: KEY.beretToss },
  wave: { texture: KEY.wave, anim: KEY.waveAnim },
};
const ARM: HoseStyle = { w: C.limb.arm.w, edge: C.limb.arm.edge, fill: hex(SHIRT.white), ink: hex(SHIRT.ink) };
const LEG: HoseStyle = { w: C.limb.leg.w, edge: C.limb.leg.edge, fill: hex(SHIRT.white), ink: hex(SHIRT.ink) };

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
/** the glove as printed points along the arm shoulder → wrist: that direction is its rotation 0 */
const GLOVE_DIR = Math.atan2(A.pivots.wrist.y - A.pivots.shoulderR.y, A.pivots.wrist.x - A.pivots.shoulderR.x);

/** Hose control point: the middle of a → b pushed sideways by `bend`. */
function bendOf(a: Vec, b: Vec, bend: number): Vec {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy) || 1;
  return { x: (a.x + b.x) / 2 - (dy / d) * bend, y: (a.y + b.y) / 2 + (dx / d) * bend };
}

export function makeBrieRig(world: BossWorld): Rig<BrieAttack> {
  const { scene, k } = world;
  const P = A.pivots;
  const T = C.transform;
  const shadow = worldSprite(scene, 0, F, KEY.shadow, k).setDepth(-1);
  // the bicycle: behind him (wheels, frame, printed legs) and in front of him (basket, loaf, bottle, glove)
  const wheelR = pinned(scene, KEY.wheelR, A.wheelR, P.hubR, PX).setPosition(L(P.hubR).x, L(P.hubR).y);
  const wheelF = pinned(scene, KEY.wheelF, A.wheelF, P.hubF, PX).setPosition(L(P.hubF).x, L(P.hubF).y);
  const frame = pinned(scene, KEY.bike, A.bike, A.origin, PX);
  const bike = scene.add.container(0, 0, [wheelR, wheelF, frame]).setDepth(0);
  const basket = scene.add.container(0, 0, [pinned(scene, KEY.basket, A.basket, A.origin, PX)]).setDepth(0.2);
  // his body: legs and the left arm behind the wedge, the beret on top; the right arm in front of all
  const legs = [scene.add.graphics(), scene.add.graphics()];
  const feet = [0, 1].map(() => pinned(scene, KEY.foot, A.foot, P.ankle, PX));
  const armLG = scene.add.graphics();
  const gloveL = pinned(scene, KEY.glove, A.glove, P.wrist, PX);
  const wedge = pinned(scene, KEY.wedge, A.wedge, P.wedgeBase, PX);
  const beret = pinned(scene, KEY.beret, A.beret, P.beret, PX);
  const puddle = part(scene, KEY.puddle, k, PUDDLE.footX, PUDDLE.footY, PUDDLE.w, PUDDLE.h);
  const stars = [0, 1, 2].map(() => part(scene, KEY.star, k, STAR.w / 2, STAR.h / 2, STAR.w, STAR.h));
  const body = scene.add.container(0, 0, [legs[0], feet[0], legs[1], feet[1], armLG, gloveL, wedge, beret, puddle, ...stars]).setDepth(0.1);
  const armRG = scene.add.graphics();
  const gloveR = pinned(scene, KEY.glove, A.glove, P.wrist, PX);
  const front = scene.add.container(0, 0, [armRG, gloveR]).setDepth(0.3);
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

  /** One arm: hose from the shoulder to the pose's hand, the cut glove turned along the hose. */
  function drawArm(g: Phaser.GameObjects.Graphics, glove: Phaser.GameObjects.Sprite, sh: Vec, pose: ArmPose, sway: number): void {
    const hand = { x: sh.x + pose.hand.x, y: sh.y + pose.hand.y + sway };
    const c = bendOf(sh, hand, pose.bend);
    g.clear();
    hose(g, sh, c, hand, ARM);
    glove.setPosition(hand.x, hand.y).setRotation(Math.atan2(hand.y - c.y, hand.x - c.x) - GLOVE_DIR + pose.twist);
  }

  /** Both legs from the hips under the wedge to the cut feet on the floor (on foot only). */
  function drawLegs(wb: Vec, lift: readonly [number, number], spread: number): void {
    C.rig.hips.forEach((h, i) => {
      const hip = add(wb, h);
      const a = C.rig.ankles[i] ?? C.rig.ankles[0];
      const ankle = { x: a.x * spread, y: a.y - (lift[i] ?? 0) };
      const g = legs[i];
      const foot = feet[i];
      if (!g || !foot) return;
      g.clear();
      hose(g, hip, bendOf(hip, ankle, i ? 5 : -5), ankle, LEG);
      foot.setPosition(ankle.x, ankle.y).setRotation(C.limb.footRot);
    });
  }

  function modeOf(f: RigFrame<BrieAttack>): Mode {
    if (f.stage === 'ko') return 'ko';
    if (f.stage === 'transform') return f.t < T.skidMs ? 'skid' : f.t < T.skidMs + T.flyMs ? 'fly' : 'foot';
    return f.phase === 0 ? 'bike' : 'foot';
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
    const pz = pickPose(f, mode, onBike, prevT, puff);
    let face: number = FACE[pz.face];
    if (f.hit < 130 && f.stage !== 'ko') face = FACE.hurt;
    let { sx, sy } = pz;
    if (f.hit < 140 && f.stage !== 'ko') {
      const w = 0.035 * Math.sin(f.hit / 16);
      sx *= 1 + w;
      sy *= 1 - w;
    }

    // the bicycle
    const spin = Math.floor(f.clock / (f.attack === 'charge' && f.stage !== 'recover' ? 30 : 70));
    const spoke = 3 - (spin % 4);
    wheelR.setFrame(spoke);
    wheelF.setFrame((spoke + 2) % 4);
    if (onBike) {
      frame.setFrame(0);
      bike.setVisible(true);
      basket.setVisible(true);
      for (const o of [bike, basket]) placeAt(o, f.pose.x, f.pose.y, sx * fs, sy, pz.rot * fs, pz.px, pz.py);
    } else if (f.stage === 'transform' || (mode === 'ko' && f.phase === 0)) {
      // the empty bike rolls away on its own: tumbling after the transformation, upright after a knockout
      const flung = f.stage === 'transform';
      const tt = flung ? f.t - T.skidMs : f.t - C.ko.wobbleMs;
      const x = flyFrom - (flung ? T.skidBack : 0) + Math.max(0, tt) * T.bikeRoll;
      frame.setFrame(1);
      for (const o of [bike, basket]) {
        o.setVisible(x < ARENA.w + 160);
        placeAt(o, x, F, 1, 1, flung ? tt * T.bikeSpin : 0, 0, -30);
      }
    } else {
      bike.setVisible(false);
      basket.setVisible(false);
    }

    // the body (local units from the feet, facing left)
    const bob = onBike ? Math.sin(f.clock / 150) * 1.2 : Math.sin(f.clock / 300) * 1.2;
    const wb = onBike ? { x: C.rig.bikeWedge.x, y: C.rig.bikeWedge.y + bob } : { x: C.rig.footWedge.x, y: C.rig.footWedge.y + bob + pz.crouch };
    const breathe = onBike ? 0 : Math.sin(f.clock / 300) * 0.025;
    wedge.setPosition(wb.x, wb.y).setFrame(face).setScale((1 + breathe) / PX, (1 - breathe) / PX).setRotation(onBike ? 0 : pz.lean);
    for (const g of [...legs, ...feet]) g.setVisible(!onBike && mode !== 'ko');
    if (!onBike) drawLegs(wb, pz.lift, pz.spread);
    // arms: the right one always; the left one only off the bike (on it, its glove holds the loaf in the basket)
    const sway = pz.arm === 'limp' ? Math.sin(f.clock / 380) * 3 : 0;
    drawArm(armRG, gloveR, add(wb, C.rig.shoulder), C.arms[pz.arm], sway);
    armLG.setVisible(!onBike);
    gloveL.setVisible(!onBike);
    if (!onBike) drawArm(armLG, gloveL, add(wb, C.rig.shoulderL), C.arms[pz.armL], -sway);
    // the beret: on the head, twirled on a finger, or away as a boomerang
    const beretOut = f.attack === 'beret' && f.stage === 'active';
    if (pz.arm === 'twirl') {
      const hand = add(add(wb, C.rig.shoulder), C.arms.twirl.hand);
      beret.setPosition(hand.x, hand.y - 8).setRotation((f.t / 1000) * C.beret.spin * (Math.PI / 180));
    } else beret.setPosition(wb.x + C.rig.beret.x, wb.y + C.rig.beret.y).setRotation(Math.sin(f.clock / 420) * 0.05);
    beret.setVisible(!beretOut);
    puddle.setVisible(false);
    for (const s of stars) s.setVisible(false);
    wedge.setVisible(true);
    armRG.setVisible(true);
    gloveR.setVisible(true);
    if (mode === 'ko') drawKo(f, onBike);
    for (const o of [body, front]) placeAt(o, f.pose.x, f.pose.y, sx * fs, sy, pz.rot * fs, pz.px, pz.py);

    const lift = Math.max(0, F - f.pose.y);
    shadow.setPosition(f.pose.x, F).setScale(((onBike ? 2.2 : 1.2) * Math.max(0.35, 1 - lift / 220)) / k, 1 / k);
    shadow.setVisible(mode !== 'ko' || f.t < C.ko.wobbleMs);
    prevT = f.t;
  }

  function drawKo(f: RigFrame<BrieAttack>, onBike: boolean): void {
    const K = C.ko;
    if (f.t < K.wobbleMs) {
      wedge.setFrame(FACE.dizzy).setRotation(Math.sin(f.t / 45) * 0.12);
      for (const g of [...legs, ...feet]) g.setVisible(!onBike);
      return;
    }
    for (const o of [...legs, ...feet, armLG, gloveL, armRG, gloveR, wedge]) o.setVisible(false);
    const u = (f.t - K.wobbleMs) / K.meltMs;
    const fr = u < 0.33 ? 0 : u < 0.66 ? 1 : u < 1 ? 2 : 2 + (Math.floor(f.t / 160) % 2);
    puddle.setVisible(true).setFrame(fr).setPosition(0, 0);
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
    parts: [wheelR, wheelF, frame, wedge, beret, gloveR, gloveL, ...feet],
    draw,
    hazard: (kind) => HAZARD[kind] ?? { texture: KEY.baguette },
    destroy(): void {
      for (const o of [bike, basket, body, front, shadow, ...puffs]) o.destroy();
    },
  };
}

