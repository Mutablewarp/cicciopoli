/**
 * Draw order and one-shot effects for level 3 (explosions, smoke, sparks, score popups).
 */
import type Phaser from 'phaser';
import { ITEMS } from '../../art/keys';
import { SPACE, SPACE_ANIMS } from '../../art/space/keys';

export const Z = {
  sky: -100,
  stars: -99,
  deco: -96,
  frame: -50,
  side: -40,
  hole: 2,
  shields: 5,
  tray: 6,
  invaders: 10,
  ufo: 11,
  pickups: 12,
  bombs: 14,
  shots: 15,
  jet: 20,
  fx: 30,
  bolt: 32,
  popup: 40,
  title: 45,
} as const;

const PLUS = 10;
const DIGIT_ADVANCE = 5;

export class SpaceFx {
  constructor(private readonly scene: Phaser.Scene) {}

  /** Plays an animation once at (x, y) and destroys the sprite at the end. */
  once(key: string, anim: string, x: number, y: number, depth: number = Z.fx, scale = 1): Phaser.GameObjects.Sprite {
    const s = this.scene.add.sprite(Math.round(x), Math.round(y), key, 0).setDepth(depth).setScale(scale);
    if (this.scene.anims.exists(anim)) {
      s.play(anim);
      s.once('animationcomplete', () => s.destroy());
    } else {
      this.scene.time.delayedCall(300, () => s.destroy());
    }
    return s;
  }

  boom(x: number, y: number, scale = 1): void {
    this.once(SPACE.boom, SPACE_ANIMS.boom, x, y, Z.fx, scale);
  }

  smoke(x: number, y: number): void {
    const s = this.once(SPACE.smoke, SPACE_ANIMS.smoke, x, y, Z.fx + 1);
    this.scene.tweens.add({ targets: s, y: y - 6, duration: 500, ease: 'Quad.easeOut' });
  }

  spark(x: number, y: number): void {
    this.once(SPACE.spark, SPACE_ANIMS.spark, x, y, Z.bolt + 1);
  }

  /** "+30" rising and fading above a point. */
  popup(x: number, y: number, points: number): void {
    const glyphs = [PLUS, ...String(Math.abs(Math.round(points))).split('').map(Number)];
    const width = (glyphs.length - 1) * DIGIT_ADVANCE + 6;
    const c = this.scene.add.container(Math.round(x - width / 2), Math.round(y)).setDepth(Z.popup);
    glyphs.forEach((g, i) => c.add(this.scene.add.image(i * DIGIT_ADVANCE, 0, ITEMS.digits, g).setOrigin(0, 1)));
    this.scene.tweens.add({ targets: c, y: c.y - 14, duration: 650, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: 450, duration: 250, onComplete: () => c.destroy() });
  }
}
