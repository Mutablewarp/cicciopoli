/**
 * CUCINA, the kitchen view of level 7 (static part): the brushed-steel worktop and the tiled wall; on
 * MONTAGGIO the steel panel of big pans (each with its label tape; the sauce bottles stand in theirs, CHIUDI
 * is the pan of brioche tops; every place this order does not use holds a decoy, a free bottle place a cold pan)
 * round the wooden board with the paper, the trash, the tray with its printed
 * liner and what stands on it (the hi-res kraft parcel and red boats); on COTTURA the big griddle with its
 * heat shimmer and the fryer with bubbling oil at the manifest sizes, their raw pans, the drinks racks. Every
 * station casts a soft shadow. A paged kitchen covers the page the camera leaves with plain worktop. The
 * cooking items, the burger, the touch feedback and the guide have their own views in the same container.
 * Rebuilt per order (the pans change) and on rotation.
 */
import Phaser from 'phaser';
import { BIN, DRINKS, FRYER, GRIDDLE, INGREDIENTS, KITCHEN, KITCHEN_ANIMS, SAUCES, SHEET_SPEC, SIDES, STARTERS, type SideId } from '../../art/kitchen/keys';
import { BRAND, BRAND_LINER_AT, brandScale } from './brand';
import { KITCHEN_COLORS, KITCHEN_FX, KITCHEN_VIEW, PAN } from './config';
import { kitchenOffset, type KitchenFraming, type Point, type Rect } from './framing';
import { drawFurniture } from './furniture';
import { showHiRes } from './hiRes';
import { binLines, drinkLines, labelTexture } from './labels';
import { kitchenLayout, targetRect, type BinPlace, type KitchenLayout } from './layout';
import type { BinId, KitchenOrder, KitchenTarget, TrayPart, TrayView } from './logic/types';
import { PageTabs } from './pager';

const PAD = KITCHEN_VIEW.pad;
/** the shelf lip of the tiled wall lands on this world y (behind the top row of pans) */
const WALL_BOTTOM = 6;
const WALL_TILE_H = 48;
const TRASH_OPEN_MS = 380;
/** the trash's mouth (art px of its frame), where thrown things land */
const TRASH_MOUTH = { x: 13, y: 8 } as const;
const SAUCE_H = SHEET_SPEC[KITCHEN.sauce][1];
const isSide = (id: BinId): id is SideId => (SIDES as readonly string[]).includes(id);
/** what each tray place shows: its pixel key and frame (the hi-res stand-in is picked when shown) */
const TRAY_ART: Readonly<Record<TrayPart, { key: string; frame: number }>> = {
  burger: { key: KITCHEN.wrap, frame: 3 },
  cone: { key: KITCHEN.cone, frame: 1 },
  side: { key: KITCHEN.starterBox, frame: 0 },
  drink: { key: KITCHEN.drink, frame: 0 },
};

/** A pan / bottle / can place drawn: its container (centred on the place: it squashes and wiggles), what is in it. */
export interface PlaceView {
  readonly g: Phaser.GameObjects.Container;
  /** the contents (fill, brioche, bottle, can): what lifts when pressed */
  readonly item: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readonly scale: number;
}

