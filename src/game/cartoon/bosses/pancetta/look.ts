/** Pancetta's textures (all prefixed 'ct-pancetta-' so unloadPrefix drops them), loading and the arena layers. */
import type Phaser from 'phaser';
import { ARENA } from '../../api';
import { anim, image, sheet, worldSprite } from '../../draw/canvas';
import { alertBurst, cloud } from '../brie/kit/toon';
import { rng } from '../brie/kit/paths';
import { ALERT, MARK, PUFF, SHADOW, STAR, drawMark, drawPuff, drawShadow, drawStar } from '../brie/art-props';
import { ARM, ARM_POSES, FACES, FLAT, HEAD, LEGS, TORSO, drawArm, drawFlat, drawHead, drawLegs, drawTorso } from './art-pig';
import { BACON, BOARD, FLIP, SHOCK, WHEEL, drawBacon, drawBoard, drawFlip, drawShock, drawWheel } from './art-board';
import { FG_L, FG_R, FLOOR, MID, drawFgLeft, drawFgRight, drawFloor, drawMid, drawSky } from './arena-draw';

export const PREFIX = 'ct-pancetta-';
const k$ = (s: string): string => `${PREFIX}${s}`;

export const KEY = {
  head: k$('head'),
  torso: k$('torso'),
  legs: k$('legs'),
  arm: k$('arm'),
  flat: k$('flat'),
  board: k$('board'),
  boardAnim: k$('board-anim'),
  flip: k$('flip'),
  flipAnim: k$('flip-anim'),
  wheel: k$('wheel'),
  bacon: k$('bacon'),
  baconAnim: k$('bacon-anim'),
  baconPinkAnim: k$('bacon-pink-anim'),
  shock: k$('shock'),
  shockAnim: k$('shock-anim'),
  mark: k$('mark'),
  alert: k$('alert'),
  puff: k$('puff'),
  puffAnim: k$('puff-anim'),
  star: k$('star'),
  shadow: k$('shadow'),
  sky: k$('sky'),
  mid: k$('mid'),
  floor: k$('floor'),
  fgL: k$('fg-l'),
  fgR: k$('fg-r'),
  cloud: k$('cloud'),
} as const;

const CLOUD = { w: 140, h: 80 } as const;
/** The soft sky is drawn at half the texture scale (memory on phones). */
const skyK = (k: number): number => Math.max(1, k / 2);

export function loadPancetta(scene: Phaser.Scene, k: number): void {
  sheet(scene, KEY.head, HEAD.w, HEAD.h, FACES.length, k, drawHead);
  image(scene, KEY.torso, TORSO.w, TORSO.h, k, drawTorso);
  sheet(scene, KEY.legs, LEGS.w, LEGS.h, 6, k, drawLegs);
  sheet(scene, KEY.arm, ARM.w, ARM.h, ARM_POSES.length, k, drawArm);
  sheet(scene, KEY.flat, FLAT.w, FLAT.h, 2, k, drawFlat);
  sheet(scene, KEY.board, BOARD.w, BOARD.h, BOARD.frames, k, drawBoard);
  anim(scene, KEY.boardAnim, KEY.board, BOARD.frames, 14);
  sheet(scene, KEY.flip, FLIP.w, FLIP.h, FLIP.frames, k, drawFlip);
  anim(scene, KEY.flipAnim, KEY.flip, FLIP.frames, 14);
  sheet(scene, KEY.wheel, WHEEL.w, WHEEL.h, 2, k, drawWheel);
  sheet(scene, KEY.bacon, BACON.w, BACON.h, 4, k, drawBacon);
  anim(scene, KEY.baconAnim, KEY.bacon, [0, 1], 8);
  anim(scene, KEY.baconPinkAnim, KEY.bacon, [2, 3], 8);
  sheet(scene, KEY.shock, SHOCK.w, SHOCK.h, 2, k, drawShock);
  anim(scene, KEY.shockAnim, KEY.shock, 2, 10);
  image(scene, KEY.mark, MARK.w, MARK.h, k, drawMark);
  image(scene, KEY.alert, ALERT.w, ALERT.h, k, (ctx) => alertBurst(ctx, ALERT.w / 2, ALERT.h / 2, 1.15, '#ffd23a'));
  sheet(scene, KEY.puff, PUFF.w, PUFF.h, PUFF.frames, k, drawPuff);
  anim(scene, KEY.puffAnim, KEY.puff, PUFF.frames, 16, 0);
  image(scene, KEY.star, STAR.w, STAR.h, k, drawStar);
  image(scene, KEY.shadow, SHADOW.w, SHADOW.h, k, drawShadow);
  image(scene, KEY.sky, ARENA.w, ARENA.h, skyK(k), drawSky);
  image(scene, KEY.mid, ARENA.w, MID.h, k, drawMid);
  image(scene, KEY.floor, ARENA.w, FLOOR.h, k, drawFloor);
  image(scene, KEY.fgL, FG_L.w, FG_L.h, k, drawFgLeft);
  image(scene, KEY.fgR, FG_R.w, FG_R.h, k, drawFgRight);
  for (let i = 0; i < 2; i++) image(scene, `${KEY.cloud}${i}`, CLOUD.w, CLOUD.h, k, (ctx) => cloud(ctx, 8, 30, CLOUD.w - 16, 40, 90 + i));
}

/** Depths: sky -50, clouds -46, mid (balustrade, palms, half-pipe) -40, floor -30, foreground corners 20. */
export function buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
  const W = ARENA.w;
  const H = ARENA.h;
  const out: Phaser.GameObjects.GameObject[] = [worldSprite(scene, W / 2, H / 2, KEY.sky, skyK(k)).setDepth(-50)];
  const r = rng(5);
  for (let i = 0; i < 2; i++) {
    const c = worldSprite(scene, 140 + i * 300 + r() * 40, 40 + r() * 30, `${KEY.cloud}${i}`, k).setDepth(-46);
    scene.tweens.add({ targets: c, x: c.x + 26 + r() * 20, duration: 10000 + r() * 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    out.push(c);
  }
  out.push(worldSprite(scene, W / 2, MID.y + MID.h / 2, KEY.mid, k).setDepth(-40));
  out.push(worldSprite(scene, W / 2, FLOOR.y + FLOOR.h / 2, KEY.floor, k).setDepth(-30));
  out.push(worldSprite(scene, FG_L.w / 2 - 8, H - FG_L.h / 2 + 26, KEY.fgL, k).setDepth(20));
  out.push(worldSprite(scene, W - FG_R.w / 2 + 10, H - FG_R.h / 2 + 22, KEY.fgR, k).setDepth(20));
  return out;
}
