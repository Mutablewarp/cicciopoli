/**
 * The scrolling world of level 6: per zone a road strip, two side strips and the wide fillers, all
 * locked to the road (no parallax). Zones meet at a cross street with zebra crossings and a portal
 * sign ("ZONA STADIO", "BENVENUTI A TERRASINI"); the last one is the TRAGUARDO line. A boundary is
 * pinned on the road a little before it scrolls into view, from the zone start times. The right
 * strips are tiled without the Ciccio's; each storefront is drawn once as a landmark: La Lumia at
 * the start, Stadio just into zone 2, Terrasini at the door where the last order goes.
 *
 * Road coordinate r: px along the road; a point at r is drawn at world y = d - r.
 */
import type Phaser from 'phaser';
import { ROAD_W, RUSH_ZONES, type RushZone, zoneKey } from '../../art/rush/keys';
import { STOREFRONT, STRIP_H } from '../../art/rush/street';
import { RUSH_DELIVERY, RUSH_RUN, RUSH_SPEED } from '../../config/rush';
import { DEPTH, LANDMARK, RUSH_VIEW } from './config';
import type { RushFraming } from './framing';
import { SCENE_TEX, XING_H } from './sceneArt';

const SIDE_W = 128;
const FILL = 64;
/** a boundary is pinned when its predicted spot is this close above the top of the view */
const PIN_MARGIN = 80;
/** run times of the boundaries: zone 2, zone 3, the end */
const BOUND_MS: readonly number[] = [RUSH_RUN.zoneStartMs[1], RUSH_RUN.zoneStartMs[2], RUSH_RUN.durationMs];
const DARK_TINT = 0x8c8c96;
const OVER = RUSH_VIEW.overscanPx;
/** wide views: the filler beyond the side strips dims in two steps (focus on the road) */
const SHADE: readonly (readonly [number, number])[] = [
  [0, 0.2],
  [24, 0.26],
];

interface ZoneGroup {
  readonly road: Phaser.GameObjects.TileSprite;
  readonly sideL: Phaser.GameObjects.TileSprite;
  readonly sideR: Phaser.GameObjects.TileSprite;
  readonly fillL: Phaser.GameObjects.TileSprite;
  readonly fillR: Phaser.GameObjects.TileSprite;
}

interface Band {
  readonly street: Phaser.GameObjects.TileSprite;
  readonly mark: Phaser.GameObjects.Image;
  readonly sign: Phaser.GameObjects.Image;
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/**
 * Road coordinate of row 0 of the first right-strip period whose storefront lies wholly at r >= rMin
 * (strip row k sits at r = top - k, and row 0 at a multiple of the period, as the tiles are locked).
 */
export function storefrontTop(zone: RushZone, rMin: number): number {
  const { y, len } = STOREFRONT[zone];
  return Math.ceil((rMin + y + len - 1) / STRIP_H) * STRIP_H;
}

export class Scenery {
  private readonly groups = new Map<RushZone, ZoneGroup>();
  private readonly bands: Band[];
  private readonly shades: Phaser.GameObjects.Rectangle[];
  /** per zone the right strip with the Ciccio's, cropped to the storefront rows */
  private readonly shops = new Map<RushZone, Phaser.GameObjects.Image>();
  /** road coordinate of each boundary, Infinity until pinned */
  private bounds = BOUND_MS.map(() => Infinity);
  private view: RushFraming | null = null;
  /** the last update() arguments: a re-framing (rotation while paused) places the strips again */
  private last: Parameters<Scenery['update']> | null = null;
  private dark = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
  ) {
    this.bands = BOUND_MS.map((_, i) => {
      const last = i === BOUND_MS.length - 1;
      const street = this.add(scene.add.tileSprite(0, 0, FILL, XING_H, SCENE_TEX.xing).setOrigin(0, 0.5), DEPTH.band);
      const mark = this.add(scene.add.image(ROAD_W / 2, 0, last ? SCENE_TEX.finish : SCENE_TEX.zebra), DEPTH.band + 1);
      const sign = this.add(scene.add.image(ROAD_W / 2, 0, SCENE_TEX.sign(i + 1)).setOrigin(0.5, 1), DEPTH.portal);
      return { street, mark, sign };
    });
    for (const zone of RUSH_ZONES) {
      const { y, len } = STOREFRONT[zone];
      const img = scene.add.image(ROAD_W, 0, zoneKey(zone, 'sideR')).setOrigin(0, 0).setCrop(0, y, SIDE_W, len).setVisible(false);
      this.shops.set(zone, this.add(img, DEPTH.scenery + 1));
    }
    this.shades = SHADE.flatMap(([, a]) => [0, 1].map(() => this.add(scene.add.rectangle(0, 0, 1, 1, 0x000000, a).setOrigin(0, 0), DEPTH.band + 3)));
  }

