/**
 * Plays the shared BOSS-C decorations through Temps: landing shadows that grow until impact (the floor
 * telegraph), wind-up glints, dust puffs and the dizzy stars of the knockout. Fewer with reduced motion.
 */
import type Phaser from 'phaser';
import { ARENA, type Vec } from '../../../api';
import type { FxKeys } from './fxart';
import { part, type Temps } from './rig';

export class FxPlayer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
    private readonly keys: FxKeys,
    private readonly depth: number,
    private readonly temps: Temps,
    private readonly calm: boolean,
  ) {}

  /** a floor shadow at x that grows over ms (something lands there when it is full); w = width factor */
  shadow(x: number, ms: number, w = 1): void {
    const s = part(this.scene, this.keys.shadow, this.k, this.depth - 2).setPosition(x, ARENA.floorY + 1);
    this.temps.add(s, ms, (sp, t) => {
      const g = 0.35 + 0.65 * t;
      sp.setScale((g * w) / this.k, g / this.k).setAlpha(0.35 + 0.65 * t);
    });
  }

  glint(x: number, y: number, ms = 360): void {
    const s = part(this.scene, this.keys.glint, this.k, this.depth + 1).setPosition(x, y);
    this.temps.add(s, ms, (sp, t) => sp.setScale((Math.sin(t * Math.PI) * 1.3) / this.k).setAngle(t * 90));
  }

  dust(x: number, y: number, flip = false, tint?: number): void {
    if (this.calm && flip) return;
    const s = part(this.scene, this.keys.dust, this.k, this.depth + 1, 0, 0.5, 1).setPosition(x, y).setFlipX(flip);
    if (tint !== undefined) s.setTint(tint);
    s.play(this.keys.dustAnim);
    this.temps.add(s, 300);
  }

  /** dizzy stars circling a moving point for ms */
  stars(at: () => Vec, ms: number): void {
    const n = this.calm ? 2 : 3;
    for (let i = 0; i < n; i++) {
      const s = part(this.scene, this.keys.star, this.k, this.depth + 2);
      this.temps.add(s, ms, (sp, t) => {
        const a = t * ms * 0.006 + (i * Math.PI * 2) / n;
        const p = at();
        sp.setPosition(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 7).setDepth(this.depth + (Math.sin(a) > 0 ? 2 : -3));
      });
    }
  }
}
