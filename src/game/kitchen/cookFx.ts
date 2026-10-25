/**
 * The cooking show of level 7, animated on each griddle slot's / fryer basket's offsets (cookView.ts draws the
 * synced state through them): the raw patty slaps down (drop, squash and settle, grease spits, a puff of steam),
 * GIRA! slides a steel spatula under it and lifts it in an arc while it turns over, it lands with a squash; the
 * basket dunks into the oil (big bubbles, a splash), shakes now and then while it fries, lifts out dripping with
 * steam. Reduced motion: no arcs, no shakes, no spatula, a few bits.
 */
import Phaser from 'phaser';
import { KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { COOK_FX } from './config';
import type { Point } from './framing';
import type { Fx } from './fx';

/** One griddle slot / fryer basket: its sprites and the animated offsets on top of the synced state. */
export interface Slot {
  readonly item: Phaser.GameObjects.Sprite;
  readonly smoke: Phaser.GameObjects.Sprite;
  readonly steam: Phaser.GameObjects.Sprite;
  readonly cue: Phaser.GameObjects.Image;
  /** the sprite scale that draws the art at the manifest size */
  readonly base: { x: number; y: number };
  readonly off: { dx: number; dy: number; sx: number; sy: number; rot: number };
  basket?: Phaser.GameObjects.Sprite;
  basketBase?: { x: number; y: number };
}

const SP = COOK_FX.spatula;

export class CookFx {
  /** one-shot sprites / graphics of the show (cleared with the shift) */
  private readonly live = new Set<Phaser.GameObjects.GameObject>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Container,
    private readonly fx: Fx,
    private readonly calm: () => boolean,
  ) {}

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.live.add(o);
    o.once(Phaser.GameObjects.Events.DESTROY, () => this.live.delete(o));
    this.layer.add(o);
    return o;
  }

  /** World point of a kitchen point (the scene's particle bursts are in world px). */
  private world(p: Point): Point {
    return { x: p.x + (this.layer.parentContainer?.x ?? 0), y: p.y };
  }

  reset(s: Slot): void {
    this.scene.tweens.killTweensOf(s.off);
    Object.assign(s.off, { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 });
  }

  /** A one-shot animated sprite (sizzle spit, steam puff) at p that rises `rise` px and fades. */
  private puff(key: string, anim: string, p: Point, rise: number, ms: number, scale = 1): void {
    const s = this.track(this.scene.add.sprite(p.x, p.y, key, 0).setScale(scale));
    if (this.scene.anims.exists(anim)) s.play(anim);
    this.scene.tweens.add({ targets: s, y: p.y - rise, alpha: 0, duration: ms, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  /** The raw patty drops onto the hot griddle, squashes and settles; grease spits round it, steam puffs up. */
  slap(s: Slot, p: Point): void {
    const S = COOK_FX.slap;
    this.reset(s);
    const calm = this.calm();
    s.off.dy = calm ? 0 : -S.dropPx;
    const land = (): void => {
      s.off.sx = S.squashX;
      s.off.sy = S.squashY;
      this.scene.tweens.add({ targets: s.off, sx: 1, sy: 1, duration: S.settleMs, ease: 'Back.easeOut' });
      const n = calm ? 1 : S.spits;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.6;
        this.puff(KITCHEN.sizzle, KITCHEN_ANIMS.sizzle[0], { x: p.x + Math.cos(a) * 16, y: p.y + Math.sin(a) * 12 }, 6, 420);
      }
      this.puff(KITCHEN.steam, KITCHEN_ANIMS.steam[0], { x: p.x, y: p.y - 10 }, 16, 700, 1.2);
      this.fx.burst(this.world(p), COOK_FX.oil.colors, calm ? 3 : 10);
    };
    if (calm) return land();
    this.scene.tweens.add({ targets: s.off, dy: 0, duration: S.ms, ease: 'Quad.easeIn', onComplete: land });
  }

  /** A steel spatula: blade (lit edge, dark rim) and a dark handle, its blade's left edge at the origin. */
  private spatula(): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics();
    const { blade: b, handle: h } = SP;
    g.fillStyle(SP.dark, 1).fillRect(0, -b.h / 2, b.w, b.h);
    g.fillStyle(SP.steel, 1).fillRect(1, -b.h / 2 + 1, b.w - 2, b.h - 2);
    g.fillStyle(SP.lit, 1).fillRect(1, -b.h / 2 + 1, b.w - 2, 1).fillRect(1, -b.h / 2 + 1, 1, b.h - 2);
    for (let x = 5; x < b.w - 3; x += 5) g.fillStyle(SP.dark, 1).fillRect(x, -b.h / 2 + 3, 1, b.h - 6);
    g.fillStyle(SP.wood, 1).fillRect(b.w - 1, -h.w / 2, h.h, h.w);
    g.fillStyle(SP.dark, 1).fillRect(b.w - 2, -1, 3, 2);
    return g;
  }

  /** GIRA!: the spatula slides under the patty, lifts it in an arc while it turns over, it lands with a squash. */
  flip(s: Slot, p: Point): void {
    this.reset(s);
    const half = SP.ms / 2;
    if (this.calm()) {
      this.scene.tweens.add({ targets: s.off, sy: 0.1, duration: half / 2, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }
    const sp = this.track(this.spatula().setPosition(p.x + 26, p.y + 6).setAngle(-8));
    const st = { u: 0 };
    // slide in (a quarter), lift and turn in an arc (half), land; the spatula follows, then slides away
    this.scene.tweens.add({ targets: sp, x: p.x - 8, duration: SP.ms / 4, ease: 'Quad.easeOut' });
    this.scene.tweens.add({
      targets: st,
      u: 1,
      delay: SP.ms / 4,
      duration: half,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const u = st.u;
        s.off.dy = -SP.arcPx * 4 * u * (1 - u);
        s.off.dx = -SP.swingPx * Math.sin(u * Math.PI);
        s.off.sy = Math.abs(Math.cos(u * Math.PI));
        s.off.rot = -0.35 * Math.sin(u * Math.PI);
        sp.setPosition(p.x - 8 + s.off.dx, p.y + 6 + s.off.dy * 0.8).setAngle(-8 - 30 * Math.sin(u * Math.PI));
      },
      onComplete: () => {
        Object.assign(s.off, { dx: 0, dy: 0, rot: 0, sx: 1.18, sy: 0.8 });
        this.scene.tweens.add({ targets: s.off, sx: 1, sy: 1, duration: 220, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: sp, x: p.x + 40, alpha: 0, duration: SP.ms / 3, ease: 'Quad.easeIn', onComplete: () => sp.destroy() });
        this.fx.burst(this.world(p), COOK_FX.oil.colors, 6);
      },
    });
  }

  /** Big bubbles boiling up round a point for a moment (graphics rings). */
  private bubbles(p: Point, n: number, ms: number): void {
    const g = this.track(this.scene.add.graphics());
    const st = { u: 0 };
    const seeds = Array.from({ length: n }, (_, i) => ({ a: i * 2.4, r: 6 + ((i * 7) % 15), t: (i * 0.37) % 1 }));
    this.scene.tweens.add({
      targets: st,
      u: 1,
      duration: ms,
      onUpdate: () => {
        g.clear();
        for (const b of seeds) {
          const v = (st.u * 2 + b.t) % 1;
          const size = 1 + Math.round(v * 4);
          g.lineStyle(1, COOK_FX.oil.colors[1], 1 - v).strokeCircle(p.x + Math.cos(b.a) * b.r, p.y + Math.sin(b.a) * b.r * 0.45, size);
        }
      },
      onComplete: () => g.destroy(),
    });
  }

  /** The basket dunks into the oil: it drops, bounces, the oil boils up big and splashes. */
  dunk(s: Slot, p: Point): void {
    const D = COOK_FX.dunk;
    this.reset(s);
    const calm = this.calm();
    s.off.dy = calm ? 0 : D.fromPx;
    if (!calm) this.scene.tweens.add({ targets: s.off, dy: 0, duration: D.ms, ease: 'Back.easeIn' });
    this.bubbles(p, calm ? 3 : D.bubbles, D.bubbleMs);
    this.fx.burst(this.world({ x: p.x, y: p.y - 6 }), COOK_FX.oil.colors, calm ? 3 : 12);
  }

  /** x offset of a frying basket's shake now and then (a quick wiggle every COOK_FX.shake.everyMs). */
  shakeX(i: number, timeMs: number): number {
    const K = COOK_FX.shake;
    const t = (timeMs + i * (K.everyMs / 2)) % K.everyMs;
    return t < K.ms ? Math.round(Math.sin((t / K.ms) * Math.PI * 4) * K.px) : 0;
  }

  /** The basket comes out of the oil: up it goes (from `fromDy` px off its hook: over it, held a moment, or under it, in
   * the oil), oil drips back down, steam rises. */
  lift(s: Slot, p: Point, fromDy: number): void {
    const L = COOK_FX.lift;
    this.reset(s);
    const calm = this.calm();
    if (!calm) {
      s.off.dy = fromDy;
      this.scene.tweens.add({ targets: s.off, dy: 0, duration: L.ms, delay: fromDy < 0 ? L.ms : 0, ease: fromDy < 0 ? 'Quad.easeInOut' : 'Back.easeOut' });
    }
    const drops = calm ? 1 : L.drips;
    for (let i = 0; i < drops; i++) {
      const x = p.x - 14 + ((i * 29) % 28);
      const d = this.track(this.scene.add.rectangle(x, p.y + COOK_FX.basket.up - 4, 1, 2, COOK_FX.oil.colors[0]).setOrigin(0.5, 0));
      this.scene.tweens.add({ targets: d, y: p.y + 6, alpha: 0.4, delay: i * 70, duration: L.dripMs, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    }
    this.puff(KITCHEN.steam, KITCHEN_ANIMS.steam[0], { x: p.x - 8, y: p.y - 18 }, 18, 800, 1.2);
    if (!calm) this.puff(KITCHEN.steam, KITCHEN_ANIMS.steam[0], { x: p.x + 8, y: p.y - 14 }, 22, 900);
  }

  clear(): void {
    for (const o of [...this.live]) o.destroy();
  }
}
