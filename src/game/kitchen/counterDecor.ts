/**
 * The fixed part of the BANCONE (counter px): the Sperlinga dining room seen from behind the counter
 * (ref/level7_pov_order.png) over the whole screen (landscape: at the customer's own pixel size, the room
 * fill tiled round it; portrait: drawn bigger behind the customer where the art at the counter's scale would
 * not cover it: no empty band), the polished steel counter top across the bottom (its last rows go on down
 * to the bottom of the screen), the pergola beam with its lights along the top edge of the screen, the
 * CICCIO'S neon hanging from it on two thin chains and the round sign with the owner's ORIGINAL face logo
 * (hi-res, never pixelated) on the plaster wall by the CICCIOPOLY poster (in the finale both give way to the
 * golden lettering and the big gold face). The neon hangs at the top of the free area, under the ticket / HUD,
 * and the disc no lower than it needs: both over the speech bubble's room above the customer's head
 * (counterFrame.ts keeps it when it scales the counter, bubbleTop), so the bubble never covers them.
 */
import type Phaser from 'phaser';
import { KITCHEN } from '../../art/kitchen/keys';
import { COUNTER_VIEW, KITCHEN_VIEW } from './config';
import { showHiRes } from './hiRes';
import { bubbleTop, roomPlace, type CounterFrame } from './counterFrame';
import type { Point } from './layout';

const C = COUNTER_VIEW;
const S = C.signs;
/** bottom rows of the counter top art (its polished front), tiled under it down to the bottom of the screen */
const RIBS_FRAME = 'ribs';
const RIBS = { y: 52, w: 64, rows: 4 } as const;
/** the beam art's concrete band (its rows are alike), tiled as the ceiling over the landscape room */
const CEIL_FRAME = 'ceil';
const CEIL = { w: 64, rows: 10 } as const;
const NEON = { w: 92, h: 24 } as const;

export class CounterDecor {
  /** the room fill tiled behind the room art (landscape: round it) */
  readonly fill: Phaser.GameObjects.TileSprite;
  /** landscape: the concrete ceiling over the room art, up to the beam */
  readonly ceil: Phaser.GameObjects.TileSprite;
  readonly room: Phaser.GameObjects.Image;
  /** the neon on its chains: over the soffit and the beam (never over the customer: the bubble's room is between) */
  readonly sign: Phaser.GameObjects.Container;
  /** the face-logo disc on the room's plaster wall */
  readonly disc: Phaser.GameObjects.Sprite;
  /** in front: the counter top, its front, the beam */
  readonly front: Phaser.GameObjects.GameObject[];
  private readonly top: Phaser.GameObjects.TileSprite;
  private readonly kick: Phaser.GameObjects.TileSprite;
  private readonly beam: Phaser.GameObjects.TileSprite;
  private readonly neon: Phaser.GameObjects.Sprite;
  private readonly chains: Phaser.GameObjects.Graphics;
  private discScale = 1;

  constructor(scene: Phaser.Scene) {
    const add = scene.add;
    this.fill = add.tileSprite(0, 0, 8, 8, KITCHEN.roomFill).setOrigin(0, 0);
    const beam = scene.textures.get(KITCHEN.beam);
    if (!beam.has(CEIL_FRAME)) beam.add(CEIL_FRAME, 0, 0, 0, CEIL.w, CEIL.rows);
    this.ceil = add.tileSprite(0, 0, 8, 8, KITCHEN.beam, CEIL_FRAME).setOrigin(0, 0);
    this.room = add.image(0, 0, KITCHEN.roomTall).setOrigin(0, 0);
    this.chains = add.graphics();
    this.neon = add.sprite(0, 0, KITCHEN.neon, 0).setOrigin(0.5, 0);
    this.sign = add.container(0, 0, [this.chains, this.neon]);
    this.disc = add.sprite(0, 0, KITCHEN.faceDisc, 0).setOrigin(0.5, 0.5);
    this.top = add.tileSprite(0, 0, 8, 8, KITCHEN.counterTop).setOrigin(0, 0);
    const counterTop = scene.textures.get(KITCHEN.counterTop);
    if (!counterTop.has(RIBS_FRAME)) counterTop.add(RIBS_FRAME, 0, 0, RIBS.y, RIBS.w, RIBS.rows);
    this.kick = add.tileSprite(0, 0, 8, 8, KITCHEN.counterTop, RIBS_FRAME).setOrigin(0, 0);
    this.beam = add.tileSprite(0, 0, 8, 8, KITCHEN.beam, 0).setOrigin(0, 0);
    this.front = [this.top, this.kick, this.beam];
  }

