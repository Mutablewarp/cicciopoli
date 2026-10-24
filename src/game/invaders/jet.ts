/**
 * Ciccio's jet: smooth left/right flight along the bottom, banking frames, blink while
 * invulnerable after a hit. The owner's logo face rides on it as its own smooth image
 * (art/space/keys.ts JET_FACE) and copies the sprite every frame: tweens, blink, scale, hiding.
 */
import Phaser from 'phaser';
import { JET_FACE, SPACE, SPACE_ANIMS } from '../../art/space/keys';
import { FIELD, JET, RULES } from './config';
import { Z } from './fx';
import type { Rect } from './shields';

/** Frame centre of the jet sheet (43x40, origin 0.5). */
const FRAME_CX = 21.5;
const FRAME_CY = 20;
/** The face resampled for the current zoom (a texture far bigger than its screen size would shimmer). */
const FACE_FIT = `${SPACE.face}-fit`;
/** Banking: the face leans into the turn, narrows a little and slides 1 px towards the low wing. */
const TILT = { rad: 0.07, squash: 0.08, px: 1, easeMs: 90 } as const;

export class Jet {
  readonly sprite: Phaser.GameObjects.Sprite;
  /** null when the face image failed to load: the plain jet still flies */
  private readonly face: Phaser.GameObjects.Image | null = null;
  private faceScale = 1;
  /** -1..1, eased towards the bank */
  private tilt = 0;
  x: number = FIELD.w / 2;
  vx = 0;
  invulnMs = 0;
  /** false while the intro / ending drive the sprite with tweens */
  steer = true;
  private bank: -1 | 0 | 1 = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(this.x, JET.y, SPACE.jet, 0).setDepth(Z.jet);
    this.sprite.play(SPACE_ANIMS.jetLevel);
    if (scene.textures.exists(SPACE.face)) this.face = scene.add.image(this.x, JET.y, SPACE.face).setDepth(Z.jet + 0.5);
  }

  /**
   * Redraws the face at its size in device pixels (zoom = device px per world unit) with the
   * browser's high-quality downscale, then shows it with linear filtering: smooth and crisp on
   * top of the pixel-art jet at any zoom. Called by the scene on every viewport change.
   */
  fitFace(zoom: number): void {
    const { face } = this;
    if (!face) return;
    const textures = face.scene.textures;
    const src = textures.get(SPACE.face).getSourceImage() as HTMLImageElement;
    const h = Math.max(1, Math.min(src.height, Math.ceil(JET_FACE.h * zoom)));
    const w = Math.max(1, Math.round((src.width * h) / src.height));
    const tex = textures.exists(FACE_FIT) ? (textures.get(FACE_FIT) as Phaser.Textures.CanvasTexture) : textures.createCanvas(FACE_FIT, w, h);
    if (!tex) return;
    tex.setSize(w, h);
    const ctx = tex.getContext();
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true; // resizing the canvas resets the context state
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, w, h);
    tex.refresh();
    tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
    face.setTexture(FACE_FIT);
    this.faceScale = JET_FACE.h / h;
    this.syncFace(0);
  }

  update(dt: number, axis: -1 | 0 | 1): void {
    if (this.invulnMs > 0) {
      this.invulnMs = Math.max(0, this.invulnMs - dt);
      this.sprite.setAlpha(this.invulnMs > 0 && Math.floor(this.invulnMs / 80) % 2 === 0 ? 0.25 : 1);
    }
    if (this.steer) this.fly(dt / 1000, axis);
    this.syncFace(dt);
  }

  private fly(sec: number, axis: -1 | 0 | 1): void {
    const target = axis * JET.speed;
    const dv = JET.accel * sec;
    this.vx = Math.abs(target - this.vx) <= dv ? target : this.vx + Math.sign(target - this.vx) * dv;
    this.x += this.vx * sec;
    if (this.x < JET.minX || this.x > JET.maxX) {
      this.x = Math.max(JET.minX, Math.min(JET.maxX, this.x));
      this.vx = 0;
    }
    this.sprite.setPosition(Math.round(this.x), JET.y);
    this.setBank(Math.abs(this.vx) > 30 ? (Math.sign(this.vx) as -1 | 1) : 0);
  }

  /** The face copies the sprite (position, scale, alpha, visibility) plus its own banking lean. */
  private syncFace(dt: number): void {
    const { face, sprite } = this;
    if (!face) return;
    this.tilt += (this.bank - this.tilt) * Math.min(1, dt / TILT.easeMs);
    const sx = sprite.scaleX;
    const sy = sprite.scaleY;
    face
      .setPosition(sprite.x + (JET_FACE.x - FRAME_CX + this.tilt * TILT.px) * sx, sprite.y + (JET_FACE.y - FRAME_CY) * sy)
      .setScale(this.faceScale * sx * (1 - TILT.squash * Math.abs(this.tilt)), this.faceScale * sy)
      .setRotation(this.tilt * TILT.rad)
      .setAlpha(sprite.alpha)
      .setVisible(sprite.visible);
  }

  setBank(b: -1 | 0 | 1): void {
    if (b === this.bank) return;
    this.bank = b;
    this.sprite.play(b < 0 ? SPACE_ANIMS.jetLeft : b > 0 ? SPACE_ANIMS.jetRight : SPACE_ANIMS.jetLevel, true);
  }

  hurt(): void {
    this.invulnMs = RULES.invulnMs;
  }

  get vulnerable(): boolean {
    return this.invulnMs <= 0 && this.steer && this.sprite.visible;
  }

  rect(): Rect {
    return { x: this.x - JET.hitW / 2, y: JET.y + JET.hitDy - JET.hitH / 2, w: JET.hitW, h: JET.hitH };
  }

  /** Wider catch box for falling food / capsules (wings included). */
  catchRect(): Rect {
    return { x: this.x - JET.catchW / 2, y: JET.y + JET.catchDy - JET.catchH / 2, w: JET.catchW, h: JET.catchH };
  }
}
