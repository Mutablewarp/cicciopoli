/**
 * The Ciccio's truck on screen: shadow, suspension bob, lean on lane changes, brake lights, hit
 * flash + invulnerability blink, sauce wobble, power visuals (nugget shield bubble, cheddar trail,
 * popcorn spray) and the PROPULSORE flight (lifts and grows, the shadow drops away, booster flames).
 * World: road x 0..120, truck centre at y 0.
 */
import type Phaser from 'phaser';
import { RUSH, RUSH_ANIMS, TRUCK_FRAME } from '../../art/rush/keys';
import { RUSH_POWERS } from '../../config/rush';
import type { RushSnapshot } from './logic/types';
import { DEPTH, TRUCK_LOOK } from './config';

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
    layer.add([this.shadow, this.trail, ...this.flames, this.body, ...this.brakeGlow, this.shield, this.popcorn]);
    for (const f of this.flames) this.loop(f, RUSH_ANIMS.flame);
    this.loop(this.trail, RUSH_ANIMS.grip);
    this.loop(this.shield, RUSH_ANIMS.shield);
  }

  private loop(s: Phaser.GameObjects.Sprite, key: string): void {
    if (s.anims.currentAnim?.key === key && s.anims.isPlaying) return;
    if (this.scene.anims.exists(key)) s.play(key);
  }

  private still(frame: number): void {
    this.body.anims.stop();
    if (this.body.frame.name !== String(frame)) this.body.setFrame(frame);
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
    this.popcorn.killAll();
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
    else if (t.flying) this.loop(this.body, RUSH_ANIMS.fly);
    else if (t.lean !== 0) this.still(t.lean < 0 ? TRUCK_FRAME.leanL : TRUCK_FRAME.leanR);
    else if (t.braking) this.still(TRUCK_FRAME.brake);
    else if (moving) this.loop(this.body, RUSH_ANIMS.drive);
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

    if (snap.power === 'sprint' && moving) {
      this.popMs -= dtMs;
      if (this.popMs <= 0) {
        this.popMs = L.popcornEveryMs;
        this.popcorn.emitParticleAt(x + (Math.random() - 0.5) * 20, y + L.rearDy * scale, 1);
      }
    }
  }
}
