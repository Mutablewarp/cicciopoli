/**
 * Road objects on screen, created lazily from the snapshot and removed when they leave it:
 * traffic with a drop shadow (a bright outline in high contrast), blinkers, hazards, menu pickups,
 * nuggets floating in the air (fade in), delivery zones with the waving customer on the sidewalk.
 * Also the marks over the road: WAFFLE RADAR chevrons, warnings at the top edge for obstacles not
 * yet on screen, and the green arrow pointing at the next delivery lane.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { PICKUP, ROAD_W, RUSH, RUSH_ANIMS } from '../../art/rush/keys';
import { DEPTH, ENTITY_LOOK } from './config';
import type { RushFraming } from './framing';
import { laneX } from './logic/lanes';
import type { EntityKind, Lane, RushEntityView, RushSnapshot } from './logic/types';

interface Look {
  readonly key: string;
  readonly frame: (variant: number) => number;
  readonly anim?: string;
  readonly depth: number;
  /** 'shadow': drop shadow, outline in high contrast · 'outline': flat on the road, outline in high contrast only */
  readonly under: 'shadow' | 'outline' | false;
  /** outline colour in high contrast */
  readonly edge?: number;
}

const VEHICLE = 0xffffff;
const ZONE_GLOW = 0x3ad06a;
const HAZARD = 0xffd83a;
const veh = (key: string, anim?: string): Look => ({ key, frame: (n) => n, anim, depth: DEPTH.vehicle, under: 'shadow', edge: VEHICLE });
const hz = (key: string, under: Look['under'], anim?: string): Look => ({ key, frame: () => 0, anim, depth: DEPTH.hazard, under, edge: HAZARD });
const pk = (frame: number): Look => ({ key: RUSH.pickups, frame: () => frame, depth: DEPTH.pickup, under: false });

const LOOKS: Readonly<Record<EntityKind, Look>> = {
  car: veh(RUSH.cars),
  parked: veh(RUSH.cars),
  suv: veh(RUSH.suv),
  van: veh(RUSH.van),
  bus: veh(RUSH.bus),
  scooter: veh(RUSH.scooter, RUSH_ANIMS.scooter),
  ape: veh(RUSH.ape, RUSH_ANIMS.ape),
  cone: hz(RUSH.cone, 'shadow'),
  barrier: hz(RUSH.barrier, 'shadow'),
  works: hz(RUSH.works, 'outline'),
  sauce: { ...hz(RUSH.puddle, 'outline', RUSH_ANIMS.puddle), depth: DEPTH.zone + 1 },
  nuggets: pk(PICKUP.nuggets),
  waffle: pk(PICKUP.waffle),
  popcorn: pk(PICKUP.popcorn),
  cheddar: pk(PICKUP.cheddar),
  booster: pk(PICKUP.booster),
  fries: pk(PICKUP.fries),
  airNugget: { key: ITEMS.nugget, frame: () => 0, anim: ITEM_ANIMS.nugget, depth: DEPTH.flight + 2, under: false },
  zone: { key: RUSH.zone, frame: () => 0, anim: RUSH_ANIMS.zone, depth: DEPTH.zone, under: false },
};

interface Ent {
  readonly view: RushEntityView;
  readonly body: Phaser.GameObjects.Sprite;
  readonly under: Phaser.GameObjects.Sprite | null;
  /** parked hazard blinkers, or the zone's customer */
  readonly extra: Phaser.GameObjects.Sprite | null;
  /** scooter turn signal */
  dot: Phaser.GameObjects.Rectangle | null;
  /** delivery zone: the green glow on the asphalt */
  readonly glow: Phaser.GameObjects.Rectangle | null;
  readonly born: number;
}

