/**
 * MONTAGGIO: the burger on its paper as a big side-view stack (bottom bun, then every layer at the
 * LAYER / LAYER_H geometry of the manifest, raw / burnt looks from layerCook), drawn at the plan's
 * stack scale; a pile taller than the plan's room shrinks to fit. A new layer flies in from
 * where it came from (bin, griddle, fryer), growing on the way, and lands with a squash-and-settle
 * plop; the top layer taken off flies to the trash; CHIUDI drops the top bun, shows the finished
 * burger off with its stars, folds the hi-res kraft paper round it and sends the parcel to the tray.
 */
import Phaser from 'phaser';
import { COOKABLE, KITCHEN, KITCHEN_ANIMS, LAYER, LAYER_H, layerCookFrame, layerFrame, type IngredientId, type LayerKind } from '../../art/kitchen/keys';
import { BRAND, BRAND_WRAP_ANIM } from './brand';
import { KITCHEN_FX } from './config';
import type { Point } from './framing';
import type { Fx } from './fx';
import { hiRes } from './hiRes';
import { FRILLS, stackScale, type KitchenLayout } from './layout';
import type { BoardArt } from './plan';
import { BANNER } from './logic/strings';
import type { StackLayer } from './logic/types';

const ORIGIN_X = LAYER.cx / LAYER.w;
const ORIGIN_Y = LAYER.baseRow / LAYER.h;
const STARS = 5;
const STAR_POP_MS = 160;
const isCookable = (k: IngredientId): k is (typeof COOKABLE)[number] => (COOKABLE as readonly string[]).includes(k);

function texOf(l: StackLayer): { key: string; frame: number } {
  if (l.look !== 'normal' && isCookable(l.kind)) return { key: KITCHEN.layerCook, frame: layerCookFrame(l.kind, l.look) };
  return { key: KITCHEN.layer, frame: layerFrame(l.kind) };
}

const sig = (l: StackLayer): string => `${l.kind}:${l.look}:${l.atMs}`;

export class StackView {
  private readonly bun: Phaser.GameObjects.Image;
  private sprites: Phaser.GameObjects.Image[] = [];
  private sigs: string[] = [];
  private base: Point = { x: 0, y: 0 };
  private art: BoardArt = { stack: 1, paper: 1, tray: 1, trash: 1 };
  private room = 0;
  private k = 1;
  /** where the next new layer flies in from (set by the reactor on 'stacked') */
  from: Point | null = null;
  /** the closed burger on show, its stars, the folding paper (cleared with the shift) */
  private shown: Phaser.GameObjects.GameObject[] = [];
  private timers: Phaser.Time.TimerEvent[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Container,
    private readonly fx: Fx,
    private readonly trash: () => Point,
  ) {
    this.bun = scene.add.image(0, 0, KITCHEN.layer, layerFrame('bunBottom')).setOrigin(ORIGIN_X, ORIGIN_Y).setScale(this.k);
    layer.add(this.bun);
  }

  /** The plan's board: the burger's base, scale and room. */
  setBase(l: KitchenLayout): void {
    this.base = l.stackBase;
    this.art = l.art;
    this.room = l.plan.room;
    const k = stackScale(this.kinds(), this.art, this.room);
    if (k !== this.k) {
      this.k = k;
      this.bun.setScale(k);
      this.sprites.forEach((s) => s.setScale(k));
    }
    this.bun.setPosition(this.base.x, this.base.y);
    this.sprites.forEach((s, i) => s.setPosition(this.base.x, this.yOf(i)));
  }

  /** Bottom edge of layer i's body. */
  private yOf(i: number): number {
    const kinds = this.kinds();
    let h = LAYER_H.bunBottom;
    for (let k = 0; k < i; k++) h += LAYER_H[kinds[k]];
    return this.base.y - h * this.k;
  }

  private kinds(): LayerKind[] {
    return this.sigs.map((s) => s.split(':')[0] as LayerKind);
  }

  /** World y of the top of the burger (tap area), null when only the bun is there. */
  get topY(): number | null {
    return this.sprites.length === 0 ? null : this.yOf(this.sprites.length) - FRILLS * this.k;
  }

