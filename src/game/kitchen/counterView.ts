/**
 * BANCONE, the counter view of level 7, as in the owner's photo of Ciccio's Sperlinga seen from
 * behind the steel counter (ref/level7_pov_order.png; the room, counter, beam, neon and sign:
 * counterDecor.ts). The customer walks in from the edge of the screen (no fading ghost), stops at
 * the counter, orders (talk frames while the bubble types), tastes and walks out the other side.
 * Drawn in counter px in its own container, scaled so the room fills the screen (counterFrame.ts
 * CounterFrame). During the service the tray (printed liner, hi-res parcel and paper boats) rests on
 * the counter (landscape: left of the customer, bigger) and the rating stars pop on its front; the till
 * shows the shift's takings; the plates and the straw cup of the photo stand on the counter at the right;
 * the price, the tip and the points stack in a column right of the customer, COMBO pops left of them. The
 * golden finale dims the room under the lit beam. Positions follow the shift's phase clock (no tweens), so
 * pause / skip / resize just work.
 */
import type Phaser from 'phaser';
import { CUSTOMERS, CUSTOMER_POSE, DRINKS, KITCHEN, STARTERS, TRAY, type CustomerId } from '../../art/kitchen/keys';
import { KITCHEN_TIMING } from '../../config/kitchen';
import { euro } from '../../config/kitchenMenu';
import { BRAND, BRAND_LINER_AT, brandScale } from './brand';
import { COUNTER_VIEW, KITCHEN_COLORS, KITCHEN_VIEW } from './config';
import { CounterDecor } from './counterDecor';
import { showHiRes } from './hiRes';
import { labelTexture } from './labels';
import type { CounterFrame } from './counterFrame';
import type { Point } from './framing';
import type { KitchenSnapshot, TrayView } from './logic/types';

const C = COUNTER_VIEW;
const STAR_COUNT = 5;
const STAR_POP_MS = 160;
/** half the star's art (16 px) */
const STAR_HALF = 8;
const NEON_FLICKER_EVERY_MS = 3700;
const NEON_FLICKER_MS = 90;
/** cap height of the pixel font (labels.ts) */
const FONT_PX = 5;
const easeOut = (u: number): number => 1 - (1 - u) * (1 - u);
const easeIn = (u: number): number => u * u;
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
/** Back.easeOut for the star pop */
const back = (u: number): number => 1 + 2.7 * (u - 1) ** 3 + 1.7 * (u - 1) ** 2;
type Part = 'burger' | 'cone' | 'side' | 'drink';

export class CounterView {
  readonly root: Phaser.GameObjects.Container;
  /** flights and floating texts of the counter */
  readonly top: Phaser.GameObjects.Container;
  private readonly decor: CounterDecor;
  private readonly customer: Phaser.GameObjects.Sprite;
  /** golden finale: dims the room and the customer, not the beam and the counter (neon and disc hide) */
  readonly shade: Phaser.GameObjects.Rectangle;
  /** golden finale: the rays, over the dimmed room, behind the counter */
  readonly behind: Phaser.GameObjects.Container;
  private readonly register: Phaser.GameObjects.Image;
  /** the plates and the straw cup of the photo, on the counter at the right */
  private readonly props: Phaser.GameObjects.Image;
  /** the till's display: the shift's takings */
  private readonly display: Phaser.GameObjects.Image;
  private displayCents = -1;
  private readonly tray: Phaser.GameObjects.Container;
  private readonly liner: Phaser.GameObjects.Image;
  private readonly trayItems: Record<Part, Phaser.GameObjects.Sprite>;
  private readonly stars: Phaser.GameObjects.Sprite[] = [];
  private f: CounterFrame | null = null;
  /** landscape: where the served tray rests left of the customer (counter px) and its scale; null: in front of them */
  private trayLeft: { x: number; k: number } | null = null;
  /** golden finale: bulbs flash, the wall disc gives way to the big gold face */
  gold = false;

