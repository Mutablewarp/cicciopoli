/**
 * Short-lived decorative sprites of the BOSS-B lane (glints, dust, splats, telegraph marks; no damage),
 * driven by the boss update so they freeze with the round.
 */
import type Phaser from 'phaser';

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