  /**
   * Follows the logic's stack: one layer more = it flies into its place (on top, or slid under the
   * layers that came first: the patty under the cheddar taken while it cooked), one less = the top
   * goes to the trash; anything else (or a new scale) is redrawn as it is.
   */
  sync(layers: readonly StackLayer[], bunOn: boolean): void {
    this.bun.setVisible(bunOn);
    const next = layers.map(sig);
    const same = (n: number): boolean => next.slice(0, n).every((s, i) => s === this.sigs[i]);
    const k = stackScale(layers.map((l) => l.kind), this.art, this.room);
    if (k === this.k) {
      if (next.length === this.sigs.length && same(next.length)) return;
      if (next.length === this.sigs.length + 1) {
        const at = next.findIndex((s, i) => s !== this.sigs[i]);
        if (next.slice(at + 1).every((s, i) => s === this.sigs[at + i])) return this.insert(at, layers[at], next);
      }
      if (next.length === this.sigs.length - 1 && same(next.length)) return this.pop(next);
    }
    this.k = k;
    this.bun.setScale(k);
    this.sprites.forEach((s) => s.destroy());
    this.sigs = next;
    this.sprites = layers.map((l, i) => this.make(l, this.yOf(i)));
    this.from = null;
  }

  private make(l: StackLayer, y: number): Phaser.GameObjects.Image {
    const t = texOf(l);
    const s = this.scene.add.image(this.base.x, y, t.key, t.frame).setOrigin(ORIGIN_X, ORIGIN_Y).setScale(this.k);
    this.layer.add(s);
    return s;
  }

  /** A new layer at index `at`: the ones above it rise to make room, it flies in and plops. */
  private insert(at: number, l: StackLayer, next: string[]): void {
    this.sigs = next;
    const y = this.yOf(at);
    const s = this.make(l, y);
    this.sprites.splice(at, 0, s);
    this.layer.moveTo(s, this.layer.getIndex(this.sprites[at + 1] ?? s));
    const k = this.k;
    this.sprites.slice(at + 1).forEach((above, j) => {
      this.scene.tweens.killTweensOf(above);
      above.setScale(k);
      this.scene.tweens.add({ targets: above, y: this.yOf(at + 1 + j), duration: KITCHEN_FX.plopMs, ease: 'Back.easeOut' });
    });
    const from = this.from;
    this.from = null;
    this.scene.tweens.killTweensOf(s);
    const plop = (): void => {
      s.setScale(1.18 * k, 0.7 * k);
      this.scene.tweens.add({ targets: s, scaleX: k, scaleY: k, duration: KITCHEN_FX.plopMs, ease: 'Back.easeOut' });
    };
    if (!from) {
      s.setY(y - KITCHEN_FX.plopDropPx * k);
      this.scene.tweens.add({ targets: s, y, duration: KITCHEN_FX.plopMs / 2, ease: 'Quad.easeIn', onComplete: plop });
      return;
    }
    // the layer flies from its bin / station on an arc, then plops
    s.setVisible(false);
    const t = texOf(l);
    const mid = (LAYER.baseRow - LAYER.h / 2) * k;
    this.fx.fly(this.layer, t.key, t.frame, from, () => ({ x: this.base.x, y: y - mid }), { scaleTo: k }, () => {
      if (!s.active) return;
      s.setVisible(true);
      plop();
    });
  }

  private pop(next: string[]): void {
    const s = this.sprites.pop();
    this.sigs = next;
    if (!s) return;
    const from = { x: s.x, y: s.y - (LAYER.baseRow - LAYER.h / 2) * this.k };
    const key = s.texture.key;
    const frame = Number(s.frame.name);
    s.destroy();
    this.fx.fly(this.layer, key, frame, from, this.trash, { spin: 1, scale: this.k, scaleTo: 0.8 });
  }