  constructor(private readonly scene: Phaser.Scene) {
    const add = scene.add;
    this.root = add.container(0, 0);
    this.decor = new CounterDecor(scene);
    this.customer = add.sprite(0, 0, KITCHEN.customer, 0).setOrigin(0.5, 1).setVisible(false);
    this.shade = add.rectangle(0, 0, 8, 8, 0x0a0806).setOrigin(0, 0).setAlpha(0);
    this.behind = add.container(0, 0);
    this.register = add.image(0, 0, KITCHEN.register).setOrigin(0.5, 1);
    this.display = add.image(0, 0, KITCHEN.register).setOrigin(1, 1).setVisible(false);
    this.props = add.image(0, 0, KITCHEN.counterProps).setOrigin(0, 1);
    const trayImg = add.image(0, 0, KITCHEN.tray).setOrigin(0, 0);
    this.liner = add.image(BRAND_LINER_AT.x, BRAND_LINER_AT.y, KITCHEN.tray).setOrigin(0, 0).setVisible(false);
    // the station's name plate is a kitchen label: at the counter the tray's front face is plain (its
    // rows painted over it in the colours of a plain column; no frame added: the image's default frame stays)
    const P = C.trayPlate;
    const plain = add.graphics();
    for (let y = P.y; y < P.y + P.h; y++) {
      const c = scene.textures.getPixel(P.plainX, y, KITCHEN.tray);
      if (c) plain.fillStyle(c.color, c.alphaGL).fillRect(P.x, y, P.w, 1);
    }
    const item = (key: string, p: Point, frame: number): Phaser.GameObjects.Sprite => add.sprite(p.x, p.y, key, frame).setOrigin(0.5, 1);
    this.trayItems = {
      burger: item(KITCHEN.wrap, TRAY.burger, 3),
      cone: item(KITCHEN.cone, TRAY.cone, 1),
      side: item(KITCHEN.starterBox, TRAY.side, 0),
      drink: item(KITCHEN.drink, TRAY.drink, 0),
    };
    this.tray = add.container(0, 0, [trayImg, this.liner, plain, ...Object.values(this.trayItems)]).setVisible(false);
    for (let i = 0; i < STAR_COUNT; i++) this.stars.push(add.sprite(0, 0, KITCHEN.star, 0).setVisible(false));
    this.top = add.container(0, 0);
    this.root.add([
      this.decor.fill, this.decor.ceil, this.decor.room, this.decor.disc, this.customer, this.shade, this.behind, ...this.decor.front,
      this.decor.sign, this.register, this.display, this.props, this.tray, ...this.stars, this.top,
    ]);
  }

  private get topY(): number {
    const s = this.f?.stage;
    return s ? s.y + s.h - C.topH : 0;
  }

  /** The counter's frame (counter px; the golden finale lays itself out in it). */
  get frame(): CounterFrame | null {
    return this.f;
  }

  /** Counter px -> world px (bursts of the scene's emitter). */
  world(p: Point): Point {
    const k = this.f?.scale ?? 1;
    return { x: p.x * k, y: p.y * k };
  }

  /** The till's display: 2x when 1x would be smaller than tillDisplayMinCssPx. */
  private get displayScale(): 1 | 2 {
    const f = this.f;
    return f && (FONT_PX * f.zoom) / f.dpr >= C.tillDisplayMinCssPx ? 1 : 2;
  }

