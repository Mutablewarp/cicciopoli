/**
 * What cooks, at the manifest sizes: the patties / strips on the big griddle (seen from above, frame from the
 * logic: the crust darkens state by state), fat bubbling at their edge and a wisp of steam while they cook;
 * the fryer baskets (lowered with the food in the oil, a shake now and then, raised when empty); sizzle and
 * smoke; over every item a big COOK BAR: raw red -> PERFETTO gold (rimmed in light gold: the target) -> troppo
 * cotto brown -> bruciato black, a tall marker moving along it (the frame blinks gold while the item is
 * PERFETTO) and a blinking cue under it ("GIRA!", "OK!", "AHIA!"). The slap-down, the spatula flip, the dunk
 * and the lift are cookFx.ts animations on each slot's offsets.
 */
import Phaser from 'phaser';
import { BASKET, FRY_ITEM, FRYER, GRIDDLE_ITEM, KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { BASKET_MOUTH } from '../../art/kitchen/station/fryer';
import { COOK_FX, KITCHEN_COLORS, KITCHEN_FX } from './config';
import { CookFx, type Slot } from './cookFx';
import type { Point } from './framing';
import type { Fx } from './fx';
import { labelTexture } from './labels';
import type { KitchenLayout } from './layout';
import type { BasketView, CookSlotView, GriddleSlotView } from './logic/types';

const BAR = KITCHEN_FX.bar;
/** the bar runs a bit past BRUCIATO so the black end shows */
const BAR_TAIL = 1.08;
const ITEM_HALF = GRIDDLE_ITEM.h / 2 - 4;
/** a lowered basket sits with its rim centred on the well (the food is centred there too) */
const BASKET_DOWN = BASKET.h / 2 - (BASKET_MOUTH.y + BASKET_MOUTH.h / 2);
const Q = KITCHEN_FX.cue;
const CUE: Readonly<Record<'flip' | 'take' | 'lift' | 'burning', { text: string; color: string }>> = {
  flip: { text: Q.flip, color: KITCHEN_COLORS.text.gold },
  take: { text: Q.take, color: KITCHEN_COLORS.text.gold },
  lift: { text: Q.lift, color: KITCHEN_COLORS.text.gold },
  burning: { text: Q.burning, color: KITCHEN_COLORS.text.red },
};
/** the art's frame sizes may differ from the manifest until the redraw lands: drawn at the manifest's */
const fit = (s: Phaser.GameObjects.Sprite, w: number, h: number): { x: number; y: number } => ({ x: w / Math.max(1, s.width), y: h / Math.max(1, s.height) });

export class CookView {
  private readonly griddle: Slot[];
  private readonly fryer: Slot[];
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly fat: Phaser.GameObjects.Graphics;
  readonly fxs: CookFx;
  private l: KitchenLayout | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    layer: Phaser.GameObjects.Container,
    barLayer: Phaser.GameObjects.Container,
    fx: Fx,
    private readonly calm: () => boolean,
  ) {
    const make = (key: string, fried: boolean): Slot => {
      const item = scene.add.sprite(0, 0, key, 0).setVisible(false);
      const smoke = scene.add.sprite(0, 0, fried ? KITCHEN.smoke : KITCHEN.sizzle, 0).setVisible(false);
      const steam = scene.add.sprite(0, 0, KITCHEN.steam, 0).setOrigin(0.5, 1).setVisible(false);
      if (scene.anims.exists(KITCHEN_ANIMS.steam[0])) steam.play(KITCHEN_ANIMS.steam[0]);
      const cue = scene.add.image(0, 0, KITCHEN.sparkle).setOrigin(0.5, 0.5).setVisible(false);
      const base = fried ? fit(item, FRY_ITEM.w, FRY_ITEM.h) : fit(item, GRIDDLE_ITEM.w, GRIDDLE_ITEM.h);
      const slot: Slot = { item, smoke, steam, cue, base, off: { dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 } };
      if (fried) {
        const basket = scene.add.sprite(0, 0, KITCHEN.basket, 0).setOrigin(0.5, 0.5);
        slot.basket = basket;
        slot.basketBase = fit(basket, BASKET.w, BASKET.h);
      }
      // the food under the lowered basket's rim, steam and smoke over everything
      layer.add([item, ...(slot.basket ? [slot.basket] : []), smoke, steam]);
      barLayer.add(cue);
      return slot;
    };
    this.griddle = [0, 1, 2].map(() => make(KITCHEN.griddleItem, false));
    this.fryer = FRYER.wells.map(() => make(KITCHEN.fryItem, true));
    this.fat = scene.add.graphics();
    layer.add(this.fat);
    this.bars = scene.add.graphics();
    barLayer.addAt(this.bars, 0);
    this.fxs = new CookFx(scene, layer, fx, calm);
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
    return { x: w.x + FRYER.well.w / 2, y: w.y + FRYER.well.h / 2 };
  }

  sync(griddle: readonly (GriddleSlotView | null)[], fryer: readonly (BasketView | null)[], timeMs: number): void {
    const l = this.l;
    if (!l) return;
    this.bars.clear();
    this.fat.clear();
    const calm = this.calm();
    griddle.forEach((v, i) => {
      const s = this.griddle[i];
      const p = l.slots[i];
      s.item.setVisible(v !== null);
      if (!v) return this.hideFx(s);
      const o = s.off;
      s.item.setFrame(v.frame).setPosition(p.x + o.dx, p.y + o.dy).setScale(s.base.x * o.sx, s.base.y * o.sy).setRotation(o.rot);
      this.smokeFor(s, v, false, { x: p.x, y: p.y - 6 + o.dy });
      this.steamFor(s, v, { x: p.x, y: p.y + COOK_FX.steam.dy + o.dy });
      if (v.phase !== 'burnt' && o.dy === 0) this.fatRing(p, timeMs + i * 131, calm);
      this.bar(s, v, { x: p.x, y: p.y - ITEM_HALF + BAR.dy }, v.tap === 'flip' ? 'flip' : 'take', { x: p.x, y: l.griddle.y + Q.griddleY });
    });
    fryer.forEach((v, i) => {
      const s = this.fryer[i];
      const p = this.wellPoint(i);
      const o = s.off;
      const shake = v && !calm && v.phase !== 'burnt' ? this.fxs.shakeX(i, timeMs) : 0;
      const B = COOK_FX.basket;
      const y = Math.max(this.basketTop + BASKET.h / 2, p.y + (v ? BASKET_DOWN : B.up) + o.dy);
      s.basket?.setFrame(v ? 1 : 0).setPosition(p.x + shake, y).setScale(s.basketBase?.x ?? 1, s.basketBase?.y ?? 1);
      s.item.setVisible(v !== null);
      if (!v) return this.hideFx(s);
      s.item.setFrame(v.frame).setPosition(p.x + shake, p.y + o.dy).setScale(s.base.x, s.base.y);
      // the art has no "over" frame: a troppo-cotto basket darkens
      s.item.setTint(v.phase === 'over' ? 0xb07040 : 0xffffff);
      this.smokeFor(s, v, true, { x: p.x, y: p.y - 10 });
      this.steamFor(s, v, { x: p.x, y: p.y - FRYER.well.h / 2 });
      this.bar(s, v, { x: p.x, y: l.wells[i].y + BAR.dy - 1 }, 'lift', { x: p.x, y: l.fryer.y + Q.fryerY });
    });
  }

  /** Fat bubbling at the patty's edge: dots popping round a ring (still with reduced motion). */
  private fatRing(p: Point, t: number, calm: boolean): void {
    const F = COOK_FX.fat;
    for (let i = 0; i < F.dots; i++) {
      const phase = calm ? 0 : (t + (i * F.periodMs) / F.dots) % F.periodMs;
      if (phase > F.litMs) continue;
      const turn = Math.floor((t + (i * F.periodMs) / F.dots) / F.periodMs);
      const a = ((i * 2.399 + turn * 1.3) % (Math.PI * 2)) - Math.PI;
      const r = F.r + ((i + turn) % 3) - 1;
      const size = phase < F.litMs / 2 ? 2 : 1;
      this.fat.fillStyle(F.colors[(i + turn) % F.colors.length], 1).fillRect(Math.round(p.x + Math.cos(a) * r), Math.round(p.y + Math.sin(a) * r * 0.8), size, size);
    }
  }

  private hideFx(s: Slot): void {
    s.smoke.setVisible(false);
    s.steam.setVisible(false);
    s.cue.setVisible(false);
  }

  /** Sizzle while it cooks on the griddle, smoke once it is past the window (both stations). */
  private smokeFor(s: Slot, v: CookSlotView<string>, fried: boolean, at: Point): void {
    const smoking = v.phase === 'over' || v.phase === 'burnt';
    const key = smoking ? KITCHEN.smoke : KITCHEN.sizzle;
    const anim = smoking ? KITCHEN_ANIMS.smoke[0] : KITCHEN_ANIMS.sizzle[0];
    const on = smoking || !fried;
    s.smoke.setVisible(on).setPosition(at.x, at.y - (smoking ? 8 : 0));
    if (!on) return;
    if (s.smoke.texture.key !== key) s.smoke.setTexture(key, 0);
    if (s.smoke.anims.currentAnim?.key !== anim && this.scene.anims.exists(anim)) s.smoke.play(anim);
  }

  /** A wisp of steam over a cooking item, stronger as it nears PERFETTO (not while it smokes). */
  private steamFor(s: Slot, v: CookSlotView<string>, at: Point): void {
    const S = COOK_FX.steam;
    const u = Math.min(1, v.ms / Math.max(1, v.perfectAtMs));
    const on = (v.phase === 'raw' || v.phase === 'perfect') && u >= S.from;
    s.steam.setVisible(on).setPosition(at.x, at.y);
    if (on) s.steam.setAlpha(S.alpha * (v.phase === 'perfect' ? 1 : (u - S.from) / (1 - S.from)));
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

  /** The raw patty / strips slap down on the griddle (sizzleBig, grease spits, a puff of steam). */
  drop(station: 'griddle' | 'fryer', i: number): void {
    if (station === 'griddle') this.fxs.slap(this.griddle[i], this.slotPoint(i));
    else this.fxs.dunk(this.fryer[i], this.wellPoint(i));
  }

  /** GIRA: a spatula lifts the patty in an arc and turns it over. */
  flip(i: number): void {
    this.fxs.flip(this.griddle[i], this.slotPoint(i));
  }

  /** Highest y a basket's top reaches: COOK_FX.basket.headroom over the COTTURA page's top. */
  private get basketTop(): number {
    return (this.l?.plan.pages[1].view.y ?? -Infinity) - COOK_FX.basket.headroom;
  }

  /** The basket lifts out of the oil, dripping, with steam: up past its hook and back down onto it, or, with no room
   * over the fryer (a landscape page's top under the HUD), up from the oil onto its hook. */
  lift(i: number): void {
    const p = this.wellPoint(i);
    const B = COOK_FX.basket;
    const rise = COOK_FX.lift.risePx;
    const room = p.y + B.up - BASKET.h / 2 - this.basketTop;
    this.fxs.lift(this.fryer[i], p, room >= rise ? -rise : BASKET_DOWN - B.up);
  }

  /** Texture and frame of what is in a slot (a burnt patty flies to the bin with its look). */
  look(station: 'griddle' | 'fryer', i: number): { key: string; frame: number } {
    const s = (station === 'griddle' ? this.griddle : this.fryer)[i];
    return { key: s?.item.texture.key ?? KITCHEN.griddleItem, frame: Number(s?.item.frame.name ?? 0) };
  }

  clear(): void {
    for (const s of [...this.griddle, ...this.fryer]) {
      this.fxs.reset(s);
      s.item.setVisible(false);
      this.hideFx(s);
    }
    this.fxs.clear();
    this.bars.clear();
    this.fat.clear();
  }
}