  /** Places everything for this frame; `headTop` = counter y of the customer's head at the counter. */
  layout(f: CounterFrame, headTop: number): void {
    const v = f.view;
    const s = f.stage;
    const pad = KITCHEN_VIEW.pad;
    const x0 = v.x - pad;
    const w = v.w + 2 * pad;
    const tileX = -Math.round(s.x + s.w / 2 - v.x);
    const room = this.placeRoom(f, headTop);
    this.fill.setPosition(x0, v.y - pad).setSize(w, v.h + 2 * pad);
    this.fill.setTilePosition(Math.round(x0 - room.x), Math.round(v.y - pad - room.y));
    this.ceil.setPosition(x0, v.y - pad).setSize(w, Math.max(1, room.y - v.y + pad)).setVisible(room.y > v.y - pad);
    this.ceil.tilePositionX = tileX;
    this.placeDisc(f, room, headTop);
    const top = s.y + s.h - C.topH;
    this.top.setPosition(x0, top).setSize(w, C.topH);
    this.kick.setPosition(x0, top + C.topH).setSize(w, Math.max(1, v.y + v.h - top - C.topH + pad));
    this.beam.setPosition(x0, Math.floor(v.y)).setSize(w, C.beamH);
    for (const t of [this.top, this.kick, this.beam]) t.tilePositionX = tileX;
    this.placeSigns(f, headTop);
  }

  /** The room art over the whole screen (counterFrame.ts roomPlace); its top-left and scale. */
  private placeRoom(f: CounterFrame, headTop: number): Point & { scale: number } {
    const r = this.room.setTexture(f.orient === 'portrait' ? KITCHEN.roomTall : KITCHEN.roomWide);
    const p = roomPlace(f, r.width, r.height, headTop);
    r.setScale(p.scale).setPosition(p.x, p.y);
    return p;
  }

  /**
   * The disc on the plaster wall of the room art (COUNTER_VIEW.signs.wall), as big as that spot: never past the
   * screen's right edge, never lower than the bubble's room allows (it rises up the wall), never under the HUD.
   */
  private placeDisc(f: CounterFrame, room: Point & { scale: number }, headTop: number): void {
    const at = S.wall[f.orient];
    const r = at.r * room.scale;
    this.discScale = (2 * r) / S.disc;
    const x = Math.min(room.x + at.x * room.scale, f.view.x + f.view.w - r - S.gapPx);
    const y = Math.max(f.free.y + r + S.gapPx, Math.min(room.y + at.y * room.scale, bubbleTop(f, headTop) - r - S.gapPx));
    this.disc.setPosition(Math.round(x), Math.round(y));
    this.showDisc();
  }

  /**
   * The neon centred over the customer at the top of the free area (under the ticket / HUD), at 2x
   * when that still stays over the bubble's room.
   */
  private placeSigns(f: CounterFrame, headTop: number): void {
    const s = f.stage;
    const top = Math.round(Math.max(f.free.y, f.view.y) + S.gapPx);
    const cx = Math.round(s.x + s.w / 2);
    const wide = 2 * NEON.w + 2 * S.gapPx <= Math.min(s.w, f.free.w);
    const scale = wide && top + 2 * NEON.h + S.gapPx <= bubbleTop(f, headTop) ? 2 : 1;
    this.neon.setScale(scale).setPosition(cx, top);
    // two thin chains up to the beam when it hangs under the beam
    const g = this.chains.clear();
    const hook = Math.floor(f.view.y) + C.beamH;
    if (top > hook) {
      g.fillStyle(S.chain, 1);
      for (const dx of [-1, 1]) g.fillRect(Math.round(cx + dx * (scale * NEON.w * S.chainAt)), hook, 1, top - hook + 1);
    }
  }

  /** The disc: the hi-res original logo on its white disc. */
  private showDisc(): void {
    showHiRes(this.disc, KITCHEN.faceDisc, 0, this.discScale);
  }

  /** Neon flicker (frame 1 = brighter). */
  setNeon(bright: boolean): void {
    this.neon.setFrame(bright ? 1 : 0);
  }

  /** The golden finale: bulbs flash (beam frame 1); the neon and the disc give way to the lettering and
   * the finale's big gold face (they would peek out behind them). */
  setGold(gold: boolean, flash: boolean): void {
    this.beam.setFrame(flash ? 1 : 0);
    this.sign.setVisible(!gold);
    this.disc.setVisible(!gold);
  }
}
