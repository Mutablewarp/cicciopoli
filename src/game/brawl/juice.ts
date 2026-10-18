/**
 * Level 5 impact juice shared by the hero, the enemies and the boss: hit-stop, the magenta
 * starburst, the SPACCA! lettering, the ground shockwave ring, dust clouds and rubble chips.
 * Every sprite and tween removes itself; nothing here holds state between calls.
 */
import type Phaser from 'phaser';
import { HULK_FX, HULK_FX_ANIMS, TILE } from '../../art/keys';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';

/** Rubble sheet frames (8x8, 6 variations) and the gravity the chips fall with, px/s². */
const RUBBLE_FRAMES = 6;
const RUBBLE_G = 900;

/** Freezes the physics for a few ms (the scene clock keeps running, so it always resumes). */
export function hitStop(scene: Phaser.Scene, ms: number): void {
  const world = scene.physics.world;
  if (world.isPaused) return;
  world.pause();
  scene.time.delayedCall(ms, () => {
    if (scene.sys.isActive()) world.resume();
  });
}

export class Juice {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
  ) {}

  /** Magenta comic starburst pop (no text). */
  burst(x: number, y: number, scale = 1): void {
    this.fx.once(HULK_FX.burst, HULK_FX_ANIMS.burst, Math.round(x), Math.round(y), { depth: DEPTH.fx + 2, scale });
  }

  /** The word SPACCA! pops out and rises. */
  text(x: number, y: number): void {
    const s = this.scene.add.image(Math.round(x), Math.round(y), HULK_FX.text).setDepth(DEPTH.popup + 1).setScale(0.5);
    this.scene.tweens.add({ targets: s, scale: 1.1, duration: 110, ease: 'Back.easeOut' });
    this.scene.tweens.add({ targets: s, y: s.y - 14, alpha: 0, delay: 420, duration: 260, onComplete: () => s.destroy() });
  }

  /** Ground shockwave ring centred on (x, feetY). */
  shock(x: number, feetY: number, scale = 1): void {
    this.fx.once(HULK_FX.shock, HULK_FX_ANIMS.shock, Math.round(x), Math.round(feetY) + 1, { originY: 1, depth: DEPTH.fx, scale });
  }

  /** Big grey-brown dust cloud standing on (x, feetY). */
  dust(x: number, feetY: number, scale = 1): void {
    this.fx.once(HULK_FX.dust, HULK_FX_ANIMS.dust, Math.round(x), Math.round(feetY), { originY: 1, depth: DEPTH.fx - 1, scale });
  }

  /**
   * Chips of brick / wood / steel thrown out of a broken prop; they fly in a ballistic arc and
   * settle on `floorY` (the ground under the prop), then fade.
   */
  rubble(x: number, y: number, count: number, power = 1, floorY = y + TILE / 2): void {
    for (let i = 0; i < count; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const vx = dir * (30 + Math.random() * 90) * power;
      const vy = -(110 + Math.random() * 130) * power;
      const air = (-vy + Math.sqrt(vy * vy + 2 * RUBBLE_G * Math.max(0, floorY - y))) / RUBBLE_G;
      const bit = this.scene.add.image(x, y, HULK_FX.rubble, (i * 5 + Math.round(x)) % RUBBLE_FRAMES).setDepth(DEPTH.fx);
      const t = { v: 0 };
      this.scene.tweens.add({
        targets: t,
        v: 1,
        duration: air * 1000,
        onUpdate: () => {
          const s = t.v * air;
          bit.setPosition(x + vx * s, y + vy * s + 0.5 * RUBBLE_G * s * s).setAngle(dir * 420 * t.v);
        },
        onComplete: () => this.scene.tweens.add({ targets: bit, alpha: 0, delay: 220, duration: 200, onComplete: () => bit.destroy() }),
      });
    }
  }
}
