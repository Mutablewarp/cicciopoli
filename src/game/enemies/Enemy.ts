/**
 * Enemy base: an Arcade sprite (feet-anchored, art faces LEFT), sleep until near the
 * camera, wall / ledge sensing, and the shared defeat animations.
 */
import type Phaser from 'phaser';
import { TILE } from '../../art/keys';
import { ENEMY, KILL_FX, MOVE } from '../../config/tuning';
import type { GameAudio } from '../../contracts';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';
import type { ViewRect } from '../parallax';
import type { EnemyKind } from '../levels/types';
import type { KillMethod } from '../rules';
import type { World } from '../world';
import { catchFire, cheeseEngulf } from './killFx';

export type StompResult = 'kill' | 'clang' | 'hurt';

/** What enemies may read from the level while thinking. */
export interface EnemyHost {
  world: World;
  fx: Fx;
  audio: GameAudio;
  heroX(): number;
  heroY(): number;
  view(): ViewRect;
}

export interface BodyBox {
  w: number;
  h: number;
  ox: number;
  oy: number;
}

/**
 * Px from `bottom` down to the first solid tile top under `x`, searched up to `maxPx` below;
 * 0 when already standing or when nothing is found (over a pit the body stays put).
 * shortcut: terrain only, ? blocks / crates are not seen; check them too if walkers ever hop over them.
 */
export function dropToGround(world: Pick<World, 'isSolidAt'>, x: number, bottom: number, maxPx: number): number {
  for (let top = Math.floor(bottom / TILE) * TILE; top <= bottom + maxPx; top += TILE) {
    if (world.isSolidAt(x, top + 1)) return Math.max(0, top - bottom);
  }
  return 0;
}

export abstract class Enemy {
  abstract readonly kind: EnemyKind;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly body: Phaser.Physics.Arcade.Body;
  alive = true;
  awake = false;
  /** cheese and club kill it */
  vulnerable = true;
  /** spawn point (feet), where a respawn sends it back */
  readonly homeX: number;
  readonly homeY: number;
  protected dir: -1 | 1 = -1;
  protected timer = 0;
  protected wasAirborne = false;

