/**
 * Bonus UFO crossing the top of the field now and then (it drops a lightning capsule when hit).
 */
import Phaser from 'phaser';
import { SPACE, SPACE_ANIMS } from '../../art/space/keys';
import { FIELD, UFO } from './config';
import { Z } from './fx';
import type { Rect } from './shields';

export class Ufo {
  sprite: Phaser.GameObjects.Sprite | null = null;
  private wait: number = UFO.firstMs;
  private dir: 1 | -1 = 1;
  private soundMs = 0;

  constructor(private readonly scene: Phaser.Scene, private readonly sfx: () => void) {}

  /** `allowed` false (few invaders left, wave break) only delays the next pass. */
  update(dt: number, allowed: boolean): void {
    const s = this.sprite;
    if (!s) {
      if (!allowed) return;
      this.wait -= dt;
      if (this.wait <= 0) this.launch();
      return;
    }
    s.x += this.dir * UFO.speed * (dt / 1000);
    this.soundMs -= dt;
    if (this.soundMs <= 0) {
      this.soundMs = UFO.soundMs;
      this.sfx();
    }
    if (s.x < -24 || s.x > FIELD.w + 24) this.remove();
  }

  rect(): Rect | null {
    const s = this.sprite;
    return s ? { x: s.x - 13, y: s.y - 5, w: 26, h: 11 } : null;
  }

  remove(): void {
    this.sprite?.destroy();
    this.sprite = null;
    this.wait = Phaser.Math.Between(UFO.minGapMs, UFO.maxGapMs);
  }

  private launch(): void {
    this.dir = Math.random() < 0.5 ? 1 : -1;
    const x = this.dir > 0 ? -20 : FIELD.w + 20;
    this.sprite = this.scene.add.sprite(x, UFO.y, SPACE.ufo, 0).setDepth(Z.ufo);
    this.sprite.play(SPACE_ANIMS.ufo);
    this.soundMs = 0;
  }
}
