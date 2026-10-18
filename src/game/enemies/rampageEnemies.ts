/**
 * Level 5 heavies (art faces LEFT):
 *  Bruto (brute)        walks, spots the hero, telegraphs, charges in a line; crashes dazed into
 *                       walls; 3 hit points, a hit staggers it.
 *  Mega burger (boss)   walks at the hero, telegraphs, jumps and smashes the ground: the impact
 *                       sends two low shockwaves (arena.ts) that must be jumped over. 8 hit
 *                       points; sleeps until the arena engages it; a slam dazes it, but only
 *                       once per grace window, so slams cannot keep it frozen till it dies.
 */
import type Phaser from 'phaser';
import { RAMPAGE, RAMPAGE_ANIMS, TILE } from '../../art/keys';
import { ENEMY, MOVE } from '../../config/tuning';
import { bossStuns } from '../brawl/rules';
import { shakeWorld } from '../camera';
import type { KillMethod } from '../rules';
import { Enemy, type EnemyHost, type StompResult } from './Enemy';

const BRUTE_DAZED_FRAME = 7;
const BOSS_DEFEATED_FRAME = 9;
const BOSS_DAZED_FRAME = 8;

type BruteState = 'walk' | 'tell' | 'charge' | 'rest' | 'dazed';

export class Brute extends Enemy {
  readonly kind = 'brute';
  private state: BruteState = 'walk';

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, RAMPAGE.brute, { w: 24, h: 32, ox: 8, oy: 8 });
    this.face(-1);
  }

  protected think(_dtMs: number, host: EnemyHost): void {
    const c = ENEMY.brute;
    switch (this.state) {
      case 'walk':
        this.play(RAMPAGE_ANIMS.bruteWalk);
        this.patrol(c.walk, host);
        if (this.onGround && this.senses(host, c.senseX, c.senseY)) {
          this.faceHero(host);
          this.state = 'tell';
          this.timer = c.telegraphMs;
        }
        break;
      case 'tell':
        this.show(4);
        this.body.setVelocityX(0);
        if (this.timer <= 0) {
          this.state = 'charge';
          this.timer = c.chargeMs;
        }
        break;
      case 'charge':
        this.show(5);
        if (this.onGround && this.wallAhead()) {
          this.crash(host);
          break;
        }
        if (this.onGround && this.ledgeAhead(host, 6)) {
          this.toRest();
          break;
        }
        this.body.setVelocityX(this.dir * c.charge);
        if (this.timer <= 0) this.toRest();
        break;
      case 'rest':
        this.show(0);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.state = 'walk';
        break;
      case 'dazed':
        this.show(BRUTE_DAZED_FRAME);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.state = 'walk';
        break;
    }
  }

  private toRest(): void {
    this.body.setVelocityX(0);
    this.state = 'rest';
    this.timer = ENEMY.brute.restMs;
  }

  /** Ran into a wall at full tilt: stars, a thud, then dazed. */
  private crash(host: EnemyHost): void {
    this.body.setVelocityX(0);
    this.face(this.dir < 0 ? 1 : -1);
    this.state = 'dazed';
    this.timer = ENEMY.brute.dazedMs;
    host.fx.hitStar(this.sprite.x + this.dir * -10, this.body.top + 6);
    host.audio.sfx('bump');
  }

  protected override dazedFrame(): number {
    return BRUTE_DAZED_FRAME;
  }

  protected override onStunEnd(): void {
    this.state = 'walk';
  }

  protected override onSentHome(): void {
    this.state = 'walk';
  }

  /** Too heavy to stomp: the hero bounces off its head. */
  onStomp(host: EnemyHost): StompResult {
    host.fx.hitStar(this.sprite.x, this.body.top);
    return 'clang';
  }

  protected squashFrame(): number {
    return BRUTE_DAZED_FRAME;
  }
}

type BossState = 'idle' | 'walk' | 'tell' | 'jump' | 'smash' | 'rest';

