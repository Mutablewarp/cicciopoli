/**
 * Level 1 enemies with distinct rhythms:
 *  Sottaceto (pickle)       steady patrol; spots Ciccio, hops angrily, then charges.
 *  Peperoncino (chili)      bounces in place; crouches (telegraph) then leaps at Ciccio.
 *  Burger corazzato (armor) slow and heavy; a stomp only clangs and dazes it.
 */
import type Phaser from 'phaser';
import { HILLS, HILLS_ANIMS } from '../../art/keys';
import { ENEMY, MOVE } from '../../config/tuning';
import { Enemy, type EnemyHost, type StompResult } from './Enemy';

type PickleState = 'walk' | 'tell' | 'charge' | 'rest';

export class Pickle extends Enemy {
  readonly kind = 'pickle';
  private state: PickleState = 'walk';

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, HILLS.pickle, { w: 14, h: 18, ox: 5, oy: 6 });
    this.face(-1);
  }

  protected think(_dtMs: number, host: EnemyHost): void {
    const c = ENEMY.pickle;
    switch (this.state) {
      case 'walk':
        this.play(HILLS_ANIMS.pickleWalk);
        this.patrol(c.walk, host);
        if (this.onGround && this.senses(host, c.senseX, c.senseY)) {
          this.faceHero(host);
          this.state = 'tell';
          this.timer = c.telegraphMs;
          this.body.setVelocity(0, -120);
        }
        break;
      case 'tell':
        this.play(HILLS_ANIMS.pickleCharge);
        this.body.setVelocityX(0);
        if (this.timer <= 0 && this.onGround) {
          this.state = 'charge';
          this.timer = c.chargeMs;
        }
        break;
      case 'charge':
        this.play(HILLS_ANIMS.pickleCharge);
        if (this.onGround && (this.wallAhead() || this.ledgeAhead(host, 6))) {
          this.body.setVelocityX(0);
          this.face(this.dir < 0 ? 1 : -1);
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
    }
  }

  private toRest(): void {
    this.state = 'rest';
    this.timer = ENEMY.pickle.restMs;
  }

  protected override onSentHome(): void {
    this.state = 'walk';
  }

  onStomp(): StompResult {
    return 'kill';
  }

  protected squashFrame(): number {
    return 6;
  }
}

type ChiliState = 'idle' | 'crouch' | 'leap' | 'rest';

/** Highest sideways speed of an idle hop back home. */
const HOME_HOP_VX = 80;

/** Seconds a jump with this initial vy stays in the air (flat ground). */
function airTime(vy: number): number {
  return (2 * -vy) / MOVE.gravity;
}

export class Chili extends Enemy {
  readonly kind = 'chili';
  private state: ChiliState = 'idle';
  private hopMs = 0;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, HILLS.chili, { w: 12, h: 18, ox: 6, oy: 6 });
    this.face(-1);
    this.hopMs = (x * 3) % ENEMY.chili.idleHopMs;
  }

  protected think(dtMs: number, host: EnemyHost): void {
    const c = ENEMY.chili;
    switch (this.state) {
      case 'idle':
        this.play(HILLS_ANIMS.chiliIdle);
        if (!this.onGround) break; // keeps the sideways drift of a hop home
        this.body.setVelocityX(0);
        if (this.senses(host, c.senseX, 56)) {
          this.faceHero(host);
          this.state = 'crouch';
          this.timer = c.telegraphMs;
          break;
        }
        this.hopMs -= dtMs;
        if (this.hopMs <= 0) {
          this.hopMs = c.idleHopMs;
          // strayed from home after a leap: idle hops carry it back
          const dx = this.homeX - this.sprite.x;
          const vx = Math.abs(dx) > 4 ? Math.max(-HOME_HOP_VX, Math.min(HOME_HOP_VX, dx / airTime(c.hopVy))) : 0;
          this.body.setVelocity(vx, c.hopVy);
        }
        break;
      case 'crouch':
        this.show(2);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.leap(host);
        break;
      case 'leap':
        this.show(3);
        if (!this.onGround) this.wasAirborne = true;
        else if (this.wasAirborne) {
          this.body.setVelocityX(0);
          this.state = 'rest';
          this.timer = c.restMs;
        }
        break;
      case 'rest':
        this.show(0);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.state = 'idle';
        break;
    }
  }

  /**
   * Leaps toward Ciccio, never landing farther than the leash from home (it cannot follow
   * him to a checkpoint), shortening or cancelling the leap rather than jumping into a pit.
   */
  private leap(host: EnemyHost): void {
    const c = ENEMY.chili;
    this.faceHero(host);
    const air = airTime(c.leapVy);
    const target = Math.max(this.homeX - c.leash, Math.min(this.homeX + c.leash, this.sprite.x + this.dir * c.leapVx * air));
    let vx = (target - this.sprite.x) / air;
    const landX = (v: number): number => this.sprite.x + v * air;
    if (!host.world.isSolidAt(landX(vx), this.body.bottom + 4)) vx *= 0.5;
    if (!host.world.isSolidAt(landX(vx), this.body.bottom + 4)) vx = 0;
    this.body.setVelocity(vx, c.leapVy);
    this.state = 'leap';
    this.wasAirborne = false;
  }

  onStomp(): StompResult {
    return 'kill';
  }

  protected squashFrame(): number {
    return 4;
  }

  protected override onSentHome(): void {
    this.state = 'rest';
    this.timer = ENEMY.chili.restMs;
  }
}

type ArmorState = 'walk' | 'clang' | 'dazed';

export class Armor extends Enemy {
  readonly kind = 'armor';
  private state: ArmorState = 'walk';

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, HILLS.armor, { w: 22, h: 24, ox: 5, oy: 8 });
    this.face(-1);
  }

  protected think(_dtMs: number, host: EnemyHost): void {
    switch (this.state) {
      case 'walk':
        this.play(HILLS_ANIMS.armorWalk);
        this.patrol(ENEMY.armor.walk, host);
        break;
      case 'clang':
        this.show(4);
        this.body.setVelocityX(0);
        if (this.timer <= 0) {
          this.state = 'dazed';
          this.timer = ENEMY.armor.dazedMs;
        }
        break;
      case 'dazed':
        this.show(5);
        this.body.setVelocityX(0);
        if (this.timer <= 0) this.state = 'walk';
        break;
    }
  }

  protected override onSentHome(): void {
    this.state = 'walk';
  }

  onStomp(host: EnemyHost): StompResult {
    this.state = 'clang';
    this.timer = 160;
    host.fx.hitStar(this.sprite.x, this.body.top);
    return 'clang';
  }

  protected squashFrame(): null {
    return null;
  }
}