  private add<T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Depth>(o: T, depth: number): T {
    o.setDepth(depth);
    this.layer.add(o);
    return o;
  }

  private group(zone: RushZone): ZoneGroup {
    let g = this.groups.get(zone);
    if (g) return g;
    const ts = (key: string, w: number, h: number): Phaser.GameObjects.TileSprite =>
      this.add(this.scene.add.tileSprite(0, 0, w, h, key).setOrigin(0, 0), DEPTH.scenery);
    g = {
      road: ts(zoneKey(zone, 'road'), ROAD_W, 8),
      sideL: ts(zoneKey(zone, 'sideL'), SIDE_W, 8),
      sideR: ts(zoneKey(zone, 'sideRPlain'), SIDE_W, 8),
      fillL: ts(zoneKey(zone, 'fill'), FILL, 8),
      fillR: ts(zoneKey(zone, 'fillR'), FILL, 8),
    };
    this.groups.set(zone, g);
    this.applyTint(g);
    return g;
  }

  layout(view: RushFraming): void {
    this.view = view;
    const left = Math.floor(view.left) - OVER;
    const right = Math.ceil(view.left + view.width) + OVER;
    SHADE.forEach(([inset], i) => {
      const l = this.shades[i * 2];
      const r = this.shades[i * 2 + 1];
      const lw = -SIDE_W - inset - left;
      const rx = ROAD_W + SIDE_W + inset;
      l.setVisible(lw > 0).setPosition(left, view.top - OVER).setSize(Math.max(1, lw), view.height + 2 * OVER);
      r.setVisible(right > rx).setPosition(rx, view.top - OVER).setSize(Math.max(1, right - rx), view.height + 2 * OVER);
    });
    if (this.last) this.update(...this.last);
  }

  /** High contrast: darker scenery so traffic stands out. */
  setDark(on: boolean): void {
    this.dark = on;
    for (const g of this.groups.values()) this.applyTint(g);
  }

  private applyTint(g: ZoneGroup): void {
    for (const t of [g.sideL, g.sideR, g.fillL, g.fillR, ...this.shops.values()]) {
      if (this.dark) t.setTint(DARK_TINT);
      else t.clearTint();
    }
  }

  /** New run: boundaries forgotten. */
  reset(): void {
    this.bounds = BOUND_MS.map(() => Infinity);
  }

  /** Pins the boundaries about to scroll in (predicted at the zone's base speed). */
  private pin(d: number, timeMs: number, zoneIndex: number): void {
    const v = this.view;
    if (!v) return;
    BOUND_MS.forEach((at, i) => {
      if (this.bounds[i] !== Infinity) return;
      const left = at - timeMs;
      const speed = RUSH_SPEED.base[RUSH_ZONES[Math.min(zoneIndex, RUSH_ZONES.length - 1)]];
      // a boundary whose time went by unseen (debug fast-forward) lies behind: never drawn
      if (left <= 0) this.bounds[i] = -Infinity;
      else if (left * (speed / 1000) <= -v.top + PIN_MARGIN) this.bounds[i] = d + left * (speed / 1000);
    });
  }

  /** Zone of the road at coordinate r. */
  private zoneAt(r: number): number {
    let z = 0;
    while (z < RUSH_ZONES.length - 1 && r >= this.bounds[z]) z++;
    return z;
  }

