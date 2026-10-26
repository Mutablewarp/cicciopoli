/**
 * Pancetta's puppet, rebuilt from the shirt cut-outs: the skateboard, the bacon strip flying behind him,
 * and the rider (crouching body, the arm making the V-sign wave, the head with its six faces) pinned on
 * the pivots measured on the shirt. Waving and pumping at rest, leaning with the half-pipe walls,
 * spinning in his ollies, kicking his board away, whirling and throwing the bacon, a dizzy knockout with
 * the board bonking his head; floor shadow and dust.
 */
import { ARENA, type BossWorld, type Vec } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { part, placeAt, type Rig, type RigFrame } from '../brie/kit/runner';
import { pinned, toLocal } from '../brie/kit/bits';
import { STAR } from '../brie/art-props';
import { PANCETTA as C } from './config';
import { KEY } from './look';
import { onPipe, type PancettaAttack } from './patterns';
import { pipeTilt } from './pipe';
import { PANCETTA_ART as A } from './sheet';

const F = ARENA.floorY;
const P = A.pivots;
const PX = A.pxPerUnit;
const L = (c: Vec): Vec => toLocal(A.origin, PX, c);
/** the shoes on the deck: the rider's origin (the board's is the floor under it) */
const FEET = L(P.feet);
/** a pivot relative to the shoes */
const rel = (c: Vec): Vec => ({ x: L(c).x - FEET.x, y: L(c).y - FEET.y });
const NECK = rel(P.neck);
const HEAD_TOP = toLocal(A.origin, PX, { x: 0, y: A.head.y }).y - FEET.y;
const FACE = Object.fromEntries(A.faces.map((f, i) => [f, i])) as Record<(typeof A.faces)[number], number>;
const M = C.move;
const LAND_MS = 260;
const SPIN_PIVOT = -80;
const HAZARD: Record<string, { texture: string; anim?: string }> = {
  flip: { texture: KEY.flip, anim: KEY.flipAnim },
  wheel: { texture: KEY.wheel },
  bacon: { texture: KEY.baconHz },
  baconPink: { texture: KEY.baconPinkHz },
  wave: { texture: KEY.shock, anim: KEY.shockAnim },
};

interface Look {
  face: number;
  /** arm turn from the printed pose */
  arm: number;
  /** rider squash (0 = as printed) */
  crouch: number;
  /** rider hop off the floor (world units, without his board) */
  lift: number;
  board: boolean;
  /** the bacon strip still flies behind him (not thrown) */
  bacon: boolean;
  spin: number;
  sx: number;
  sy: number;
}