export class StationView {
  readonly root: Phaser.GameObjects.Container;
  /** layers above the static stations, in draw order */
  readonly cookLayer: Phaser.GameObjects.Container;
  readonly stackLayer: Phaser.GameObjects.Container;
  readonly barLayer: Phaser.GameObjects.Container;
  readonly top: Phaser.GameObjects.Container;
  readonly tabs: PageTabs;
  private readonly worktop: Phaser.GameObjects.TileSprite;
  private readonly wall: Phaser.GameObjects.TileSprite;
  private readonly furniture: Phaser.GameObjects.Graphics;
  private readonly griddle: Phaser.GameObjects.Image;
  private readonly heat: Phaser.GameObjects.Sprite;
  private readonly fryer: Phaser.GameObjects.Image;
  private readonly oil: Phaser.GameObjects.Sprite[];
  private readonly trash: Phaser.GameObjects.Sprite;
  private readonly paper: Phaser.GameObjects.Image;
  private readonly trayImg: Phaser.GameObjects.Image;
  private readonly liner: Phaser.GameObjects.Image;
  private readonly shelves: Phaser.GameObjects.Image[];
  private readonly bins: Phaser.GameObjects.Container;
  private readonly trayItems: Record<TrayPart, Phaser.GameObjects.Sprite>;
  private readonly urgent: Phaser.GameObjects.Graphics;
  /** paged kitchen: plain worktop right of MONTAGGIO (0) / left of COTTURA (1), shown with that page */
  private readonly covers: Phaser.GameObjects.TileSprite[];
  /** what each bin / drink place draws (tap squash, lift, nope shake) */
  private readonly places = new Map<string, PlaceView>();
  /** tray places with something flying to them: hidden until it lands */
  private readonly held = new Set<TrayPart>();
  private trashTimer: Phaser.Time.TimerEvent | null = null;
  private f: KitchenFraming | null = null;
  private order: KitchenOrder | null = null;
  layout: KitchenLayout | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    const add = scene.add;
    this.root = add.container(0, 0);
    this.worktop = add.tileSprite(0, 0, 8, 8, KITCHEN.worktop).setOrigin(0, 0);
    this.wall = add.tileSprite(0, 0, 8, 8, KITCHEN.wallTiles).setOrigin(0, 0);
    this.furniture = add.graphics();
    this.griddle = add.image(0, 0, KITCHEN.griddle).setOrigin(0, 0).setDisplaySize(GRIDDLE.w, GRIDDLE.h);
    this.heat = add.sprite(0, 0, KITCHEN.griddleHeat, 0).setOrigin(0, 0).setAlpha(KITCHEN_FX.heatAlpha).setDisplaySize(GRIDDLE.surface.w, GRIDDLE.surface.h);
    this.fryer = add.image(0, 0, KITCHEN.fryer).setOrigin(0, 0).setDisplaySize(FRYER.w, FRYER.h);
    this.oil = FRYER.wells.map(() => add.sprite(0, 0, KITCHEN.fryOil, 0).setOrigin(0, 0).setDisplaySize(FRYER.well.w, FRYER.well.h));
    this.trash = add.sprite(0, 0, KITCHEN.trash, 0).setOrigin(0, 0);
    this.paper = add.image(0, 0, KITCHEN.paper).setOrigin(0, 0);
    this.trayImg = add.image(0, 0, KITCHEN.tray).setOrigin(0, 0);
    this.liner = add.image(0, 0, KITCHEN.tray).setOrigin(0, 0).setVisible(false);
    this.shelves = [0, 1].map(() => add.image(0, 0, KITCHEN.shelf).setOrigin(0, 0));
    this.bins = add.container(0, 0);
    const item = (p: TrayPart): Phaser.GameObjects.Sprite => add.sprite(0, 0, TRAY_ART[p].key, TRAY_ART[p].frame).setOrigin(0.5, 1).setVisible(false);
    this.trayItems = { burger: item('burger'), cone: item('cone'), side: item('side'), drink: item('drink') };
    this.cookLayer = add.container(0, 0);
    this.stackLayer = add.container(0, 0);
    this.barLayer = add.container(0, 0);
    this.urgent = add.graphics();
    this.covers = [0, 1].map(() => add.tileSprite(0, 0, 8, 8, KITCHEN.worktop).setOrigin(0, 0).setVisible(false));
    this.tabs = new PageTabs(scene);
    this.top = add.container(0, 0);
    this.root.add([
      this.worktop, this.wall, this.furniture, this.griddle, this.heat, this.fryer, ...this.oil, this.trash, this.paper, this.trayImg, this.liner,
      ...this.shelves, this.bins, ...Object.values(this.trayItems), this.cookLayer, this.stackLayer, this.barLayer, ...this.covers, this.tabs.root, this.urgent, this.top,
    ]);
    const play = (s: Phaser.GameObjects.Sprite, anim: string): void => {
      if (scene.anims.exists(anim)) s.play(anim);
    };
    play(this.heat, KITCHEN_ANIMS.heat[0]);
    this.oil.forEach((o, i) => {
      play(o, KITCHEN_ANIMS.oil[0]);
      o.anims.setProgress(i * 0.5);
    });
  }

  /** Framing changed (resize, rotation, new brand textures): everything is placed again. */
  setFraming(f: KitchenFraming): void {
    this.f = f;
    const v = f.backdrop;
    this.root.setPosition(kitchenOffset(f), 0);
    this.worktop.setPosition(v.x - PAD, v.y - PAD).setSize(v.w + 2 * PAD, v.h + 2 * PAD);
    // the tiles only along the top of the worktop, their shelf lip just behind the top row of pans
    const wallH = Math.max(0, WALL_BOTTOM - (v.y - PAD));
    const h = Math.min(WALL_TILE_H, wallH);
    this.wall.setPosition(v.x - PAD, WALL_BOTTOM - h).setSize(v.w + 2 * PAD, Math.max(1, h)).setVisible(wallH > 0);
    this.wall.tilePositionY = WALL_TILE_H - h;
    const paged = f.pages.length > 1;
    const [m, c] = f.plan.pages.map((p) => p.view);
    // the cut half way between the pages: each page's cover hides the other one's side
    const cut = (m.x + m.w + c.x) / 2;
    this.covers.forEach((cv, i) => {
      cv.setVisible(paged);
      const x0 = i === 0 ? cut : v.x - PAD;
      cv.setPosition(x0, v.y - PAD).setSize(i === 0 ? v.x + v.w + PAD - cut : cut - x0, v.h + 2 * PAD);
      cv.tilePositionX = x0 - (v.x - PAD);
    });
    this.tabs.setPlan(f.plan, paged);
    this.rebuild();
  }

  /** Paged kitchen: the camera between the pages (0..1); each page's cover fades with it. */
  showPage(at: number): void {
    this.covers[0].setAlpha(1 - at);
    this.covers[1].setAlpha(at);
  }

  /** A new order: its pans, sauces and drinks. */
  setOrder(o: KitchenOrder | null): void {
    if (o === this.order) return;
    this.order = o;
    this.rebuild();
  }

  private rebuild(): void {
    const f = this.f;
    const o = this.order;
    this.bins.removeAll(true);
    this.places.clear();
    if (!f) return;
    const empty = { griddle: [], fryer: [], cold: [], sauces: [], drinks: [] };
    const l = kitchenLayout(f.plan, o?.bins ?? empty);
    this.layout = l;
    const a = l.art;
    drawFurniture(this.furniture, l);
    this.griddle.setPosition(l.griddle.x, l.griddle.y);
    this.heat.setPosition(l.griddle.x + GRIDDLE.surface.x, l.griddle.y + GRIDDLE.surface.y);
    this.fryer.setPosition(l.fryer.x, l.fryer.y);
    this.oil.forEach((s, i) => s.setPosition(l.wells[i].x, l.wells[i].y));
    this.trash.setPosition(l.trash.x, l.trash.y).setScale(a.trash);
    this.paper.setPosition(l.paper.x, l.paper.y).setScale(a.paper);
    this.trayImg.setPosition(l.tray.x, l.tray.y).setScale(a.tray);
    this.placeLiner(l);
    this.shelves.forEach((s, i) => s.setPosition(l.shelves[i].x, l.shelves[i].y).setScale(l.shelfScale).setVisible(i < l.shelves.length));
    for (const [part, s] of Object.entries(this.trayItems) as [TrayPart, Phaser.GameObjects.Sprite][]) s.setPosition(l.trayAt[part].x, l.trayAt[part].y);
    this.refreshTray();
    for (const b of l.bins) this.places.set(b.id === 'bun' ? 'bun' : `bin:${b.id}`, this.pan(b));
    for (const d of l.drinks) {
      const k = d.can;
      const g = this.scene.add.container(d.at.x, d.at.y);
      const can = this.scene.add.sprite(0, 0, KITCHEN.drink, DRINKS.indexOf(d.id)).setOrigin(0.5, 1).setScale(k);
      g.add([can, this.tape(drinkLines(d.id), d.label.x - d.at.x, d.label.y - d.at.y, d.art.label)]);
      this.bins.add(g);
      this.places.set(`drink:${d.id}`, { g, item: can, scale: k });
    }
  }

  /** A pan / bottle / CHIUDI place: the pan, what is in it, its label tape. */
  private pan(b: BinPlace): PlaceView {
    const add = this.scene.add;
    const k = b.art.pan;
    const g = add.container(b.hit.x + b.hit.w / 2, b.hit.y + b.hit.h / 2);
    const lx = b.x - g.x;
    const ly = b.y - g.y;
    g.add(add.image(lx, ly, KITCHEN.bin).setOrigin(0, 0).setScale(k));
    const fx = lx + BIN.fillX * k;
    const fy = ly + BIN.fillY * k;
    let item: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    if (b.kind === 'bottle') {
      const frame = (SAUCES as readonly string[]).indexOf(b.id);
      item = add.sprite(lx + (BIN.w * k) / 2, ly + (PAN.bottleBottom - SAUCE_H) * k, KITCHEN.sauce, frame).setOrigin(0.5, 0).setScale(k);
    } else if (b.id === 'bun') item = add.image(fx, fy, KITCHEN.binBun).setOrigin(0, 0).setScale(k);
    else item = this.contents(b.id, fx, fy).setScale(k);
    g.add([item, this.tape(binLines(b.id), b.label.x - g.x, b.label.y - g.y, b.art.label)]);
    this.bins.add(g);
    return { g, item, scale: k };
  }

  /** What a pan holds (fries / starter or an ingredient), its top-left at (x, y). */
  private contents(id: BinId, x: number, y: number): Phaser.GameObjects.Sprite {
    const add = this.scene.add;
    return isSide(id) ? add.sprite(x, y, KITCHEN.binSide, SIDES.indexOf(id)).setOrigin(0, 0) : add.sprite(x, y, KITCHEN.binFill, INGREDIENTS.indexOf(id)).setOrigin(0, 0);
  }

  /** A label tape (pixel font at `scale`), its top centre at (x, y). */
  private tape(lines: readonly string[], x: number, y: number, scale: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, labelTexture(this.scene, lines, 'tape', KITCHEN_COLORS.text.cream)).setOrigin(0.5, 0).setScale(scale);
  }

  /** The printed hi-res liner over the pixel tray's floor (when the brand textures are there). */
  private placeLiner(l: KitchenLayout): void {
    const on = this.scene.textures.exists(BRAND.liner);
    const ts = l.art.tray;
    this.liner.setVisible(on);
    if (on) this.liner.setTexture(BRAND.liner).setPosition(l.tray.x + BRAND_LINER_AT.x * ts, l.tray.y + BRAND_LINER_AT.y * ts).setScale(ts * brandScale(this.scene, 'liner'));
  }

  private get trayScale(): number {
    return this.layout?.art.tray ?? 1;
  }

  /** Every tray place takes its (hi-res) texture again: after a redraw of the brand textures. */
  private refreshTray(): void {
    for (const [part, s] of Object.entries(this.trayItems) as [TrayPart, Phaser.GameObjects.Sprite][]) {
      const frame = part === 'burger' || part === 'cone' ? TRAY_ART[part].frame : Number(s.frame.name);
      showHiRes(s, TRAY_ART[part].key, frame, this.trayScale);
    }
  }

  /** What stands on the tray (places in flight stay hidden until they land). */
  syncTray(t: TrayView): void {
    const it = this.trayItems;
    it.burger.setVisible(t.burger !== null && !this.held.has('burger'));
    it.cone.setVisible(t.cone !== null && !this.held.has('cone'));
    it.side.setVisible(t.side !== null && !this.held.has('side'));
    if (t.side) showHiRes(it.side, KITCHEN.starterBox, STARTERS.indexOf(t.side.id), this.trayScale);
    it.drink.setVisible(t.drink !== null && !this.held.has('drink'));
    if (t.drink) it.drink.setFrame(DRINKS.indexOf(t.drink));
  }

  hold(part: TrayPart, on: boolean): void {
    if (on) this.held.add(part);
    else this.held.delete(part);
  }

  /** The sprite on a tray place (its texture / frame / scale fly to the bin when it is thrown away). */
  trayItem(part: TrayPart): Phaser.GameObjects.Sprite {
    return this.trayItems[part];
  }

  /** Trash lid opens for a moment. */
  openTrash(): void {
    this.trash.setFrame(1);
    this.trashTimer?.remove();
    this.trashTimer = this.scene.time.delayedCall(TRASH_OPEN_MS, () => this.trash.setFrame(0));
  }

  /** Mouth of the trash can (where thrown things land). */
  get trashMouth(): Point {
    const l = this.layout;
    const t = l?.trash ?? { x: 0, y: 0 };
    const k = l?.art.trash ?? 1;
    return { x: t.x + TRASH_MOUTH.x * k, y: t.y + TRASH_MOUTH.y * k };
  }

  /** The drawn place of a pan / bottle / CHIUDI / drink target. */
  place(t: KitchenTarget): PlaceView | null {
    if (t.kind === 'bin') return this.places.get(`bin:${t.id}`) ?? null;
    if (t.kind === 'drink') return this.places.get(`drink:${t.id}`) ?? null;
    if (t.kind === 'bun') return this.places.get('bun') ?? null;
    return null;
  }

  /** Tap feedback on a pan / drink: a quick squash (or a shake when the tap was refused). */
  press(t: KitchenTarget, refused: boolean): void {
    const p = this.place(t);
    if (p) this.wiggle(p.g, refused);
  }

  private wiggle(g: Phaser.GameObjects.Container, refused: boolean): void {
    this.scene.tweens.killTweensOf(g);
    g.setScale(1).setAngle(0);
    if (refused) this.scene.tweens.add({ targets: g, angle: { from: -6, to: 0 }, duration: KITCHEN_FX.nopeMs, ease: 'Elastic.easeOut' });
    else this.scene.tweens.add({ targets: g, scaleX: { from: 1.08, to: 1 }, scaleY: { from: 0.86, to: 1 }, duration: KITCHEN_FX.plopMs, ease: 'Back.easeOut' });
  }

  /** Centre of a target in this view's px (flights start there). */
  centre(t: KitchenTarget, stackTop: number | null = null): Point | null {
    const r = this.layout && targetRect(this.layout, t, stackTop);
    return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null;
  }

  /** Red edges beating while the customer's patience runs out (kitchen view only), round `v` (kitchen px on screen). */
  drawUrgent(patience: number | null, timeMs: number, calm: boolean, v: Rect): void {
    const g = this.urgent;
    g.clear();
    if (patience === null || patience >= KITCHEN_FX.urgentPatience) return;
    const beat = calm ? 0.5 : 1 - (timeMs % KITCHEN_FX.urgentBeatMs) / KITCHEN_FX.urgentBeatMs;
    const strength = 1 - patience / KITCHEN_FX.urgentPatience;
    const band = Math.round(4 + 4 * beat);
    g.fillStyle(KITCHEN_COLORS.urgent, (0.25 + 0.35 * beat) * (0.4 + 0.6 * strength));
    g.fillRect(v.x, v.y, v.w, band);
    g.fillRect(v.x, v.y + v.h - band, v.w, band);
    g.fillRect(v.x, v.y, band, v.h);
    g.fillRect(v.x + v.w - band, v.y, band, v.h);
  }

  clear(): void {
    this.held.clear();
    this.urgent.clear();
  }
}