  layout(f: CounterFrame): void {
    this.f = f;
    this.root.setScale(f.scale);
    const v = f.view;
    const pad = KITCHEN_VIEW.pad;
    this.decor.layout(f, this.spot.y - this.customer.height + C.headTopPx);
    this.shade.setPosition(v.x - pad, v.y - pad).setSize(v.w + 2 * pad, v.h + 2 * pad);
    const top = this.topY;
    // right of the customer, clear of a raised hand; inside the free area
    const till = Math.min(this.spot.x + C.tillFromCustomer, f.free.x + f.free.w - this.register.width / 2 - 2);
    this.register.setPosition(Math.round(till), top + C.registerSinkPx);
    const right = Math.min(this.register.x + this.register.width / 2, v.x + v.w - 1);
    this.display.setPosition(Math.floor(right), this.register.y - this.register.height + C.tillDisplayDy).setScale(this.displayScale);
    this.placeProps();
    // landscape: the served tray left of the customer (the ticket column is empty while serving), as big as that room
    // allows in quarter steps, never over the body
    const L = C.trayLeft;
    const edge = this.spot.x - C.bodyHalfW - L.gapPx;
    const k = Math.min(L.maxScale, Math.floor(((edge - v.x - 2) / TRAY.w) * 4) / 4);
    this.trayLeft = f.orient === 'landscape' && k >= 1 ? { x: Math.round(edge - TRAY.w * k), k } : null;
    this.tray.setScale(this.trayLeft?.k ?? 1);
    // the hi-res liner and packaging at the new density
    const linerOn = this.scene.textures.exists(BRAND.liner);
    this.liner.setVisible(linerOn);
    if (linerOn) this.liner.setTexture(BRAND.liner).setScale(brandScale(this.scene, 'liner'));
    showHiRes(this.trayItems.burger, KITCHEN.wrap, 3, 1);
    showHiRes(this.trayItems.cone, KITCHEN.cone, 1, 1);
    showHiRes(this.trayItems.side, KITCHEN.starterBox, Number(this.trayItems.side.frame.name), 1);
  }

  /**
   * The plates and the straw cup (the photo's bottom right): nearer the player under the till, against the screen's
   * right edge, when the counter shows that much (portrait); else right of the till, their base just under the
   * screen's bottom, cut by the screen's edge like the photo's cup (at least `minShow` px of them on screen).
   */
  private placeProps(): void {
    const v = this.f?.view ?? { x: 0, y: 0, w: 0, h: 0 };
    const P = C.props;
    const p = this.props;
    const right = v.x + v.w;
    const bottom = v.y + v.h + P.cutPx;
    const under = this.register.y + P.gapPx + p.height;
    if (under <= bottom) {
      p.setPosition(Math.round(right - p.width - P.gapPx), Math.round(under));
      return;
    }
    const left = Math.min(this.register.x + this.register.width / 2 + P.gapPx, right - P.minShow);
    p.setPosition(Math.round(left), Math.round(Math.min(this.topY + C.topH, bottom)));
  }

  /** Where the customer stands at the counter (centre x, feet y). */
  private get spot(): Point {
    const s = this.f?.stage ?? { x: 0, y: 0, w: 0, h: 0 };
    return { x: Math.round(s.x + s.w / 2), y: this.topY + C.customerSink };
  }

  /** Top of the customer's head (the bubble's tail points here), counter px. */
  get head(): Point {
    return { x: this.customer.x, y: this.customer.y - this.customer.height + C.headTopPx };
  }

  /** Scale (2, else 1) at which a floating text this many px wide at 1x fits the room between the
   * customer's body and the screen's edge on that side. */
  private fit(side: 'left' | 'right', w: number): 1 | 2 {
    const v = this.f?.view ?? { x: 0, w: 0 };
    const at = this.spot.x;
    const room = side === 'right' ? v.x + v.w - 2 - (at + C.bodyHalfW) : at - C.bodyHalfW - (v.x + 2);
    return room >= 2 * w ? 2 : 1;
  }

  /**
   * The column of price, tip and points (right-aligned rows of `w` px at 1x): its bottom right over the
   * till's display, clear of the customer's body, inside the screen; and its scale.
   */
  money(w: number): { at: Point; scale: 1 | 2 } {
    const v = this.f?.view ?? { x: 0, w: 0 };
    const scale = this.fit('right', w);
    const right = Math.min(v.x + v.w - 2, this.register.x + this.register.width / 2 + C.moneyReachPx);
    const x = Math.max(right, this.spot.x + C.bodyHalfW + scale * w + 2);
    const over = this.trayLeft ? Infinity : this.tray.y;
    return { at: { x: Math.min(v.x + v.w - 2, x), y: Math.min(this.display.y - this.display.displayHeight, over) - 4 }, scale };
  }

