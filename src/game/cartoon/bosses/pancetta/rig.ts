/**
 * Pancetta's puppet: one container (board, legs, torso, head, waving arm, the knockout pose, stars)
 * shown at C.rig.scale × the pose scale, leaning with the half-pipe walls, spinning in his ollies,
 * pumping on the ramp, waving at rest; a free board for the knockout bonk; floor shadow and dust.
 */
import { ARENA, type BossWorld } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { part, placeAt, type Rig, type RigFrame } from '../brie/kit/runner';
import { STAR } from '../brie/art-props';
import { PANCETTA as C } from './config';
import { ARM, FLAT, HEAD, LEGS, LEG_DROP, TORSO } from './art-pig';
import { BOARD } from './art-board';
import { KEY } from './look';
import { onPipe, type PancettaAttack } from './patterns';
import { pipeTilt } from './pipe';

const F = ARENA.floorY;
const FACE = { laugh: 0, blink: 1, windup: 2, shout: 3, hurt: 4, dizzy: 5, cocky: 6, cockyBlink: 7 } as const;
const AR = { waveA: 0, waveB: 1, peace: 2, whirl: 3, throw: 4, fist: 5, limp: 6, point: 7 } as const;
const LG = { stance: 0, crouch: 1, push: 2, tuck: 3, stand: 4, splat: 5 } as const;
const LAND_MS = 260;
const HAZARD: Record<string, { texture: string; anim?: string }> = {
  flip: { texture: KEY.flip, anim: KEY.flipAnim },
  wheel: { texture: KEY.wheel },
  bacon: { texture: KEY.bacon, anim: KEY.baconAnim },
  baconPink: { texture: KEY.bacon, anim: KEY.baconPinkAnim },
  wave: { texture: KEY.shock, anim: KEY.shockAnim },
};

interface Look {
  legF: number;
  face: number;
  arm: number;
  board: boolean;
  spin: number;
  sx: number;
  sy: number;
}

