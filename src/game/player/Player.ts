/**
 * Ciccio's physics side: an invisible Arcade body (16x34, Brie 18x38) driven by the
 * pure motor once per fixed physics step. Visuals live in PlayerView.
 */
import type Phaser from 'phaser';
import { HERO, MOVE, type MoveParams } from '../../config/tuning';
import { Timer } from '../rules';
import { bounce, createMotor, type MotorInput, type MotorState, type MovementMode, NO_INPUT, PlatformerMode } from './motor';

export interface StepResult {
  jumped: boolean;
  /** touched down this step */
  landed: boolean;
  /** fall speed at touchdown (px/s) */
  landSpeed: number;
}

export class Player {
  readonly zone: Phaser.GameObjects.Zone;
  readonly body: Phaser.Physics.Arcade.Body;
  readonly motor: MotorState = createMotor();
  readonly invuln = new Timer();
  readonly hurtLock = new Timer();
  mode: MovementMode;
  facing: 1 | -1 = 1;
  /** cutscene / death: ignore input */
  frozen = false;
  private grounded = false;
  private airVy = 0;
  private brie = false;

  constructor(scene: Phaser.Scene, x: number, bottom: number, params: MoveParams = MOVE) {
    this.zone = scene.add.zone(x, bottom - HERO.bodyH / 2, HERO.bodyW, HERO.bodyH);
    scene.physics.add.existing(this.zone);
    this.body = this.zone.body as Phaser.Physics.Arcade.Body;
    this.body.setAllowGravity(false);
    this.body.setCollideWorldBounds(true);
    this.mode = new PlatformerMode(params);
  }

  get x(): number {
    return this.body.center.x;
  }
  get bottom(): number {
    return this.body.bottom;
  }
  get top(): number {
    return this.body.top;
  }
  get centerY(): number {
    return this.body.center.y;
  }
  get onGround(): boolean {
    return this.grounded;
  }
  get hasBrie(): boolean {
    return this.brie;
  }
  get vx(): number {
    return this.body.velocity.x;
  }
  get vy(): number {
    return this.body.velocity.y;
  }

  /** One fixed physics step: read collisions, run the motor, write the velocity back. */
  step(dt: number, inp: MotorInput): StepResult {
    const b = this.body;
    if (!b.enable) return { jumped: false, landed: false, landSpeed: 0 };
    // blocked only: Arcade also sets touching.down on mere overlaps (fries, enemies), which
    // would count a pickup grabbed mid-fall as ground (a free mid-air jump / a false landing)
    const onGround = b.blocked.down;
    this.motor.vx = b.velocity.x;
    this.motor.vy = b.velocity.y;
    const use = this.frozen || this.hurtLock.active ? NO_INPUT : inp;
    const ev = this.mode.step(this.motor, use, onGround, dt);
    const ceil = this.mode.ceilingY;
    // the step that would cross the flight ceiling stops exactly on it
    if (ceil !== undefined && dt > 0) this.motor.vy = Math.max(this.motor.vy, (ceil - b.top) / dt);
    if (use.axis !== 0) this.facing = use.axis;
    b.setVelocity(this.motor.vx, this.motor.vy);
    const landed = onGround && !this.grounded;
    const landSpeed = landed ? this.airVy : 0;
    this.airVy = onGround ? 0 : Math.max(this.airVy, this.motor.vy);
    this.grounded = onGround && !ev.jumped;
    return { jumped: ev.jumped, landed, landSpeed };
  }

  /** Stomp bounce (higher while jump is held). */
  bounce(held: boolean): void {
    bounce(this.motor, held, MOVE);
    this.body.setVelocityY(this.motor.vy);
    this.grounded = false;
  }

  /** Sideways shove that keeps the vertical motion (armour clang). */
  kick(vx: number): void {
    this.motor.vx = vx;
    this.body.setVelocityX(vx);
  }

  /** Knockback away from a hit source plus a short input lock. */
  knockback(fromX: number): void {
    const dir = this.x < fromX ? -1 : 1;
    this.motor.vx = dir * HERO.knockX;
    this.motor.vy = -HERO.knockY;
    this.motor.jumpT = -1;
    this.body.setVelocity(this.motor.vx, this.motor.vy);
    this.hurtLock.start(HERO.hurtLockMs);
    this.grounded = false;
  }

  /** Grows / shrinks the body around the feet (Brie). */
  setBrie(on: boolean): void {
    if (on === this.brie) return;
    this.brie = on;
    this.motor.jumpMul = on ? HERO.brieJumpMul : 1;
    const s = on ? HERO.brieScale : 1;
    this.resize(Math.round(HERO.bodyW * s), Math.round(HERO.bodyH * s));
  }

  private resize(w: number, h: number): void {
    const cx = this.x;
    const bottom = this.bottom;
    const v = { x: this.body.velocity.x, y: this.body.velocity.y };
    this.zone.setSize(w, h);
    this.body.setSize(w, h, false);
    this.body.setOffset(0, 0);
    this.body.reset(cx, bottom - h / 2);
    this.body.setVelocity(v.x, v.y);
  }

  /** Places the feet at (x, bottom) with no velocity. */
  teleport(x: number, bottom: number): void {
    this.body.reset(x, bottom - this.body.height / 2);
    this.motor.vx = 0;
    this.motor.vy = 0;
    this.motor.jumpT = -1;
    this.airVy = 0;
    this.grounded = false;
  }

  tick(dtMs: number): void {
    this.invuln.tick(dtMs);
    this.hurtLock.tick(dtMs);
  }
}
