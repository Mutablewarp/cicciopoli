/**
 * The caught-food tray along the bottom of the field (the level's collectibles). Caught foods
 * fly into the next free slot; once the row is full the oldest icon drops out and the rest
 * slide one slot left. Every icon always has exactly one tween, aimed at its current slot.
 */
import type Phaser from 'phaser';
import { SPACE } from '../../art/space/keys';
import { TRAY } from './config';
import { Z } from './fx';

const FLY_MS = 380;
const SHIFT_MS = 120;

export class Tray {
  private icons: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** A food of sheet `frame` caught at world (x, y). */
  add(frame: number, x: number, y: number): void {
    if (this.icons.length >= TRAY.max) {
      const oldest = this.icons.shift();
      if (oldest) {
        this.scene.tweens.killTweensOf(oldest);
        oldest.destroy();
      }
      // icons still in flight are retargeted too: a plain setX would be undone by their tween
      this.icons.forEach((icon, slot) => this.slide(icon, slot, SHIFT_MS));
    }
    const icon = this.scene.add.image(x, y, SPACE.food, frame).setDepth(Z.tray);
    this.slide(icon, this.icons.length, FLY_MS);
    this.icons.push(icon);
  }

  private slide(icon: Phaser.GameObjects.Image, slot: number, ms: number): void {
    this.scene.tweens.killTweensOf(icon);
    this.scene.tweens.add({ targets: icon, x: TRAY.x0 + slot * TRAY.step, y: TRAY.y, duration: ms, ease: 'Quad.easeOut' });
  }
}
