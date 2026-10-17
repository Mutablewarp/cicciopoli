/**
 * Everything static-ish on the CICCIO-MAN board: tray-paper surround, the pre-rendered
 * maze, nugget dots, blinking provola sticks, the bonus roulette, the golf hole + flag,
 * the in-maze captions, and the side covers that hide actors inside the tunnel.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import { BONUS_FRAME, MAZE_ANIMS, MAZE_ART } from '../../art/maze/keys';
import { DEPTH } from './actors';
import { CENTRE_SPOT, COLS, HOLE_SPOT, MAZE, MAZE_H, MAZE_W, TILE, TUNNEL_ROWS, centerOf } from './layout';

export type BonusKind = keyof typeof BONUS_FRAME;
/** The bonus flips between the three foods; Ciccio gets whichever is showing. */
export const BONUS_CYCLE: readonly BonusKind[] = ['fries', 'burger', 'wings'];
export const BONUS_POINTS: Readonly<Record<BonusKind, number>> = { fries: 100, burger: 300, wings: 500 };
const BONUS_FLIP_MS = 700;
const PAPER_TINT = 0xb8b0b0;

/** World rectangle currently visible (set by the scene's camera fit). */
export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export class BoardView {
  private readonly backdrop: Phaser.GameObjects.TileSprite;
  private readonly covers: Phaser.GameObjects.TileSprite[];
  private readonly mouths: Phaser.GameObjects.Image[];
  private readonly flashRect: Phaser.GameObjects.Rectangle;
  private readonly dots = new Map<number, Phaser.GameObjects.Image>();
  private readonly sticks = new Map<number, Phaser.GameObjects.Sprite>();
  private readonly bonus: Phaser.GameObjects.Sprite;
  private bonusMs = 0;
  private bonusAge = 0;
  private readonly hole: Phaser.GameObjects.Image;
  private readonly flag: Phaser.GameObjects.Sprite;
  private readonly ready: Phaser.GameObjects.Image;
  private readonly goText: Phaser.GameObjects.Image;

  constructor(private readonly scene: Phaser.Scene) {
    const add = scene.add;
    // the paper around the board is a shade darker so the playfield stays the focus
    this.backdrop = add.tileSprite(0, 0, 64, 64, MAZE_ART.panel).setOrigin(0).setDepth(DEPTH.board - 1).setTint(PAPER_TINT);
    add.rectangle(2, 3, MAZE_W, MAZE_H, 0x000000, 0.4).setOrigin(0).setDepth(DEPTH.board - 0.5); // sheet shadow
    add.image(0, 0, MAZE_ART.board).setOrigin(0).setDepth(DEPTH.board);
    this.flashRect = add.rectangle(0, 0, MAZE_W, MAZE_H, 0xfff4e0, 0.3).setOrigin(0).setDepth(DEPTH.dots + 0.5).setVisible(false);
    this.covers = [0, 1].map(() => add.tileSprite(0, 0, 64, 64, MAZE_ART.panel).setOrigin(0).setDepth(DEPTH.covers).setTint(PAPER_TINT));
    // tunnel mouths: the corridors run on under the tray paper and fade to dark
    this.mouths = TUNNEL_ROWS.flatMap((row) => [
      add.image(0, row * TILE - 8, MAZE_ART.mouth).setOrigin(1, 0).setDepth(DEPTH.covers + 1),
      add.image(MAZE_W, row * TILE - 8, MAZE_ART.mouth).setOrigin(0, 0).setFlipX(true).setDepth(DEPTH.covers + 1),
    ]);
    for (const p of MAZE.dots) {
      this.dots.set(p.r * COLS + p.c, add.image(centerOf(p.c), centerOf(p.r), MAZE_ART.dot).setDepth(DEPTH.dots));
    }
    for (const p of MAZE.powers) {
      this.sticks.set(p.r * COLS + p.c, add.sprite(centerOf(p.c), centerOf(p.r), MAZE_ART.stick, 0).setDepth(DEPTH.dots));
    }
    this.bonus = add.sprite(CENTRE_SPOT.x, CENTRE_SPOT.y, MAZE_ART.bonus, 0).setDepth(DEPTH.items).setVisible(false);
    this.hole = add.image(HOLE_SPOT.x, HOLE_SPOT.y, MAZE_ART.hole).setDepth(DEPTH.hole).setVisible(false);
    this.flag = add.sprite(HOLE_SPOT.x, HOLE_SPOT.y + 1, MAZE_ART.flag, 0).setOrigin(3 / 16, 23 / 24).setDepth(DEPTH.hole + 0.5).setVisible(false);
    this.ready = add.image(CENTRE_SPOT.x, CENTRE_SPOT.y, MAZE_ART.ready).setDepth(DEPTH.text).setVisible(false);
    this.goText = add.image(CENTRE_SPOT.x, CENTRE_SPOT.y, MAZE_ART.goText).setDepth(DEPTH.text).setVisible(false);
  }

  /** Re-fills the paper surround and the tunnel covers for the visible area. */
  layout(view: ViewRect): void {
    const x0 = Math.floor(view.x) - 2;
    const y0 = Math.floor(view.y) - 2;
    const w = Math.ceil(view.w) + 4;
    const h = Math.ceil(view.h) + 4;
    this.place(this.backdrop, x0, y0, w, h);
    const side = Math.max(8, -x0);
    this.place(this.covers[0], -side, y0, side, h);
    this.place(this.covers[1], MAZE_W, y0, Math.max(8, x0 + w - MAZE_W), h);
    for (const m of this.mouths) m.setVisible(view.x < -1 || view.x + view.w > MAZE_W + 1);
  }

  private place(t: Phaser.GameObjects.TileSprite, x: number, y: number, w: number, h: number): void {
    t.setPosition(x, y).setSize(w, h);
    t.setTilePosition(x, y); // anchor the pattern to world space so all pieces line up
  }

  /** Eats whatever is on that tile: 'dot', 'power' or null. */
  eat(c: number, r: number): 'dot' | 'power' | null {
    const k = r * COLS + c;
    const dot = this.dots.get(k);
    if (dot) {
      dot.destroy();
      this.dots.delete(k);
      return 'dot';
    }
    const stick = this.sticks.get(k);
    if (stick) {
      stick.destroy();
      this.sticks.delete(k);
      return 'power';
    }
    return null;
  }

  get remaining(): number {
    return this.dots.size + this.sticks.size;
  }

  /** Debug: every remaining nugget and stick tile. */
  remainingTiles(): { c: number; r: number }[] {
    return [...this.dots.keys(), ...this.sticks.keys()].map((k) => ({ c: k % COLS, r: Math.floor(k / COLS) }));
  }

  /** Provola sticks blink (they freeze, lit, when `blink` is false: ready / death). */
  update(timeMs: number, dtMs: number, blink: boolean): void {
    const on = !blink || Math.floor(timeMs / 180) % 2 === 0;
    for (const s of this.sticks.values()) s.setVisible(on).setFrame(Math.floor(timeMs / 360) % 3 === 0 ? 1 : 0);
    if (this.bonus.visible) {
      this.bonusMs -= dtMs;
      this.bonusAge += dtMs;
      if (this.bonusMs <= 0) this.bonus.setVisible(false);
      else {
        this.bonus.setFrame(BONUS_FRAME[this.bonusKind]);
        // blink during the last second so it never just vanishes
        this.bonus.setAlpha(this.bonusMs < 1000 && Math.floor(this.bonusMs / 120) % 2 === 0 ? 0.35 : 1);
      }
    }
  }

  showBonus(ms: number): void {
    this.bonusMs = ms;
    this.bonusAge = 0;
    this.bonus.setVisible(true).setScale(0.2);
    this.scene.tweens.add({ targets: this.bonus, scale: 1, duration: 260, ease: 'Back.easeOut' });
  }

  get bonusKind(): BonusKind {
    return BONUS_CYCLE[Math.floor(this.bonusAge / BONUS_FLIP_MS) % BONUS_CYCLE.length];
  }

  get bonusActive(): boolean {
    return this.bonus.visible;
  }

  hideBonus(): void {
    this.bonus.setVisible(false);
  }

  /** Both captions share CENTRE_SPOT: "VAI IN BUCA!" (hole open) steps aside while "PRONTI!" shows. */
  showReady(on: boolean): void {
    this.ready.setVisible(on);
    this.goText.setVisible(!on && this.hole.visible);
  }

  /** Board cleared: the golf hole opens with its flag and the caption starts blinking. */
  openHole(): void {
    this.hideBonus();
    this.hole.setVisible(true).setScale(0.1);
    this.scene.tweens.add({ targets: this.hole, scale: 1, duration: 320, ease: 'Back.easeOut' });
    this.flag.setVisible(true).setScale(1, 0.1);
    this.scene.tweens.add({ targets: this.flag, scaleY: 1, delay: 200, duration: 300, ease: 'Back.easeOut' });
    if (this.scene.anims.exists(MAZE_ANIMS.flag)) this.flag.play(MAZE_ANIMS.flag);
    this.goText.setVisible(true);
    this.scene.tweens.add({ targets: this.goText, alpha: { from: 1, to: 0.25 }, duration: 380, yoyo: true, repeat: -1 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const s = this.scene.add.sprite(HOLE_SPOT.x, HOLE_SPOT.y, ITEMS.sparkle, 0).setDepth(DEPTH.popup);
      this.scene.tweens.add({ targets: s, x: HOLE_SPOT.x + Math.cos(a) * 14, y: HOLE_SPOT.y + Math.sin(a) * 10, duration: 360 });
      if (this.scene.anims.exists(ITEM_ANIMS.sparkle)) s.play(ITEM_ANIMS.sparkle).once('animationcomplete', () => s.destroy());
      else this.scene.time.delayedCall(360, () => s.destroy());
    }
  }

  hideGoText(): void {
    this.goText.setVisible(false);
  }

  /** Cleared-board flash: the whole tray blinks a few times. */
  flash(timeMs: number): void {
    this.flashRect.setVisible(Math.floor(timeMs / 180) % 2 === 0);
  }

  stopFlash(): void {
    this.flashRect.setVisible(false);
  }
}
