/**
 * Weapon kill effects (BRIEF §6). Provola Goat: a melted-cheese blob swallows the enemy
 * (it turns yellow, vanishes under the blob, the blob drips away). Thai club: the enemy
 * catches fire (orange → charred black while flames rise), then an ash puff. Both work
 * with placeholder art too: the tint + fade alone still read as the kill.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { KILL_FX } from '../../config/tuning';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';

const CHEESE_TINT = 0xffe680;
const CHEESE_FILL = 0xfcd030;
const BURN_FROM = { r: 0xff, g: 0x8c, b: 0x30 };
const BURN_TO = { r: 0x24, g: 0x12, b: 0x12 };

function mixColor(t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (a: number, b: number): number => Math.round(a + (b - a) * k);
  return (ch(BURN_FROM.r, BURN_TO.r) << 16) | (ch(BURN_FROM.g, BURN_TO.g) << 8) | ch(BURN_FROM.b, BURN_TO.b);
}

/** The kill sheets get no placeholder: without them the tint + fade fallback runs. */
function hasArt(scene: Phaser.Scene, key: string, anim: string): boolean {
  return scene.textures.exists(key) && scene.anims.exists(anim);
}

/** Cheese engulf at the enemy's feet; `done` runs once the enemy is gone. */
export function cheeseEngulf(scene: Phaser.Scene, fx: Fx, enemy: Phaser.GameObjects.Sprite, done: () => void): void {
  enemy.anims.stop();
  enemy.setTint(CHEESE_TINT);
  scene.tweens.add({ targets: enemy, scaleY: 0.82, scaleX: 1.1, duration: 140, ease: 'Quad.easeOut' });
  let gone = false;
  const hide = (): void => {
    if (gone) return;
    gone = true;
    enemy.setVisible(false);
    done();
  };
  if (!hasArt(scene, ITEMS.cheeseEngulf, ITEM_ANIMS.cheeseEngulf)) {
    // no sheet: the yellow enemy melts down into a cheese splat
    fx.once(ITEMS.cheeseSplat, ITEM_ANIMS.cheeseSplat, enemy.x, enemy.y - 6, { depth: DEPTH.enemies + 1 });
    enemy.setTintFill(CHEESE_FILL);
    scene.tweens.add({ targets: enemy, scaleY: 0.1, alpha: 0, duration: KILL_FX.engulfMs, ease: 'Quad.easeIn', onComplete: hide });
    return;
  }
  const blob = fx.once(ITEMS.cheeseEngulf, ITEM_ANIMS.cheeseEngulf, Math.round(enemy.x), Math.round(enemy.y), { originY: 1, depth: DEPTH.enemies + 1 });
  blob.on(
    'animationupdate',
    (_a: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) => {
      const f = Number(frame.textureFrame);
      if (f >= 1) enemy.setTintFill(CHEESE_FILL);
      if (f >= KILL_FX.engulfHideFrame) hide();
    },
  );
  blob.once('animationcomplete', hide);
  blob.once('destroy', hide);
}

/** The enemy catches fire at its feet; `done` runs once it has burnt away. */
export function catchFire(scene: Phaser.Scene, fx: Fx, enemy: Phaser.GameObjects.Sprite, done: () => void): void {
  const real = hasArt(scene, ITEMS.burn, ITEM_ANIMS.burn);
  let total: number = KILL_FX.burnMs;
  if (real) {
    const anim = fx.once(ITEMS.burn, ITEM_ANIMS.burn, Math.round(enemy.x), Math.round(enemy.y), { originY: 1, depth: DEPTH.enemies + 1 }).anims.currentAnim;
    if (anim) total = Math.max(total, (anim.frames.length * 1000) / anim.frameRate);
  } else {
    // no sheet: two club flames lick up the silhouette
    for (const [dx, frame] of [[-5, 0], [5, 3]] as const) {
      const f = fx.once(ITEMS.flame, ITEM_ANIMS.flame, enemy.x + dx, enemy.y + 2, { originY: 1, depth: DEPTH.enemies + 1, startFrame: frame });
      scene.tweens.add({ targets: f, y: f.y - 8, alpha: 0, delay: 200, duration: total - 200, onComplete: () => f.destroy() });
    }
  }
  enemy.anims.timeScale = 2.5; // frantic legs while it burns
  enemy.setTint(mixColor(0));
  const heat = { t: 0 };
  scene.tweens.add({
    targets: heat,
    t: 1,
    duration: total * 0.6,
    ease: 'Sine.easeIn',
    onUpdate: () => enemy.setTint(mixColor(heat.t)),
  });
  scene.tweens.add({ targets: enemy, y: enemy.y - 3, duration: 90, yoyo: true, repeat: 2 });
  scene.tweens.add({
    targets: enemy,
    alpha: 0,
    scaleY: 0.7,
    delay: total * 0.5,
    duration: total * 0.4,
    ease: 'Quad.easeIn',
    onComplete: () => {
      if (!real) fx.poof(enemy.x, enemy.y - 8);
      enemy.setVisible(false);
      done();
    },
  });
}