export function makePancettaRig(world: BossWorld): Rig<PancettaAttack> {
  const { scene, k } = world;
  const R = C.rig;
  const shadow = worldSprite(scene, 0, F, KEY.shadow, k).setDepth(-1);
  const board = part(scene, KEY.board, k, BOARD.fx, BOARD.fy, BOARD.w, BOARD.h);
  const legs = part(scene, KEY.legs, k, LEGS.fx, LEGS.fy, LEGS.w, LEGS.h);
  const torso = part(scene, KEY.torso, k, TORSO.hx, TORSO.hy, TORSO.w, TORSO.h);
  const head = part(scene, KEY.head, k, HEAD.nx, HEAD.ny, HEAD.w, HEAD.h);
  const arm = part(scene, KEY.arm, k, ARM.sx, ARM.sy, ARM.w, ARM.h);
  const flat = part(scene, KEY.flat, k, FLAT.fx, FLAT.fy, FLAT.w, FLAT.h);
  const stars = [0, 1, 2].map(() => part(scene, KEY.star, k, STAR.w / 2, STAR.h / 2, STAR.w, STAR.h));
  const body = scene.add.container(0, 0, [board, legs, torso, head, arm, flat, ...stars]);
  const koBoard = part(scene, KEY.board, k, BOARD.fx, BOARD.h / 2, BOARD.w, BOARD.h).setDepth(1).setVisible(false);
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
    const bg = onPipe(f.pose);
    const blink = (f.clock + 1500) % 3100 < 130;
    const wave = Math.floor(f.clock / 230) % 2 ? AR.waveA : AR.waveB;
    const idle: Look = bg
      ? { legF: Math.abs(pipeTilt(f.pose.x)) < 0.35 ? LG.crouch : LG.stance, face: blink ? FACE.cockyBlink : FACE.cocky, arm: Math.floor(f.clock / 900) % 2 ? AR.peace : wave, board: true, spin: 0, sx: 1, sy: 1 }
      : { legF: f.clock % 1400 < 700 ? LG.stance : LG.push, face: blink ? FACE.blink : FACE.laugh, arm: wave, board: true, spin: 0, sx: 1, sy: 1 };
    const tele = f.stage === 'telegraph';
    const active = f.stage === 'active';
    const throwing = active && (f.plan?.hazards ?? []).some((h) => f.t >= h.atMs && f.t < h.atMs + 220);
    const wind = { ...idle, face: FACE.windup, sx: 1 + 0.04 * Math.sin(f.t / 60), sy: 1 - 0.04 * Math.sin(f.t / 60) };
    if (f.stage === 'transform') {
      const T = C.transform;
      if (f.t < T.leapMs) return { ...idle, legF: LG.tuck, face: FACE.shout, arm: AR.fist, spin: (f.t / T.leapMs) * Math.PI * 4 };
      return { ...idle, legF: LG.stance, face: FACE.cocky, arm: AR.peace };
    }
    if (!tele && !active) return idle;
    switch (f.attack) {
      case 'board':
        if (tele) return { ...wind, legF: LG.stand, arm: AR.point, board: true };
        return { ...idle, legF: LG.stand, face: f.t < 400 ? FACE.shout : FACE.laugh, arm: AR.peace, board: false };
      case 'stomp':
      case 'dive': {
        const L = f.attack === 'stomp' ? C.stomp : C.dive;
        if (tele) return { ...wind, legF: LG.crouch, sx: 1.12, sy: 0.86 };
        const back = L.outMs + L.holdMs;
        const air = f.t < L.outMs || (f.t >= back && f.t < back + L.backMs);
        const since = f.t >= back + L.backMs ? f.t - back - L.backMs : f.t >= L.outMs && f.t < back ? f.t - L.outMs : -1;
        const squash = since >= 0 && since < LAND_MS ? 0.2 * (1 - since / LAND_MS) : 0;
        if (air) return { ...idle, legF: LG.tuck, face: FACE.shout, arm: AR.fist, spin: f.t < L.outMs ? (f.t / L.outMs) * Math.PI * 2 : 0 };
        return { ...idle, legF: squash > 0 ? LG.splat : LG.stance, face: FACE.laugh, arm: AR.peace, sx: 1 + squash, sy: 1 - squash };
      }
      case 'bacon':
      case 'skyBacon':
        return { ...(tele ? wind : idle), face: throwing ? FACE.shout : FACE.windup, arm: throwing ? AR.throw : AR.whirl };
      case 'wheels':
        return { ...(tele ? wind : idle), legF: LG.crouch, face: throwing ? FACE.shout : FACE.windup, arm: throwing ? AR.throw : AR.point };
      case 'rain':
        return { ...(tele ? wind : idle), face: throwing ? FACE.shout : FACE.windup, arm: throwing ? AR.throw : AR.fist };
      default:
        return idle;
    }
  }

  function drawKo(f: RigFrame<PancettaAttack>): void {
    const K = C.ko;
    const down = f.pose.s > 0.98 && f.pose.y >= F - 0.5;
    if (!down) {
      // tumbling down from the ramp
      placeAt(body, f.pose.x, f.pose.y, R.scale * f.pose.s, R.scale * f.pose.s, f.t / 90, 0, -90);
      head.setFrame(FACE.hurt);
      legs.setFrame(LG.tuck);
      return;
    }
    for (const s of [board, legs, torso, head, arm]) s.setVisible(false);
    flat.setVisible(true).setFrame(Math.floor(f.t / 180) % 2).setPosition(0, 0);
    placeAt(body, f.pose.x, f.pose.y, R.scale * (f.pose.f === -1 ? 1 : -1), R.scale, 0);
    // the board flies up, bonks his head, then slides off onto the floor
    const u = (f.t - K.tumbleMs) / (K.bonkAt - K.tumbleMs);
    const v = Math.min(1, (f.t - K.bonkAt) / K.slideMs);
    const headX = f.pose.x - 34 * (f.pose.f === -1 ? 1 : -1);
    if (u >= 0 && u <= 1) koBoard.setVisible(true).setPosition(headX + 20 - u * 20, f.pose.y - 46 - Math.sin(u * Math.PI) * 120).setRotation(u * Math.PI * 3);
    else if (u > 1) koBoard.setVisible(true).setPosition(headX - v * 50, f.pose.y - 46 + v * 38).setRotation(-0.35 * (1 - v));
    if (u > 1 && prevT < K.bonkAt) puff(headX, f.pose.y - 40);
    if (f.t > K.starsAt)
      stars.forEach((s, i) => {
        const a = f.t / 240 + (i / stars.length) * Math.PI * 2;
        s.setVisible(true).setPosition(-36 + Math.cos(a) * 34, -78 + Math.sin(a) * 9);
      });
  }

  function draw(f: RigFrame<PancettaAttack>): void {
    if (f.stage !== prevStage) {
      prevT = 0;
      prevStage = f.stage;
    }
    for (const s of [board, legs, torso, head, arm]) s.setVisible(true);
    flat.setVisible(false);
    for (const s of stars) s.setVisible(false);
    const bg = onPipe(f.pose);
    body.setDepth(f.pose.s < C.box.bg.solidAt ? -20 : 0);
    const lift = Math.max(0, F - f.pose.y);
    shadow.setVisible(!bg && f.pose.s > 0.9 && f.stage !== 'ko').setPosition(f.pose.x, F).setScale((1.4 * Math.max(0.35, 1 - lift / 220)) / k, 1 / k);
    if (f.stage === 'ko') {
      drawKo(f);
      prevT = f.t;
      return;
    }
    const L = look(f);
    let { sx, sy } = L;
    if (f.hit < 140) {
      const w = 0.035 * Math.sin(f.hit / 16);
      sx *= 1 + w;
      sy *= 1 - w;
    }
    const face = f.hit < 130 ? FACE.hurt : L.face;
    const legsY = L.board ? -R.deck : 0;
    const bob = L.legF === LG.stance || L.legF === LG.crouch ? Math.sin(f.clock / 200) * 1.5 : 0;
    const hipY = legsY - R.hip + (LEG_DROP[L.legF] ?? 0) + bob;
    board.setVisible(L.board).setFrame(Math.floor(f.clock / 60) % BOARD.frames);
    if (f.attack === 'board' && f.stage === 'telegraph') board.setPosition(-30, 4).setRotation(-0.3);
    else board.setPosition(0, 0).setRotation(0);
    legs.setPosition(0, legsY).setFrame(L.legF);
    torso.setPosition(0, hipY);
    head.setPosition(R.neck.x, hipY + R.neck.y + Math.sin(f.clock / 200 - 0.6) * 1.2).setFrame(face);
    arm.setPosition(R.shoulder.x, hipY + R.shoulder.y).setFrame(L.arm);
    const fs = f.pose.f === -1 ? 1 : -1;
    const tilt = bg ? pipeTilt(f.pose.x) : 0;
    const sc = R.scale * f.pose.s;
    placeAt(body, f.pose.x, f.pose.y, sc * sx * fs, sc * sy, tilt + L.spin * fs, 0, L.spin ? -90 : 0);
    // landings throw up dust
    if (f.stage === 'active' && f.plan) for (const c of f.plan.cues) if (c.sfx === 'blast' && prevT < c.atMs && c.atMs <= f.t && !bg) {
      puff(f.pose.x - 24, F);
      puff(f.pose.x + 24, F);
    }
    prevT = f.t;
  }

  return {
    parts: [board, legs, torso, head, arm, flat],
    draw,
    hazard: (kind) => HAZARD[kind] ?? { texture: KEY.wheel },
    destroy(): void {
      body.destroy();
      koBoard.destroy();
      shadow.destroy();
      for (const p of puffs) p.destroy();
    },
  };
}