export class MegaBurger extends Enemy {
  readonly kind = 'megaburger';
  /** the arena sets these: the landing smash (feet x, y) and the end of the fight */
  onSmash: ((x: number, feetY: number) => void) | null = null;
  onDefeated: (() => void) | null = null;
  private state: BossState = 'idle';
  /** ms left in which a new stun is refused (it starts when a stagger ends) */
  private graceMs = 0;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, RAMPAGE.megaburger, { w: 44, h: 52, ox: 10, oy: 12 });
    this.face(-1);
  }

  /** The hero stepped into the arena: the fight starts. */
  engage(): void {
    if (this.state === 'idle') this.enter('walk', ENEMY.megaburger.walkMs);
  }

  private enter(state: BossState, ms: number): void {
    this.state = state;
    this.timer = ms;
  }

  protected think(dtMs: number, host: EnemyHost): void {
    const c = ENEMY.megaburger;
    this.graceMs = Math.max(0, this.graceMs - dtMs);
    switch (this.state) {
      case 'idle':
        this.show(0);
        break;
      case 'walk':
        this.play(RAMPAGE_ANIMS.megaburgerWalk);
        this.faceHero(host);
        this.body.setVelocityX(this.dir * c.walk);
        if (this.timer <= 0) this.enter('tell', c.telegraphMs);
        break;
      case 'tell':
        this.show(4);
        this.faceHero(host);
        this.body.setVelocityX(0);
        this.sprite.setTint(Math.floor(this.timer / 90) % 2 === 0 ? 0xffffff : 0xffb0a0);
        if (this.timer <= 0) this.leap(host);
        break;
      case 'jump':
        this.show(this.body.velocity.y < 0 ? 5 : 6);
        if (!this.onGround) this.wasAirborne = true;
        else if (this.wasAirborne) this.land(host);
        break;
      case 'smash':
        this.show(6);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.enter('rest', c.restMs);
        break;
      case 'rest':
        this.show(BOSS_DAZED_FRAME);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.enter('walk', c.walkMs);
        break;
    }
  }

  private leap(host: EnemyHost): void {
    const c = ENEMY.megaburger;
    this.sprite.clearTint();
    const air = (2 * -c.jumpVy) / MOVE.gravity;
    const vx = Math.max(-c.jumpVx, Math.min(c.jumpVx, (host.heroX() - this.sprite.x) / air));
    this.body.setVelocity(vx, c.jumpVy);
    this.wasAirborne = false;
    this.state = 'jump';
  }

  /** Touchdown: dust, shake and the two shockwaves. */
  private land(host: EnemyHost): void {
    const { x } = this.sprite;
    const feet = this.body.bottom;
    this.body.setVelocityX(0);
    this.enter('smash', ENEMY.megaburger.smashMs);
    host.juice.dust(x - 18, feet, 1.2);
    host.juice.dust(x + 18, feet, 1.2);
    host.juice.shock(x, feet, 1.5);
    host.audio.sfx('slam');
    shakeWorld(this.scene.cameras.main, 220, 5);
    this.onSmash?.(x, feet);
  }

  protected override dazedFrame(): number {
    return BOSS_DAZED_FRAME;
  }

  /** Only a slam staggers it, and not again while staggered or just after: no stun-lock. */
  override stun(ms: number): void {
    if (bossStuns(ms, this.stunned, this.graceMs)) super.stun(ms);
  }

  /** Back on its feet it goes straight into its attack: the grace keeps a re-slam from stalling it. */
  protected override onStunEnd(): void {
    this.graceMs = ENEMY.megaburger.stunGraceMs;
    this.enter('tell', ENEMY.megaburger.telegraphMs);
  }

  protected override onSentHome(): void {
    if (this.state !== 'idle') this.enter('walk', ENEMY.megaburger.walkMs);
  }

  /** Too big to stomp: the hero bounces off its bun. */
  onStomp(host: EnemyHost): StompResult {
    host.fx.hitStar(this.sprite.x, this.body.top);
    return 'clang';
  }

  protected squashFrame(): null {
    return null;
  }

  /**
   * Down for good: defeated pose at once, then (after dropping to the street if it was
   * mid-leap) a rumble and it crumbles away. The arena takes over immediately.
   */
  override kill(_method: KillMethod, host: EnemyHost): void {
    if (!this.alive) return;
    this.alive = false;
    this.body.stop();
    this.body.enable = false;
    this.sprite.anims.stop();
    this.sprite.clearTint().setAngle(0).setFrame(BOSS_DEFEATED_FRAME);
    this.onDefeated?.();
    const apex = ENEMY.megaburger.jumpVy ** 2 / (2 * MOVE.gravity);
    this.settle(
      host,
      () => {
        host.juice.dust(this.sprite.x, this.sprite.y, 1.2);
        this.scene.tweens.add({ targets: this.sprite, x: this.sprite.x + 2, duration: 40, yoyo: true, repeat: 14 });
        this.scene.tweens.add({ targets: this.sprite, alpha: 0, delay: 700, duration: 500, onComplete: () => this.sprite.destroy() });
      },
      Math.ceil(apex) + TILE,
    );
  }
}
