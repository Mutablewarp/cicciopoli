/**
 * v9 mood of level 6: the light grades smoothly from Centro daylight to Stadio late afternoon to the
 * Terrasini sunset (gradeColor: eased around each cross street instead of a switch; Scenery multiplies it
 * into the ground and the buildings as a tint, which costs no extra pass over the screen), and a few zone
 * particles drift over the road: plane-tree leaves in the centre, dust at the stadium, sea spray on the
 * seafront. They move with the road but a little slower (blown along), sway, and none with reduced motion.
 */
import type Phaser from 'phaser';
import { RUSH } from '../../art/rush/keys';
import { BITS, DEPTH, GRADE, RUSH_VIEW } from './config';
import type { ViewRect } from './framing';

interface Bit {
  readonly s: Phaser.GameObjects.Image;
  x: number;
  vx: number;
  phase: number;
}

const lerpColor = (a: number, b: number, u: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * u);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

/** Colour `a` lit by colour `b` (a multiply, channel by channel). */
export function mulColor(a: number, b: number): number {
  const ch = (shift: number): number => Math.round((((a >> shift) & 0xff) * ((b >> shift) & 0xff)) / 255);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

/** Grade colour at a zone mix 0..2 (Scenery.mix). */
export function gradeColor(mix: number): number {
  const c = GRADE.colors;
  const i = Math.max(0, Math.min(c.length - 1, Math.floor(mix)));
  const j = Math.min(c.length - 1, i + 1);
  return lerpColor(c[i], c[j], Math.max(0, Math.min(1, mix - i)));
}

export class Ambience {
  private readonly bits: Bit[] = [];
  private everyMs = 0;
  private view: ViewRect | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: Phaser.GameObjects.Layer,
  ) {}

  layout(view: ViewRect): void {
    this.view = view;
  }

  /** Off while the finale plays (its own sky). */
  show(on: boolean): void {
    for (const b of this.bits) b.s.setVisible(on);
  }

  /** Per frame: `speed` road px/s, `zone` 0..2 (which bits), `calm` = reduced motion. */
  update(speed: number, zone: number, calm: boolean, dtMs: number): void {
    const v = this.view;
    if (!v) return;
    const dt = dtMs / 1000;
    const bottom = v.top + v.height + RUSH_VIEW.overscanPx;
    for (let i = this.bits.length - 1; i >= 0; i--) {
      const b = this.bits[i];
      b.phase += dtMs;
      b.x += b.vx * dt;
      b.s.setPosition(b.x + Math.sin(b.phase / BITS.swayMs) * BITS.swayPx, b.s.y + Math.max(0, speed - BITS.lagPx) * dt);
      if (b.s.y > bottom || calm) {
        b.s.destroy();
        this.bits.splice(i, 1);
      }
    }
    this.everyMs -= dtMs;
    if (calm || speed < 1 || this.everyMs > 0 || this.bits.length >= BITS.max) return;
    this.everyMs = BITS.everyMs * (0.6 + Math.random() * 0.8);
    const frame = Math.min(2, Math.max(0, zone)) * BITS.perZone + Math.floor(Math.random() * BITS.perZone);
    const x = v.left + Math.random() * v.width;
    const s = this.scene.add.image(x, v.top - RUSH_VIEW.overscanPx, RUSH.bits, frame).setAlpha(BITS.alpha).setDepth(DEPTH.fx - 1);
    this.world.add(s);
    this.bits.push({ s, x, vx: (Math.random() - 0.5) * 2 * BITS.driftPx, phase: Math.random() * 1000 });
  }

  clear(): void {
    for (const b of this.bits) b.s.destroy();
    this.bits.length = 0;
  }
}
