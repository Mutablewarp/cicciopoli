/**
 * Runtime helpers for the BOSS-C bosses: place k-scaled part sprites in world units, short-lived decoration
 * sprites (landing shadows, glints, dust, dizzy stars) and delayed callbacks. The hit flash is in ./flash.
 */
import type Phaser from 'phaser';
import { worldSprite } from '../../../draw/canvas';

type Sprite = Phaser.GameObjects.Sprite;

/** Place a k-scaled sprite at world (x, y) with world scale (sx, sy) and angle in degrees. */
export function put(s: Sprite, k: number, x: number, y: number, sx = 1, sy = sx, angle = 0): void {
  s.setPosition(x, y).setScale(sx / k, sy / k).setAngle(angle);
}

/** Sprite at world size and a given depth. */
export function part(scene: Phaser.Scene, key: string, k: number, depth: number, frame = 0, ox = 0.5, oy = 0.5): Sprite {
  return worldSprite(scene, 0, 0, key, k, frame).setDepth(depth).setOrigin(ox, oy);
}

interface Temp {
  s: Sprite;
  age: number;
  life: number;
  tick?: (s: Sprite, t: number, dtMs: number) => void;
}

/** Decoration sprites that live `life` ms; tick gets t = 0..1. */
export class Temps {
  private list: Temp[] = [];

  add(s: Sprite, life: number, tick?: (s: Sprite, t: number, dtMs: number) => void): Sprite {
    this.list.push({ s, age: 0, life, tick });
    return s;
  }

  update(dtMs: number): void {
    for (const t of this.list) {
      t.age += dtMs;
      t.tick?.(t.s, Math.min(1, t.age / t.life), dtMs);
      if (t.age >= t.life) t.s.destroy();
    }
    this.list = this.list.filter((t) => t.age < t.life);
  }

  clear(): void {
    for (const t of this.list) t.s.destroy();
    this.list = [];
  }
}

/** Delayed one-shot callbacks driven by the boss update (paused with the round, cleared on knockout). */
export class Timers {
  private list: { left: number; fn: () => void }[] = [];

  after(ms: number, fn: () => void): void {
    this.list.push({ left: ms, fn });
  }

  update(dtMs: number): void {
    const due: (() => void)[] = [];
    for (const t of this.list) {
      t.left -= dtMs;
      if (t.left <= 0) due.push(t.fn);
    }
    this.list = this.list.filter((t) => t.left > 0);
    for (const fn of due) fn();
  }

  clear(): void {
    this.list = [];
  }
}
