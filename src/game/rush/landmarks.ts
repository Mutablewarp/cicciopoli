/**
 * The three Ciccio's storefronts of level 6, each drawn once over the plain right strip (the right strip
 * with the shop, cropped to the storefront rows), with two fans on the sidewalk in front who wave all the
 * time and hop + cheer as the truck goes by (once per shop per run). Side view (v9): the shop art turns with
 * the camera, so an upright sign plate (shopSignKey) names the shop on the bottom sidewalk, covering the art's
 * own blade sign where a tall screen shows it, the shop art is cut at its facade (Terrasini's PROSSIMA APERTURA
 * banner beyond it would read sideways; the plate says it), and the fans stand upright.
 */
import type Phaser from 'phaser';
import { ROAD_W, RUSH, RUSH_ANIMS, RUSH_ZONES, type RushZone, shopSignKey, zoneKey } from '../../art/rush/keys';
import { FACADE_D, STOREFRONT, STRIP_H } from '../../art/rush/street';
import { DEPTH, FANS, LANDMARK, RUSH_VIEW } from './config';
import { screenUp, type CamPose, type ViewRect } from './framing';

const SIDE_W = 128;
/** side view: the shop art up to the far edge of its facade band (art/rush/street.ts ciccios) */
const SIDE_CROP = FACADE_D + 11;
const OVER = RUSH_VIEW.overscanPx;

/** A world point getter for a speech bubble (null = the speaker is gone). */
export type Speaker = () => { x: number; y: number } | null;

interface Shop {
  readonly zone: RushZone;
  readonly img: Phaser.GameObjects.Image;
  readonly plate: Phaser.GameObjects.Image | null;
  readonly fans: readonly Phaser.GameObjects.Sprite[];
}

/**
 * Road coordinate of row 0 of the first right-strip period whose storefront lies wholly at r >= rMin
 * (strip row k sits at r = top - k, and row 0 at a multiple of the period, as the tiles are locked).
 */
export function storefrontTop(zone: RushZone, rMin: number): number {
  const { y, len } = STOREFRONT[zone];
  return Math.ceil((rMin + y + len - 1) / STRIP_H) * STRIP_H;
}

/**
 * Side view: world x of a sign plate's top edge (`h` px tall, it runs down the screen from there; `edge` = world x of
 * the screen's bottom edge). By the road edge; on a screen that shows the sidewalk past it, out over the art's blade
 * sign, as far as the bottom edge lets the plate stay whole.
 */
export function signPlateX(h: number, edge: number): number {
  const L = LANDMARK;
  return Math.max(ROAD_W - L.plateInPx, Math.min(ROAD_W + L.bladeFarPx - h, edge - h));
}

export class Landmarks {
  private readonly shops: Shop[];
  /** shops whose fans already cheered this run */
  private readonly cheered = new Set<RushZone>();
  private readonly due: Speaker[] = [];
  /** the view the shop art is cropped for */
  private cropSide = false;

  constructor(
    scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private readonly pose: CamPose,
  ) {
    const add = <T extends Phaser.GameObjects.Image | Phaser.GameObjects.Sprite>(o: T, depth: number): T => {
      o.setDepth(depth).setVisible(false);
      layer.add(o);
      return o;
    };
    this.shops = RUSH_ZONES.map((zone, z) => {
      const { y, len } = STOREFRONT[zone];
      const img = add(scene.add.image(ROAD_W, 0, zoneKey(zone, 'sideR')).setOrigin(0, 0).setCrop(0, y, SIDE_W, len), DEPTH.scenery + 1);
      const key = shopSignKey(zone);
      const plate = scene.textures.exists(key) ? add(scene.add.image(0, 0, key).setOrigin(0.5, 0), DEPTH.customer + 1) : null;
      const fans = FANS.outPx.map((_, k) => {
        const s = add(scene.add.sprite(0, 0, RUSH.customer, 0).setFlipX(true), DEPTH.customer);
        const anim = (z + k) % 2 === 0 ? RUSH_ANIMS.customerA : RUSH_ANIMS.customerB;
        if (scene.anims.exists(anim)) s.play({ key: anim, startFrame: k });
        return s;
      });
      return { zone, img, plate, fans };
    });
  }

  /** Every storefront image (high contrast darkens them with the strips). */
  get images(): Phaser.GameObjects.Image[] {
    return this.shops.map((s) => s.img);
  }

  /** New run: everybody cheers again. */
  reset(): void {
    this.cheered.clear();
    this.due.length = 0;
  }

  /** Fans that just started cheering (their bubble getters), once each. */
  cheers(): Speaker[] {
    return this.due.splice(0);
  }

  /** `tops`: road coordinate of each shop's strip row 0 (NaN = not placed); d = road driven; v = the world on screen. */
  place(d: number, tops: Readonly<Record<RushZone, number>>, v: ViewRect, side: boolean, timeMs: number): void {
    const turn = -this.pose.rotation;
    const up = screenUp(this.pose.rotation);
    const crop = side !== this.cropSide;
    this.cropSide = side;
    for (const s of this.shops) {
      const { y, len } = STOREFRONT[s.zone];
      const top = d - tops[s.zone]; // world y of strip row 0
      const on = top + y < v.top + v.height + OVER && top + y + len > v.top - OVER;
      if (crop) s.img.setCrop(0, y, side ? SIDE_CROP : SIDE_W, len);
      s.img.setVisible(on).setY(top);
      const mid = top + y + len / 2;
      s.plate?.setVisible(on && side).setPosition(signPlateX(s.plate?.height ?? 0, v.left + v.width), mid).setRotation(turn);
      const near = on && Math.abs(mid) < FANS.nearPx;
      const hop = near && Math.floor(timeMs / FANS.hopMs) % 2 === 0 ? FANS.hopPx : 0;
      // upright either side of the blade sign; in the side view on the kerb either side of the sign plate
      const spread = side && s.plate ? s.plate.width + 2 * FANS.sideGapPx : FANS.spacingPx;
      s.fans.forEach((f, k) => {
        const fx = ROAD_W + (side ? FANS.sideOutPx : FANS.outPx[k]);
        f.setVisible(on).setPosition(fx + up.x * hop, mid + (k - 0.5) * spread + up.y * hop).setRotation(side ? turn : 0);
      });
      if (near && !this.cheered.has(s.zone)) {
        this.cheered.add(s.zone);
        const fan = s.fans[0];
        this.due.push(() => (fan.visible ? { x: fan.x, y: fan.y } : null));
      }
    }
  }
}
