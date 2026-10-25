/**
 * Everything level 7 draws, framed by one camera: the BANCONE at the world origin and the CUCINA one
 * screen to its right, MONTAGGIO then COTTURA. The camera glides between the stops (the counter, page 0,
 * page 1: each edge of the screen's world rect in a straight line, so the zoom changes with it; a cut with
 * reduced motion). Both views fill the whole canvas with their room / worktop art, so a glide never shows a
 * gap. The hi-res brand textures are drawn here at the density of the screen.
 */
import type Phaser from 'phaser';
import type { ViewportInfo } from '../../contracts';
import { KITCHEN_TIMING } from '../../config/kitchen';
import { ensureBrandTextures } from './brand';
import { KITCHEN_VIEW, PAGER } from './config';
import { CookView } from './cookView';
import { CounterView } from './counterView';
import { computeFraming, inRect, kitchenOffset, lerpRect, pageToWorld, toWorld, type KitchenFraming, type Point, type Rect } from './framing';
import { Fx } from './fx';
import { Guide } from './guide';
import { targetRect } from './layout';
import type { KitchenSnapshot, KitchenTarget } from './logic/types';
import { pageOfX } from './plan';
import { StackView } from './stackView';
import { StationView } from './stationView';


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
  /** the kitchen page wanted (0 MONTAGGIO, 1 COTTURA) and the camera between the pages (0..1) */
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
    // floating texts stay on screen: in counter px at the counter, in kitchen px of the screen in the kitchen
    this.fx = new Fx(scene, calm, (box) => (box === this.counter.top ? this.counter.frame?.view : undefined) ?? this.pageView);
    this.counter = new CounterView(scene);
    this.station = new StationView(scene);
    this.cook = new CookView(scene, this.station.cookLayer, this.station.barLayer, this.fx, calm);
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
    ensureBrandTextures(this.scene, Math.max(Math.max(...f.pages.map((p) => p.zoom)) * f.plan.art.stack, f.counter.zoom));
    if (!this.paged) this.page = this.pageAt = 0;
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
    this.stack.setBase(l);
  }

  /** The kitchen page between the pages (pageAt), kitchen px. */
  private get kitchenRect(): Rect {
    const p = this.framing.pages;
    return p.length > 1 ? lerpRect(p[0].view, p[1].view, this.pageAt) : p[0].view;
  }

  /** The world rect on screen now. */
  private get camRect(): Rect {
    const k = this.kitchenRect;
    return lerpRect(this.framing.view, { ...k, x: k.x + kitchenOffset(this.framing) }, this.slide);
  }

  /** The kitchen rect on screen now (kitchen px). */
  get pageView(): Rect {
    const r = this.camRect;
    return { ...r, x: r.x - kitchenOffset(this.framing) };
  }

  private placeCamera(): void {
    const r = this.camRect;
    const cam = this.scene.cameras.main;
    cam.setZoom(this.scene.scale.width / r.w);
    cam.centerOn(r.x + r.w / 2, r.y + r.h / 2);
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

  /** The kitchen shows one page at a time. */
  get paged(): boolean {
    return this.framing.pages.length > 1;
  }

  /** Shows page `p` (0 MONTAGGIO, 1 COTTURA) of a paged kitchen. */
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

  /** The page a kitchen target is on (the shown one when the kitchen is not paged). */
  pageOfTarget(t: KitchenTarget): number {
    const l = this.station.layout;
    const r = l && targetRect(l, t, this.stack.topY);
    return r && this.paged ? pageOfX(this.framing.plan, r.x + r.w / 2) : this.page;
  }

  /** A point of the kitchen (local px) is on the shown page's tab. */
  onTab(p: Point): boolean {
    return this.paged && inRect(this.framing.plan.pages[this.page].tab, p.x, p.y);
  }

  /** The kitchen is on screen and still enough for taps. */
  get kitchenReady(): boolean {
    return this.want === 'kitchen' && this.slide >= KITCHEN_VIEW.tapSlide && (!this.paged || Math.abs(this.pageAt - this.page) < 1 - KITCHEN_VIEW.tapSlide);
  }

  get counterReady(): boolean {
    return this.want === 'counter' && this.slide <= 1 - KITCHEN_VIEW.tapSlide;
  }

  /** A point on the game host (CSS px) in the px of the view (and page) the camera is going to. */
  toLocal(cssX: number, cssY: number): Point {
    const f = this.framing;
    return this.want === 'kitchen' ? pageToWorld(f, this.paged ? this.page : 0, cssX, cssY) : toWorld(f, cssX, cssY);
  }

  /** A world point -> CSS px on the game host, with the camera where it is now. */
  private cssOfWorld(x: number, y: number): Point {
    const r = this.camRect;
    const k = this.scene.scale.width / r.w / this.framing.dpr;
    return { x: (x - r.x) * k, y: (y - r.y) * k };
  }

  /** A kitchen point (local px) -> CSS px on the game host, with its page on screen (scripted taps). */
  kitchenCss(x: number, y: number): Point {
    const f = this.framing;
    const g = f.pages[this.paged ? this.page : 0];
    return { x: ((x - g.view.x) * g.zoom) / f.dpr, y: ((y - g.view.y) * g.zoom) / f.dpr };
  }

  /** Top of the customer's head in CSS px of the game host (the bubble's anchor). */
  headCss(): Point {
    const h = this.counter.world(this.counter.head);
    const p = this.cssOfWorld(h.x, h.y);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  }

  /** Draws one frame of the shift. */
  sync(snap: KitchenSnapshot, timeMs: number): void {
    this.station.setOrder(snap.order);
    this.relayoutKitchen();
    this.counter.sync(snap, timeMs);
    this.cook.sync(snap.griddle, snap.fryer, timeMs);
    this.stack.sync(snap.stack, snap.tray.burger === null && snap.order !== null);
    this.station.syncTray(snap.tray);
    this.station.tabs.sync(this.pageAt, snap.griddle, snap.fryer, timeMs, this.otherNeeds(snap));
    this.station.showPage(this.pageAt);
    this.station.drawUrgent(snap.view === 'kitchen' ? snap.patience : null, timeMs, this.calm(), this.pageView);
  }

  /** Something on the page not shown needs the player: a cook ready to flip / take / lift or burning, or the next step. */
  private otherNeeds(s: KitchenSnapshot): boolean {
    if (!this.paged || s.view !== 'kitchen') return false;
    const cookCalls = [...s.griddle, ...s.fryer].some((v) => v !== null && v.phase !== 'raw');
    if (this.page === 0 && cookCalls) return true;
    return !!s.guide && !s.guide.wait && this.pageOfTarget(s.guide.target) !== this.page;
  }

  /** World rect of a guide target, in the view it belongs to (null: nothing to show now); a target on
   * the other page of a paged kitchen = the tab that leads there. */
  targetWorld(t: KitchenTarget, actionCss: Rect | null): Rect | null {
    const f = this.framing;
    const off = kitchenOffset(f);
    if (t.kind === 'action') {
      if (!actionCss) return null;
      const r = this.camRect;
      const k = r.w / this.scene.scale.width * f.dpr;
      return { x: r.x + actionCss.x * k, y: r.y + actionCss.y * k, w: actionCss.w * k, h: actionCss.h * k };
    }
    const l = this.station.layout;
    if (this.paged && this.pageOfTarget(t) !== this.page) {
      const tab = f.plan.pages[this.page].tab;
      return { ...tab, x: tab.x + off };
    }
    // a pan or a drink: its whole place, contents and label (the hand lies on it beside its middle)
    const r = l && targetRect(l, t, this.stack.topY);
    return r ? { ...r, x: r.x + off } : null;
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
