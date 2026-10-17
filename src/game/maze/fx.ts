/** Small one-shot effects for the maze: score popups from the shared `digits` sheet and a poof. */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { DEPTH } from './actors';

const PLUS = 10;
const ADVANCE = 5;

/** "+200" rising and fading above a point (digits are 6x8, cream with a dark outline). */
export function popup(scene: Phaser.Scene, x: number, y: number, points: number): void {
  const glyphs = [PLUS, ...String(Math.round(points)).split('').map(Number)];
  const width = (glyphs.length - 1) * ADVANCE + 6;
  const c = scene.add.container(Math.round(x - width / 2), Math.round(y + 4)).setDepth(DEPTH.popup);
  glyphs.forEach((g, i) => c.add(scene.add.image(i * ADVANCE, 0, ITEMS.digits, g).setOrigin(0, 1)));
  scene.tweens.add({ targets: c, y: c.y - 12, duration: 700, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: c, alpha: 0, delay: 650, duration: 250, onComplete: () => c.destroy() });
}

/** Cloud puff that removes itself. */
export function poof(scene: Phaser.Scene, x: number, y: number): void {
  const s = scene.add.sprite(x, y, ITEMS.poof, 0).setDepth(DEPTH.popup - 1);
  if (scene.anims.exists(ITEM_ANIMS.poof)) s.play(ITEM_ANIMS.poof).once('animationcomplete', () => s.destroy());
  else scene.time.delayedCall(300, () => s.destroy());
}
