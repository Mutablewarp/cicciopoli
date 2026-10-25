/**
 * CUCINA, the kitchen view of level 7 (static part), laid out like the Good Pizza prep screen
 * (plan.ts): the brushed-steel worktop and the tiled wall, the steel panel of big pans (each with its
 * label tape; the sauce bottles stand in theirs, CHIUDI is the pan of brioche tops; places this order
 * does not use hold decoys, one of them a locked pan: dimmed, a padlock, a wiggle when tapped) framing the wooden board
 * with the paper, the bin at the panel's edge, the griddle with its heat shimmer and the fryer with
 * bubbling oil, the drinks racks and the tray with its printed liner and what stands on it (the
 * hi-res kraft parcel and paper boats). Every station casts a soft shadow. A paged kitchen covers the
 * half the shown page does not show with plain worktop. The cooking items, the burger and the guide
 * have their own views in the same container. Rebuilt per order (the pans change) and on rotation.
 */
import Phaser from 'phaser';
import { BIN, DRINKS, GRIDDLE, INGREDIENTS, KITCHEN, KITCHEN_ANIMS, SAUCES, SIDES, STARTERS, type SideId } from '../../art/kitchen/keys';
import { BRAND, BRAND_LINER_AT, brandScale } from './brand';
import { FURNITURE, KITCHEN_COLORS, KITCHEN_FX, KITCHEN_VIEW, LABEL, MONTAGGIO, PAN, TRASH_SCALE } from './config';
import { drawFurniture, padlock } from './furniture';
import { showHiRes } from './hiRes';
import { binLines, drinkLines, labelTexture } from './labels';
import { inRect, kitchenLayout, kitchenOffset, targetRect, type KitchenFraming, type KitchenLayout, type LockedPan, type Point, type Rect } from './layout';
import type { BinId, KitchenOrder, KitchenTarget, TrayPart, TrayView } from './logic/types';
import { PageTabs } from './pager';

