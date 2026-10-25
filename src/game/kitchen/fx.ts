/**
 * One-shot effects of level 7: things flying in arcs (a patty to the burger, fries to the tray, a
 * burnt one to the bin), floating pixel texts ("PERFETTO!", "+14,90 €"), crumb / sauce bursts, the
 * gold sparkle and camera shakes. Flights and texts live in the container of their view (they
 * slide with it); bursts use one scene emitter in world px. Everything removes itself; reduced
 * motion = no shake, fewer particles.
 */
import Phaser from 'phaser';
import { KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { KITCHEN_COLORS, KITCHEN_FX } from './config';
import { labelTexture } from './labels';
import type { Point, Rect } from './layout';
import { KITCHEN_PX } from './placeholders';

type Box = Phaser.GameObjects.Container;

export interface FloatOpts {
  plate?: boolean;
  ms?: number;
  /** `at.x` is the text's right edge (a right-aligned column) */
  right?: boolean;
  /** px it rises while fading (default KITCHEN_FX.floatRisePx; 0 = a row of a column, it stays put) */
  rise?: number;
}

export interface FlyOpts {
  ms?: number;
  arc?: number;
  /** full turns while flying */
  spin?: number;
  scale?: number;
  /** scale on landing (default: `scale`) */
  scaleTo?: number;
}

export class Fx {
  private readonly bits: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly live = new Set<Phaser.GameObjects.GameObject>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly calm: () => boolean,
    /** the screen in the px of a view's container (floating texts stay inside it) */
    private readonly bounds: (box: Box) => Rect,
  ) {
    this.bits = scene.add
      .particles(0, 0, KITCHEN_PX, {
        lifespan: { min: 320, max: 700 },
        speed: { min: 30, max: 120 },
        angle: { min: 200, max: 340 },
        gravityY: 240,
        scale: { start: 1, end: 0.5 },
        alpha: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(50);
  }

  private track<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.live.add(o);
    o.once(Phaser.GameObjects.Events.DESTROY, () => this.live.delete(o));
    return o;
  }

  /** A sprite of `key` / `frame` flies from `from` to `to` (container px) in an arc; `onLand` runs when it arrives. */
  fly(box: Box, key: string, frame: number, from: Point, to: () => Point, o: FlyOpts = {}, onLand?: () => void): void {
    const k0 = o.scale ?? 1;
    const k1 = o.scaleTo ?? k0;
    const s = this.track(this.scene.add.sprite(from.x, from.y, key, frame).setScale(k0));
    box.add(s);
    const ms = o.ms ?? KITCHEN_FX.flightMs;
    const arc = o.arc ?? KITCHEN_FX.arcPx;
    const st = { u: 0 };
    this.scene.tweens.add({
      targets: st,
      u: 1,
      duration: ms,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = to();
        const u = st.u;
        s.setPosition(from.x + (t.x - from.x) * u, from.y + (t.y - from.y) * u - arc * 4 * u * (1 - u)).setScale(k0 + (k1 - k0) * u);
        if (o.spin) s.setAngle(360 * o.spin * u);
      },
      onComplete: () => {
        s.destroy();
        onLand?.();
      },
    });
  }

  /** Pixel text (capitals) that pops at a point and rises away, kept inside the screen (FloatOpts: plate, length, alignment). */
  float(box: Box, text: string, at: Point, color: string = KITCHEN_COLORS.text.gold, scale = 2, delay = 0, o: FloatOpts = {}): void {
    const key = labelTexture(this.scene, [text.toUpperCase()], o.plate ? 'plate' : 'float', color);
    const ms = o.ms ?? KITCHEN_FX.floatMs;
    const b = this.bounds(box);
    const half = (this.scene.textures.get(key).getSourceImage().width * scale) / 2 + 2;
    const cx = o.right ? at.x - half : at.x;
    const x = Math.round(Math.max(b.x + half, Math.min(b.x + b.w - half, cx)));
    const t = this.track(this.scene.add.image(x, Math.round(at.y), key).setScale(scale * 0.4).setAlpha(0));
    box.add(t);
    const rise = o.rise ?? (this.calm() ? KITCHEN_FX.floatRisePx / 2 : KITCHEN_FX.floatRisePx);
    this.scene.tweens.add({ targets: t, scale, alpha: 1, delay, duration: 180, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: t,
      y: at.y - rise,
      alpha: 0,
      delay: delay + ms * 0.55,
      duration: ms * 0.45,
      ease: 'Quad.easeIn',
      onComplete: () => t.destroy(),
    });
  }

  /** Coloured pixel burst at a world point (confetti, sparks). */
  burst(world: Point, colors: readonly number[], n: number = KITCHEN_FX.burst): void {
    const count = this.calm() ? Math.ceil(n / 3) : n;
    colors.forEach((c) => {
      this.bits.setParticleTint(c);
      this.bits.explode(Math.max(1, Math.ceil(count / colors.length)), world.x, world.y);
    });
  }

  /** The gold PERFETTO sparkle, once. */
  sparkle(box: Box, at: Point): void {
    const s = this.track(this.scene.add.sprite(at.x, at.y, KITCHEN.sparkle, 0));
    box.add(s);
    if (!this.scene.anims.exists(KITCHEN_ANIMS.sparkle[0])) {
      s.destroy();
      return;
    }
    s.play(KITCHEN_ANIMS.sparkle[0]).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  /** Shakes the camera by about `px` world px (never with reduced motion). */
  shake(px: number = KITCHEN_FX.shakePx, ms: number = KITCHEN_FX.shakeMs): void {
    if (this.calm()) return;
    const cam = this.scene.cameras.main;
    cam.shake(ms, new Phaser.Math.Vector2(px / (cam.width * cam.zoom), px / (cam.height * cam.zoom)));
  }

  /** Every flight / text in progress goes (new shift). */
  clear(): void {
    for (const o of [...this.live]) o.destroy();
    this.bits.killAll();
  }
}
