/**
 * Ingredients "belli da sentire mentre le prendi con le mani" (BRIEF §9 v7.5): pressing a pan lifts a piece of
 * what is in it (squash and stretch, a shadow under it), the pan bounces, a grab sound of its family plays and
 * the phone ticks (KitchenSettings.vibration); dragging carries the piece under the finger and lights up where
 * it goes (the griddle, the fryer, the board, the tray); releasing hands it to the shift (it flies there) or
 * drops it back. Kitchen px, in the kitchen's top layer.
 */
import Phaser from 'phaser';
import { DRINKS, FRY_ITEM, FRY_ITEMS, FRY_STATE, GRIDDLE_ITEM, GRIDDLE_ITEMS, GRIDDLE_STATE, KITCHEN, LAYER, SAUCES, layerFrame, type DrinkId } from '../../art/kitchen/keys';
import type { SfxName } from '../../contracts';
import { TOUCH } from './config';
import type { Point, Rect } from './framing';
import type { BinId } from './logic/types';
import type { PlaceView } from './stationView';

/** Grab sound of each family: raw meat, leaves and soft veg, cheeses, fried / crunchy / nuts, the bun, cans, sauces. */
const GRAB: Readonly<Record<string, SfxName>> = {
  manzo: 'grabMeat', vegetale: 'grabMeat', bacon: 'grabMeat', guanciale: 'grabMeat', pancetta: 'grabMeat',
  polloPastellato: 'grabCrisp', polloCroccante: 'grabCrisp', cosciaPanko: 'grabCrisp',
  cheddar: 'grabCheese', brie: 'grabCheese', provola: 'grabCheese', taleggio: 'grabCheese', tuma: 'grabCheese', scamorza: 'grabCheese', gorgonzola: 'grabCheese',
  songino: 'grabLeaf', lattuga: 'grabLeaf', pomodoro: 'grabLeaf', cipollaCaramellata: 'grabLeaf', capuliato: 'grabLeaf', peperoncino: 'grabLeaf', pere: 'grabLeaf', fichi: 'grabLeaf',
  cipollaCroccante: 'grabCrisp', nocciole: 'grabCrisp', noci: 'grabCrisp',
  patatine: 'grabCrisp', nuggets: 'grabCrisp', meatball: 'grabCrisp', chickenPopCorn: 'grabCrisp', greenNuggets: 'grabCrisp',
};

/** The sound of picking `id` up (a pan's piece, a sauce bottle, CHIUDI's brioche, a drink can). */
export function grabSfx(id: BinId | DrinkId | 'bun'): SfxName {
  if (id === 'bun') return 'grabBun';
  if ((DRINKS as readonly string[]).includes(id)) return 'grabCan';
  if ((SAUCES as readonly string[]).includes(id)) return 'squeeze';
  return GRAB[id] ?? 'plop';
}

/** What a picked-up piece looks like: one raw patty / strip, one raw fry, a layer of the burger (a cold topping,
 * a squeeze of sauce, the brioche top), or null = the place's own item (a drink can); its width in kitchen px. */
export interface Piece {
  readonly key: string;
  readonly frame: number;
  readonly w: number;
}

export function pieceOf(id: BinId | 'bun', panScale: number): Piece | null {
  if (id === 'bun') return { key: KITCHEN.layer, frame: layerFrame('bunTop'), w: LAYER.w * panScale };
  const g = (GRIDDLE_ITEMS as readonly string[]).indexOf(id);
  if (g >= 0) return { key: KITCHEN.griddleItem, frame: g * GRIDDLE_STATE.count + GRIDDLE_STATE.raw, w: GRIDDLE_ITEM.w };
  const f = (FRY_ITEMS as readonly string[]).indexOf(id);
  if (f >= 0) return { key: KITCHEN.fryItem, frame: f * FRY_STATE.count + FRY_STATE.raw, w: FRY_ITEM.w };
  return { key: KITCHEN.layer, frame: layerFrame(id as Parameters<typeof layerFrame>[0]), w: LAYER.w * panScale };
}

