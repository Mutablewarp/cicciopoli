/**
 * The Ciccio's truck on screen: shadow, suspension bob, lean on lane changes, brake lights, hit
 * flash + invulnerability blink, sauce wobble, power visuals (nugget shield bubble, cheddar trail,
 * popcorn spray) and the PROPULSORE flight (lifts and grows, the shadow drops away, booster flames).
 * v9: blinkers on a lane change, the CICCIO FEVER gold trail + sparks, and in the side view the
 * 'rush-truck-x' sheet (roof lettering along the body, so it reads left to right once the camera turns).
 * World: road x 0..120, truck centre at y 0.
 */
import type Phaser from 'phaser';
import { RUSH, RUSH_ANIMS, TRUCK_FRAME } from '../../art/rush/keys';
import { RUSH_POWERS } from '../../config/rush';
import type { RushSnapshot } from './logic/types';
import { DEPTH, FX, TRUCK_LOOK } from './config';
import { SCENE_TEX } from './sceneArt';

const AMBER = 0xffb020;
const FEVER_GOLD = [0xffd040, 0xfff0a0, 0xffffff];

const smooth = (u: number): number => u * u * (3 - 2 * u);

/** 0..1 height of the flight: eases up, holds, eases down to the landing. */
export function liftOf(flight: number): number {
  const e = TRUCK_LOOK.flyEase;
  if (flight <= 0 || flight >= 1) return 0;
  if (flight < e) return smooth(flight / e);
  if (flight > 1 - e) return smooth((1 - flight) / e);
  return 1;
}

