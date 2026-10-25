/**
 * The Burger Gang boss on screen: a container at his feet holding the legs and the body sprites (drawn at
 * kb = k * texBoost), its floor shadow, the pose switch, hurt / telegraph flashes, the strut sway and
 * the knockout gag (dizzy stars, the heart shades fly off, he topples over backwards).
 */
import type Phaser from 'phaser';
import { ARENA, type Box } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { BOSS_ANIMS, BODY_FRAMES, BODY_KEY, LEGS_KEY, LEG_FRAMES } from './art/boss';
import { TEX } from './art/props';
import { BG, BODY, BOXES, MOTION } from './config';
import type { Pose } from './plan';

export type RigPose = Pose | 'gulp' | 'roar' | 'ko';

const F = ARENA.floorY;
const TAU = Math.PI * 2;
const STRUT = BOSS_ANIMS.strut;
const BODY_OF: Record<RigPose, number | string> = {
  idle: BOSS_ANIMS.idle,
  shake: BOSS_ANIMS.shake,
  spray: BODY_FRAMES.spray,
  windup: BODY_FRAMES.windup,
  throw: BODY_FRAMES.throw,
  twirl: BODY_FRAMES.twirl,
  fling: BODY_FRAMES.fling,
  whistle: BODY_FRAMES.whistle,
  lift: BODY_FRAMES.roar,
  stomp: BODY_FRAMES.roar,
  roar: BODY_FRAMES.roar,
  gulp: BODY_FRAMES.gulp,
  ko: BOSS_ANIMS.ko,
};
const LEGS_OF: Record<RigPose, number | string> = {
  idle: STRUT,
  shake: STRUT,
  spray: LEG_FRAMES.stand,
  windup: LEG_FRAMES.stand,
  throw: LEG_FRAMES.stand,
  twirl: STRUT,
  fling: LEG_FRAMES.stand,
  whistle: STRUT,
  lift: LEG_FRAMES.lift,
  stomp: LEG_FRAMES.stand,
  roar: LEG_FRAMES.stand,
  gulp: LEG_FRAMES.stand,
  ko: LEG_FRAMES.ko,
};
/** Head height above the feet (scale 1) for the knockout stars. */
const HEAD_Y = -150;
const KO = MOTION.ko;
const KO_SHADES = MOTION.koShades;
const STAR_ORBIT = MOTION.stars;
const BLINK_MS = MOTION.blinkMs;

function show(sprite: Phaser.GameObjects.Sprite, what: number | string): void {
  if (typeof what === 'string') {
    sprite.play(what, true);
    return;
  }
  sprite.stop();
  sprite.setFrame(what);
}

export class BossRig {
  readonly root: Phaser.GameObjects.Container;
  /** current size (1, the giant grows it) and stand x */
  s = 1;
  baseX: number = BG.bx;
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly legs: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Sprite;
  private readonly extras: Phaser.GameObjects.Sprite[] = [];
  /** brightness flashes (WebGL only: a white silhouette would strobe under constant fire) */
  private readonly glow: Phaser.FX.ColorMatrix[];
  private bright = 1;
  private pose: RigPose | null = null;
  private t = 0;
  private hitMs = 0;
  private teleMs = 0;
  private koMs = -1;
  private flyer = { x: 0, y: 0, vx: 0, vy: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
    kb: number,
    /** the fallen boss hits the roof */
    private readonly thud: () => void,
  ) {
    this.shadow = worldSprite(scene, BG.bx, F + 2, TEX.shadow, k).setDepth(-2);
    this.legs = scene.add.sprite(0, 0, LEGS_KEY, LEG_FRAMES.stand).setOrigin(0.5, 1).setScale(1 / kb);
    this.body = scene.add.sprite(0, -BODY.stack, BODY_KEY, 0).setOrigin(0.5, BODY.base / BODY.h).setScale(1 / kb);
    this.root = scene.add.container(BG.bx, F, [this.legs, this.body]).setDepth(0);
    this.glow = [this.body, this.legs].flatMap((sp) => (sp.preFX ? [sp.preFX.addColorMatrix()] : []));
    this.setPose('idle');
  }

  setPose(p: RigPose): void {
    if (p === this.pose) return;
    this.pose = p;
    show(this.body, BODY_OF[p]);
    show(this.legs, LEGS_OF[p]);
  }

  hit(): void {
    this.hitMs = BG.hitFlashMs;
  }

  /** Quick bright blinks: an attack is coming. */
  telegraph(): void {
    this.teleMs = BLINK_MS * 3;
  }

