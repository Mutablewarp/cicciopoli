/**
 * Boss body + effects for the BOSS-B lane, all driven by the boss update (so they freeze with the round):
 * ToonBody = a sheet sprite standing on the floor with frame holds, an idle loop, spring squash & stretch,
 * breathing, hit flash and frame-unit -> world boxes. Fx = short-lived decorative sprites (no damage).
 */
import type Phaser from 'phaser';
import type { Box, Vec } from '../../../api';

export interface FrameSpec {
  w: number;
  h: number;
  footY: number;
}

const STIFF = 260;
const DAMP = 13;
const FLASH_MS = 55;
const FLASH_GAP_MS = 130;
/** colour-matrix brightness of a hit flash: the art stays readable (a white silhouette strobed under steady fire) */
const FLASH_BRIGHT = 1.35;

export class ToonBody {
  readonly sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  /** phase growth multiplier */
  grow = 1;
  angle = 0;
  /** extra vertical offset (hops), world units */
  lift = 0;
  private loop: readonly number[] = [0];
  private fps = 6;
  private holdMs = 0;
  private holdFrame = 0;
  private sq = 0;
  private sqV = 0;
  private flashMs = 0;
  private sinceFlash = FLASH_GAP_MS;
  private lit = false;
  private pivotY: number;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    key: string,
    /** texture scale of the sheet (canvas px per frame unit) */
    private readonly texK: number,
    private readonly f: FrameSpec,
    x: number,
    y: number,
    private readonly s: number,
    depth: number,
  ) {
    this.x = x;
    this.y = y;
    this.pivotY = f.footY;
    this.sprite = scene.add.sprite(x, y, key, 0).setOrigin(0.5, f.footY / f.h).setDepth(depth);
    // WebGL only (canvas: no flash, the hit sparks still show); the FX pass runs only while flashing
    this.sprite.preFX?.addColorMatrix().brightness(FLASH_BRIGHT);
    this.sprite.preFX?.disable();
  }

  setLoop(frames: readonly number[], fps: number): void {
    this.loop = frames;
    this.fps = fps;
  }

  /** Show `frame` for `ms` (a pose), then back to the loop. */
  hold(frame: number, ms: number): void {
    this.holdFrame = frame;
    this.holdMs = ms;
  }

  release(): void {
    this.holdMs = 0;
  }

  /** Spring impulse: + squashes (wide, short), - stretches (tall, thin). */
  kick(a: number): void {
    this.sqV += a * 30;
  }

  flash(): void {
    if (this.sinceFlash < FLASH_GAP_MS) return;
    this.flashMs = FLASH_MS;
    this.sinceFlash = 0;
  }

  /** Rotate / scale around this frame-unit height instead of the feet (a rolling ball). */
  pivot(fy: number): void {
    this.pivotY = fy;
    this.sprite.setOrigin(0.5, fy / this.f.h);
  }

  get scale(): number {
    return this.s * this.grow;
  }

  /** Frame units -> world point (ignores squash / rotation: hit boxes stay steady). */
  at(fx: number, fy: number): Vec {
    return { x: this.x + (fx - this.f.w / 2) * this.scale, y: this.y - this.lift + (fy - this.f.footY) * this.scale };
  }

  box(fx: number, fy: number, fw: number, fh: number): Box {
    const p = this.at(fx, fy);
    return { x: p.x, y: p.y, w: fw * this.scale, h: fh * this.scale };
  }

  update(dt: number): void {
    this.t += dt;
    this.sinceFlash += dt;
    if (this.holdMs > 0) this.holdMs -= dt;
    const frame = this.holdMs > 0 ? this.holdFrame : this.loop[Math.floor((this.t * this.fps) / 1000) % this.loop.length];
    if (Number(this.sprite.frame.name) !== frame) this.sprite.setFrame(frame);
    const step = Math.min(dt, 50) / 1000;
    this.sqV += (-STIFF * this.sq - DAMP * this.sqV) * step;
    this.sq += this.sqV * step;
    const breathe = 0.012 * Math.sin(this.t / 320);
    const base = this.scale / this.texK;
    this.sprite.setScale(base * (1 + this.sq * 0.8 - breathe * 0.5), base * (1 - this.sq + breathe));
    const p = this.at(this.f.w / 2, this.pivotY);
    this.sprite.setPosition(p.x, p.y).setAngle(this.angle);
    if (this.flashMs > 0) this.flashMs -= dt;
    const lit = this.flashMs > 0;
    if (lit !== this.lit) {
      this.lit = lit;
      if (lit) this.sprite.preFX?.enable();
      else this.sprite.preFX?.disable();
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

export interface FxOpts {
  frames?: readonly number[];
  fps?: number;
  loop?: boolean;
  depth?: number;
  scale?: number;
  /** per-frame tweak, p = age / life (0..1) */
  tick?(s: Phaser.GameObjects.Sprite, p: number): void;
}

interface FxItem {
  s: Phaser.GameObjects.Sprite;
  age: number;
  life: number;
  o: FxOpts;
}

export class Fx {
  private items: FxItem[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
  ) {}

  add(key: string, x: number, y: number, lifeMs: number, o: FxOpts = {}): Phaser.GameObjects.Sprite {
    const s = this.scene.add.sprite(x, y, key, o.frames?.[0] ?? 0).setScale((o.scale ?? 1) / this.k).setDepth(o.depth ?? 6);
    this.items.push({ s, age: 0, life: lifeMs, o });
    return s;
  }

  update(dt: number): void {
    for (const it of this.items) {
      it.age += dt;
      const fr = it.o.frames;
      if (fr && fr.length > 1) {
        const i = Math.floor((it.age * (it.o.fps ?? 12)) / 1000);
        it.s.setFrame(fr[it.o.loop ? i % fr.length : Math.min(fr.length - 1, i)]);
      }
      it.o.tick?.(it.s, Math.min(1, it.age / it.life));
      if (it.age >= it.life) it.s.destroy();
    }
    this.items = this.items.filter((it) => it.age < it.life);
  }

  clear(): void {
    for (const it of this.items) it.s.destroy();
    this.items = [];
  }
}