export function makePancettaRig(world: BossWorld): Rig<PancettaAttack> {
  const { scene, k } = world;
  const shadow = worldSprite(scene, 0, F, KEY.shadow, k).setDepth(-1);
  const board = pinned(scene, KEY.board, A.board, A.origin, PX);
  const bacon = pinned(scene, KEY.bacon, A.bacon, P.bacon, PX);
  const body = pinned(scene, KEY.body, A.body, P.feet, PX);
  const arm = pinned(scene, KEY.arm, A.arm, P.shoulder, PX).setPosition(rel(P.shoulder).x, rel(P.shoulder).y);
  const head = pinned(scene, KEY.head, A.head, P.neck, PX).setPosition(NECK.x, NECK.y);
  const stars = [0, 1, 2].map(() => part(scene, KEY.star, k, STAR.w / 2, STAR.h / 2, STAR.w, STAR.h));
  const rider = scene.add.container(FEET.x, FEET.y, [body, arm, head, ...stars]);
  const puppet = scene.add.container(0, 0, [bacon, board, rider]);
  const koBoard = pinned(scene, KEY.board, A.board, { x: A.board.x + A.board.fw / 2, y: A.board.y + A.board.fh / 2 }, PX).setDepth(1).setVisible(false);
  const puffs = [0, 1, 2, 3].map(() => worldSprite(scene, 0, 0, KEY.puff, k).setDepth(1).setVisible(false));
  let puffN = 0;
  let prevT = 0;
  let prevStage = '';

  const puff = (x: number, y: number): void => {
    const p = puffs[puffN++ % puffs.length];
    if (!p) return;
    p.setPosition(x, y - 10).setVisible(true).play(KEY.puffAnim);
    p.once('animationcomplete', () => p.setVisible(false));
  };

  /** pose of the puppet for the current beat */
  function look(f: RigFrame<PancettaAttack>): Look {
    const blink = (f.clock + 1500) % 3100 < 130;
    const wave = M.arm.wave * Math.sin(f.clock / M.arm.waveMs);
    const idle: Look = onPipe(f.pose)
      ? { face: blink ? FACE.blink : FACE.cocky, arm: Math.floor(f.clock / M.arm.peaceMs) % 2 ? 0 : wave, crouch: Math.abs(pipeTilt(f.pose.x)) < 0.35 ? 0.06 : 0, lift: 0, board: true, bacon: true, spin: 0, sx: 1, sy: 1 }
      : { face: blink ? FACE.blink : FACE.laugh, arm: wave, crouch: 0.02 * (1 - Math.cos(f.clock / 220)), lift: 0, board: true, bacon: true, spin: 0, sx: 1, sy: 1 };
    const tele = f.stage === 'telegraph';
    const active = f.stage === 'active';
    const throwing = active && (f.plan?.hazards ?? []).some((h) => f.t >= h.atMs && f.t < h.atMs + 220);
    const whirl = M.arm.whirl * Math.sin(f.t / M.arm.whirlMs);
    const wind = { ...idle, face: FACE.windup, sx: 1 + 0.04 * Math.sin(f.t / 60), sy: 1 - 0.04 * Math.sin(f.t / 60) };
    if (f.stage === 'transform') {
      const T = C.transform;
      if (f.t < T.leapMs) return { ...idle, face: FACE.windup, arm: M.arm.fist, crouch: 0.12, spin: (f.t / T.leapMs) * Math.PI * 4 };
      return { ...idle, face: FACE.cocky, arm: 0 };
    }
    if (!tele && !active) return idle;
    switch (f.attack) {
      case 'board': {
        if (tele) return { ...wind, arm: M.arm.point };
        const flip = f.plan?.hazards[0];
        const back = flip ? flip.atMs + flip.lifeMs : 0;
        if (f.t >= back) return { ...idle, face: FACE.laugh, arm: 0 };
        // his board is away: he bunny-hops on the spot, the last hop lands as it comes back under him
        const H = C.board.hop;
        const up = Math.abs(Math.sin((Math.PI * Math.max(1, Math.round(back / H.everyMs)) * f.t) / back));
        return { ...idle, face: f.t < 400 ? FACE.windup : FACE.laugh, arm: up * M.arm.fist, crouch: H.squash * (1 - up), lift: H.apex * up, board: false };
      }
      case 'stomp':
      case 'dive': {
        const J = f.attack === 'stomp' ? C.stomp : C.dive;
        if (tele) return { ...wind, crouch: 0.14, sx: 1.08, sy: 0.92 };
        const back = J.outMs + J.holdMs;
        const air = f.t < J.outMs || (f.t >= back && f.t < back + J.backMs);
        const since = f.t >= back + J.backMs ? f.t - back - J.backMs : f.t >= J.outMs && f.t < back ? f.t - J.outMs : -1;
        const squash = since >= 0 && since < LAND_MS ? 0.2 * (1 - since / LAND_MS) : 0;
        if (air) return { ...idle, face: FACE.windup, arm: M.arm.fist, crouch: 0.1, spin: f.t < J.outMs ? (f.t / J.outMs) * Math.PI * 2 : 0 };
        return { ...idle, face: FACE.laugh, arm: 0, crouch: squash };
      }
      case 'bacon':
      case 'skyBacon':
        return { ...(tele ? wind : idle), face: FACE.windup, arm: throwing ? M.arm.throw : whirl, bacon: tele };
      case 'wheels':
        return { ...(tele ? wind : idle), face: FACE.windup, crouch: 0.08, arm: throwing ? M.arm.throw : M.arm.point };
      case 'rain':
        return { ...(tele ? wind : idle), face: FACE.windup, arm: throwing ? M.arm.throw : M.arm.fist };
      default:
        return idle;
    }
  }

  function drawKo(f: RigFrame<PancettaAttack>, fs: number): void {
    const K = C.ko;
    const down = f.pose.s > 0.98 && f.pose.y >= F - 0.5;
    if (!down) {
      // tumbling down from the ramp
      head.setFrame(FACE.hurt);
      placeAt(puppet, f.pose.x, f.pose.y, f.pose.s * fs, f.pose.s, f.t / 90, 0, SPIN_PIVOT);
      return;
    }
    // sat on the floor, dizzy and wobbling; his board flies up, bonks his head and slides off
    board.setVisible(false);
    bacon.setVisible(false);
    const sq = { x: 1.08, y: 0.88 };
    rider.setPosition(0, 0).setScale(sq.x, sq.y).setRotation(Math.sin(f.t / 160) * 0.1);
    head.setFrame(FACE.dizzy);
    arm.setRotation(M.arm.ko);
    placeAt(puppet, f.pose.x, F, fs, 1, 0);
    const top = { x: f.pose.x + fs * NECK.x * sq.x, y: F + HEAD_TOP * sq.y };
    const rest = A.board.fh / PX / 2;
    const u = (f.t - K.tumbleMs) / (K.bonkAt - K.tumbleMs);
    const v = Math.min(1, (f.t - K.bonkAt) / K.slideMs);
    if (u >= 0 && u <= 1) koBoard.setVisible(true).setPosition(top.x + fs * 30 * (1 - u), top.y - rest - Math.sin(u * Math.PI) * 120).setRotation(u * Math.PI * 3);
    else if (u > 1) koBoard.setVisible(true).setPosition(top.x - fs * v * 70, top.y - rest + v * (F - top.y)).setRotation(-0.35 * (1 - v) * fs);
    if (u > 1 && prevT < K.bonkAt) puff(top.x, top.y);
    if (f.t > K.starsAt)
      stars.forEach((s, i) => {
        const a = f.t / 240 + (i / stars.length) * Math.PI * 2;
        s.setVisible(true).setPosition(NECK.x + Math.cos(a) * 34, HEAD_TOP - 6 + Math.sin(a) * 9);
      });
  }

  function draw(f: RigFrame<PancettaAttack>): void {
    if (f.stage !== prevStage) {
      prevT = 0;
      prevStage = f.stage;
    }
    for (const s of stars) s.setVisible(false);
    rider.setRotation(0);
    const fs = f.pose.f === -1 ? 1 : -1;
    const bg = onPipe(f.pose);
    puppet.setDepth(f.pose.s < C.box.bg.solidAt ? -20 : 0);
    const Lk = f.stage === 'ko' ? null : look(f);
    const lift = Math.max(0, F - f.pose.y) + (Lk?.lift ?? 0);
    shadow.setVisible(!bg && f.pose.s > 0.9 && Lk !== null).setPosition(f.pose.x, F).setScale((1.5 * Math.max(0.35, 1 - lift / 220)) / k, 1 / k);
    if (!Lk) {
      drawKo(f, fs);
      prevT = f.t;
      return;
    }
    let { sx, sy } = Lk;
    if (f.hit < 140) {
      const w = 0.035 * Math.sin(f.hit / 16);
      sx *= 1 + w;
      sy *= 1 - w;
    }
    head.setFrame(f.hit < 130 ? FACE.hurt : Lk.face).setRotation(M.headTilt * Math.sin(f.clock / 260));
    arm.setRotation(Lk.arm);
    board.setVisible(Lk.board);
    if (f.attack === 'board' && f.stage === 'telegraph') board.setPosition(-30, 4).setRotation(-0.3);
    else board.setPosition(0, 0).setRotation(0);
    const sway = Math.sin(f.clock / 170);
    bacon.setVisible(Lk.bacon).setPosition(L(P.bacon).x, L(P.bacon).y + sway * 2).setRotation(M.baconSway * sway);
    const bob = Lk.crouch ? 0 : Math.sin(f.clock / 200) * M.bob * 0.5;
    rider.setPosition(FEET.x, (Lk.board ? FEET.y : 0) + bob - Lk.lift).setScale(1 + Lk.crouch * 0.5, 1 - Lk.crouch);
    const tilt = bg ? pipeTilt(f.pose.x) : 0;
    const sc = f.pose.s;
    placeAt(puppet, f.pose.x, f.pose.y, sc * sx * fs, sc * sy, tilt + Lk.spin * fs, 0, Lk.spin ? SPIN_PIVOT : 0);
    // landings throw up dust
    if (f.stage === 'active' && f.plan) for (const c of f.plan.cues) if (c.sfx === 'blast' && prevT < c.atMs && c.atMs <= f.t && !bg) {
      puff(f.pose.x - 30, F);
      puff(f.pose.x + 30, F);
    }
    prevT = f.t;
  }

  return {
    parts: [board, bacon, body, arm, head],
    draw,
    hazard: (kind) => HAZARD[kind] ?? { texture: KEY.wheel },
    destroy(): void {
      for (const o of [puppet, koBoard, shadow, ...puffs]) o.destroy();
    },
  };
}
