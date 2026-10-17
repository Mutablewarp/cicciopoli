/**
 * One-shot visual effects: animated puffs / sparkles, score popups built from the
 * `digits` sheet, crate splinters. Everything cleans itself up.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../art/keys';
import { DEPTH } from './depths';

const PLUS = 10;
const DIGIT_ADVANCE = 5;

export interface OnceOpts {
  depth?: number;
  flipX?: boolean;
  originY?: number;
  scale?: number;
  angle?: number;
}

export class Fx {
  constructor(private readonly scene: Phaser.Scene) {}

  /** Plays an animation once at (x, y) and destroys the sprite when it ends. */
  once(key: string, anim: string, x: number, y: number, o: OnceOpts = {}): Phaser.GameObjects.Sprite {
    const s = this.scene.add.sprite(x, y, key, 0);
    s.setDepth(o.depth ?? DEPTH.fx).setOrigin(0.5, o.originY ?? 0.5).setFlipX(o.flipX ?? false);
    s.setScale(o.scale ?? 1).setAngle(o.angle ?? 0);
    if (this.scene.anims.exists(anim)) {
      s.play(anim);
      s.once('animationcomplete', () => s.destroy());
    } else {
      this.scene.time.delayedCall(250, () => s.destroy());
    }
    return s;
  }

  sparkle(x: number, y: number): void {
    this.once(ITEMS.sparkle, ITEM_ANIMS.sparkle, x, y);
  }

  /** Ring of sparkles (pickups, goal). */
  sparkleBurst(x: number, y: number, count: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const s = this.once(ITEMS.sparkle, ITEM_ANIMS.sparkle, x, y);
      this.scene.tweens.add({ targets: s, x: x + Math.cos(a) * radius, y: y + Math.sin(a) * radius, duration: 260, ease: 'Quad.easeOut' });
    }
  }

  /** Dust puff at the feet; dir = direction the puff drifts. */
  dust(x: number, feetY: number, dir: number): void {
    const s = this.once(ITEMS.dust, ITEM_ANIMS.dust, x, feetY, { originY: 1, flipX: dir < 0, depth: DEPTH.hero - 1 });
    this.scene.tweens.add({ targets: s, x: x + dir * 6, y: feetY - 2, duration: 300, ease: 'Quad.easeOut' });
  }

  poof(x: number, y: number): void {
    this.once(ITEMS.poof, ITEM_ANIMS.poof, x, y);
  }

  hitStar(x: number, y: number): void {
    this.once(ITEMS.hitStar, ITEM_ANIMS.hitStar, x, y, { depth: DEPTH.fx + 1 });
  }

  /** "+30" rising and fading above a point. */
  popup(x: number, y: number, points: number): void {
    const glyphs = [PLUS, ...String(Math.abs(Math.round(points))).split('').map(Number)];
    const width = (glyphs.length - 1) * DIGIT_ADVANCE + 6;
    const c = this.scene.add.container(Math.round(x - width / 2), Math.round(y));
    c.setDepth(DEPTH.popup);
    glyphs.forEach((g, i) => c.add(this.scene.add.image(i * DIGIT_ADVANCE, 0, ITEMS.digits, g).setOrigin(0, 1)));
    this.scene.tweens.add({ targets: c, y: c.y - 18, duration: 700, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: 480, duration: 260, onComplete: () => c.destroy() });
  }

  /** Four wooden splinters flying out of a broken crate. */
  crateBits(x: number, y: number): void {
    const dirs: [number, number][] = [[-1, -1.3], [1, -1.2], [-0.6, -0.6], [0.7, -0.7]];
    dirs.forEach(([dx, dy], i) => {
      const s = this.scene.add.image(x, y, ITEMS.crateBits, i).setDepth(DEPTH.fx);
      this.scene.tweens.add({ targets: s, x: x + dx * 26, duration: 520, ease: 'Linear' });
      this.scene.tweens.add({
        targets: s,
        y: { from: y, to: y + 30 },
        angle: dx * 260,
        duration: 520,
        ease: (t: number) => (dy * 2 * t + 3 * t * t) / (dy * 2 + 3),
      });
      this.scene.tweens.add({ targets: s, alpha: 0, delay: 360, duration: 160, onComplete: () => s.destroy() });
    });
  }
}
