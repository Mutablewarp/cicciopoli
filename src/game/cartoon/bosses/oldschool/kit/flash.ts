/**
 * Hit / wind-up flash of a set of BOSS-C parts (The Old School, Double Triple). A hit brightens the parts
 * with a colour matrix, so the ink lines and the colours stay readable under constant fire; a wind-up
 * blinks a warm tint over the parts that are about to strike.
 */
import type Phaser from 'phaser';

type Sprite = Phaser.GameObjects.Sprite;

export const FLASH = {
  /** a short brightness pulse at most every coolMs: steady fire pulses the boss, never strobes it */
  hitMs: 70,
  coolMs: 220,
  /** colour-matrix brightness of a hit (1 = unchanged) */
  hitBright: 1.4,
  blinkMs: 90,
  teleTint: 0xffd36e,
} as const;

/** Brightness hit flash (rate-limited, on the parts that can be hit) and a warm wind-up blink over any part. */
export class Flash {
  private hitMs = 0;
  private cool = 0;
  private teleMs = 0;
  private teleParts: readonly Sprite[] = [];
  private readonly lit = new Set<Sprite>();

  constructor(
    private readonly parts: () => readonly Sprite[],
    private readonly hitParts: () => readonly Sprite[] = parts,
  ) {}

  hit(): void {
    if (this.cool > 0) return;
    this.hitMs = FLASH.hitMs;
    this.cool = FLASH.coolMs;
  }

  /** blink these parts for ms (the telegraph) */
  tele(ms: number, parts: readonly Sprite[]): void {
    this.teleMs = ms;
    this.teleParts = parts;
  }

  update(dtMs: number): void {
    this.hitMs -= dtMs;
    this.cool -= dtMs;
    this.teleMs -= dtMs;
    const blink = this.teleMs > 0 && Math.floor(this.teleMs / FLASH.blinkMs) % 2 === 0;
    const hit = this.hitMs > 0 ? this.hitParts() : [];
    for (const s of this.parts()) {
      if (!s.active) continue;
      this.bright(s, hit.includes(s));
      if (blink && this.teleParts.includes(s)) s.setTint(FLASH.teleTint);
      else s.clearTint();
    }
  }

  /**
   * The colour matrix is added once and its FX pipeline runs only while lit (the parts batch normally
   * otherwise). No preFX on the canvas renderer: no hit flash there, the boss wobble still shows the hit.
   */
  private bright(s: Sprite, on: boolean): void {
    const fx = s.preFX;
    if (!fx || on === this.lit.has(s)) return;
    if (!on) {
      fx.disable();
      this.lit.delete(s);
      return;
    }
    if (fx.list.length === 0) fx.addColorMatrix().brightness(FLASH.hitBright);
    else fx.enable();
    this.lit.add(s);
  }
}