const PAD = KITCHEN_VIEW.pad;
/** the shelf lip of the tiled wall lands on this world y (behind the top row of pans) */
const WALL_BOTTOM = 6;
const WALL_TILE_H = 48;
const TRASH_OPEN_MS = 380;
/** the trash's mouth (art px of its frame), where thrown things land */
const TRASH_MOUTH = { x: 13, y: 8 } as const;
const SAUCE_H = 34;
const LOCK = FURNITURE.lock;
const isSide = (id: BinId): id is SideId => (SIDES as readonly string[]).includes(id);
const TS = MONTAGGIO.trayScale;
/** what each tray place shows: its pixel key and frame (the hi-res stand-in is picked when shown) */
const TRAY_ART: Readonly<Record<TrayPart, { key: string; frame: number }>> = {
  burger: { key: KITCHEN.wrap, frame: 3 },
  cone: { key: KITCHEN.cone, frame: 1 },
  side: { key: KITCHEN.starterBox, frame: 0 },
  drink: { key: KITCHEN.drink, frame: 0 },
};

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
  /** paged kitchen: plain worktop under MONTAGGIO (0) / over COTTURA (1), shown with that page */
  private readonly covers: Phaser.GameObjects.TileSprite[];
  /** what each bin / drink place draws (tap squash, nope shake) */
  private readonly groups = new Map<string, Phaser.GameObjects.Container>();
  private locked: { hit: Rect; g: Phaser.GameObjects.Container }[] = [];
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
    this.griddle = add.image(0, 0, KITCHEN.griddle).setOrigin(0, 0);
    this.heat = add.sprite(0, 0, KITCHEN.griddleHeat, 0).setOrigin(0, 0).setAlpha(KITCHEN_FX.heatAlpha);
    this.fryer = add.image(0, 0, KITCHEN.fryer).setOrigin(0, 0);
    this.oil = [0, 1].map(() => add.sprite(0, 0, KITCHEN.fryOil, 0).setOrigin(0, 0));
    this.trash = add.sprite(0, 0, KITCHEN.trash, 0).setOrigin(0, 0).setScale(TRASH_SCALE);
    this.paper = add.image(0, 0, KITCHEN.paper).setOrigin(0, 0).setScale(MONTAGGIO.scale);
    this.trayImg = add.image(0, 0, KITCHEN.tray).setOrigin(0, 0).setScale(TS);
    this.liner = add.image(0, 0, KITCHEN.tray).setOrigin(0, 0).setVisible(false);
    this.shelves = [0, 1].map(() => add.image(0, 0, KITCHEN.shelf).setOrigin(0, 0));
    this.bins = add.container(0, 0);
    const item = (p: TrayPart): Phaser.GameObjects.Sprite => add.sprite(0, 0, TRAY_ART[p].key, TRAY_ART[p].frame).setOrigin(0.5, 1).setScale(TS).setVisible(false);
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
    const v = this.viewBounds(f);
    this.root.setPosition(kitchenOffset(f), 0);
    this.worktop.setPosition(v.x - PAD, v.y - PAD).setSize(v.w + 2 * PAD, v.h + 2 * PAD);
    // the tiles only along the top of the worktop, their shelf lip just behind the top row of pans
    const wallH = Math.max(0, WALL_BOTTOM - (v.y - PAD));
    const h = Math.min(WALL_TILE_H, wallH);
    this.wall.setPosition(v.x - PAD, WALL_BOTTOM - h).setSize(v.w + 2 * PAD, Math.max(1, h)).setVisible(wallH > 0);
    this.wall.tilePositionY = WALL_TILE_H - h;
    const pages = f.pages.length > 1 ? f.plan.pages : null;
    this.covers.forEach((c, i) => {
      c.setVisible(pages !== null);
      if (!pages) return;
      // the cut: where COTTURA starts (page 0's tab sits on it, over the cover)
      const cut = pages[1].view.y;
      const y0 = i === 0 ? cut : v.y - PAD;
      c.setPosition(v.x - PAD, y0).setSize(v.w + 2 * PAD, i === 0 ? v.y + v.h + PAD - cut : cut - y0);
      c.tilePositionY = y0 - (v.y - PAD);
    });
    this.tabs.setPlan(f.plan, f.pages.length > 1);
    this.rebuild();
  }

  /** Paged kitchen: the camera between the pages (0..1); each page's cover fades with it. */
  showPage(at: number): void {
    this.covers[0].setAlpha(1 - at);
    this.covers[1].setAlpha(at);
  }

  /** The world rect any page of the kitchen shows (the backdrop covers them all). */
  private viewBounds(f: KitchenFraming): Rect {
    const ys = f.pages.map((dy) => f.view.y + dy);
    const y0 = Math.min(...ys);
    return { x: f.view.x, y: y0, w: f.view.w, h: Math.max(...ys) - y0 + f.view.h };
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
    this.groups.clear();
    if (!f) return;
    const empty = { griddle: [], fryer: [], cold: [], sauces: [], drinks: [] };
    const l = kitchenLayout(f.plan, o?.bins ?? empty);
    this.layout = l;
    drawFurniture(this.furniture, l);
    this.griddle.setPosition(l.griddle.x, l.griddle.y);
    this.heat.setPosition(l.griddle.x + GRIDDLE.surface.x, l.griddle.y + GRIDDLE.surface.y);
    this.fryer.setPosition(l.fryer.x, l.fryer.y);
    this.oil.forEach((s, i) => s.setPosition(l.wells[i].x, l.wells[i].y));
    this.trash.setPosition(l.trash.x, l.trash.y);
    this.paper.setPosition(l.paper.x, l.paper.y);
    this.trayImg.setPosition(l.tray.x, l.tray.y);
    this.placeLiner(l);
    this.shelves.forEach((s, i) => s.setPosition(l.shelves[i].x, l.shelves[i].y));
    for (const [part, s] of Object.entries(this.trayItems) as [TrayPart, Phaser.GameObjects.Sprite][]) s.setPosition(l.trayAt[part].x, l.trayAt[part].y);
    this.refreshTray();
    const add = this.scene.add;
    this.locked = l.locked.map((b) => ({ hit: b.hit, g: this.lockedPan(b) }));
    for (const b of l.bins) {
      const g = add.container(b.hit.x + b.hit.w / 2, b.hit.y + b.hit.h / 2);
      const lx = -g.x;
      const ly = -g.y;
      g.add(add.image(b.x + lx, b.y + ly, KITCHEN.bin).setOrigin(0, 0));
      const fx = b.x + BIN.fillX + lx;
      const fy = b.y + BIN.fillY + ly;
      if (b.kind === 'bottle') {
        const frame = (SAUCES as readonly string[]).indexOf(b.id);
        g.add(add.sprite(b.hit.x + b.hit.w / 2 + lx, b.hit.y + PAN.bottleBottom - SAUCE_H + ly, KITCHEN.sauce, frame).setOrigin(0.5, 0));
      } else if (b.id === 'bun') g.add(add.image(fx, fy, KITCHEN.binBun).setOrigin(0, 0));
      else g.add(this.contents(b.id, fx, fy));
      g.add(this.tape(binLines(b.id), b.label.x + lx, b.label.y + ly));
      this.bins.add(g);
      this.groups.set(b.id === 'bun' ? 'bun' : `bin:${b.id}`, g);
    }
    for (const d of l.drinks) {
      const g = add.container(d.at.x, d.at.y);
      g.add(add.sprite(0, 0, KITCHEN.drink, DRINKS.indexOf(d.id)).setOrigin(0.5, 1));
      g.add(this.tape(drinkLines(d.id), d.label.x - d.at.x, d.label.y - d.at.y));
      this.bins.add(g);
      this.groups.set(`drink:${d.id}`, g);
    }
  }

  /** What a pan holds (fries / starter or an ingredient), its top-left at (x, y). */
  private contents(id: BinId, x: number, y: number): Phaser.GameObjects.Sprite {
    const add = this.scene.add;
    return isSide(id) ? add.sprite(x, y, KITCHEN.binSide, SIDES.indexOf(id)).setOrigin(0, 0) : add.sprite(x, y, KITCHEN.binFill, INGREDIENTS.indexOf(id)).setOrigin(0, 0);
  }

  /** A locked pan: pan and contents dimmed, a padlock on them, no label (a container centred on its place: it wiggles). */
  private lockedPan(b: LockedPan): Phaser.GameObjects.Container {
    const add = this.scene.add;
    const g = add.container(b.hit.x + b.hit.w / 2, b.hit.y + b.hit.h / 2);
    const x = b.x - g.x;
    const y = b.y - g.y;
    const lock = add.graphics();
    padlock(lock, Math.round(x + BIN.fillX + (BIN.w - 2 * BIN.fillX - LOCK.w) / 2), Math.round(y + BIN.fillY + (BIN.h - 2 * BIN.fillY - LOCK.h) / 2));
    g.add([add.image(x, y, KITCHEN.bin).setOrigin(0, 0).setTint(LOCK.panTint), this.contents(b.id, x + BIN.fillX, y + BIN.fillY).setTint(LOCK.fillTint), lock]);
    this.bins.add(g);
    return g;
  }

  /** A tap on nothing to do: a locked pan there wiggles (not for this order). */
  nudge(p: Point): void {
    const hit = this.locked.find((x) => inRect(x.hit, p.x, p.y));
    if (hit) this.wiggle(hit.g, true);
  }

  /** A label tape (pixel font, LABEL.scale), its top centre at (x, y). */
  private tape(lines: readonly string[], x: number, y: number): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, labelTexture(this.scene, lines, 'tape', KITCHEN_COLORS.text.cream)).setOrigin(0.5, 0).setScale(LABEL.scale);
  }

  /** The printed hi-res liner over the pixel tray's floor (when the brand textures are there). */
  private placeLiner(l: KitchenLayout): void {
    const on = this.scene.textures.exists(BRAND.liner);
    this.liner.setVisible(on);
    if (on) this.liner.setTexture(BRAND.liner).setPosition(l.tray.x + BRAND_LINER_AT.x * TS, l.tray.y + BRAND_LINER_AT.y * TS).setScale(TS * brandScale(this.scene, 'liner'));
  }

  /** Every tray place takes its (hi-res) texture again: after a redraw of the brand textures. */
  private refreshTray(): void {
    for (const [part, s] of Object.entries(this.trayItems) as [TrayPart, Phaser.GameObjects.Sprite][]) {
      const frame = part === 'burger' || part === 'cone' ? TRAY_ART[part].frame : Number(s.frame.name);
      showHiRes(s, TRAY_ART[part].key, frame, TS);
    }
  }

  /** What stands on the tray (places in flight stay hidden until they land). */
  syncTray(t: TrayView): void {
    const it = this.trayItems;
    it.burger.setVisible(t.burger !== null && !this.held.has('burger'));
    it.cone.setVisible(t.cone !== null && !this.held.has('cone'));
    it.side.setVisible(t.side !== null && !this.held.has('side'));
    if (t.side) showHiRes(it.side, KITCHEN.starterBox, STARTERS.indexOf(t.side.id), TS);
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
    const t = this.layout?.trash ?? { x: 0, y: 0 };
    return { x: t.x + TRASH_MOUTH.x * TRASH_SCALE, y: t.y + TRASH_MOUTH.y * TRASH_SCALE };
  }

  private group(t: KitchenTarget): Phaser.GameObjects.Container | null {
    if (t.kind === 'bin') return this.groups.get(`bin:${t.id}`) ?? null;
    if (t.kind === 'drink') return this.groups.get(`drink:${t.id}`) ?? null;
    if (t.kind === 'bun') return this.groups.get('bun') ?? null;
    return null;
  }

  /** Tap feedback on a pan / drink: a quick squash (or a shake when the tap was refused). */
  press(t: KitchenTarget, refused: boolean): void {
    const g = this.group(t);
    if (g) this.wiggle(g, refused);
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

  /** Red edges beating while the customer's patience runs out (kitchen view only); `dy` = the page's camera offset. */
  drawUrgent(patience: number | null, timeMs: number, calm: boolean, dy: number): void {
    const g = this.urgent;
    g.clear();
    const f = this.f;
    if (!f || patience === null || patience >= KITCHEN_FX.urgentPatience) return;
    const v = { ...f.view, y: f.view.y + dy };
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