  /** Where COMBO pops (a plate `w` px wide at 1x) and its scale: left of the customer, over the counter. */
  combo(w: number): { at: Point; scale: 1 | 2 } {
    const v = this.f?.view ?? { x: 0, w: 0 };
    const scale = this.fit('left', w);
    const x = Math.max(v.x + 2 + (scale * w) / 2, Math.min((v.x + this.spot.x - C.bodyHalfW) / 2, this.spot.x - C.bodyHalfW - (scale * w) / 2 - 2));
    const y = this.trayLeft ? Math.min(this.topY - C.comboLiftPx, this.trayRestY - C.trayLeft.comboGapPx * scale) : this.topY - C.comboLiftPx;
    return { at: { x, y }, scale };
  }

  /** Middle of the room between the beam and the counter (the end-of-shift banner: nobody at the counter). */
  get roomCentre(): Point {
    const s = this.f?.stage ?? { x: 0, y: 0, w: 0, h: 0 };
    const free = this.f?.free ?? s;
    const beam = (this.f?.view.y ?? s.y) + C.beamH;
    return { x: s.x + s.w / 2, y: Math.round((Math.max(free.y, beam) + this.topY) / 2) };
  }

  /** Centre of the tray on the counter. */
  get trayCentre(): Point {
    const k = this.tray.scaleX;
    return { x: this.tray.x + (TRAY.w * k) / 2, y: this.tray.y + (TRAY.h * k) / 2 };
  }

  /** The served tray's top at rest: its bottom on the counter top (counter px). */
  private get trayRestY(): number {
    return this.topY + C.trayDy + 14 - TRAY.h * (this.trayLeft?.k ?? 1);
  }

  private pose(snap: KitchenSnapshot): number {
    const r = snap.result;
    if (r?.kind === 'angry') return CUSTOMER_POSE.angry;
    if (r && (snap.phase === 'reaction' || snap.phase === 'walkOut')) {
      if (r.mood === 'happy') return CUSTOMER_POSE.happy;
      if (r.mood === 'angry') return CUSTOMER_POSE.angry;
    }
    const text = snap.say?.text ?? '';
    const talking = snap.say !== null && snap.phaseMs < text.length * C.talkCharMs;
    return talking && Math.floor(snap.phaseMs / C.talkFlipMs) % 2 === 0 ? CUSTOMER_POSE.talk : CUSTOMER_POSE.idle;
  }

  /** Customer, tray and stars for this moment of the shift; `timeMs` drives the neon. */
  sync(snap: KitchenSnapshot, timeMs: number): void {
    this.syncCustomer(snap.customer, snap);
    this.syncTray(snap);
    this.syncStars(snap);
    this.syncDisplay(snap);
    this.decor.setNeon(this.gold || timeMs % NEON_FLICKER_EVERY_MS < NEON_FLICKER_MS);
  }

  /** The lights of the beam: flash = frame 1 (golden finale; the wall disc hides meanwhile). */
  flashBulbs(on: boolean): void {
    this.decor.setGold(this.gold, on);
  }

  private syncCustomer(id: CustomerId | null, snap: KitchenSnapshot): void {
    const c = this.customer;
    if (!id || snap.phase === 'finished') {
      c.setVisible(false);
      return;
    }
    // in from the left edge of the screen (the free area's), out past the right one: always solid
    const at = this.spot;
    const v = this.f?.view ?? { x: 0, w: 0 };
    const left = Math.max(v.x, this.f?.free.x ?? v.x) - c.width / 2;
    const right = v.x + v.w + c.width / 2;
    let x = at.x;
    let bob = 0;
    if (snap.phase === 'walkIn') {
      const u = clamp01(snap.phaseMs / KITCHEN_TIMING.walkInMs);
      x = left + (at.x - left) * easeOut(u);
      bob = u < 1 ? Math.abs(Math.sin((snap.phaseMs / C.walkStepMs) * Math.PI)) * C.walkBobPx : 0;
    } else if (snap.phase === 'walkOut') {
      const u = clamp01(snap.phaseMs / KITCHEN_TIMING.walkOutMs);
      x = at.x + (right - at.x) * easeIn(u);
      bob = Math.abs(Math.sin((snap.phaseMs / C.walkStepMs) * Math.PI)) * C.walkBobPx;
    }
    c.setVisible(true).setAlpha(1).setPosition(Math.round(x), Math.round(at.y - bob));
    c.setFrame(CUSTOMERS.indexOf(id) * CUSTOMER_POSE.count + this.pose(snap));
  }

