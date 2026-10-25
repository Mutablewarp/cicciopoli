/**
 * Everything level 7 draws, framed by one camera: the BANCONE at the world origin and the CUCINA
 * one screen to its right; the camera slides between them (eased, KITCHEN_TIMING.cameraMs; a cut
 * with reduced motion). Both views fill the whole canvas with their room / worktop art, so the
 * slide never shows a gap and the free area around the plan is never empty. A paged kitchen (a
 * phone too short for the whole plan) shows MONTAGGIO or COTTURA: the camera moves down / up between
 * them. The hi-res brand textures are drawn here at the density of the screen.
 */
import type Phaser from 'phaser';
import { KITCHEN, SHEET_SPEC } from '../../art/kitchen/keys';
import type { ViewportInfo } from '../../contracts';
import { KITCHEN_TIMING } from '../../config/kitchen';
import { ensureBrandTextures } from './brand';
import { KITCHEN_VIEW, MONTAGGIO, PAGER } from './config';
import { CookView } from './cookView';
import { CounterView } from './counterView';
import { Fx } from './fx';
import { Guide } from './guide';
import { computeFraming, inRect, kitchenOffset, pageOf, targetRect, toCss, toWorld, type KitchenFraming, type Point, type Rect } from './layout';
import type { KitchenSnapshot, KitchenTarget } from './logic/types';
import { StackView } from './stackView';
import { StationView } from './stationView';

const [CAN_W, CAN_H] = SHEET_SPEC[KITCHEN.drink];
const DRINK_CAN = { w: CAN_W, h: CAN_H } as const;

