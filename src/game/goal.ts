/**
 * Level end: golf flag planted in the hole, the "VAI IN BUCA!" banner when Ciccio gets
 * close, and the drop-into-the-hole finish (clipped by a mask at the hole's lip).
 */
import type Phaser from 'phaser';
import { TILE } from '../art/keys';
import { FLOW } from '../config/tuning';
import type { Cell } from './levels/types';
import { DEPTH } from './depths';
import { addGlow } from './fxArt';
import type { Fx } from './fx';
import type { ThemeConfig } from './themes';

/** Half-width of the zone over the hole that swallows Ciccio (the level 5 finale starts earlier). */
const MOUTH = 12;
/** A jump crossing the flag lower than this above the hole still ends in the hole. */
const CATCH_HEIGHT = 96;

export class Goal {
  readonly x: number;
  /** ground surface y at the hole */
  readonly surfaceY: number;
  /** the flag on its pole (the level 5 finale swaps it for the torn pole) */
  readonly pole: Phaser.GameObjects.Sprite;
  /** held while a boss guards the goal: no "VAI IN BUCA!" banner yet, and the hole swallows nobody */
  gated = false;
  private bannerShown = false;
  /** scene time before which the banner stays quiet (the gate banner is still up) */
  private quietUntil = 0;
  private readonly hole: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    theme: ThemeConfig,
    cell: Cell,
    private readonly fx: Fx,
    private readonly mouth = MOUTH,
  ) {
    this.x = cell.col * TILE + TILE / 2;
    this.surfaceY = (cell.row + 1) * TILE;
    this.hole = scene.add.image(this.x, this.surfaceY + 2, theme.hole).setOrigin(0.5, 1).setDepth(DEPTH.hole);
    const tex = scene.textures.get(theme.flag.key).get(0);
    const flag = scene.add.sprite(this.x + 3, this.surfaceY - 1, theme.flag.key, 0);
    flag.setOrigin(theme.flag.baseX / tex.width, theme.flag.baseY / tex.height).setDepth(DEPTH.flag);
    if (scene.anims.exists(theme.flag.anim)) flag.play(theme.flag.anim);
    this.pole = flag;
    if (theme.lights) {
      addGlow(scene, this.x, this.surfaceY - 6, { depth: DEPTH.hole + 0.5, alpha: 0.9, pulse: 0.3 });
      addGlow(scene, this.x + 14, this.surfaceY - 56, { depth: DEPTH.glow, alpha: 0.7, pulse: 0.35 });
    }
  }

  /** The guard is down: the goal opens now, its banner after `holdMs` (another banner owns the lane). */
  ungate(holdMs: number): void {
    this.gated = false;
    this.quietUntil = this.scene.time.now + holdMs;
  }

  /** True once, the first time the hero is within the banner distance. */
  shouldAnnounce(heroX: number): boolean {
    if (this.gated || this.bannerShown || this.scene.time.now < this.quietUntil) return false;
    if (heroX < this.x - FLOW.goalBannerTiles * TILE) return false;
    this.bannerShown = true;
    return true;
  }

  /**
   * Hero standing over the hole mouth, or flying across the flag at a normal jump height
   * (a running jump onto the mound would otherwise overshoot the hole: it gets sucked in).
   */
  swallows(prevX: number, heroX: number, heroBottom: number, onGround: boolean): boolean {
    if (this.gated) return false; // a boss still guards it: nothing may win the level around him
    if (onGround) return Math.abs(heroX - this.x) <= this.mouth && Math.abs(heroBottom - this.surfaceY) < 4;
    const crossed = (prevX - this.x) * (heroX - this.x) <= 0 && prevX !== heroX;
    return crossed && heroBottom <= this.surfaceY && heroBottom > this.surfaceY - CATCH_HEIGHT;
  }

  /** World x of the pole. */
  get poleX(): number {
    return this.pole.x;
  }

  /** The flag was torn off: the pole stops waving and shows the torn sprite. */
  swapPole(key: string): void {
    this.pole.anims.stop();
    this.pole.setTexture(key);
  }

  /** Slides the hero sprite to the hole centre and sinks it under the lip (cropped there). */
  playDrop(sprite: Phaser.GameObjects.Sprite, onDone: () => void): void {
    const lip = this.hole.y - this.hole.height + 5;
    const clip = (): void => {
      const top = sprite.y - sprite.height * sprite.scaleY;
      sprite.setCrop(0, 0, sprite.width, Math.max(0, (lip - top) / sprite.scaleY));
    };
    this.scene.tweens.add({ targets: sprite, x: this.x, duration: 140, ease: 'Sine.easeOut' });
    this.scene.tweens.add({
      targets: sprite,
      y: sprite.y - 10,
      duration: 170,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.fx.sparkleBurst(this.x, lip - 6, 8, 16);
        this.scene.tweens.add({
          targets: sprite,
          y: lip + 46,
          scaleX: sprite.scaleX * 0.7,
          scaleY: sprite.scaleY * 0.7,
          duration: 520,
          ease: 'Quad.easeIn',
          onUpdate: clip,
          onComplete: () => {
            this.fx.sparkleBurst(this.x, lip - 4, 10, 22);
            sprite.setVisible(false).setCrop();
            onDone();
          },
        });
      },
    });
  }
}