export class TruckView {
  private readonly body: Phaser.GameObjects.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly trail: Phaser.GameObjects.Sprite;
  private readonly shield: Phaser.GameObjects.Sprite;
  private readonly flames: Phaser.GameObjects.Sprite[];
  private readonly popcorn: Phaser.GameObjects.Particles.ParticleEmitter;
  /** red halos round the rear lights while FRENA is held */
  private readonly brakeGlow: Phaser.GameObjects.Rectangle[];
  /** v9 amber blinkers: front + rear corner of the side the truck turns to */
  private readonly blinkers: Phaser.GameObjects.Rectangle[];
  private readonly fever: Phaser.GameObjects.Sprite;
  private readonly sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private blinkSide = 0;
  private blinkMs = 0;
  private sparkMs = 0;
  /** side view: the sheet with the lettering along the body */
  private side = false;
  private tilt = 0;
  private hitMs = 0;
  private kick = 0;
  private popMs = 0;
  /** world position of the body now (flight lift included), `top` = world y of its front edge */
  readonly pos = { x: 0, y: 0, lift: 0, top: 0 };

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
  ) {
    this.shadow = scene.add.image(0, 0, RUSH.truckShadow).setAlpha(TRUCK_LOOK.shadowAlpha).setDepth(DEPTH.truckShadow);
    this.trail = scene.add.sprite(0, 0, RUSH.grip, 0).setDepth(DEPTH.trail).setVisible(false);
    this.fever = scene.add.sprite(0, 0, RUSH.fever, 0).setDepth(DEPTH.trail - 0.5).setVisible(false);
    this.sparks = scene.add.particles(0, 0, SCENE_TEX.px, {
      lifespan: { min: 260, max: 520 },
      speedX: { min: -30, max: 30 },
      speedY: { min: 60, max: 150 },
      alpha: { start: 1, end: 0 },
      tint: FEVER_GOLD,
      emitting: false,
    }).setDepth(DEPTH.trail);
    this.body = scene.add.sprite(0, 0, RUSH.truck, 0).setDepth(DEPTH.truck);
    this.flames = [-1, 1].map((s) => scene.add.sprite(0, 0, RUSH.flame, s > 0 ? 2 : 0).setOrigin(0.5, 0).setDepth(DEPTH.truck - 1).setVisible(false));
    this.shield = scene.add.sprite(0, 0, RUSH.shield, 0).setDepth(DEPTH.truck + 1).setVisible(false);
    this.popcorn = scene.add.particles(0, 0, RUSH.popcorn, {
      frame: [0, 1, 2, 3],
      lifespan: { min: 380, max: 620 },
      speedX: { min: -70, max: 70 },
      speedY: { min: 90, max: 200 },
      rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0.2 },
      emitting: false,
    }).setDepth(DEPTH.trail);
    this.brakeGlow = [-1, 1].map(() => scene.add.rectangle(0, 0, 9, 12, 0xff2a1a, 0.5).setBlendMode('ADD').setDepth(DEPTH.truck + 1).setVisible(false));
    this.blinkers = [-1, 1].map(() => scene.add.rectangle(0, 0, 3, 4, AMBER).setStrokeStyle(1, 0x3a1a00).setDepth(DEPTH.truck + 1).setVisible(false));
    layer.add([this.shadow, this.fever, this.sparks, this.trail, ...this.flames, this.body, ...this.brakeGlow, ...this.blinkers, this.shield, this.popcorn]);
    for (const f of this.flames) this.loop(f, RUSH_ANIMS.flame);
    this.loop(this.trail, RUSH_ANIMS.grip);
    this.loop(this.fever, RUSH_ANIMS.fever);
    this.loop(this.shield, RUSH_ANIMS.shield);
  }

  private loop(s: Phaser.GameObjects.Sprite, key: string): void {
    if (s.anims.currentAnim?.key === key && s.anims.isPlaying) return;
    if (this.scene.anims.exists(key)) s.play(key);
  }

  private still(frame: number): void {
    this.body.anims.stop();
    const key = this.sheet;
    if (this.body.texture.key !== key) this.body.setTexture(key, frame);
    else if (this.body.frame.name !== String(frame)) this.body.setFrame(frame);
  }

  /** The truck sheet for the current view (the side-view one when the art has it). */
  private get sheet(): string {
    return this.side && this.scene.textures.exists(RUSH.truckX) ? RUSH.truckX : RUSH.truck;
  }

  private anim(upright: string, sideView: string): string {
    return this.sheet === RUSH.truckX && this.scene.anims.exists(sideView) ? sideView : upright;
  }

  /** Side view on / off (the camera turned): swaps to the sheet whose roof lettering reads along the body. */
  setSide(on: boolean): void {
    this.side = on;
  }

  /** Crash: a white flash frame. */
  hit(): void {
    this.hitMs = TRUCK_LOOK.hitFlashMs;
  }

  /** Bumped the kerb: a short sideways jolt. */
  bump(dir: number): void {
    this.kick = dir * TRUCK_LOOK.leanRad * 1.6;
  }

  reset(): void {
    this.tilt = 0;
    this.hitMs = 0;
    this.kick = 0;
    this.blinkMs = 0;
    this.popcorn.killAll();
    this.sparks.killAll();
  }

  update(snap: RushSnapshot, timeMs: number, dtMs: number): void {
    const t = snap.truck;
    const L = TRUCK_LOOK;
    const lift = t.flying ? liftOf(t.flight) : 0;
    const moving = snap.phase === 'play' && snap.speed > 1;
    const bob = moving && lift === 0 && Math.floor(timeMs / L.bobMs) % 2 === 1 ? -1 : 0;
    const wobble = t.slip > 0 ? Math.sin(timeMs / L.wobbleMs) * L.wobbleRad * t.slip : 0;
    const k = 1 - Math.exp(-dtMs / L.leanTauMs);
    this.tilt += (t.lean * L.leanRad + wobble + this.kick - this.tilt) * k;
    this.kick *= Math.exp(-dtMs / (L.leanTauMs * 1.5));
    this.hitMs = Math.max(0, this.hitMs - dtMs);
    const x = t.x;
    const y = bob - lift * 6;
    const scale = 1 + L.flyScale * lift;
    this.pos.x = x;
    this.pos.y = y;
    this.pos.lift = lift;
    this.pos.top = y - (this.body.height * scale) / 2;

    this.body.setPosition(x, y).setScale(scale).setRotation(this.tilt).setDepth(lift > 0 ? DEPTH.flight : DEPTH.truck);
    if (this.hitMs > 0) this.still(TRUCK_FRAME.hit);
    else if (t.flying) this.loop(this.body, this.anim(RUSH_ANIMS.fly, RUSH_ANIMS.flyX));
    else if (t.lean !== 0) this.still(t.lean < 0 ? TRUCK_FRAME.leanL : TRUCK_FRAME.leanR);
    else if (t.braking) this.still(TRUCK_FRAME.brake);
    else if (moving) this.loop(this.body, this.anim(RUSH_ANIMS.drive, RUSH_ANIMS.driveX));
    else this.still(TRUCK_FRAME.driveA);
    const blink = t.invulnMs > 0 && !t.flying && Math.floor(timeMs / L.blinkMs) % 2 === 0;
    this.body.setAlpha(blink ? 0.35 : 1);

    this.shadow
      .setPosition(x + 2 + L.flyShadowDx * lift, 20 + L.flyShadowDy * lift)
      .setScale(1 - L.flyShadowShrink * lift, 1.5 - L.flyShadowShrink * lift)
      .setAlpha(L.shadowAlpha);

    this.flames.forEach((f, i) => {
      f.setVisible(t.flying);
      if (!t.flying) return;
      const side = i === 0 ? -1 : 1;
      const c = Math.cos(this.tilt);
      const s = Math.sin(this.tilt);
      const dx = side * L.flameDx * scale;
      const dy = L.flameDy * scale;
      f.setPosition(x + dx * c - dy * s, y + dx * s + dy * c).setRotation(this.tilt).setScale(scale * (0.8 + 0.5 * lift), scale * (0.9 + 0.9 * lift));
      f.setDepth(lift > 0 ? DEPTH.flight - 1 : DEPTH.truck - 1);
    });

    this.shield.setVisible(snap.shield);
    if (snap.shield) {
      const fading = snap.power === null && snap.powerLeft < RUSH_POWERS.warnMs / RUSH_POWERS.ms.shield;
      this.shield.setPosition(x, y).setScale(scale).setRotation(this.tilt);
      this.shield.setAlpha(fading && Math.floor(timeMs / 80) % 2 === 0 ? 0.3 : 0.9);
      this.shield.setDepth(lift > 0 ? DEPTH.flight + 1 : DEPTH.truck + 1);
    }

    const braking = t.braking && !t.flying && moving;
    this.brakeGlow.forEach((g, i) => {
      g.setVisible(braking);
      if (braking) g.setPosition(x + (i === 0 ? -L.brakeDx : L.brakeDx), y + L.brakeDy).setAlpha(0.4 + 0.15 * Math.sin(timeMs / 60));
    });

    const grip = snap.power === 'grip' && !t.flying;
    this.trail.setVisible(grip);
    if (grip) this.trail.setPosition(x, L.rearDy + 6).setRotation(this.tilt * 0.5);
    this.blink(t.target - t.lane, x, y, timeMs, dtMs, lift > 0);
    this.feverTrail(snap.fever > 0 && moving, x, y + L.feverDy * scale, dtMs);

    if (snap.power === 'sprint' && moving) {
      this.popMs -= dtMs;
      if (this.popMs <= 0) {
        this.popMs = L.popcornEveryMs;
        this.popcorn.emitParticleAt(x + (Math.random() - 0.5) * 20, y + L.rearDy * scale, 1);
      }
    }
  }

  /** Blinkers: the corner lights on the side of the lane change flash during it and a moment after. */
  private blink(dir: number, x: number, y: number, timeMs: number, dtMs: number, flying: boolean): void {
    const L = TRUCK_LOOK;
    if (dir !== 0) {
      this.blinkSide = Math.sign(dir);
      this.blinkMs = L.blinkerHoldMs;
    } else this.blinkMs = Math.max(0, this.blinkMs - dtMs);
    const on = !flying && this.blinkMs > 0 && Math.floor(timeMs / L.blinkerMs) % 2 === 0;
    this.blinkers.forEach((b, i) => {
      b.setVisible(on);
      if (on) b.setPosition(x + this.blinkSide * L.blinkDx, y + (i === 0 ? -L.blinkDy : L.blinkDy));
    });
  }

  /** CICCIO FEVER: the gold sparkle trail and a stream of gold sparks behind the truck. */
  private feverTrail(on: boolean, x: number, rearY: number, dtMs: number): void {
    this.fever.setVisible(on);
    if (!on) return;
    this.fever.setPosition(x, rearY).setRotation(this.tilt * 0.5);
    this.sparkMs -= dtMs;
    if (this.sparkMs > 0) return;
    this.sparkMs = FX.feverSparkMs;
    this.sparks.emitParticleAt(x + (Math.random() - 0.5) * 24, rearY, 2);
  }
}