  /** `shopD`: road coordinate of the Ciccio's Terrasini door, null until the last zone is placed there. */
  update(d: number, timeMs: number, zoneIndex: number, shopD: number | null = null): void {
    this.last = [d, timeMs, zoneIndex, shopD];
    const v = this.view;
    if (!v) return;
    this.pin(d, timeMs, zoneIndex);
    this.placeShops(d, shopD);
    const top = Math.floor(v.top) - OVER;
    const bottom = Math.ceil(v.top + v.height) + OVER;
    const rTop = d - top;
    const rBottom = d - bottom;
    const lo = this.zoneAt(rBottom);
    const hi = this.zoneAt(rTop);
    RUSH_ZONES.forEach((zone, z) => {
      const g = z >= lo && z <= hi ? this.group(zone) : this.groups.get(zone);
      if (!g) return;
      if (z < lo || z > hi) {
        this.show(g, false);
        return;
      }
      // zone z spans r in [bounds[z-1], bounds[z]) -> world y in (d - bounds[z], d - bounds[z-1]]
      const y0 = z === hi ? top : Math.round(d - this.bounds[z]);
      const y1 = z === lo ? bottom : Math.round(d - this.bounds[z - 1]);
      this.place(g, y0, y1 - y0, d);
    });
    this.placeBands(d);
  }

  private show(g: ZoneGroup, on: boolean): void {
    for (const t of Object.values(g)) t.setVisible(on);
  }

  private place(g: ZoneGroup, y: number, h: number, d: number): void {
    const v = this.view;
    if (!v || h <= 0) {
      this.show(g, false);
      return;
    }
    this.show(g, true);
    const left = Math.floor(v.left) - OVER;
    const right = Math.ceil(v.left + v.width) + OVER;
    const strip = (t: Phaser.GameObjects.TileSprite, x: number, w: number): void => {
      t.setPosition(x, y).setSize(Math.max(1, w), h);
      t.tilePositionY = mod(y - d, t.frame.height); // texture locked to the road
      t.tilePositionX = mod(x, t.frame.width);
    };
    strip(g.road, 0, ROAD_W);
    strip(g.sideL, -SIDE_W, SIDE_W);
    strip(g.sideR, ROAD_W, SIDE_W);
    g.fillL.setVisible(left < -SIDE_W);
    g.fillR.setVisible(right > ROAD_W + SIDE_W);
    if (left < -SIDE_W) strip(g.fillL, left, -SIDE_W - left);
    if (right > ROAD_W + SIDE_W) strip(g.fillR, ROAD_W + SIDE_W, right - ROAD_W - SIDE_W);
  }

  /** The three storefronts; `shopD` puts the Terrasini door row (RUSH_DELIVERY.shop.doorRow) there. */
  private placeShops(d: number, shopD: number | null): void {
    const v = this.view;
    if (!v) return;
    const stadio = this.bounds[0];
    const tops: Readonly<Record<RushZone, number>> = {
      centro: storefrontTop('centro', LANDMARK.laLumiaAheadPx),
      stadio: Number.isFinite(stadio) ? storefrontTop('stadio', stadio + XING_H / 2 + LANDMARK.stadioAfterPx) : NaN,
      mare: shopD === null ? NaN : shopD + RUSH_DELIVERY.shop.doorRow,
    };
    for (const [zone, img] of this.shops) {
      const { y, len } = STOREFRONT[zone];
      const top = d - tops[zone]; // world y of strip row 0
      img.setVisible(top + y < v.top + v.height + OVER && top + y + len > v.top - OVER).setY(top);
    }
  }

  private placeBands(d: number): void {
    const v = this.view;
    if (!v) return;
    this.bands.forEach((b, i) => {
      const y = Math.round(d - this.bounds[i]);
      const on = Number.isFinite(y) && y > v.top - XING_H - 24 && y < v.top + v.height + XING_H;
      const last = i === this.bands.length - 1;
      b.street.setVisible(on && !last);
      b.mark.setVisible(on);
      b.sign.setVisible(on);
      if (!on) return;
      const left = Math.floor(v.left) - OVER;
      b.street.setPosition(left, y).setSize(Math.ceil(v.width) + 2 * OVER, XING_H);
      b.street.tilePositionX = mod(left, b.street.frame.width);
      b.mark.setY(y);
      b.sign.setY(y - (last ? 6 : XING_H / 2) - 2);
    });
  }
}
