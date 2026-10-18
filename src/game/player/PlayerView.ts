/**
 * The hero's look: a sprite (48x48 Ciccio, 64x64 rage form) with feet on the body bottom,
 * pose / animation choice from its skin, squash & stretch, invulnerability blink, dust
 * puffs and the anchored attachments.
 */
import type Phaser from 'phaser';
import { CLUB, HERO } from '../../config/tuning';
import type { CiccioFrameAnchors, PowerState } from '../../contracts';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';
import { Attachments, type HeroPose } from './attachments';
import type { Player } from './Player';
import { heroProfile, type HeroSkin } from './profile';

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
  /** one-shot action (club swing, punch, slam pose) that owns the pose for this long */
  private actionMs = 0;
  /** frame held by the action, null while its animation plays */
  private actionFrame: number | null = null;
  private scale = 1;
  /** false while a cutscene (goal, death) drives the sprite directly */
  auto = true;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
    anchors: readonly CiccioFrameAnchors[],
    readonly skin: HeroSkin = heroProfile().skin,
  ) {
    this.sprite = scene.add.sprite(0, 0, skin.sheet, 0).setOrigin(0.5, 1).setDepth(DEPTH.hero);
    this.attachments = new Attachments(scene, anchors, skin.attachments, skin.frame);
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
      this.fx.dust(p.x - this.skin.dustX, p.bottom, -1);
      this.fx.dust(p.x + this.skin.dustX, p.bottom, 1);
    }
  }

  onBounce(): void {
    this.squash(0.82, 1.18);
  }

  onShoot(): void {
    this.shootMs = 150;
  }

  onClub(): void {
    if (this.skin.club) this.playAction(this.skin.club, CLUB.swingMs + 20);
  }

  /** Plays a one-shot animation (club swing, punch) that owns the pose for `ms`. */
  playAction(anim: string, ms: number): void {
    if (!this.scene.anims.exists(anim)) return;
    // a countdown, not an anim event: an interrupted action can never lock the pose
    this.actionMs = ms;
    this.actionFrame = null;
    this.sprite.play(anim);
  }

  /** Holds one sheet frame for `ms` (slam poses); call again every step to keep it. */
  holdFrame(frame: number, ms: number): void {
    this.actionMs = ms;
    this.actionFrame = frame;
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
    const k = this.skin;
    if (this.actionMs > 0) {
      if (this.actionFrame !== null) this.frame(this.actionFrame);
      return;
    }
    if (p.hurtLock.active) return this.frame(k.hurt);
    if (this.shootMs > 0 && k.shoot !== undefined) return this.frame(k.shoot);
    if (k.fly && p.mode.id === 'flight' && !p.onGround) return this.loop(k.fly, p.vy < -20 ? 1.4 : 0.7);
    if (!p.onGround) {
      if (p.vy < -70) return this.frame(k.jump);
      return this.frame(p.vy > 70 ? k.fall : k.apex);
    }
    if (this.landMs > 0) return this.frame(k.land);
    const speed = Math.abs(p.vx);
    if (speed > 12) return this.loop(k.run, 0.55 + 0.45 * (speed / k.runRef));
    this.loop(k.idle);
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
    this.actionMs = Math.max(0, this.actionMs - dtMs);
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
