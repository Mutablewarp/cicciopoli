/**
 * Four burger shields. Each owns a canvas texture copied from the art and a ShieldMask;
 * bombs, shots and invaders erode them pixel by pixel.
 */
import Phaser from 'phaser';
import { SPACE } from '../../art/space/keys';
import { SHIELDS } from './config';
import { Z } from './fx';
import { ShieldMask, type Px } from './shieldMask';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Shield {
  x: number;
  y: number;
  tex: Phaser.Textures.CanvasTexture;
  mask: ShieldMask;
}

export class Shields {
  private items: Shield[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  /** Fresh, intact shields (level start / every wave). */
  reset(): void {
    const src = this.scene.textures.get(SPACE.shield).getSourceImage() as HTMLCanvasElement;
    const w = src.width;
    const h = src.height;
    this.items = SHIELDS.xs.map((cx, i) => {
      const key = `inv-shield-${i}`;
      const tex = (this.scene.textures.exists(key)
        ? this.scene.textures.get(key)
        : this.scene.textures.createCanvas(key, w, h)) as Phaser.Textures.CanvasTexture;
      const ctx = tex.getContext();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(src, 0, 0);
      tex.refresh();
      const alpha = ctx.getImageData(0, 0, w, h).data.filter((_, k) => k % 4 === 3);
      const x = cx - Math.floor(w / 2);
      const y: number = SHIELDS.top;
      if (!this.scene.children.getByName(key)) {
        this.scene.add.image(x, y, key).setOrigin(0, 0).setDepth(Z.shields).setName(key);
      }
      return { x, y, tex, mask: new ShieldMask(w, h, alpha) };
    });
  }

  /**
   * A projectile rect against the shields: on contact erodes a ragged hole around the first
   * solid pixel met (from the top for bombs, from below for shots) and returns true.
   */
  impact(r: Rect, fromTop: boolean, radius: number): boolean {
    for (const s of this.items) {
      if (!overlaps(r, s)) continue;
      const p = s.mask.hit(r.x - s.x, r.y - s.y, r.w, r.h, fromTop);
      if (!p) continue;
      this.erase(s, s.mask.blast(p[0], p[1] + (fromTop ? 1 : -1), radius, Math.random));
      return true;
    }
    return false;
  }

  /** Invaders marching through the shields wipe what they touch. */
  plough(r: Rect): void {
    for (const s of this.items) if (overlaps(r, s)) this.erase(s, s.mask.clearRect(r.x - s.x, r.y - s.y, r.w, r.h));
  }

  private erase(s: Shield, px: readonly Px[]): void {
    if (px.length === 0) return;
    const ctx = s.tex.getContext();
    for (const [x, y] of px) ctx.clearRect(x, y, 1, 1);
    s.tex.refresh();
  }
}

function overlaps(r: Rect, s: Shield): boolean {
  return r.x < s.x + s.mask.w && r.x + r.w > s.x && r.y < s.y + s.mask.h && r.y + r.h > s.y;
}
