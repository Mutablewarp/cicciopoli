/**
 * Provola Goat cheese shots: rectangular projectiles fired from the hand anchor in the
 * facing direction (speed / cooldown / lifetime from tuning), splatting on impact.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { CHEESE } from '../../config/tuning';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';

interface Shot {
  sprite: Phaser.Physics.Arcade.Sprite;
  ageMs: number;
}

export class CheeseGun {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly shots = new Map<Phaser.GameObjects.GameObject, Shot>();
  private cooldownMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
  ) {
    this.group = scene.physics.add.group({ allowGravity: false });
  }

  get ready(): boolean {
    return this.cooldownMs <= 0;
  }

  fire(x: number, y: number, dir: 1 | -1): boolean {
    if (!this.ready) return false;
    this.cooldownMs = CHEESE.cooldownMs;
    const s = this.scene.physics.add.sprite(x + dir * CHEESE.muzzle, y, ITEMS.cheeseShot, 0);
    this.group.add(s);
    s.setDepth(DEPTH.shots).setFlipX(dir < 0);
    const body = s.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setSize(10, 6, true);
    body.setVelocity(dir * CHEESE.speed, 0);
    if (this.scene.anims.exists(ITEM_ANIMS.cheeseShot)) s.play(ITEM_ANIMS.cheeseShot);
    this.shots.set(s, { sprite: s, ageMs: 0 });
    return true;
  }

  /** Splats a shot at its current position (wall, block, enemy, crate). */
  splat(obj: Phaser.GameObjects.GameObject): void {
    const shot = this.shots.get(obj);
    if (!shot) return;
    this.shots.delete(obj);
    const s = shot.sprite;
    const dir = (s.body as Phaser.Physics.Arcade.Body).velocity.x >= 0 ? 1 : -1;
    this.fx.once(ITEMS.cheeseSplat, ITEM_ANIMS.cheeseSplat, s.x + dir * 4, s.y, { flipX: dir < 0, depth: DEPTH.fx });
    s.destroy();
  }

  isShot(obj: Phaser.GameObjects.GameObject): boolean {
    return this.shots.has(obj);
  }

  update(dtMs: number): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    for (const shot of [...this.shots.values()]) {
      shot.ageMs += dtMs;
      const b = shot.sprite.body as Phaser.Physics.Arcade.Body;
      if (b.blocked.left || b.blocked.right) this.splat(shot.sprite);
      else if (shot.ageMs >= CHEESE.lifetimeMs) {
        this.shots.delete(shot.sprite);
        this.scene.tweens.add({ targets: shot.sprite, alpha: 0, duration: 120, onComplete: () => shot.sprite.destroy() });
        b.enable = false;
      }
    }
  }
}