export class TouchFx {
  private piece: Phaser.GameObjects.Image | null = null;
  private shadow: Phaser.GameObjects.Ellipse | null = null;
  private home: Point = { x: 0, y: 0 };
  private k = 1;
  private readonly glow: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Container,
    private readonly calm: () => boolean,
  ) {
    this.glow = scene.add.graphics();
    layer.add(this.glow);
  }

  /** A piece of the pressed place (`piece`, else its own item) lifts out of it, the place bounces. */
  lift(p: PlaceView, piece: Piece | null): void {
    this.release(true);
    const it = p.item;
    const g = p.g;
    const ox = it.originX * it.displayWidth;
    const oy = it.originY * it.displayHeight;
    // the item's centre in kitchen px (its container is centred on the place)
    this.home = { x: g.x + it.x - ox + it.displayWidth / 2, y: g.y + it.y - oy + it.displayHeight / 2 };
    const L = TOUCH;
    const own = it instanceof Phaser.GameObjects.Sprite ? it.frame.name : undefined;
    this.piece = piece ? this.scene.add.image(this.home.x, this.home.y, piece.key, piece.frame) : this.scene.add.image(this.home.x, this.home.y, it.texture.key, own);
    this.k = piece ? piece.w / Math.max(1, this.piece.width) : p.scale;
    this.piece.setScale(this.k);
    const pw = this.piece.displayWidth;
    const ph = this.piece.displayHeight;
    this.shadow = this.scene.add.ellipse(this.home.x, this.home.y + ph * 0.45, pw * 0.8, Math.max(4, ph * 0.3), 0x101218, L.shadowAlpha);
    this.layer.add([this.shadow, this.piece]);
    this.layer.bringToTop(this.glow);
    const calm = this.calm();
    this.scene.tweens.killTweensOf(g);
    g.setScale(1).setAngle(0);
    if (!calm) this.scene.tweens.add({ targets: g, scaleX: { from: 1.07, to: 1 }, scaleY: { from: 0.9, to: 1 }, duration: L.liftMs * 2, ease: 'Back.easeOut' });
    this.scene.tweens.add({
      targets: this.piece,
      y: this.home.y - L.liftPx,
      scaleX: { from: this.k * (calm ? 1 : 1.18), to: this.k },
      scaleY: { from: this.k * (calm ? 1 : 0.78), to: this.k * 1.04 },
      duration: L.liftMs,
      ease: 'Back.easeOut',
    });
  }

  /** The lifted piece follows the finger (kitchen px), bigger, a little over it; `target` lights up when it is over its place. */
  drag(at: Point, target: Rect | null, over: boolean): void {
    const p = this.piece;
    if (!p) return;
    this.scene.tweens.killTweensOf(p);
    p.setPosition(at.x, at.y - TOUCH.dragLiftPx).setScale(this.k * TOUCH.dragScale);
    this.shadow?.setPosition(at.x, at.y - TOUCH.dragLiftPx / 3);
    this.lightUp(target, over);
  }

  private lightUp(r: Rect | null, over: boolean): void {
    const G = TOUCH.glow;
    const g = this.glow.clear();
    if (!r) return;
    g.fillStyle(G.color, over ? G.alpha * 1.6 : G.alpha);
    g.fillRect(r.x - G.pad, r.y - G.pad, r.w + 2 * G.pad, r.h + 2 * G.pad);
    g.lineStyle(over ? 2 : 1, G.color, G.rim).strokeRect(r.x - G.pad, r.y - G.pad, r.w + 2 * G.pad, r.h + 2 * G.pad);
  }

  /** The press ends: the piece goes (it flies on from the shift's events) or, `back`, drops back into its place. */
  release(back = false): void {
    this.glow.clear();
    const p = this.piece;
    const s = this.shadow;
    this.piece = null;
    this.shadow = null;
    if (!p) return;
    this.scene.tweens.killTweensOf(p);
    s?.destroy();
    if (!back || this.calm()) {
      p.destroy();
      return;
    }
    this.scene.tweens.add({ targets: p, x: this.home.x, y: this.home.y, scale: this.k, alpha: 0.2, duration: TOUCH.liftMs * 1.5, ease: 'Quad.easeIn', onComplete: () => p.destroy() });
  }
}
