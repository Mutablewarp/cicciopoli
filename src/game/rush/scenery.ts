/**
 * The scrolling world of level 6: per zone a road strip, two side strips and the wide fillers, all
 * locked to the road (no parallax). Zones meet at a cross street with zebra crossings and a portal
 * sign ("ZONA STADIO", "BENVENUTI A TERRASINI"); the last one is the TRAGUARDO line. A boundary is
 * pinned on the road before it scrolls into view, from the zone start times; the v9 transition strips
 * (blendL / blendR: this zone's buildings easing into the next one's, ending in a vicolo over the strip
 * below) hang just before the cross street. Where a side strip meets its filler
 * the v9 caps draw a proper edge (hedge, wall, railing). The storefronts are landmarks.ts. In the side
 * view the portal names stand on an upright plate at the top kerb.
 *
 * Road coordinate r: px along the road; a point at r is drawn at world y = d - r.
 */
import type Phaser from 'phaser';
import { ROAD_W, RUSH_ZONES, type RushZone, type ZoneSeamPart, zoneKey } from '../../art/rush/keys';
import { STRIP_H } from '../../art/rush/street';
import { RUSH_DELIVERY, RUSH_RUN, RUSH_SPEED } from '../../config/rush';
import { gradeColor, mulColor } from './ambience';
import { DEPTH, GRADE, LANDMARK, RUSH_VIEW } from './config';
import type { CamPose, ViewRect } from './framing';
import { Landmarks, storefrontTop } from './landmarks';
import { SCENE_TEX, XING_H } from './sceneArt';

const SIDE_W = 128;
const FILL = 64;
const CAP_W = 16;
/** run times of the boundaries: zone 2, zone 3, the end */
const BOUND_MS: readonly number[] = [RUSH_RUN.zoneStartMs[1], RUSH_RUN.zoneStartMs[2], RUSH_RUN.durationMs];
/** a boundary is pinned when its predicted spot is this close above the top of the view: far enough that its
 * transition strips (a strip period below the cross street) never pop in */
const PIN_MARGIN = 80 + XING_H + STRIP_H;
const DARK_TINT = 0x8c8c96;
const OVER = RUSH_VIEW.overscanPx;
/** wide views: the filler beyond the side strips dims in two steps (focus on the road) */
const SHADE: readonly (readonly [number, number])[] = [
  [0, 0.2],
  [24, 0.26],
];

type Tile = Phaser.GameObjects.TileSprite;

interface ZoneGroup {
  readonly road: Tile;
  readonly sideL: Tile;
  readonly sideR: Tile;
  readonly fillL: Tile;
  readonly fillR: Tile;
  /** v9 strip edges facing the fillers (null while the art lacks them) */
  readonly capL: Tile | null;
  readonly capR: Tile | null;
}

interface Band {
  readonly street: Tile;
  readonly mark: Phaser.GameObjects.Image;
  readonly sign: Phaser.GameObjects.Image;
  readonly plate: Phaser.GameObjects.Image;
  /** this zone's strips easing into the next zone (none for the finish, none while the art lacks them) */
  readonly blends: readonly Phaser.GameObjects.Image[];
}

const mod = (a: number, n: number): number => ((a % n) + n) % n;
const smooth = (u: number): number => {
  const c = Math.max(0, Math.min(1, u));
  return c * c * (3 - 2 * c);
};

