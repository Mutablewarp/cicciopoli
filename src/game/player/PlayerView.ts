/**
 * Ciccio's look: 48x48 sprite with feet on the body bottom, pose / animation choice,
 * squash & stretch, invulnerability blink, dust puffs and the anchored attachments.
 */
import type Phaser from 'phaser';
import { CICCIO, CICCIO_ANIMS } from '../../art/keys';
import { CLUB, HERO } from '../../config/tuning';
import type { CiccioFrameAnchors, PowerState } from '../../contracts';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';
import { Attachments, type HeroPose } from './attachments';
import type { Player } from './Player';

const SPRING = 14;
const RUN_DUST_MS = 170;

export class PlayerView {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly attachments: Attachments;
  private sqX = 1;
  private sqY = 1;
  private landMs = 0;
  private shootMs = 0;
  private dustMs = 0;
  private clubMs = 0;
  private scale = 1;
  /** false while a cutscene (goal, death) drives the sprite directly */
  auto = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
    anchors: readonly CiccioFrameAnchors[],
  ) {
    this.sprite = scene.add.sprite(0, 0, CICCIO.sheet, CICCIO.idle[0]).setOrigin(0.5, 1).setDepth(DEPTH.hero);
    this.attachments = new Attachments(scene, anchors);
  }

  pose(p: Player): HeroPose {
    return { sprite: this.sprite, facing: p.facing, scale: this.scale, sqX: this.sqX, sqY: this.sqY, shown: p.invuln.blinkOn(HERO.blinkHz) };
  }

  onJump(): void {
    this.squash(0.8, 1.2);
  }

  onLand(p: Player, speed: number): void {
    const k = Math.min(1, speed / 480);
    this.squash(1 + 0.28 * k, 1 - 0.24 * k);
    this.landMs = 90;
    if (speed > 160) {
      this.fx.dust(p.x - 7, p.bottom, -1);
      this.fx.dust(p.x + 7, p.bottom, 1);
    }
  }

  onBounce(): void {
    this.squash(0.82, 1.18);
  }

  onShoot(): void {
    this.shootMs = 150;
  }

  onClub(): void {
    if (!this.scene.anims.exists(CICCIO_ANIMS.club)) return;
    // a countdown, not an anim event: an interrupted swing can never lock the pose
    this.clubMs = CLUB.swingMs + 20;
    this.sprite.play(CICCIO_ANIMS.club);
  }

  private squash(x: number, y: number): void {
    this.sqX = x;
    this.sqY = y;
  }

  private loop(key: string, timeScale = 1): void {
    if (this.sprite.anims.currentAnim?.key !== key || !this.sprite.anims.isPlaying) this.sprite.play(key);
    this.sprite.anims.timeScale = timeScale;
  }

  private frame(index: number): void {
    if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
    if (Number(this.sprite.frame.name) !== index) this.sprite.setFrame(index);
  }

  private choosePose(p: Player): void {
    if (this.clubMs > 0) return;
    if (p.hurtLock.active) return this.frame(CICCIO.hurt);
    if (this.shootMs > 0) return this.frame(CICCIO.shoot);
    if (p.mode.id === 'flight' && !p.onGround) return this.loop(CICCIO_ANIMS.fly, p.vy < -20 ? 1.4 : 0.7);
    if (!p.onGround) {
      if (p.vy < -70) return this.frame(CICCIO.jump);
      return this.frame(p.vy > 70 ? CICCIO.fall : CICCIO.apex);
    }
    if (this.landMs > 0) return this.frame(CICCIO.land);
    const speed = Math.abs(p.vx);
    if (speed > 12) return this.loop(CICCIO_ANIMS.run, 0.55 + 0.45 * (speed / 150));
    this.loop(CICCIO_ANIMS.idle);
  }

  private runDust(p: Player, dtMs: number): void {
    const speed = Math.abs(p.vx);
    const skid = p.onGround && speed > 60 && Math.sign(p.vx) !== p.facing;
    if (!p.onGround || (speed < 130 && !skid)) {
      this.dustMs = 0;
      return;
    }
    this.dustMs -= dtMs;
    if (this.dustMs > 0) return;
    this.dustMs = skid ? 90 : RUN_DUST_MS;
    const back = -Math.sign(p.vx);
    this.fx.dust(p.x + back * 6, p.bottom, skid ? -back : back);
  }

  update(p: Player, powers: PowerState, dtMs: number): void {
    const dt = dtMs / 1000;
    this.landMs = Math.max(0, this.landMs - dtMs);
    this.shootMs = Math.max(0, this.shootMs - dtMs);
    this.clubMs = Math.max(0, this.clubMs - dtMs);
    const target = p.hasBrie ? HERO.brieScale : 1;
    this.scale += (target - this.scale) * Math.min(1, dt * 10);
    const k = Math.min(1, dt * SPRING);
    this.sqX += (1 - this.sqX) * k;
    this.sqY += (1 - this.sqY) * k;
    if (this.auto) {
      this.choosePose(p);
      this.sprite.setPosition(p.x, p.bottom);
      this.sprite.setScale(this.scale * this.sqX, this.scale * this.sqY);
      this.sprite.setFlipX(p.facing < 0);
      this.runDust(p, dtMs);
    }
    const pose = this.pose(p);
    if (this.auto) this.sprite.setVisible(pose.shown);
    this.attachments.update(pose, powers);
  }
}