  /** Boss-space box (scale 1, relative to the feet) in the world at the current size. */
  box(b: Box): Box {
    return { x: this.root.x + b.x * this.s, y: F + b.y * this.s, w: b.w * this.s, h: b.h * this.s };
  }

  boxes(): Box[] {
    return this.koMs >= 0 ? [] : [this.box(BOXES.body)];
  }

  update(dt: number): void {
    this.t += dt;
    this.hitMs -= dt;
    this.teleMs -= dt;
    const blink = this.teleMs > 0 && Math.floor(this.teleMs / BLINK_MS) % 2 === 0;
    const v = blink ? BG.teleBright : this.hitMs > 0 ? BG.hitBright : 1;
    if (v !== this.bright) {
      this.bright = v;
      for (const m of this.glow) {
        if (v === 1) m.reset();
        else m.brightness(v);
      }
    }
    if (this.koMs >= 0) {
      this.updateKo(dt);
      return;
    }
    const step = 1000 / BG.strutFps;
    const strutting = this.legs.anims.isPlaying;
    this.root.x = this.baseX + Math.sin((this.t / BG.swayMs) * TAU) * BG.sway;
    this.body.y = -BODY.stack - (strutting ? Math.abs(Math.sin((Math.PI * this.t) / (step * 3))) * 2 : 0);
    const breath = 1 + Math.sin((this.t / (step * 6)) * TAU) * BG.squash * 0.3;
    this.root.setScale(this.s * (2 - breath), this.s * breath);
    this.shadow.setPosition(this.root.x, F + 2).setScale((this.s * 0.9) / this.k, this.s / this.k);
  }

  startKo(): void {
    if (this.koMs >= 0) return;
    this.koMs = 0;
    this.setPose('ko');
    const head = { x: this.root.x, y: F + HEAD_Y * this.s };
    for (let i = 0; i < 3; i++) this.extras.push(worldSprite(this.scene, head.x, head.y, TEX.star, this.k).setDepth(1));
    this.flyer = { x: head.x, y: head.y + KO_SHADES.drop * this.s, vx: KO_SHADES.vx, vy: KO_SHADES.vy };
    this.extras.push(worldSprite(this.scene, this.flyer.x, this.flyer.y, TEX.shades, this.k).setDepth(1));
  }

  get koDone(): boolean {
    return this.koMs >= BG.koDoneMs;
  }

  private updateKo(dt: number): void {
    this.koMs += dt;
    const m = this.koMs;
    const fall = Math.max(0, Math.min(1, (m - BG.koDizzyMs) / BG.koFallMs));
    const down = m - BG.koDizzyMs - BG.koFallMs;
    const wobble = fall > 0 ? 0 : Math.sin(m / KO.wobbleMs) * KO.wobbleDeg;
    // falls flat on his face towards the hero (AL TAPPETO!) and bounces once
    const bounce = fall >= 1 ? Math.max(0, Math.sin((down / KO.bounceMs) * Math.PI)) * KO.bounceDeg * Math.max(0, 1 - down / KO.settleMs) : 0;
    this.root.setAngle(wobble - fall * fall * KO.fallDeg + bounce);
    this.root.setScale(this.s);
    const head = { x: this.root.x + Math.sin((this.root.angle * Math.PI) / 180) * -HEAD_Y * this.s, y: F + Math.cos((this.root.angle * Math.PI) / 180) * HEAD_Y * this.s };
    this.extras.slice(0, 3).forEach((star, i) => {
      const a = (m / STAR_ORBIT.ms) * TAU + (i / 3) * TAU;
      star.setPosition(head.x + Math.cos(a) * STAR_ORBIT.rx * this.s, head.y - KO.starLift + Math.sin(a) * STAR_ORBIT.ry);
      star.setAlpha(fall >= 1 ? Math.max(0, 1 - down / KO.starFadeMs) : 1);
    });
    const shades = this.extras[3];
    if (shades && this.flyer.y < ARENA.h + 40) {
      const s = dt / 1000;
      this.flyer.vy += KO_SHADES.g * s;
      this.flyer.x += this.flyer.vx * s;
      this.flyer.y += this.flyer.vy * s;
      shades.setPosition(this.flyer.x, this.flyer.y).setAngle(shades.angle + KO_SHADES.spin * s);
    }
    if (fall >= 1 && m - dt < BG.koDizzyMs + BG.koFallMs) this.thud();
  }

  destroy(): void {
    for (const e of this.extras) e.destroy();
    this.root.destroy();
    this.shadow.destroy();
  }
}
