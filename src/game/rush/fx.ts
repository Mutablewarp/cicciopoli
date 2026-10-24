/**
 * One-shot world effects of level 6: score popups from the shared `digits` sheet, sparkles, poofs,
 * impact stars, confetti / sparks, the knocked-away car after a crash, the delivery bag thrown to
 * the customer (or parachuted from the flying truck), speed lines and camera shake. Everything
 * removes itself; reduced motion turns off shake and speed lines.
 */
import Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { RUSH } from '../../art/rush/keys';
import { DEPTH, FX } from './config';
import type { RushFraming } from './framing';
import { SCENE_TEX } from './sceneArt';

const PLUS = 10;
const TIMES = 11;
const ADVANCE = 5;

type Point = { x: number; y: number };

export class Fx {
  private readonly bits: Phaser.GameObjects.Particles.ParticleEmitter;
  private view: RushFraming | null = null;
  private lineMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly calm: () => boolean,
  ) {
    this.bits = scene.add.particles(0, 0, SCENE_TEX.px, {
      lifespan: { min: 380, max: 760 },
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      gravityY: 160,
      scale: { start: 1, end: 0.5 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(DEPTH.fx);
    layer.add(this.bits);
  }

  layout(f: RushFraming): void {
    this.view = f;
  }

  private put<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container>(o: T, depth: number = DEPTH.fx): T {
    o.setDepth(depth);
    this.layer.add(o);
    return o;
  }

  /** "+50" / "x2" rising above a point. */
  popup(x: number, y: number, points: number, times = false): void {
    const glyphs = [times ? TIMES : PLUS, ...String(Math.round(points)).split('').map(Number)];
    const width = (glyphs.length - 1) * ADVANCE + 6;
    const c = this.put(this.scene.add.container(Math.round(x - width / 2), Math.round(y)), DEPTH.marks);
    glyphs.forEach((g, i) => c.add(this.scene.add.image(i * ADVANCE, 0, ITEMS.digits, g).setOrigin(0, 1)));
    this.scene.tweens.add({ targets: c, y: c.y - FX.popupRisePx, duration: FX.popupMs, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: FX.popupMs * 0.8, duration: FX.popupMs * 0.3, onComplete: () => c.destroy() });
  }

  /** An item one-shot animation (sparkle, poof, hit star, dust) that removes itself. */
  once(x: number, y: number, kind: 'sparkle' | 'poof' | 'hitStar' | 'dust', scale = 1): void {
    const s = this.put(this.scene.add.sprite(x, y, ITEMS[kind], 0).setScale(scale));
    const anim = ITEM_ANIMS[kind];
    if (!this.scene.anims.exists(anim)) {
      s.destroy();
      return;
    }
    s.play(anim).once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }

  /** Coloured pixel burst (confetti, sparks, sauce). */
  burst(x: number, y: number, colors: readonly number[], n: number): void {
    colors.forEach((c) => {
      this.bits.setParticleTint(c);
      this.bits.explode(Math.ceil(n / colors.length), x, y);
    });
  }

  /** The car that was hit spins off towards the kerb, falls behind and fades at the end. */
  knockAway(s: Phaser.GameObjects.Sprite, dir: number): void {
    this.put(s, DEPTH.vehicle);
    const side = dir === 0 ? (Math.random() < 0.5 ? -1 : 1) : dir;
    this.burst(s.x - side * 8, s.y - 10, [0xffd23a, 0xffffff, 0xff7a2a], 16);
    this.scene.tweens.add({ targets: s, x: s.x + side * 44, y: s.y + 70, angle: side * 220, duration: 700, ease: 'Cubic.easeOut' });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: 520, duration: 220, onComplete: () => s.destroy() });
  }

  /** A picked-up crate pops away. */
  pop(s: Phaser.GameObjects.Sprite): void {
    this.put(s, DEPTH.pickup);
    this.scene.tweens.add({ targets: s, scale: 1.8, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  /** The Ciccio's bag flies from the truck to the customer; from the sky it floats down on a parachute. */
  bag(from: Point, to: () => Point, sky: boolean, onLand: () => void): void {
    const bag = this.put(this.scene.add.image(from.x, from.y, RUSH.bag), DEPTH.flight + 3);
    const chute = sky ? this.put(this.scene.add.image(from.x, from.y - 10, RUSH.parachute), DEPTH.flight + 3) : null;
    const state = { u: 0 };
    this.scene.tweens.add({
      targets: state,
      u: 1,
      duration: sky ? FX.parachuteMs : FX.bagArcMs,
      ease: sky ? 'Sine.easeInOut' : 'Linear',
      onUpdate: () => {
        const t = to();
        const u = state.u;
        const hop = sky ? 0 : FX.bagArcPx * 4 * u * (1 - u);
        const sway = sky ? Math.sin(u * Math.PI * 3) * 6 * (1 - u) : 0;
        bag.setPosition(from.x + (t.x - from.x) * u + sway, from.y + (t.y - from.y) * u - hop);
        bag.setAngle(sky ? sway * 2 : u * 360);
        chute?.setPosition(bag.x, bag.y - 11).setAngle(sway * 2);
      },
      onComplete: () => {
        bag.destroy();
        chute?.destroy();
        onLand();
      },
    });
  }

  /** Streaks rushing past (flight, sprint); none with reduced motion. */
  speedLines(on: boolean, dtMs: number): void {
    const v = this.view;
    if (!on || !v || this.calm()) return;
    this.lineMs -= dtMs;
    if (this.lineMs > 0) return;
    this.lineMs = FX.speedLineEveryMs;
    const x = v.left + 8 + Math.random() * (v.width - 16);
    const y = v.top + Math.random() * v.height * 0.7;
    const s = this.put(this.scene.add.image(x, y, RUSH.speedLine).setAlpha(0.7).setScale(1, 1 + Math.random()), DEPTH.marks - 1);
    this.scene.tweens.add({ targets: s, y: y + 90, alpha: 0, duration: FX.speedLineMs, onComplete: () => s.destroy() });
  }

  /** Shakes the road by up to `px` world px (Phaser's intensity scales with the camera size and zoom). */
  shake(ms: number, px: number): void {
    if (this.calm()) return;
    const cam = this.scene.cameras.main;
    cam.shake(ms, new Phaser.Math.Vector2(px / (cam.width * cam.zoom), px / (cam.height * cam.zoom)));
  }

  clear(): void {
    this.bits.killAll();
  }
}
