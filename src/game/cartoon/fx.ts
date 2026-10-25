/**
 * One-shot cartoon effects of a round (sparks, puffs, blasts, the pink parry star, the boss speech
 * balloon) and the screen shake (camera offset in world units, calm = reduced motion: barely any).
 */
import type Phaser from 'phaser';
import { ARENA, FX, type Vec } from './api';
import { playFx } from './assets';
import { INK, PAPER } from './draw/canvas';
import { DEPTH } from './depths';
import { CT_FONT } from '../../config/cartoon';

const FALLBACK_MS = 600;

export class RoundFx {
  private readonly live = new Set<Phaser.GameObjects.GameObject>();
  private balloon: Phaser.GameObjects.Container | null = null;
  private balloonMs = 0;
  private shakeMs = 0;
  private shakeTotal = 1;
  private shakeAmp = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: () => number,
    private readonly textRes: () => number,
    private readonly calm: () => boolean,
  ) {}

  /** An FX sprite at (x, y), scale `size`, gone when its anim ends. */
  spawn(key: string, x: number, y: number, size = 1, angle = 0): void {
    if (!this.scene.textures.exists(key)) return;
    const s = this.scene.add.sprite(x, y, key).setScale(size / this.k()).setDepth(DEPTH.fx).setAngle(angle);
    this.live.add(s);
    const kill = (): void => {
      this.live.delete(s);
      s.destroy();
    };
    if (playFx(s, key)) s.once('animationcomplete', kill);
    else this.scene.tweens.add({ targets: s, alpha: 0, scale: s.scale * 1.4, duration: FALLBACK_MS, onComplete: kill });
  }

  hit(at: Vec): void {
    this.spawn(FX.hit, at.x, at.y, 1, Math.random() * 360);
  }

  pop(at: Vec): void {
    this.spawn(FX.hit, at.x, at.y, 1.6);
    this.spawn(FX.dust, at.x, at.y, 1.2);
  }

  blast(at: Vec, size: number): void {
    this.spawn(FX.blast, at.x, at.y, size);
  }

  parry(at: Vec): void {
    this.spawn(FX.parryFlash, at.x, at.y, 1.3);
  }

  muzzle(at: Vec): void {
    this.spawn(FX.muzzle, at.x, at.y, 0.9, Math.random() * 360);
  }

  dust(at: Vec): void {
    this.spawn(FX.dust, at.x, at.y - 4, 1);
  }

  /** Shake in world units for ms (a bigger one wins). */
  shake(intensity: number, ms: number): void {
    const amp = this.calm() ? Math.min(intensity * 0.15, 0.8) : intensity;
    if (amp < this.shakeAmp * (this.shakeMs / this.shakeTotal)) return;
    this.shakeAmp = amp;
    this.shakeMs = ms;
    this.shakeTotal = Math.max(1, ms);
  }

  /** Current shake offset (world units), call once per frame. */
  shakeOffset(dtMs: number): Vec {
    if (this.shakeMs <= 0) return { x: 0, y: 0 };
    this.shakeMs -= dtMs;
    const a = this.shakeAmp * Math.max(0, this.shakeMs / this.shakeTotal);
    return { x: (Math.random() * 2 - 1) * a, y: (Math.random() * 2 - 1) * a };
  }

  /** The boss speech balloon above `anchor` (Italian line, short). */
  say(text: string, ms: number, anchor: Vec): void {
    this.balloon?.destroy();
    const t = this.scene.add
      .text(0, 0, text, { fontFamily: CT_FONT.script, fontSize: '11px', fontStyle: 'bold italic', color: INK, align: 'center', wordWrap: { width: 150 } })
      .setOrigin(0.5)
      .setResolution(this.textRes());
    const w = t.width + 14;
    const h = t.height + 10;
    const g = this.scene.add.graphics();
    g.fillStyle(0x1c1511, 1);
    g.fillRoundedRect(-w / 2 + 1.5, -h / 2 + 1.5, w, h, 8);
    g.fillStyle(Number.parseInt(PAPER.slice(1), 16), 1);
    g.lineStyle(1.6, 0x1c1511, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
    g.fillTriangle(-6, h / 2 - 1, 6, h / 2 - 1, -10, h / 2 + 9);
    g.lineBetween(-6, h / 2, -10, h / 2 + 9);
    g.lineBetween(6, h / 2, -10, h / 2 + 9);
    const x = Math.max(w / 2 + 4, Math.min(ARENA.w - w / 2 - 4, anchor.x));
    const y = Math.max(h / 2 + 4, anchor.y - h / 2 - 12);
    this.balloon = this.scene.add.container(x, y, [g, t]).setDepth(DEPTH.balloon).setScale(0.2);
    this.scene.tweens.add({ targets: this.balloon, scale: 1, duration: 260, ease: 'Back.Out' });
    this.balloonMs = ms;
  }

  update(dtMs: number): void {
    if (!this.balloon) return;
    this.balloonMs -= dtMs;
    if (this.balloonMs > 0) return;
    this.balloon.destroy();
    this.balloon = null;
  }

  /** Removes the speech balloon now. */
  hush(): void {
    this.balloon?.destroy();
    this.balloon = null;
  }

  clear(): void {
    for (const o of this.live) o.destroy();
    this.live.clear();
    this.hush();
    this.shakeMs = 0;
  }
}
