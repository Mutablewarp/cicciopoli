/**
 * Enemy base: an Arcade sprite (feet-anchored, art faces LEFT), sleep until near the
 * camera, wall / ledge sensing, and the shared defeat animations.
 */
import type Phaser from 'phaser';
import { TILE } from '../../art/keys';
import { ENEMY, HULK, KILL_FX, MOVE } from '../../config/tuning';
import type { GameAudio } from '../../contracts';
import { enemyHp, hitResult } from '../brawl/rules';
import type { Juice } from '../brawl/juice';
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
  juice: Juice;
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
  /** level 5 fists: hit points left (-1 until the first hit) and the remaining stagger */
  private hp = -1;
  private stunMs = 0;

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

  /** Staggered by a fist / slam: harmless and frozen until the time is up. */
  get stunned(): boolean {
    return this.stunMs > 0;
  }

  /** Hit points left against the fists. */
  get hpLeft(): number {
    return this.hp < 0 ? enemyHp(this.kind) : this.hp;
  }

  /** Fist / slam damage; true when it is dead. */
  hurt(damage: number): boolean {
    const out = hitResult(this.hpLeft, damage);
    this.hp = out.hp;
    return out.dead;
  }

  /** White flash on a hit that did not kill. */
  flash(ms = 80): void {
    this.sprite.setTintFill(0xffffff);
    this.scene.time.delayedCall(ms, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });
  }

  stun(ms: number): void {
    this.stunMs = Math.max(this.stunMs, ms);
    this.sprite.anims.pause();
    const frame = this.dazedFrame();
    if (frame !== null) this.sprite.setFrame(frame);
  }

  /** Frame shown while staggered (null = keep the current one and wobble). */
  protected dazedFrame(): number | null {
    return null;
  }

  /** Per-type reaction when a stagger ends. */
  protected onStunEnd(): void {}

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
    if (this.stunMs > 0) {
      this.stunMs = Math.max(0, this.stunMs - dtMs);
      if (this.onGround) this.body.setVelocityX(0);
      this.sprite.setAngle(this.stunMs > 0 ? Math.sin(this.stunMs * 0.045) * 6 : 0);
      if (this.stunMs === 0) {
        this.sprite.anims.resume();
        this.onStunEnd();
      }
      return;
    }
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

  /** A walker killed mid-hop first drops onto the ground under it (at most `maxPx`), so no defeat effect floats. */
  protected settle(host: EnemyHost, then: () => void, maxPx: number = KILL_FX.dropMaxPx): void {
    // the sprite's feet, not the body: the body may already be a step ahead of the drawn sprite
    const fall = this.body.allowGravity ? dropToGround(host.world, this.sprite.x, this.sprite.y, maxPx) : 0;
    if (fall < 1) return then();
    const ms = Math.sqrt((2 * fall) / MOVE.gravity) * 1000; // free-fall time
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y + fall, duration: ms, ease: 'Quad.easeIn', onComplete: then });
  }

  /** `dir` is the way a punched enemy is launched (level 5). */
  kill(method: KillMethod, host: EnemyHost, dir: -1 | 1 = 1): void {
    if (!this.alive) return;
    this.alive = false;
    this.body.stop();
    this.body.enable = false;
    this.sprite.clearTint().setAngle(0);
    if (method === 'punch') return this.launch(dir);
    const frame = method === 'stomp' || method === 'slam' ? this.squashFrame() : null;
    if (method === 'slam' && frame === null) return this.flatten();
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

  /** Punched away: spins off in an arc, fading as it goes. */
  private launch(dir: -1 | 1): void {
    const L = HULK.launch;
    const s = this.sprite;
    const cy = this.body.center.y;
    const x0 = s.x;
    s.anims.stop();
    s.setOrigin(0.5, 0.5).setPosition(x0, cy);
    const t = { v: 0 };
    this.scene.tweens.add({
      targets: t,
      v: 1,
      duration: L.ms,
      onUpdate: () => {
        s.setPosition(x0 + dir * L.dist * t.v, cy - L.rise * 4 * t.v * (1 - t.v) + 70 * t.v * t.v);
        s.setAngle(dir * L.spin * t.v);
        s.setAlpha(t.v < 0.6 ? 1 : 1 - (t.v - 0.6) / 0.4);
      },
      onComplete: () => s.destroy(),
    });
  }

  /** Crushed by a slam with no squashed frame: flattened, then gone. */
  private flatten(): void {
    this.sprite.anims.stop();
    this.scene.tweens.add({ targets: this.sprite, scaleY: 0.25, scaleX: 1.25, duration: 90, ease: 'Quad.easeOut' });
    this.scene.tweens.add({ targets: this.sprite, alpha: 0, delay: 380, duration: 220, onComplete: () => this.sprite.destroy() });
  }
}
