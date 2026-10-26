/**
 * Edge arrows of level 8 (v8): inked cartoon arrowheads on the view edge for the hazards outside a pushed-in
 * view (red; pink = parryable) and the boss when it is out of view (gold, bigger, always opaque). One Graphics in
 * world units, redrawn each frame at a constant CSS size, a cream halo under the ink outline so an arrow reads on
 * any scenery (golden haystacks too); nearer hazards are more opaque.
 */
import type Phaser from 'phaser';
import type { EdgeArrow, RadarKind } from './logic/arrows';
import { DEPTH } from './depths';
import { CT_VIEW } from '../../config/cartoon';

const A = CT_VIEW.arrows;
const FILL: Readonly<Record<RadarKind, number>> = { hazard: A.hazard, pink: A.pink, boss: A.boss };

/**
 * The arrowhead of `a`, s long and 0.9 s wide with a short tail notch, tip at (a.x, a.y); `out` > 0 grows it by
 * about that much all round (scaled about a point inside it: the halo).
 */
function head(a: EdgeArrow, s: number, out: number): Phaser.Types.Math.Vector2Like[] {
  const c = Math.cos(a.angle);
  const n = Math.sin(a.angle);
  const k = 1 + (2 * out) / s;
  const mid = -0.6 * s;
  return [
    [0, 0],
    [-s, -0.45 * s],
    [-0.72 * s, 0],
    [-s, 0.45 * s],
  ].map(([p, q]) => {
    const x = mid + (p - mid) * k;
    const y = q * k;
    return { x: a.x + x * c - y * n, y: a.y + x * n + y * c };
  });
}

export class EdgeArrows {
  private readonly g: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(DEPTH.arrow);
  }

  /** Draws `arrows` (world units) at `cssPerUnit` CSS px per world unit. */
  draw(arrows: readonly EdgeArrow[], cssPerUnit: number): void {
    const g = this.g;
    g.clear();
    const u = 1 / Math.max(0.05, cssPerUnit);
    for (const a of arrows) {
      const boss = a.kind === 'boss';
      const s = (boss ? A.bossSizeCss : A.sizeCss) * u;
      const alpha = boss ? 1 : A.minAlpha + (1 - A.minAlpha) * a.near;
      g.fillStyle(A.halo, alpha);
      g.fillPoints(head(a, s, A.haloCss * u), true);
      const pts = head(a, s, 0);
      g.fillStyle(FILL[a.kind], alpha);
      g.fillPoints(pts, true);
      g.lineStyle(A.inkCss * u, A.ink, alpha);
      g.strokePoints(pts, true, true);
    }
  }

  destroy(): void {
    this.g.destroy();
  }
}
