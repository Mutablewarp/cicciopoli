/**
 * The Burger Gang boss on screen: the parts cut from the shirt (art/boss.ts) in a container at his feet — the two
 * legs, and the upper body (bun, arms, peace glove, sunglasses, mouth) in a nested container that bobs, leans and
 * squashes. Each joint follows the current pose (poses.ts) on a spring (the rubber-hose overshoot); on top: the
 * idle strut, the cup jitter of a telegraph, the sunglasses twirl, hit / telegraph flashes and the knockout gag
 * (dizzy eyes, the sunglasses fly off, he falls flat on his face toward the hero).
 */
import type Phaser from 'phaser';
import { ARENA, type Box } from '../../api';
import { worldSprite } from '../../draw/canvas';
import type { PartName } from './art/atlas';
import { DIZZY_KEY, PART_NAMES, originOf, partKey, pivotOf } from './art/boss';
import { TEX } from './art/props';
import { BG, BOXES, EMIT, MOTION, RIG } from './config';
import { type Joint, POSES, type RigPose } from './poses';

const F = ARENA.floorY;
const TAU = Math.PI * 2;
const LEGS: readonly PartName[] = ['legB', 'legF'];
type Num = Exclude<keyof Joint, 'shades' | 'cupFront'>;
const NUMS: readonly Num[] = ['armL', 'armR', 'legF', 'legB', 'lean', 'sx', 'sy'];
/** poses in which he struts on the spot (legs swing, the body bobs) */
const STRUT: ReadonlySet<RigPose> = new Set<RigPose>(['idle', 'shake', 'twirl', 'whistle']);
const KO = MOTION.ko;
const KO_SHADES = MOTION.koShades;
const STAR_ORBIT = MOTION.stars;
const BLINK_MS = MOTION.blinkMs;
/** longest spring step (a long frame would make the springs blow up) */
const MAX_STEP_MS = 40;

class Spring {
  private v = 0;
  constructor(public x: number) {}
  step(target: number, ms: number): void {
    const s = ms / 1000;
    this.v += (RIG.spring.k * (target - this.x) - RIG.spring.damp * this.v) * s;
    this.x += this.v * s;
  }
}

const wave = (t: number, ms: number, phase = 0): number => Math.sin((t / ms) * TAU + phase);