export class KitchenView {
  readonly counter: CounterView;
  readonly station: StationView;
  readonly cook: CookView;
  readonly stack: StackView;
  readonly guide: Guide;
  readonly fx: Fx;
  framing: KitchenFraming;
  /** 0 = counter on screen, 1 = kitchen */
  slide = 0;
  /** paged kitchen: the page shown (0 MONTAGGIO, 1 COTTURA) and the camera between them (0..1) */
  page = 0;
  pageAt = 0;
  private want: 'counter' | 'kitchen' = 'counter';
  private tween: Phaser.Tweens.Tween | null = null;
  private pageTween: Phaser.Tweens.Tween | null = null;
  private placed: unknown = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly viewport: ViewportInfo,
    readonly calm: () => boolean,
  ) {
    // floating texts stay on screen: in counter px at the counter, in world px of the shown page in the kitchen
    this.fx = new Fx(scene, calm, (box) => (box === this.counter.top ? this.counter.frame?.view : undefined) ?? this.pageView);
    this.counter = new CounterView(scene);
    this.station = new StationView(scene);
    this.cook = new CookView(scene, this.station.cookLayer, this.station.barLayer);
    this.stack = new StackView(scene, this.station.stackLayer, this.fx, () => this.station.trashMouth);
    this.guide = new Guide(scene);
    this.framing = computeFraming(viewport);
    this.layout();
  }

  /** Canvas size / insets changed: frame again, redraw the brand textures at the new density, place both views. */
  layout(): void {
    const cam = this.scene.cameras.main;
    cam.setSize(this.scene.scale.width, this.scene.scale.height);
    const f = computeFraming(this.viewport);
    this.framing = f;
    cam.setZoom(f.zoom);
    ensureBrandTextures(this.scene, Math.max(f.zoom * MONTAGGIO.scale, f.counter.zoom));
    if (this.page >= f.pages.length) this.page = this.pageAt = 0;
    this.counter.layout(f.counter);
    this.station.setFraming(f);
    this.relayoutKitchen(true);
    this.placeCamera();
  }

  /** The order's bins changed (or the framing): stations, burger base and cook slots follow. */
  private relayoutKitchen(force = false): void {
    const l = this.station.layout;
    if (!l || (l === this.placed && !force)) return;
    this.placed = l;
    this.cook.setLayout(l);
    this.stack.setBase(l.stackBase);
  }

  /** Camera y offset of the kitchen page between pages (pageAt). */
  private get pageDy(): number {
    const p = this.framing.pages;
    return p.length > 1 ? p[0] + (p[1] - p[0]) * this.pageAt : 0;
  }

  /** The world rect of the kitchen page on screen (kitchen px). */
  get pageView(): Rect {
    const v = this.framing.view;
    return { ...v, y: v.y + this.pageDy };
  }

  private placeCamera(): void {
    const f = this.framing;
    const v = f.view;
    this.scene.cameras.main.centerOn(v.x + v.w / 2 + this.slide * kitchenOffset(f), v.y + v.h / 2 + this.slide * this.pageDy);
  }

  /** Slides the camera to a view (instant = no animation: restart, reduced motion). */
  show(view: 'counter' | 'kitchen', instant = false): void {
    if (view === this.want && !instant) return;
    this.want = view;
    const to = view === 'kitchen' ? 1 : 0;
    this.tween?.stop();
    this.tween = null;
    if (instant || this.calm()) {
      this.slide = to;
      this.placeCamera();
      return;
    }
    this.tween = this.scene.tweens.add({
      targets: this,
      slide: to,
      duration: KITCHEN_TIMING.cameraMs,
      ease: 'Cubic.easeInOut',
      onUpdate: () => this.placeCamera(),
      onComplete: () => {
        this.tween = null;
      },
    });
  }

  /** The kitchen is paged (one half on screen at a time). */
  get paged(): boolean {
    return this.framing.pages.length > 1;
  }

  /** Paged kitchen: shows page `p` (0 MONTAGGIO, 1 COTTURA). */
  showPage(p: number, instant = false): void {
    if (!this.paged || (p === this.page && !instant)) return;
    this.page = p;
    this.pageTween?.stop();
    this.pageTween = null;
    if (instant || this.calm()) {
      this.pageAt = p;
      this.placeCamera();
      return;
    }
    this.pageTween = this.scene.tweens.add({
      targets: this,
      pageAt: p,
      duration: PAGER.slideMs,
      ease: 'Cubic.easeInOut',
      onUpdate: () => this.placeCamera(),
      onComplete: () => {
        this.pageTween = null;
      },
    });
  }

  /** The page a kitchen target is on (0 when the kitchen is not paged). */
  pageOfTarget(t: KitchenTarget): number {
    const l = this.station.layout;
    const r = l && targetRect(l, t, this.stack.topY);
    return r && this.paged ? pageOf(this.framing.plan, r.y + r.h / 2) : this.page;
  }

  /** A point of the kitchen (local px) is on the shown page's tab. */
  onTab(p: Point): boolean {
    const pages = this.paged ? this.framing.plan.pages : null;
    return !!pages && inRect(pages[this.page].tab, p.x, p.y);
  }

  /** The kitchen is on screen and still enough for taps. */
  get kitchenReady(): boolean {
    return this.want === 'kitchen' && this.slide >= KITCHEN_VIEW.tapSlide && (!this.paged || Math.abs(this.pageAt - this.page) < 1 - KITCHEN_VIEW.tapSlide);
  }

  get counterReady(): boolean {
    return this.want === 'counter' && this.slide <= 1 - KITCHEN_VIEW.tapSlide;
  }

  /** A tap on the game host (CSS px) in the coordinates of the view (and page) the camera is going to. */
  toLocal(cssX: number, cssY: number): Point {
    const p = toWorld(this.framing, cssX, cssY);
    const kitchen = this.want === 'kitchen';
    const dy = kitchen && this.paged ? this.framing.pages[this.page] : 0;
    return { x: p.x + (this.slide - (kitchen ? 1 : 0)) * kitchenOffset(this.framing), y: p.y + dy };
  }

  /** Top of the customer's head in CSS px of the game host (the bubble's anchor). */
  headCss(): Point {
    const h = this.counter.world(this.counter.head);
    const p = toCss(this.framing, h.x - this.slide * kitchenOffset(this.framing), h.y - this.slide * this.pageDy);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  /** Draws one frame of the shift. */
  sync(snap: KitchenSnapshot, timeMs: number): void {
    this.station.setOrder(snap.order);
    this.relayoutKitchen();
    this.counter.sync(snap, timeMs);
    this.cook.sync(snap.griddle, snap.fryer);
    this.stack.sync(snap.stack, snap.tray.burger === null && snap.order !== null);
    this.station.syncTray(snap.tray);
    this.station.tabs.sync(this.pageAt, snap.griddle, snap.fryer, timeMs);
    this.station.showPage(this.pageAt);
    this.station.drawUrgent(snap.view === 'kitchen' ? snap.patience : null, timeMs, this.calm(), this.pageDy);
  }

  /** World rect of a guide target, in the view it belongs to (null: nothing to show now); a target on
   * the other page of a paged kitchen = the tab that leads there. */
  targetWorld(t: KitchenTarget, actionCss: Rect | null): Rect | null {
    const f = this.framing;
    if (t.kind === 'action') {
      if (!actionCss) return null;
      const a = toWorld(f, actionCss.x, actionCss.y);
      const b = toWorld(f, actionCss.x + actionCss.w, actionCss.y + actionCss.h);
      const dx = this.slide * kitchenOffset(f);
      return { x: a.x + dx, y: a.y + this.slide * this.pageDy, w: b.x - a.x, h: b.y - a.y };
    }
    const l = this.station.layout;
    const pages = f.plan.pages;
    if (pages && this.paged && this.pageOfTarget(t) !== this.page) return { ...pages[this.page].tab, x: pages[this.page].tab.x + kitchenOffset(f) };
    // a drink: its can (the pulse rings it, the hand points at it from beside)
    const can = t.kind === 'drink' ? l?.drinks.find((d) => d.id === t.id)?.at : undefined;
    const r = can ? { x: can.x - DRINK_CAN.w / 2, y: can.y - DRINK_CAN.h, ...DRINK_CAN } : l && targetRect(l, t, this.stack.topY);
    return r ? { ...r, x: r.x + kitchenOffset(f) } : null;
  }

  /** World x of the kitchen view's right edge (the guide's hand stays left of it). */
  get kitchenRight(): number {
    const v = this.framing.view;
    return kitchenOffset(this.framing) + v.x + v.w;
  }

  /** New shift: nothing in flight, the camera on the counter. */
  reset(): void {
    this.fx.clear();
    this.cook.clear();
    this.stack.clear();
    this.station.clear();
    this.guide.hide();
    this.counter.gold = false;
    this.counter.flashBulbs(false);
    this.show('counter', true);
    this.showPage(0, true);
  }
}