export class Scenery {
  private readonly groups = new Map<RushZone, ZoneGroup>();
  private readonly bands: Band[];
  private readonly shades: Phaser.GameObjects.Rectangle[];
  readonly landmarks: Landmarks;
  /** road coordinate of each boundary, Infinity until pinned */
  private bounds = BOUND_MS.map(() => Infinity);
  private view: ViewRect | null = null;
  private side = false;
  /** the last update() arguments: a re-framing (rotation while paused) places the strips again */
  private last: Parameters<Scenery['update']> | null = null;
  private dark = false;
  /** v9 light grade now (gradeColor of the road at the truck) */
  private grade = 0xffffff;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.GameObjects.Layer,
    pose: CamPose,
  ) {
    const blend = (zone: RushZone, part: ZoneSeamPart, x: number): Phaser.GameObjects.Image[] => {
      const key = zoneKey(zone, part);
      return scene.textures.exists(key) ? [this.add(scene.add.image(x, 0, key).setOrigin(0, 0), DEPTH.scenery + 0.5)] : [];
    };
    this.bands = BOUND_MS.map((_, i) => {
      const last = i === BOUND_MS.length - 1;
      const street = this.add(scene.add.tileSprite(0, 0, FILL, XING_H, SCENE_TEX.xing).setOrigin(0, 0.5), DEPTH.band);
      const mark = this.add(scene.add.image(ROAD_W / 2, 0, last ? SCENE_TEX.finish : SCENE_TEX.zebra), DEPTH.band + 1);
      const sign = this.add(scene.add.image(ROAD_W / 2, 0, SCENE_TEX.sign(i + 1)).setOrigin(0.5, 1), DEPTH.portal);
      const plate = this.add(scene.add.image(-1, 0, SCENE_TEX.plate(i + 1)).setOrigin(0.5, 1), DEPTH.portal);
      const blends = last ? [] : [...blend(RUSH_ZONES[i], 'blendL', -SIDE_W), ...blend(RUSH_ZONES[i], 'blendR', ROAD_W)];
      return { street, mark, sign, plate, blends };
    });
    this.landmarks = new Landmarks(scene, layer, pose);
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
    const ts = (key: string, w: number): Tile => this.add(this.scene.add.tileSprite(0, 0, w, 8, key).setOrigin(0, 0), DEPTH.scenery);
    const cap = (part: 'capL' | 'capR'): Tile | null => (this.scene.textures.exists(zoneKey(zone, part)) ? ts(zoneKey(zone, part), CAP_W).setDepth(DEPTH.scenery + 0.5) : null);
    g = {
      road: ts(zoneKey(zone, 'road'), ROAD_W),
      sideL: ts(zoneKey(zone, 'sideL'), SIDE_W),
      sideR: ts(zoneKey(zone, 'sideRPlain'), SIDE_W),
      fillL: ts(zoneKey(zone, 'fill'), FILL),
      fillR: ts(zoneKey(zone, 'fillR'), FILL),
      capL: cap('capL'),
      capR: cap('capR'),
    };
    this.groups.set(zone, g);
    this.applyTint(g);
    return g;
  }

  /** The world rect on screen (its bounding box mid-turn) and whether the camera is in the side view. */
  layout(view: ViewRect, side: boolean): void {
    this.view = view;
    this.side = side;
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

  /**
   * The ground and the buildings take the light grade (high contrast also darkens the buildings); traffic,
   * people, signs and effects keep their own colours.
   */
  private applyTint(g: ZoneGroup): void {
    const town = mulColor(this.dark ? DARK_TINT : 0xffffff, this.grade);
    const tiles = [g.sideL, g.sideR, g.fillL, g.fillR, g.capL, g.capR, ...this.landmarks.images, ...this.bands.flatMap((b) => b.blends)];
    for (const t of tiles) t?.setTint(town);
    for (const t of [g.road, ...this.bands.flatMap((b) => [b.street, b.mark])]) t.setTint(this.grade);
  }

  /** The light at road coordinate `d` (eased across the cross streets). */
  private light(d: number): void {
    const c = gradeColor(this.mix(d));
    if (c === this.grade) return;
    this.grade = c;
    for (const g of this.groups.values()) this.applyTint(g);
  }

  /** New run: boundaries forgotten, the shop fans cheer again. */
  reset(): void {
    this.bounds = BOUND_MS.map(() => Infinity);
    this.landmarks.reset();
  }

  /** Pins the boundaries about to scroll in (predicted at the zone's base speed). */
  private pin(d: number, timeMs: number, zoneIndex: number): void {
    const v = this.view;
    if (!v) return;
    BOUND_MS.forEach((at, i) => {
      if (this.bounds[i] !== Infinity) return;
      const left = at - timeMs;
      const speed = RUSH_SPEED.base[RUSH_ZONES[Math.min(zoneIndex, RUSH_ZONES.length - 1)]];
      const r = d + left * (speed / 1000);
      // a boundary whose time went by unseen (debug fast-forward) lies behind: never drawn
      if (left <= 0) this.bounds[i] = -Infinity;
      else if (r - d <= -v.top + PIN_MARGIN) this.bounds[i] = r;
    });
  }

  /** Zone of the road at coordinate r. */
  private zoneAt(r: number): number {
    let z = 0;
    while (z < RUSH_ZONES.length - 1 && r >= this.bounds[z]) z++;
    return z;
  }

  /**
   * 0..2: how far the light has graded from Centro (0) through Stadio (1) to Terrasini (2) at road coordinate r
   * (eases across GRADE.bandPx around each cross street).
   */
  private mix(r: number): number {
    let z = 0;
    for (let i = 0; i < RUSH_ZONES.length - 1; i++) z += smooth((r - this.bounds[i] + GRADE.bandPx / 2) / GRADE.bandPx);
    return z;
  }

  /** `shopD`: road coordinate of the Ciccio's Terrasini door, null until the last zone is placed there. */
  update(d: number, timeMs: number, zoneIndex: number, shopD: number | null = null): void {
    this.last = [d, timeMs, zoneIndex, shopD];
    const v = this.view;
    if (!v) return;
    this.pin(d, timeMs, zoneIndex);
    this.light(d);
    const stadio = this.bounds[0];
    this.landmarks.place(
      d,
      {
        centro: storefrontTop('centro', LANDMARK.laLumiaAheadPx),
        stadio: Number.isFinite(stadio) ? storefrontTop('stadio', stadio + XING_H / 2 + LANDMARK.stadioAfterPx) : NaN,
        mare: shopD === null ? NaN : shopD + RUSH_DELIVERY.shop.doorRow,
      },
      v,
      this.side,
      timeMs,
    );
    const top = Math.floor(v.top) - OVER;
    const bottom = Math.ceil(v.top + v.height) + OVER;
    const lo = this.zoneAt(d - bottom);
    const hi = this.zoneAt(d - top);
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
    for (const t of Object.values(g)) t?.setVisible(on);
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
    // road, side strips and caps start at their own x (texture column 0 there); only the fillers tile the world
    const strip = (t: Tile, x: number, w: number, world = false): void => {
      t.setPosition(x, y).setSize(Math.max(1, w), h);
      t.tilePositionY = mod(y - d, t.frame.height); // texture locked to the road
      t.tilePositionX = world ? mod(x, t.frame.width) : 0;
    };
    strip(g.road, 0, ROAD_W);
    strip(g.sideL, -SIDE_W, SIDE_W);
    strip(g.sideR, ROAD_W, SIDE_W);
    const wideL = left < -SIDE_W;
    const wideR = right > ROAD_W + SIDE_W;
    g.fillL.setVisible(wideL);
    g.fillR.setVisible(wideR);
    g.capL?.setVisible(wideL);
    g.capR?.setVisible(wideR);
    if (wideL) strip(g.fillL, left, -SIDE_W - left, true);
    if (wideR) strip(g.fillR, ROAD_W + SIDE_W, right - ROAD_W - SIDE_W, true);
    if (wideL && g.capL) strip(g.capL, -SIDE_W - CAP_W, CAP_W);
    if (wideR && g.capR) strip(g.capR, ROAD_W + SIDE_W, CAP_W);
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
      b.sign.setVisible(on && !this.side);
      b.plate.setVisible(on && this.side);
      // the transition strips hang below the cross street's near edge
      const edge = y + XING_H / 2;
      const blend = Number.isFinite(y) && edge < v.top + v.height + OVER && edge + STRIP_H > v.top - OVER;
      for (const s of b.blends) s.setVisible(blend).setY(edge);
      if (!on) return;
      const left = Math.floor(v.left) - OVER;
      b.street.setPosition(left, y).setSize(Math.ceil(v.width) + 2 * OVER, XING_H);
      b.street.tilePositionX = mod(left, b.street.frame.width);
      b.mark.setY(y);
      b.sign.setY(y - (last ? 6 : XING_H / 2) - 2);
      b.plate.setY(y).setRotation(-Math.PI / 2);
    });
  }
}