export class EntityView {
  private readonly ents = new Map<number, Ent>();
  private readonly radar: Phaser.GameObjects.Sprite[];
  private readonly warns: Phaser.GameObjects.Sprite[];
  private readonly arrow: Phaser.GameObjects.Sprite;
  private view: RushFraming | null = null;
  private contrast = false;
  private target: { id: number; lane: Lane } | null = null;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    const mark = (frame: number): Phaser.GameObjects.Sprite => this.add(scene.add.sprite(0, 0, RUSH.radar, frame), DEPTH.marks).setVisible(false);
    this.radar = [0, 1, 2].map(() => mark(0));
    this.warns = [0, 1, 2].map(() => mark(0));
    this.arrow = mark(1);
  }

  private add<T extends Phaser.GameObjects.Sprite | Phaser.GameObjects.Rectangle>(o: T, depth: number): T {
    o.setDepth(depth);
    this.layer.add(o);
    return o;
  }

  layout(f: RushFraming): void {
    this.view = f;
  }

  setContrast(on: boolean): void {
    this.contrast = on;
    for (const e of this.ents.values()) this.styleUnder(e);
  }

  /** The next delivery lane, until its zone shows up (null = none). */
  pointAt(target: { id: number; lane: Lane } | null): void {
    this.target = target;
  }

  private create(e: RushEntityView, timeMs: number): Ent {
    const look = LOOKS[e.kind];
    const frame = look.frame(e.variant);
    const body = this.add(this.scene.add.sprite(0, 0, look.key, frame), look.depth);
    if (look.anim && this.scene.anims.exists(look.anim)) body.play(look.anim);
    const under = look.under ? this.add(this.scene.add.sprite(0, 0, look.key, frame), DEPTH.shadow) : null;
    let extra: Phaser.GameObjects.Sprite | null = null;
    if (e.kind === 'parked') {
      extra = this.add(this.scene.add.sprite(0, 0, RUSH.blinker, 0), look.depth + 1);
      if (this.scene.anims.exists(RUSH_ANIMS.blink)) extra.play(RUSH_ANIMS.blink);
    } else if (e.kind === 'zone') {
      extra = this.add(this.scene.add.sprite(0, 0, RUSH.customer, 0), DEPTH.customer);
      const anim = e.id % 2 === 0 ? RUSH_ANIMS.customerA : RUSH_ANIMS.customerB;
      if (this.scene.anims.exists(anim)) extra.play(anim);
    }
    const glow = e.kind === 'zone' ? this.add(this.scene.add.rectangle(0, 0, e.w, e.h, ZONE_GLOW), DEPTH.zone - 1) : null;
    const ent: Ent = { view: e, body, under, extra, dot: null, glow, born: timeMs };
    this.styleUnder(ent);
    this.ents.set(e.id, ent);
    return ent;
  }

  private styleUnder(e: Ent): void {
    const u = e.under;
    if (!u) return;
    const look = LOOKS[e.view.kind];
    const outline = this.contrast;
    u.setVisible(outline || look.under === 'shadow');
    if (outline) u.setTintFill(look.edge ?? VEHICLE).setAlpha(1).setScale((e.body.width + 2) / e.body.width, (e.body.height + 2) / e.body.height);
    else u.setTintFill(0x000000).setAlpha(ENTITY_LOOK.shadowAlpha).setScale(1);
    u.setDepth(look.depth - (outline ? 0.5 : 4));
  }

  private destroyEnt(e: Ent): void {
    e.body.destroy();
    this.dropParts(e);
  }

  private dropParts(e: Ent): void {
    e.under?.destroy();
    e.extra?.destroy();
    e.dot?.destroy();
    e.glow?.destroy();
  }

  /** Takes a sprite off the books so an effect can animate it (it owns and destroys it). */
  detach(id: number): Phaser.GameObjects.Sprite | null {
    const e = this.ents.get(id);
    if (!e) return null;
    this.ents.delete(id);
    this.dropParts(e);
    return e.body;
  }

  /** World position of a live object (and of a zone's customer). */
  where(id: number): { x: number; y: number; cx: number; cy: number } | null {
    const e = this.ents.get(id);
    if (!e) return null;
    return { x: e.body.x, y: e.body.y, cx: e.extra?.x ?? e.body.x, cy: e.extra?.y ?? e.body.y };
  }

  sync(snap: RushSnapshot, timeMs: number): void {
    const seen = new Set<number>();
    const L = ENTITY_LOOK;
    for (const v of snap.entities) {
      seen.add(v.id);
      const e = this.ents.get(v.id) ?? this.create(v, timeMs);
      const x = v.x;
      let y = -v.y;
      if (v.kind === 'airNugget') {
        y += Math.round(Math.sin((timeMs + v.id * 97) / L.bobMs) * L.bobPx);
        e.body.setAlpha(Math.min(1, (timeMs - e.born) / L.fadeInMs));
      }
      e.body.setPosition(x, y);
      if (e.under) {
        if (e.under.frame.name !== e.body.frame.name) e.under.setFrame(e.body.frame.name);
        const off = this.contrast ? 0 : 1;
        e.under.setPosition(x + L.shadowDx * off, y + L.shadowDy * off);
      }
      if (v.kind === 'parked') e.extra?.setPosition(x, y);
      if (v.kind === 'zone') {
        e.body.setAlpha(v.done ? L.doneAlpha : 1);
        e.glow?.setPosition(x, y).setAlpha(v.done ? 0 : L.glowMin + L.glowAmp * (0.5 + 0.5 * Math.sin(timeMs / 140)));
        e.extra?.setPosition(v.side < 0 ? -L.customerOutPx : ROAD_W + L.customerOutPx, y - 6).setFlipX(v.side > 0);
      }
      if (v.kind === 'scooter') this.signal(e, v, x, y, timeMs);
    }
    for (const [id, e] of this.ents) {
      if (seen.has(id)) continue;
      this.destroyEnt(e);
      this.ents.delete(id);
    }
    this.marks(snap, timeMs);
  }

  /** Scooter turn signal: an amber dot blinking on the side it will cut into. */
  private signal(e: Ent, v: RushEntityView, x: number, y: number, timeMs: number): void {
    const on = v.blink !== null && v.blink !== 0 && Math.floor(timeMs / ENTITY_LOOK.blinkMs) % 2 === 0;
    if (!on) {
      e.dot?.setVisible(false);
      return;
    }
    e.dot ??= this.add(this.scene.add.rectangle(0, 0, 3, 3, 0xffb020).setStrokeStyle(1, 0x2a1400), DEPTH.vehicle + 1);
    e.dot.setVisible(true).setPosition(x + (v.blink ?? 0) * 6, y + 8);
  }

  private marks(snap: RushSnapshot, timeMs: number): void {
    const f = this.view;
    const pulse = 0.8 + 0.2 * Math.sin(timeMs / 90);
    this.radar.forEach((s, l) => {
      const mark = snap.radar?.[l];
      s.setVisible(mark !== undefined);
      if (mark) s.setFrame(mark === 'danger' ? 0 : 1).setPosition(laneX(l), -ENTITY_LOOK.radarAheadPx).setAlpha(pulse);
    });
    if (!f) return;
    const edgeY = f.freeTop + ENTITY_LOOK.edgeMarkPx;
    const warn = [false, false, false];
    if (snap.phase === 'play' && !snap.truck.flying) {
      for (const v of snap.entities) if (v.ttcMs <= snap.warnMs && v.y - v.h / 2 > f.ahead) warn[v.lane] = true;
    }
    this.warns.forEach((s, l) => s.setVisible(warn[l]).setPosition(laneX(l), edgeY).setAlpha(pulse));
    const t = this.target;
    const show = t !== null && !this.ents.has(t.id) && snap.phase === 'play';
    this.arrow.setVisible(show);
    if (show && t) this.arrow.setPosition(laneX(t.lane), edgeY + 4 + Math.round(Math.sin(timeMs / 120) * 2)).setAlpha(pulse);
  }

  clear(): void {
    for (const e of this.ents.values()) this.destroyEnt(e);
    this.ents.clear();
    this.target = null;
  }
}