  /**
   * CHIUDI: the top bun lands on the finished burger and it is shown off for a moment (a hop and a
   * squash, sparkles, its `stars` popping over it, PERFETTO! at 5); then the paper folds round it
   * (`onFold`) and the wrapped burger flies to the tray (`onLand`).
   */
  wrap(stars: number, to: () => Point, onFold: () => void, onLand: () => void): void {
    const R = KITCHEN_FX.reveal;
    const { x, y } = this.base;
    const k = this.k;
    const restY = this.yOf(this.sprites.length) - y;
    // the burger moves into its own box (origin = its bottom centre) so it squashes as one piece
    const box = this.keep(this.scene.add.container(x, y));
    this.layer.add(box);
    box.add(this.scene.add.image(0, 0, KITCHEN.layer, layerFrame('bunBottom')).setOrigin(ORIGIN_X, ORIGIN_Y).setScale(k));
    this.sprites.forEach((s, i) => {
      this.scene.tweens.killTweensOf(s);
      box.add(s.setScale(k).setPosition(0, this.yOf(i) - y));
    });
    this.sprites = [];
    this.sigs = [];
    this.from = null;
    const bunTop = this.keep(
      this.scene.add.image(0, restY - KITCHEN_FX.plopDropPx * 2 * k, KITCHEN.layer, layerFrame('bunTop')).setOrigin(ORIGIN_X, ORIGIN_Y).setScale(k),
    );
    box.add(bunTop);
    const topY = y + restY - LAYER_H.bunTop * k;
    this.scene.tweens.add({
      targets: bunTop,
      y: restY,
      duration: KITCHEN_FX.plopMs / 2,
      ease: 'Quad.easeIn',
      onComplete: () => {
        box.setScale(1.14, 0.84);
        this.scene.tweens.add({ targets: box, scaleX: 1, scaleY: 1, duration: KITCHEN_FX.plopMs * 1.5, ease: 'Back.easeOut' });
        this.scene.tweens.add({ targets: box, y: y - R.hopPx * k, duration: R.holdMs / 4, ease: 'Quad.easeOut', yoyo: true });
        for (let i = 0; i < R.sparkles; i++) {
          const at = { x: x + (i - (R.sparkles - 1) / 2) * 16 * k, y: topY + ((i * 7) % 3) * 6 * k };
          this.later(i * R.starEveryMs, () => this.fx.sparkle(this.layer, at));
        }
        this.showStars(stars, { x, y: topY - R.starDy });
        this.later(R.holdMs, () => this.fold(to, onFold, onLand));
      },
    });
  }

  /** The burger's stars in a row over it, popping one by one; PERFETTO! over them at 5. */
  private showStars(stars: number, at: Point): void {
    const R = KITCHEN_FX.reveal;
    for (let i = 0; i < STARS; i++) {
      const st = this.keep(this.scene.add.sprite(Math.round(at.x + (i - (STARS - 1) / 2) * R.starGap), at.y, KITCHEN.star, i < stars ? 1 : 0).setScale(0));
      this.layer.add(st);
      this.scene.tweens.add({ targets: st, scale: 1, delay: i * R.starEveryMs, duration: STAR_POP_MS, ease: 'Back.easeOut' });
    }
    if (stars >= STARS) this.later(STARS * R.starEveryMs, () => this.fx.float(this.layer, BANNER.perfect, { x: at.x, y: at.y - 14 }));
  }

  /** The kraft paper folds round the burger (the burger and its stars go) and the wrapped parcel flies to the tray. */
  private fold(to: () => Point, onFold: () => void, onLand: () => void): void {
    this.clearShow();
    onFold();
    const k = this.k;
    // the hi-res kraft wrap with its own fold animation when the brand textures are there
    const hi = this.scene.textures.exists(BRAND.wrap);
    const wrap = hi ? hiRes(this.scene, KITCHEN.wrap) : { key: KITCHEN.wrap, k: 1 };
    const anim = hi ? BRAND_WRAP_ANIM : KITCHEN_ANIMS.wrap[0];
    const paper = this.keep(this.scene.add.sprite(this.base.x, this.base.y + 2 * k, wrap.key, 0).setOrigin(0.5, 1).setScale(k * wrap.k));
    this.layer.add(paper);
    const fly = (): void => {
      paper.destroy();
      const from = { x: this.base.x, y: this.base.y - 14 * k };
      const o = { ms: KITCHEN_FX.flightMs * 1.4, arc: 24, scale: k * wrap.k, scaleTo: this.art.tray * wrap.k };
      this.fx.fly(this.layer, wrap.key, 3, from, to, o, onLand);
    };
    if (!this.scene.anims.exists(anim)) return fly();
    paper.play(anim).once(Phaser.Animations.Events.ANIMATION_COMPLETE, fly);
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.shown.push(o);
    return o;
  }

  /** A scene timer of the reveal (cancelled by clear()). */
  private later(ms: number, fn: () => void): void {
    this.timers.push(this.scene.time.delayedCall(ms, fn));
  }

  /** Everything on show goes (tweens and timers too). */
  private clearShow(): void {
    this.timers.forEach((t) => t.remove());
    this.timers = [];
    this.shown.forEach((o) => {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    });
    this.shown = [];
  }

  clear(): void {
    this.sprites.forEach((s) => s.destroy());
    this.sprites = [];
    this.sigs = [];
    this.from = null;
    this.clearShow();
  }
}