  constructor(
    protected readonly scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.Group,
    x: number,
    feetY: number,
    key: string,
    box: BodyBox,
    gravity = true,
  ) {
    this.homeX = x;
    this.homeY = feetY;
    this.sprite = scene.physics.add.sprite(x, feetY, key, 0);
    this.sprite.setOrigin(0.5, 1).setDepth(DEPTH.enemies);
    group.add(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(box.w, box.h, false).setOffset(box.ox, box.oy);
    this.body.setAllowGravity(gravity);
    this.body.setGravityY(gravity ? MOVE.gravity : 0);
    this.body.setMaxVelocityY(MOVE.maxFall);
    this.body.setCollideWorldBounds(true);
    this.body.updateFromGameObject(); // origin / box changed after the body was created
    this.body.enable = false;
  }

  /** Back to the spawn point at rest (pit respawn safety). */
  sendHome(): void {
    if (!this.alive) return;
    this.body.reset(this.homeX, this.homeY);
    this.timer = 0;
    this.wasAirborne = false;
    this.onSentHome();
  }

  /** Per-type state reset after sendHome. */
  protected onSentHome(): void {}

  /** Per-type behaviour while awake and alive. */
  protected abstract think(dtMs: number, host: EnemyHost): void;

  /** Player landed on top. */
  abstract onStomp(host: EnemyHost): StompResult;

  /** Frame shown when squashed by a stomp (null = poof instead). */
  protected abstract squashFrame(): number | null;

  get onGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(dtMs: number, host: EnemyHost): void {
    if (!this.alive) return;
    if (!this.awake) {
      const v = host.view();
      const m = ENEMY.wakeMargin;
      if (this.sprite.x < v.x - m || this.sprite.x > v.x + v.w + m) return;
      this.awake = true;
      this.body.enable = true;
    }
    if (this.body.top > host.world.height + 32) {
      this.alive = false;
      this.sprite.destroy();
      return;
    }
    this.timer -= dtMs;
    this.think(dtMs, host);
  }

  protected face(dir: -1 | 1): void {
    this.dir = dir;
    this.sprite.setFlipX(dir > 0);
  }

  protected faceHero(host: EnemyHost): void {
    this.face(host.heroX() < this.sprite.x ? -1 : 1);
  }

  protected wallAhead(): boolean {
    return this.dir < 0 ? this.body.blocked.left || this.body.touching.left : this.body.blocked.right || this.body.touching.right;
  }

  /** No ground a step in front of the feet. */
  protected ledgeAhead(host: EnemyHost, lookPx = 3): boolean {
    const fx = this.dir < 0 ? this.body.left - lookPx : this.body.right + lookPx;
    return !host.world.isSolidAt(fx, this.body.bottom + 4);
  }

  /** Walks in `dir`, turning around at walls and ledges. */
  protected patrol(speed: number, host: EnemyHost): void {
    if (this.onGround && (this.wallAhead() || this.ledgeAhead(host))) this.face(this.dir < 0 ? 1 : -1);
    this.body.setVelocityX(this.dir * speed);
  }

  protected play(key: string): void {
    if (this.sprite.anims.currentAnim?.key === key && this.sprite.anims.isPlaying) return;
    if (this.scene.anims.exists(key)) this.sprite.play(key);
  }

  protected show(frame: number): void {
    if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
    this.sprite.setFrame(frame);
  }

  /** Hero within a box around the enemy (dx ahead or behind). */
  protected senses(host: EnemyHost, rangeX: number, rangeY: number): boolean {
    return Math.abs(host.heroX() - this.sprite.x) < rangeX && Math.abs(host.heroY() - this.body.center.y) < rangeY;
  }

  /** A walker killed mid-hop first drops onto the ground under it, so no defeat effect floats. */
  private settle(host: EnemyHost, then: () => void): void {
    // the sprite's feet, not the body: the body may already be a step ahead of the drawn sprite
    const fall = this.body.allowGravity ? dropToGround(host.world, this.sprite.x, this.sprite.y, KILL_FX.dropMaxPx) : 0;
    if (fall < 1) return then();
    const ms = Math.sqrt((2 * fall) / MOVE.gravity) * 1000; // free-fall time
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y + fall, duration: ms, ease: 'Quad.easeIn', onComplete: then });
  }

  kill(method: KillMethod, host: EnemyHost): void {
    if (!this.alive) return;
    this.alive = false;
    this.body.stop();
    this.body.enable = false;
    const frame = method === 'stomp' ? this.squashFrame() : null;
    if (frame !== null) {
      this.show(frame);
      this.settle(host, () => {
        host.fx.dust(this.sprite.x - 6, this.sprite.y, -1);
        host.fx.dust(this.sprite.x + 6, this.sprite.y, 1);
        this.scene.tweens.add({ targets: this.sprite, alpha: 0, delay: 380, duration: 220, onComplete: () => this.sprite.destroy() });
      });
      return;
    }
    if (method === 'cheese' || method === 'club') {
      host.fx.hitStar(this.sprite.x, this.body.center.y);
      const done = (): void => {
        this.scene.tweens.killTweensOf(this.sprite);
        this.sprite.destroy();
      };
      this.settle(host, () => {
        if (method === 'cheese') cheeseEngulf(this.scene, host.fx, this.sprite, done);
        else catchFire(this.scene, host.fx, this.sprite, done);
      });
      return;
    }
    host.fx.hitStar(this.sprite.x, this.body.center.y);
    host.fx.poof(this.sprite.x, this.body.center.y);
    this.sprite.anims.stop();
    this.sprite.setFlipY(true);
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 14, duration: 160, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y + 120,
      alpha: 0,
      delay: 160,
      duration: 520,
      ease: 'Quad.easeIn',
      onComplete: () => this.sprite.destroy(),
    });
  }
}