  private syncTray(snap: KitchenSnapshot): void {
    const p = snap.phase;
    const on = (p === 'serving' || p === 'reaction' || p === 'walkOut') && snap.tray.burger !== null && snap.result?.kind !== 'angry';
    this.tray.setVisible(on);
    if (!on) return;
    const at = this.spot;
    const restY = this.trayRestY;
    // it rises from under the counter while served; at the walk-out Ciccio clears it first (opaque:
    // the customer walking off behind it never shows through)
    const u = p === 'serving' ? easeOut(clamp01(snap.phaseMs / C.trayRiseMs)) : p === 'walkOut' ? 1 - easeIn(clamp01(snap.phaseMs / C.trayClearMs)) : 1;
    const low = (this.f?.view.y ?? 0) + (this.f?.view.h ?? 0);
    // in front of the customer, left of the till (a narrow screen: shifted left, the till's display stays readable)
    const x = this.trayLeft?.x ?? Math.min(at.x - TRAY.w / 2, this.register.x - this.register.width / 2 - TRAY.w - 2);
    this.tray.setVisible(u > 0).setPosition(Math.round(Math.max((this.f?.view.x ?? 0) + 1, x)), Math.round(low + (restY - low) * u));
    this.fillTray(snap.tray);
  }

  private syncDisplay(snap: KitchenSnapshot): void {
    const cents = snap.takingsCents;
    this.display.setVisible(snap.phase !== 'finished');
    if (cents === this.displayCents) return;
    this.displayCents = cents;
    this.display.setTexture(labelTexture(this.scene, [euro(cents)], 'tape', KITCHEN_COLORS.text.green));
  }

  private fillTray(t: TrayView): void {
    const it = this.trayItems;
    it.burger.setVisible(t.burger !== null);
    it.cone.setVisible(t.cone !== null);
    it.side.setVisible(t.side !== null);
    if (t.side) showHiRes(it.side, KITCHEN.starterBox, STARTERS.indexOf(t.side.id), 1);
    it.drink.setVisible(t.drink !== null);
    if (t.drink) it.drink.setFrame(DRINKS.indexOf(t.drink));
  }

  private syncStars(snap: KitchenSnapshot): void {
    const r = snap.result;
    const show = r?.kind === 'rated' && (snap.phase === 'reaction' || snap.phase === 'walkOut');
    const at = this.spot;
    // on the counter front under the tray; on a strip of counter top, up on the tray's front
    const v = this.f?.view;
    const y = this.topY + Math.min(C.starDy, v ? v.y + v.h - this.topY - STAR_HALF - 1 : C.starDy);
    this.stars.forEach((st, i) => {
      if (!show || r?.kind !== 'rated') {
        st.setVisible(false);
        return;
      }
      const t = snap.phase === 'walkOut' ? 1e9 : snap.phaseMs - i * C.starEveryMs;
      st.setVisible(t >= 0);
      st.setFrame(i < r.stars ? 1 : 0);
      st.setPosition(at.x + (i - (STAR_COUNT - 1) / 2) * C.starGap, y);
      st.setScale(t >= 0 ? Math.max(0.2, back(clamp01(t / STAR_POP_MS))) : 0);
      st.setAlpha(snap.phase === 'walkOut' ? clamp01(1 - snap.phaseMs / KITCHEN_TIMING.walkOutMs) : 1);
    });
  }
}
