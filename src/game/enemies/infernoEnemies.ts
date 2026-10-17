/**
 * Level 2 enemies:
 *  Pipistrello (bat)         flies a sine path around its spawn point; stompable.
 *  Diavoletto (demon)        patrols its island, hops, chases Ciccio when he is close; stompable.
 *  Spirito di fuoco (spirit) hovers and bobs in place with its own light; NOT stompable.
 * Fliers have no gravity and pass through the terrain (see Enemies.isWalker).
 */
import type Phaser from 'phaser';
import { INFERNO, INFERNO_ANIMS } from '../../art/keys';
import { ENEMY } from '../../config/tuning';
import type { KillMethod } from '../rules';
import { DEPTH } from '../depths';
import { addGlow } from '../fxArt';
import { Enemy, type EnemyHost, type StompResult } from './Enemy';

const BAT_HIT_FRAME = 4;
const DEMON_SQUASH_FRAME = 4;

/** Steers a gravity-free body along an analytic path: path velocity + a pull onto it. */
function steer(e: Phaser.Physics.Arcade.Sprite, body: Phaser.Physics.Arcade.Body, tx: number, ty: number, vx: number, vy: number, track: number): void {
  body.setVelocity(vx + (tx - e.x) * track, vy + (ty - e.y) * track);
}

export class Bat extends Enemy {
  readonly kind = 'bat';
  private readonly x0: number;
  private readonly y0: number;
  private readonly phase: number;
  /** warm backlight: a dark bat must still read against the dark castles */
  private readonly light: Phaser.GameObjects.Image;
  private t = 0;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, INFERNO.bat, { w: 14, h: 9, ox: 5, oy: 4 }, false);
    this.x0 = x;
    this.y0 = feetY;
    this.phase = (x * 0.013) % (Math.PI * 2);
    this.light = addGlow(scene, x, feetY - 8, { depth: DEPTH.enemies - 1, scale: 0.75, alpha: 0.7 });
    this.face(-1);
  }

  protected think(dtMs: number): void {
    const c = ENEMY.bat;
    this.t += dtMs / 1000;
    const ax = this.t * c.wx + this.phase;
    const ay = this.t * c.wy + this.phase * 2;
    const vx = c.rangeX * c.wx * Math.cos(ax);
    steer(this.sprite, this.body, this.x0 + Math.sin(ax) * c.rangeX, this.y0 + Math.sin(ay) * c.amp, vx, c.amp * c.wy * Math.cos(ay), c.track);
    if (Math.abs(vx) > 4) this.face(vx < 0 ? -1 : 1);
    this.play(INFERNO_ANIMS.bat);
    this.light.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 8));
  }

  onStomp(): StompResult {
    return 'kill';
  }

  protected squashFrame(): null {
    return null;
  }

  /** Stunned frame, then the shared tumble out of the sky. */
  override kill(method: KillMethod, host: EnemyHost): void {
    if (!this.alive) return;
    this.show(BAT_HIT_FRAME);
    this.scene.tweens.add({ targets: this.light, alpha: 0, duration: 200, onComplete: () => this.light.destroy() });
    super.kill(method, host);
  }
}

type DemonState = 'walk' | 'chase';

export class Demon extends Enemy {
  readonly kind = 'demon';
  private state: DemonState = 'walk';
  private hopMs: number;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, INFERNO.demon, { w: 14, h: 18, ox: 5, oy: 6 });
    this.face(-1);
    this.hopMs = (x * 5) % ENEMY.demon.hopMs;
  }

  protected think(dtMs: number, host: EnemyHost): void {
    const c = ENEMY.demon;
    this.play(INFERNO_ANIMS.demonWalk);
    if (!this.onGround) return;
    const near = this.senses(host, c.senseX, c.senseY);
    this.state = near ? 'chase' : 'walk';
    if (this.state === 'walk') this.patrol(c.walk, host);
    else {
      this.faceHero(host);
      // never chases off its island into the lava
      this.body.setVelocityX(this.ledgeAhead(host, 4) || this.wallAhead() ? 0 : this.dir * c.chase);
    }
    this.sprite.anims.timeScale = this.state === 'chase' ? 1.8 : 1;
    this.hopMs -= dtMs;
    // no hop near an edge: the hop keeps its walking speed and could carry it into the lava
    if (this.hopMs <= 0 && !this.ledgeAhead(host, 12)) {
      this.hopMs = c.hopMs;
      this.body.setVelocityY(c.hopVy);
    }
  }

  onStomp(): StompResult {
    return 'kill';
  }

  protected squashFrame(): number {
    return DEMON_SQUASH_FRAME;
  }
}

export class Spirit extends Enemy {
  readonly kind = 'spirit';
  private readonly x0: number;
  private readonly y0: number;
  private readonly phase: number;
  private readonly light: Phaser.GameObjects.Image;
  private t = 0;

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) {
    super(scene, group, x, feetY, INFERNO.spirit, { w: 10, h: 15, ox: 3, oy: 7 }, false);
    this.vulnerable = false;
    this.x0 = x;
    this.y0 = feetY;
    this.phase = (x * 0.021) % (Math.PI * 2);
    this.light = addGlow(scene, x, feetY - 10, { depth: DEPTH.enemies - 1, alpha: 0.85, pulse: 0.3 });
    if (scene.anims.exists(INFERNO_ANIMS.spirit)) this.sprite.play({ key: INFERNO_ANIMS.spirit, startFrame: Math.floor(x / 16) % 4 });
  }

  protected think(dtMs: number, host: EnemyHost): void {
    const c = ENEMY.spirit;
    this.t += dtMs / 1000;
    const ax = this.t * c.wx + this.phase;
    const ay = this.t * c.wy + this.phase;
    steer(this.sprite, this.body, this.x0 + Math.sin(ax) * c.driftX, this.y0 + Math.sin(ay) * c.bob, c.driftX * c.wx * Math.cos(ax), c.bob * c.wy * Math.cos(ay), c.track);
    this.faceHero(host);
    this.play(INFERNO_ANIMS.spirit);
    this.light.setPosition(Math.round(this.sprite.x), Math.round(this.sprite.y - 10));
  }

  /** Fire cannot be stomped: landing on it burns. */
  onStomp(): StompResult {
    return 'hurt';
  }

  protected squashFrame(): null {
    return null;
  }
}
