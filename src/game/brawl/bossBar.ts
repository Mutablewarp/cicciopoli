/**
 * The mini-boss life bar: a small burger icon (so it reads as "his life"), a dark frame, a
 * magenta fill split in one notch per hit point, and a white flash on every hit. One
 * container that follows the boss; the fill is the only part that changes.
 */
import type Phaser from 'phaser';
import { DEPTH } from '../depths';

const ICON = 16;
const GAP = 3;
const BAR_W = 56;
const BAR_H = 6;
const FILL = 0xe0309c;
const INK = 0x14081c;
const FLASH_MS = 90;

export class BossBar {
  private readonly box: Phaser.GameObjects.Container;
  private readonly fill: Phaser.GameObjects.Rectangle;
  private shown: number;

  constructor(
    private readonly scene: Phaser.Scene,
    iconKey: string,
    private readonly maxHp: number,
  ) {
    this.shown = maxHp;
    const total = ICON + GAP + BAR_W + 2;
    const left = -total / 2;
    const barLeft = left + ICON + GAP + 1;
    const icon = scene.add.image(left + ICON / 2, 0, iconKey, 0).setDisplaySize(ICON, ICON);
    const back = scene.add.rectangle(barLeft - 1 + (BAR_W + 2) / 2, 0, BAR_W + 2, BAR_H + 2, INK).setStrokeStyle(1, 0xffffff);
    this.fill = scene.add.rectangle(barLeft, 0, BAR_W, BAR_H, FILL).setOrigin(0, 0.5);
    const notches = Array.from({ length: maxHp - 1 }, (_, i) =>
      scene.add.rectangle(barLeft + ((i + 1) * BAR_W) / maxHp, 0, 1, BAR_H, INK),
    );
    this.box = scene.add.container(0, 0, [icon, back, this.fill, ...notches]).setDepth(DEPTH.popup);
  }

  /** Pins the bar at (x, y) and shows `hp` hit points left. */
  update(x: number, y: number, hp: number): void {
    this.box.setPosition(Math.round(x), Math.round(y));
    if (hp < this.shown) {
      this.fill.setFillStyle(0xffffff);
      this.scene.time.delayedCall(FLASH_MS, () => {
        if (this.fill.active) this.fill.setFillStyle(FILL);
      });
    }
    this.shown = hp;
    this.fill.width = Math.max(0, BAR_W * (hp / this.maxHp));
  }

  destroy(): void {
    this.box.destroy();
  }
}
