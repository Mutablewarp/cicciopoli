/**
 * What cooks: the patties / strips on the griddle (seen from above, frame from the logic), the
 * fryer baskets (lowered with the food in the oil, raised when empty), sizzle and smoke, and over
 * every item a big COOK BAR: raw red -> PERFETTO gold (rimmed in light gold: the target) -> troppo
 * cotto brown -> bruciato black, a tall marker moving along it (the frame blinks gold while the item
 * is PERFETTO) and a blinking cue under it ("GIRA!", "OK!", "AHIA!", each within its slot). Drops,
 * flips and lifts animate small offsets on top of the synced state.
 */
import Phaser from 'phaser';
import { KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { KITCHEN_COLORS, KITCHEN_FX } from './config';
import { labelTexture } from './labels';
import type { KitchenLayout, Point } from './layout';
import type { BasketView, CookSlotView, GriddleSlotView } from './logic/types';

const BAR = KITCHEN_FX.bar;
/** the bar runs a bit past BRUCIATO so the black end shows */
const BAR_TAIL = 1.08;
/** item half height on the griddle, well centre, basket offsets (raised / lowered) */
const ITEM_HALF = 14;
const WELL_CX = 16;
const WELL_CY = 11;
const BASKET_UP = -3;
const BASKET_DOWN = 2;
const FRY_ITEM_DY = 1;
const Q = KITCHEN_FX.cue;
const CUE: Readonly<Record<'flip' | 'take' | 'lift' | 'burning', { text: string; color: string }>> = {
  flip: { text: Q.flip, color: KITCHEN_COLORS.text.gold },
  take: { text: Q.take, color: KITCHEN_COLORS.text.gold },
  lift: { text: Q.lift, color: KITCHEN_COLORS.text.gold },
  burning: { text: Q.burning, color: KITCHEN_COLORS.text.red },
};

interface Slot {
  readonly item: Phaser.GameObjects.Sprite;
  readonly fx: Phaser.GameObjects.Sprite;
  readonly cue: Phaser.GameObjects.Image;
  /** animated offset (drop, flip hop) and squash */
  readonly off: { dy: number; sy: number };
  basket?: Phaser.GameObjects.Sprite;
}

export class CookView {
  private readonly griddle: Slot[];
  private readonly fryer: Slot[];
  private readonly bars: Phaser.GameObjects.Graphics;
  private l: KitchenLayout | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    barLayer: Phaser.GameObjects.Container,
  ) {
    const make = (key: string, fried: boolean): Slot => {
      const item = scene.add.sprite(0, 0, key, 0).setVisible(false);
      const fx = scene.add.sprite(0, 0, fried ? KITCHEN.smoke : KITCHEN.sizzle, 0).setVisible(false);
      const cue = scene.add.image(0, 0, KITCHEN.sparkle).setOrigin(0.5, 0.5).setVisible(false);
      const slot: Slot = { item, fx, cue, off: { dy: 0, sy: 1 } };
      if (fried) slot.basket = scene.add.sprite(0, 0, KITCHEN.basket, 0).setOrigin(0.5, 0.5);
      layer.add([...(slot.basket ? [slot.basket] : []), item, fx]);
      barLayer.add(cue);
      return slot;
    };
    this.griddle = [0, 1, 2].map(() => make(KITCHEN.griddleItem, false));
    this.fryer = [0, 1].map(() => make(KITCHEN.fryItem, true));
    this.bars = scene.add.graphics();
    barLayer.addAt(this.bars, 0);
  }

  setLayout(l: KitchenLayout): void {
    this.l = l;
  }

  /** Centre of a griddle slot / the food in a fryer well (flights start and end there). */
  slotPoint(i: number): Point {
    return this.l?.slots[i] ?? { x: 0, y: 0 };
  }

  wellPoint(i: number): Point {
    const w = this.l?.wells[i] ?? { x: 0, y: 0 };
    return { x: w.x + WELL_CX, y: w.y + WELL_CY };
  }

  sync(griddle: readonly (GriddleSlotView | null)[], fryer: readonly (BasketView | null)[]): void {
    const l = this.l;
    if (!l) return;
    this.bars.clear();
    griddle.forEach((v, i) => {
      const s = this.griddle[i];
      const p = l.slots[i];
      s.item.setVisible(v !== null);
      if (!v) return this.hideFx(s);
      s.item.setFrame(v.frame).setPosition(p.x, p.y + s.off.dy).setScale(1, s.off.sy);
      this.fxFor(s, v, false, { x: p.x, y: p.y - 4 + s.off.dy });
      this.bar(s, v, { x: p.x, y: p.y - ITEM_HALF + BAR.dy }, v.tap === 'flip' ? 'flip' : 'take', { x: p.x, y: l.griddle.y + Q.griddleY });
    });
    fryer.forEach((v, i) => {
      const s = this.fryer[i];
      const p = this.wellPoint(i);
      s.item.setVisible(v !== null);
      s.basket?.setFrame(v ? 1 : 0).setPosition(p.x, p.y + (v ? BASKET_DOWN : BASKET_UP) + s.off.dy);
      if (!v) return this.hideFx(s);
      s.item.setFrame(v.frame).setPosition(p.x, p.y + FRY_ITEM_DY + s.off.dy);
      // the art has no "over" frame: a troppo-cotto basket darkens
      s.item.setTint(v.phase === 'over' ? 0xb07040 : 0xffffff);
      this.fxFor(s, v, true, { x: p.x, y: p.y - 8 });
      this.bar(s, v, { x: p.x, y: l.wells[i].y + BAR.dy - 1 }, 'lift', { x: p.x, y: l.fryer.y + Q.fryerY });
    });
  }

  private hideFx(s: Slot): void {
    s.fx.setVisible(false);
    s.cue.setVisible(false);
  }

  /** Sizzle while it cooks on the griddle, smoke once it is past the window (both stations). */
  private fxFor(s: Slot, v: CookSlotView<string>, fried: boolean, at: Point): void {
    const smoking = v.phase === 'over' || v.phase === 'burnt';
    const key = smoking ? KITCHEN.smoke : KITCHEN.sizzle;
    const anim = smoking ? KITCHEN_ANIMS.smoke[0] : KITCHEN_ANIMS.sizzle[0];
    const on = smoking || !fried;
    s.fx.setVisible(on).setPosition(at.x, at.y - (smoking ? 6 : 0));
    if (!on) return;
    if (s.fx.texture.key !== key) s.fx.setTexture(key, 0);
    if (s.fx.anims.currentAnim?.key !== anim && this.scene.anims.exists(anim)) s.fx.play(anim);
  }

  private bar(s: Slot, v: CookSlotView<string>, at: Point, ready: 'flip' | 'take' | 'lift', cueAt: Point): void {
    const g = this.bars;
    const C = KITCHEN_COLORS;
    const span = v.burntAtMs * BAR_TAIL;
    const x0 = Math.round(at.x - BAR.w / 2);
    const y0 = Math.round(at.y - BAR.h);
    const px = (ms: number): number => Math.round((Math.min(ms, span) / span) * BAR.w);
    const blink = Math.floor(this.scene.time.now / KITCHEN_FX.cueBlinkMs) % 2 === 0;
    g.fillStyle(v.phase === 'perfect' && blink ? C.perfect : C.barFrame, 1).fillRect(x0 - 1, y0 - 1, BAR.w + 2, BAR.h + 2);
    const bands: [number, number, keyof typeof C.barHi][] = [
      [0, v.perfectAtMs, 'raw'],
      [v.perfectAtMs, v.overAtMs, 'perfect'],
      [v.overAtMs, v.burntAtMs, 'over'],
      [v.burntAtMs, span, 'burnt'],
    ];
    for (const [a, b, band] of bands) {
      g.fillStyle(C[band], 1).fillRect(x0 + px(a), y0, px(b) - px(a), BAR.h);
      g.fillStyle(C.barHi[band], 1).fillRect(x0 + px(a), y0, px(b) - px(a), 1);
    }
    // the PERFETTO band: a light gold rim, so the target reads at a glance
    const p0 = x0 + px(v.perfectAtMs);
    const p1 = x0 + px(v.overAtMs);
    g.fillStyle(C.barHi.perfect, 1).fillRect(p0 - 1, y0 - 1, p1 - p0 + 2, 1).fillRect(p0 - 1, y0 + BAR.h, p1 - p0 + 2, 1);
    g.fillRect(p0 - 1, y0, 1, BAR.h).fillRect(p1, y0, 1, BAR.h);
    const m = x0 + Math.min(BAR.w - 1, px(v.ms));
    const half = BAR.markerW / 2;
    g.fillStyle(C.barFrame, 1).fillRect(m - half, y0 - BAR.markerOut - 1, BAR.markerW, BAR.h + 2 * BAR.markerOut + 2);
    g.fillStyle(C.marker, 1).fillRect(m - half + 1, y0 - BAR.markerOut, BAR.markerW - 2, BAR.h + 2 * BAR.markerOut);
    const cue = v.phase === 'perfect' ? CUE[ready] : v.phase === 'over' ? CUE.burning : null;
    s.cue.setVisible(cue !== null && (v.phase === 'perfect' || blink));
    if (!cue) return;
    s.cue.setTexture(labelTexture(this.scene, [cue.text], 'tape', cue.color, Q.w)).setPosition(cueAt.x, cueAt.y).setScale(Q.scale);
  }

  /** Something lands in a slot / basket: it drops in from above. */
  drop(station: 'griddle' | 'fryer', i: number): void {
    const s = (station === 'griddle' ? this.griddle : this.fryer)[i];
    if (!s) return;
    this.scene.tweens.killTweensOf(s.off);
    s.off.dy = -8;
    s.off.sy = 1;
    this.scene.tweens.add({ targets: s.off, dy: 0, duration: KITCHEN_FX.plopMs, ease: 'Bounce.easeOut' });
  }

  /** GIRA: the patty hops and turns over. */
  flip(i: number): void {
    const s = this.griddle[i];
    if (!s) return;
    this.scene.tweens.killTweensOf(s.off);
    s.off.dy = 0;
    s.off.sy = 1;
    const half = KITCHEN_FX.flipMs / 2;
    this.scene.tweens.add({ targets: s.off, dy: -7, sy: 0.1, duration: half, ease: 'Quad.easeOut', yoyo: true });
  }

  /** The basket is lifted out of the oil (shown raised for a moment). */
  lift(i: number): void {
    const s = this.fryer[i];
    if (!s) return;
    this.scene.tweens.killTweensOf(s.off);
    s.off.dy = -6;
    this.scene.tweens.add({ targets: s.off, dy: 0, duration: KITCHEN_FX.plopMs, ease: 'Quad.easeOut' });
  }

  /** Texture and frame of what is in a slot (a burnt patty flies to the bin with its look). */
  look(station: 'griddle' | 'fryer', i: number): { key: string; frame: number } {
    const s = (station === 'griddle' ? this.griddle : this.fryer)[i];
    return { key: s?.item.texture.key ?? KITCHEN.griddleItem, frame: Number(s?.item.frame.name ?? 0) };
  }

  clear(): void {
    for (const s of [...this.griddle, ...this.fryer]) {
      this.scene.tweens.killTweensOf(s.off);
      s.off.dy = 0;
      s.off.sy = 1;
      s.item.setVisible(false);
      this.hideFx(s);
    }
    this.bars.clear();
  }
}