export class BossRig {
  readonly root: Phaser.GameObjects.Container;
  /** current size (1, the giant grows it) and stand x */
  s = 1;
  baseX: number = BG.bx;
  private readonly upper: Phaser.GameObjects.Container;
  private readonly parts = {} as Record<PartName, Phaser.GameObjects.Sprite>;
  private readonly dizzy: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Sprite;
  private readonly extras: Phaser.GameObjects.Sprite[] = [];
  private readonly springs = Object.fromEntries(NUMS.map((n) => [n, new Spring(POSES.idle[n])])) as Record<Num, Spring>;
  private readonly upperAt = pivotOf('body');
  /** brightness flashes on the whole boss (WebGL only: a white silhouette would strobe under constant fire) */
  private readonly glow: Phaser.FX.ColorMatrix | null;
  private bright = 1;
  private pose: RigPose = 'idle';
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
    for (const n of PART_NAMES) {
      const o = originOf(n);
      const at = pivotOf(n);
      const local = LEGS.includes(n) ? at : { x: at.x - this.upperAt.x, y: at.y - this.upperAt.y };
      this.parts[n] = scene.add.sprite(local.x, local.y, partKey(n)).setOrigin(o.x, o.y).setScale(1 / kb);
    }
    const eyes = { x: EMIT.eyes.x - this.upperAt.x, y: EMIT.eyes.y - this.upperAt.y };
    this.dizzy = scene.add.sprite(eyes.x, eyes.y, DIZZY_KEY).setScale(1 / kb).setVisible(false);
    const upperParts = PART_NAMES.filter((n) => !LEGS.includes(n)).map((n) => this.parts[n]);
    this.upper = scene.add.container(this.upperAt.x, this.upperAt.y, [...upperParts, this.dizzy]);
    this.root = scene.add.container(BG.bx, F, [...LEGS.map((n) => this.parts[n]), this.upper]).setDepth(0);
    this.glow = this.root.postFX ? this.root.postFX.addColorMatrix() : null;
  }

  setPose(p: RigPose): void {
    this.pose = p;
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

  /** Where player shots hurt him. */
  hurtBoxes(): Box[] {
    return this.koMs >= 0 ? [] : [this.box(BOXES.body)];
  }

  /** Where touching him hurts: the bun stack and the floor behind him. */
  bodyBoxes(): Box[] {
    return this.koMs >= 0 ? [] : [this.box(BOXES.body), this.box(BOXES.back)];
  }

  update(dt: number): void {
    this.t += dt;
    this.hitMs -= dt;
    this.teleMs -= dt;
    this.flash();
    this.joints(dt);
    if (this.koMs >= 0) {
      this.updateKo(dt);
      return;
    }
    this.root.x = this.baseX + wave(this.t, BG.swayMs) * BG.sway;
    this.root.setScale(this.s);
    this.shadow.setPosition(this.root.x, F + 2).setScale((this.s * 0.9) / this.k, this.s / this.k);
  }

  private flash(): void {
    const blink = this.teleMs > 0 && Math.floor(this.teleMs / BLINK_MS) % 2 === 0;
    const v = blink ? BG.teleBright : this.hitMs > 0 ? BG.hitBright : 1;
    if (v === this.bright || !this.glow) return;
    this.bright = v;
    if (v === 1) this.glow.reset();
    else this.glow.brightness(v);
  }

  /** Springs toward the pose (+ the strut, breathing, wave), then the fast jitter / twirl on top. */
  private joints(dt: number): void {
    const p = POSES[this.pose];
    const t = this.t;
    const strut = STRUT.has(this.pose) && this.koMs < 0;
    const swing = strut ? wave(t, RIG.strut.ms) * RIG.strut.legDeg : 0;
    const breath = wave(t, RIG.breathe.ms) * RIG.breathe.squash;
    const target: Record<Num, number> = {
      armL: p.armL + (this.pose === 'idle' ? wave(t, RIG.wave.ms) * RIG.wave.deg : 0),
      armR: p.armR + (this.pose === 'idle' ? wave(t, RIG.sway.ms, 1) * RIG.sway.deg : 0),
      legF: p.legF + swing,
      legB: p.legB - swing,
      lean: p.lean,
      sx: p.sx * (1 - breath),
      sy: p.sy * (1 + breath),
    };
    for (let left = Math.max(0, dt); left > 0; left -= MAX_STEP_MS) {
      for (const n of NUMS) this.springs[n].step(target[n], Math.min(MAX_STEP_MS, left));
    }
    const j = (n: Num): number => this.springs[n].x;
    const jitter = this.pose === 'shake' ? wave(t, RIG.jitter.ms) * RIG.jitter.deg : 0;
    this.parts.armL.setAngle(j('armL'));
    this.parts.gloveL.setAngle(j('armL'));
    this.parts.armR.setAngle(j('armR') + jitter);
    this.parts.legF.setAngle(j('legF'));
    this.parts.legB.setAngle(j('legB'));
    this.parts.shades.setVisible(p.shades !== 'off').setAngle(p.shades === 'spin' ? wave(t, RIG.spin.ms) * RIG.spin.deg : 0);
    if (p.cupFront) this.upper.moveAbove(this.parts.armR, this.parts.body);
    else this.upper.moveBelow(this.parts.armR, this.parts.body);
    const bob = strut ? Math.abs(wave(t, RIG.strut.ms * 2)) * RIG.strut.bob : 0;
    this.upper.setPosition(this.upperAt.x, this.upperAt.y - bob).setAngle(j('lean')).setScale(j('sx'), j('sy'));
  }

  startKo(): void {
    if (this.koMs >= 0) return;
    this.koMs = 0;
    this.setPose('ko');
    this.dizzy.setVisible(true);
    const head = { x: this.root.x + EMIT.head.x * this.s, y: F + EMIT.head.y * this.s };
    for (let i = 0; i < 3; i++) this.extras.push(worldSprite(this.scene, head.x, head.y, TEX.star, this.k).setDepth(1));
    const face = { x: this.root.x + EMIT.shadesHand.x * this.s, y: F + EMIT.shadesHand.y * this.s };
    this.flyer = { x: face.x, y: face.y, vx: KO_SHADES.vx, vy: KO_SHADES.vy };
    this.extras.push(worldSprite(this.scene, face.x, face.y, TEX.shades, this.k).setDepth(1));
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
    const a = (this.root.angle * Math.PI) / 180;
    const head = { x: this.root.x - Math.sin(a) * EMIT.head.y * this.s, y: F + Math.cos(a) * EMIT.head.y * this.s };
    this.extras.slice(0, 3).forEach((star, i) => {
      const r = (m / STAR_ORBIT.ms) * TAU + (i / 3) * TAU;
      star.setPosition(head.x + Math.cos(r) * STAR_ORBIT.rx * this.s, head.y - KO.starLift + Math.sin(r) * STAR_ORBIT.ry);
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
