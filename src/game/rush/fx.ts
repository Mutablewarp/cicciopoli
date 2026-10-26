/**
 * One-shot world effects of level 6: score popups from the shared `digits` sheet, sparkles, poofs,
 * impact stars, confetti / sparks, the knocked-away car after a crash, the delivery bag thrown to
 * the customer (or parachuted from the flying truck), speed lines, the SFIORATO! air streak (v9), the
 * CICCIO FEVER gold road edges and gold speed lines (v9) and camera shake. Everything removes itself;
 * reduced motion turns off shake and speed lines. In the side
 * view (v9) texts stand upright and rise / fall / hop along the screen's vertical, not the road's.
 */
import Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { ROAD_W, RUSH } from '../../art/rush/keys';
import { DEPTH, FX, RUSH_VIEW } from './config';
import { screenUp, type CamPose, type ViewRect } from './framing';
import { SCENE_TEX } from './sceneArt';

const PLUS = 10;
const TIMES = 11;
const ADVANCE = 5;
/** spark gravity, world px/s² (down the screen) */
const GRAVITY = 160;

type Point = { x: number; y: number };

export class Fx {
  private readonly bits: Phaser.GameObjects.Particles.ParticleEmitter;
  private view: ViewRect | null = null;
  private lineMs = 0;
  /** popups that replace each other (a FRIES TRAIL's running total) */
  private readonly slots = new Map<string, Phaser.GameObjects.Container>();
  /** popups in flight: they stand upright at every step of a camera turn */
  private readonly live = new Set<Phaser.GameObjects.Container>();
  /** FEVER: gold glow along both road edges */
  private readonly edges: Phaser.GameObjects.Rectangle[];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    private readonly calm: () => boolean,
    private readonly pose: CamPose,
  ) {
    this.bits = scene.add.particles(0, 0, SCENE_TEX.px, {
      lifespan: { min: 380, max: 760 },
      speed: { min: 40, max: 150 },
      angle: { min: 0, max: 360 },
      gravityY: GRAVITY,
      scale: { start: 1, end: 0.5 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(DEPTH.fx);
    this.edges = [0, ROAD_W].map((x) => scene.add.rectangle(x, 0, FX.feverEdgePx, 1, FX.feverGold).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.zone - 1).setVisible(false));
    layer.add([this.bits, ...this.edges]);
  }

  /** The world rect on screen; the sparks fall down the screen at the current camera turn. */
  layout(f: ViewRect): void {
    this.view = f;
    for (const c of this.live) c.setRotation(-this.pose.rotation);
    const up = screenUp(this.pose.rotation);
    this.bits.gravityX = -up.x * GRAVITY;
    this.bits.gravityY = -up.y * GRAVITY;
  }

  /** World offset `px` up the screen. */
  private up(px: number): Point {
    const u = screenUp(this.pose.rotation);
    return { x: u.x * px, y: u.y * px };
  }

  private put<T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | Phaser.GameObjects.Container>(o: T, depth: number = DEPTH.fx): T {
    o.setDepth(depth);
    this.layer.add(o);
    return o;
  }

  /** "+50" / "x2" rising above a point; a popup in the same `slot` takes the place of the one still showing. */
  popup(x: number, y: number, points: number, times = false, slot?: string): void {
    const glyphs = [times ? TIMES : PLUS, ...String(Math.round(points)).split('').map(Number)];
    const width = (glyphs.length - 1) * ADVANCE + 6;
    const at = { x: Math.round(x), y: Math.round(y) };
    const c = this.put(this.scene.add.container(at.x, at.y).setRotation(-this.pose.rotation), DEPTH.marks);
    glyphs.forEach((g, i) => c.add(this.scene.add.image(i * ADVANCE - Math.round(width / 2), 0, ITEMS.digits, g).setOrigin(0, 1)));
    // it rises up the screen as the camera is turned now (a rotation mid-flight included); layout() keeps it upright
    this.live.add(c);
    c.once(Phaser.GameObjects.Events.DESTROY, () => this.live.delete(c));
    const st = { rise: 0 };
    this.scene.tweens.add({
      targets: st,
      rise: FX.popupRisePx,
      duration: FX.popupMs,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        if (!c.active) return;
        const r = this.up(st.rise);
        c.setPosition(at.x + r.x, at.y + r.y);
      },
    });
    this.scene.tweens.add({ targets: c, alpha: 0, delay: FX.popupMs * 0.8, duration: FX.popupMs * 0.3, onComplete: () => c.destroy() });
    if (!slot) return;
    const old = this.slots.get(slot);
    if (old?.active) {
      this.scene.tweens.killTweensOf(old);
      old.destroy();
    }
    this.slots.set(slot, c);
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
    const chute = sky ? this.put(this.scene.add.image(from.x, from.y, RUSH.parachute), DEPTH.flight + 3) : null;
    const state = { u: 0 };
    this.scene.tweens.add({
      targets: state,
      u: 1,
      duration: sky ? FX.parachuteMs : FX.bagArcMs,
      ease: sky ? 'Sine.easeInOut' : 'Linear',
      onUpdate: () => {
        const turn = -this.pose.rotation;
        const t = to();
        const u = state.u;
        const hop = this.up(sky ? 0 : FX.bagArcPx * 4 * u * (1 - u));
        const sway = sky ? Math.sin(u * Math.PI * 3) * 6 * (1 - u) : 0;
        const lean = this.up(sway); // turned a quarter below: sideways on screen
        bag.setPosition(from.x + (t.x - from.x) * u + hop.x - lean.y, from.y + (t.y - from.y) * u + hop.y + lean.x);
        bag.setRotation(turn + (sky ? sway * 2 * Phaser.Math.DEG_TO_RAD : u * Math.PI * 2));
        const lift = this.up(11);
        chute?.setPosition(bag.x + lift.x, bag.y + lift.y).setRotation(turn + sway * 2 * Phaser.Math.DEG_TO_RAD);
      },
      onComplete: () => {
        bag.destroy();
        chute?.destroy();
        onLand();
      },
    });
  }

  /** Streaks rushing past (flight, sprint, gold in FEVER); none with reduced motion. */
  speedLines(on: boolean, dtMs: number, gold = false): void {
    const v = this.view;
    if (!on || !v || this.calm()) return;
    this.lineMs -= dtMs;
    if (this.lineMs > 0) return;
    this.lineMs = gold ? FX.feverLineEveryMs : FX.speedLineEveryMs;
    const x = v.left + 8 + Math.random() * (v.width - 16);
    const y = v.top + Math.random() * v.height * 0.7;
    const s = this.put(this.scene.add.image(x, y, RUSH.speedLine).setAlpha(0.7).setScale(1, 1 + Math.random()), DEPTH.marks - 1);
    if (gold) s.setTint(FX.feverGold);
    this.scene.tweens.add({ targets: s, y: y + 90, alpha: 0, duration: FX.speedLineMs, onComplete: () => s.destroy() });
  }

  /** SFIORATO!: a white air streak whooshes past the truck's flank (side -1 left, 1 right of the road) and falls behind. */
  streak(x: number, y: number, side: number): void {
    const s = this.put(this.scene.add.image(x + side * FX.streakPx, y, RUSH.streak).setAlpha(0.9), DEPTH.fx);
    this.scene.tweens.add({ targets: s, y: y + FX.streakPx * 3, alpha: 0, scaleY: 1.6, duration: FX.streakMs, ease: 'Quad.easeOut', onComplete: () => s.destroy() });
  }

  /** CICCIO FEVER (`level` 0..1 time left, 0 = off): both road edges glow gold, pulsing, fading in the last fifth. */
  fever(level: number, timeMs: number): void {
    const v = this.view;
    const on = level > 0 && v !== null;
    for (const e of this.edges) {
      e.setVisible(on);
      if (!on) continue;
      const pulse = 0.5 + 0.5 * Math.sin(timeMs / FX.feverPulseMs);
      e.setY(v.top - RUSH_VIEW.overscanPx).setSize(FX.feverEdgePx, v.height + 2 * RUSH_VIEW.overscanPx);
      e.setAlpha((FX.feverEdgeAlpha + FX.feverEdgePulse * pulse) * Math.min(1, level * 5));
    }
  }

  /** Shakes the road by up to `px` world px (Phaser's intensity scales with the camera size and zoom). */
  shake(ms: number, px: number): void {
    if (this.calm()) return;
    const cam = this.scene.cameras.main;
    cam.shake(ms, new Phaser.Math.Vector2(px / (cam.width * cam.zoom), px / (cam.height * cam.zoom)));
  }

  clear(): void {
    this.bits.killAll();
    for (const e of this.edges) e.setVisible(false);
  }
}
