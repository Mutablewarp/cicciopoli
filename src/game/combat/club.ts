/**
 * Alette Thai club swing: short animation + flames along the swing, and a hitbox in
 * front of Ciccio (reach / vertical range / live window from tuning). Each target is hit
 * at most once per swing. Holding the club never makes contact safe.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { CLUB } from '../../config/tuning';
import { DEPTH } from '../depths';
import type { Fx } from '../fx';

export interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SwingSource {
  /** body edges / centre of the hero */
  left: number;
  right: number;
  centerY: number;
  facing: 1 | -1;
}

/** Flame bursts at the club head during the forward part of the swing (ms from the start). */
const FLAME_AT_MS = [60, 95, 130];

export function clubHitbox(src: SwingSource): Rect {
  const front = src.facing > 0 ? src.right : src.left - CLUB.reach;
  return { left: front, right: front + CLUB.reach, top: src.centerY - CLUB.vRange, bottom: src.centerY + CLUB.vRange };
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export class Club {
  private cooldownMs = 0;
  private swingMs = -1;
  private readonly hit = new Set<unknown>();
  private flames = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
  ) {}

  get ready(): boolean {
    return this.cooldownMs <= 0;
  }

  get swinging(): boolean {
    return this.swingMs >= 0;
  }

  /** Starts a swing (flames follow the club head while the hitbox is live). */
  swing(): boolean {
    if (!this.ready) return false;
    this.cooldownMs = CLUB.cooldownMs;
    this.swingMs = 0;
    this.flames = 0;
    this.hit.clear();
    return true;
  }

  private flame(tip: { x: number; y: number }, facing: 1 | -1): void {
    const f = this.fx.once(ITEMS.flame, ITEM_ANIMS.flame, tip.x, tip.y + 6, {
      depth: DEPTH.fx,
      originY: 1,
      flipX: facing < 0,
      scale: 1 - this.flames * 0.15,
    });
    this.scene.tweens.add({ targets: f, alpha: 0, y: f.y - 6, delay: 90, duration: 170, onComplete: () => f.destroy() });
    this.flames++;
  }

  /**
   * Advances the swing. While the hitbox is live, calls `onHit` for every target whose
   * rect overlaps it (once per swing).
   */
  update<T>(
    dtMs: number,
    src: SwingSource,
    tip: { x: number; y: number } | null,
    targets: readonly T[],
    rectOf: (t: T) => Rect,
    onHit: (t: T) => void,
  ): void {
    this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    if (this.swingMs < 0) return;
    this.swingMs += dtMs;
    if (tip && this.flames < FLAME_AT_MS.length && this.swingMs >= FLAME_AT_MS[this.flames]) this.flame(tip, src.facing);
    if (this.swingMs > CLUB.swingMs) {
      this.swingMs = -1;
      return;
    }
    if (this.swingMs < CLUB.activeFromMs || this.swingMs > CLUB.activeToMs) return;
    const box = clubHitbox(src);
    for (const t of targets) {
      if (this.hit.has(t) || !overlaps(box, rectOf(t))) continue;
      this.hit.add(t);
      onHit(t);
    }
  }
}
