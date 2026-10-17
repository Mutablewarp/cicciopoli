/**
 * Ciccio's jet: smooth left/right flight along the bottom, banking frames, blink while
 * invulnerable after a hit.
 */
import type Phaser from 'phaser';
import { SPACE, SPACE_ANIMS } from '../../art/space/keys';
import { JET, RULES } from './config';
import { Z } from './fx';
import type { Rect } from './shields';

export class Jet {
  readonly sprite: Phaser.GameObjects.Sprite;
  x: number = 112;
  vx = 0;
  invulnMs = 0;
  /** false while the intro / ending drive the sprite with tweens */
  steer = true;
  private bank: -1 | 0 | 1 = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(this.x, JET.y, SPACE.jet, 0).setDepth(Z.jet);
    this.sprite.play(SPACE_ANIMS.jetLevel);
  }

  update(dt: number, axis: -1 | 0 | 1): void {
    const sec = dt / 1000;
    if (this.invulnMs > 0) {
      this.invulnMs = Math.max(0, this.invulnMs - dt);
      this.sprite.setAlpha(this.invulnMs > 0 && Math.floor(this.invulnMs / 80) % 2 === 0 ? 0.25 : 1);
    }
    if (!this.steer) return;
    const target = axis * JET.speed;
    const dv = JET.accel * sec;
    this.vx = Math.abs(target - this.vx) <= dv ? target : this.vx + Math.sign(target - this.vx) * dv;
    this.x += this.vx * sec;
    if (this.x < JET.minX || this.x > JET.maxX) {
      this.x = Math.max(JET.minX, Math.min(JET.maxX, this.x));
      this.vx = 0;
    }
    this.sprite.setPosition(Math.round(this.x), JET.y);
    this.setBank(Math.abs(this.vx) > 30 ? (Math.sign(this.vx) as -1 | 1) : 0);
  }

  setBank(b: -1 | 0 | 1): void {
    if (b === this.bank) return;
    this.bank = b;
    this.sprite.play(b < 0 ? SPACE_ANIMS.jetLeft : b > 0 ? SPACE_ANIMS.jetRight : SPACE_ANIMS.jetLevel, true);
  }

  hurt(): void {
    this.invulnMs = RULES.invulnMs;
  }

  get vulnerable(): boolean {
    return this.invulnMs <= 0 && this.steer && this.sprite.visible;
  }

  rect(): Rect {
    return { x: this.x - JET.hitW / 2, y: JET.y + 3 - JET.hitH / 2, w: JET.hitW, h: JET.hitH };
  }

  /** Wider catch box for falling food / capsules (wings included). */
  catchRect(): Rect {
    return { x: this.x - 13, y: JET.y - 10, w: 26, h: 22 };
  }
}
