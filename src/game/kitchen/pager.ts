/**
 * The paged kitchen (a phone too short for the whole plan, KitchenPlan.pages): the tab at the bottom
 * of each page that switches to the other one ("COTTURA" with a down arrow under MONTAGGIO, "MONTAGGIO"
 * with an up arrow under COTTURA). The COTTURA tab carries a live mini cook bar per griddle slot / fryer
 * basket in use (raw red -> PERFETTO gold -> troppo cotto -> bruciato, the white marker moving; its
 * frame blinks gold in the PERFETTO window, red when it starts to burn), so the cooking is watched from
 * MONTAGGIO. World px, in the kitchen's container; only the shown page's tab is visible.
 */
import type Phaser from 'phaser';
import { KITCHEN_COLORS, KITCHEN_FX, PAGER } from './config';
import { labelTexture } from './labels';
import type { BasketView, CookRing, GriddleSlotView } from './logic/types';
import type { KitchenPage, KitchenPlan } from './plan';

const C = KITCHEN_COLORS;
const PLATE = { fill: 0x1c1a20, alpha: 0.94, rim: 0xffd23a } as const;
const ARROW = { w: 9, h: 5, gap: 5 } as const;
/** the label's top and the bars' top, px under the tab's top (with bars / without) */
const TEXT_DY = { bars: 7, alone: 12 } as const;
const BARS_DY = 27;
/** between the griddle's bars and the fryer's */
const GROUP_GAP = 8;

interface Tab {
  readonly page: KitchenPage;
  readonly box: Phaser.GameObjects.Container;
  readonly text: Phaser.GameObjects.Image;
  readonly arrows: Phaser.GameObjects.Graphics;
}

export class PageTabs {
  readonly root: Phaser.GameObjects.Container;
  private tabs: Tab[] = [];
  private readonly bars: Phaser.GameObjects.Graphics;

  constructor(private readonly scene: Phaser.Scene) {
    this.root = scene.add.container(0, 0);
    this.bars = scene.add.graphics();
  }

  /** The plan's tabs (none when the kitchen is on one screen). */
  setPlan(plan: KitchenPlan, paged: boolean): void {
    // the bars outlive the tabs they sit on
    this.tabs[0]?.box.remove(this.bars);
    this.tabs.forEach((t) => t.box.destroy());
    this.tabs = paged && plan.pages ? plan.pages.map((p) => this.make(p)) : [];
    (this.tabs[0]?.box ?? this.root).add(this.bars);
  }

  private make(page: KitchenPage): Tab {
    const add = this.scene.add;
    const t = page.tab;
    const box = add.container(t.x, t.y);
    const plate = add.graphics();
    plate.fillStyle(PLATE.rim, 1).fillRect(1, 0, t.w - 2, t.h).fillRect(0, 1, t.w, t.h - 2);
    plate.fillStyle(PLATE.fill, PLATE.alpha).fillRect(1, 1, t.w - 2, t.h - 2);
    const text = add.image(t.w / 2, 0, labelTexture(this.scene, [page.label], 'float', C.text.cream)).setOrigin(0.5, 0).setScale(PAGER.textScale);
    const arrows = add.graphics();
    box.add([plate, text, arrows]);
    this.root.add(box);
    const tab = { page, box, text, arrows };
    this.placeText(tab, false);
    return tab;
  }

  /** The label (higher when the bars are under it) and two gold arrows either side of it, pointing where the other page is. */
  private placeText(t: Tab, bars: boolean): void {
    t.text.setY(bars ? TEXT_DY.bars : TEXT_DY.alone);
    const g = t.arrows.clear();
    const half = (t.text.displayWidth / 2) | 0;
    const cy = t.text.y + t.text.displayHeight / 2;
    g.fillStyle(C.perfect, 1);
    for (const x of [t.page.tab.w / 2 - half - ARROW.gap - ARROW.w, t.page.tab.w / 2 + half + ARROW.gap]) {
      for (let i = 0; i < ARROW.h; i++) {
        const row = t.page.dir === 'down' ? i : ARROW.h - 1 - i;
        g.fillRect(x + i, Math.round(cy - ARROW.h / 2) + row, ARROW.w - 2 * i, 1);
      }
    }
  }

  /** The tab of the page on screen (`at` = the camera between pages, 0..1), the cook bars on COTTURA's. */
  sync(at: number, griddle: readonly (GriddleSlotView | null)[], fryer: readonly (BasketView | null)[], timeMs: number): void {
    this.tabs.forEach((t, i) => t.box.setAlpha(Math.max(0, 1 - Math.abs(at - i) * 2)).setVisible(Math.abs(at - i) < 0.5));
    const t = this.tabs[0];
    if (!t) return;
    const g = this.bars.clear();
    const items = [griddle, fryer].map((list) => list.filter((v): v is GriddleSlotView | BasketView => v !== null));
    const n = items[0].length + items[1].length;
    const had = t.text.y === TEXT_DY.bars;
    if (had !== n > 0) this.placeText(t, n > 0);
    if (n === 0) return;
    const B = PAGER.bar;
    const w = n * B.w + (n - 1) * B.gap + (items[0].length && items[1].length ? GROUP_GAP - B.gap : 0);
    let x = Math.round(t.page.tab.w / 2 - w / 2);
    const blink = Math.floor(timeMs / KITCHEN_FX.cueBlinkMs) % 2 === 0;
    items.forEach((list, k) => {
      if (k === 1 && items[0].length && list.length) x += GROUP_GAP - B.gap;
      for (const v of list) {
        this.bar(g, v, x, BARS_DY, blink);
        x += B.w + B.gap;
      }
    });
  }

  private bar(g: Phaser.GameObjects.Graphics, v: CookRing, x: number, y: number, blink: boolean): void {
    const B = PAGER.bar;
    const span = v.burntAtMs * 1.08;
    const px = (ms: number): number => Math.round((Math.min(ms, span) / span) * B.w);
    const frame = v.phase === 'perfect' && blink ? C.perfect : (v.phase === 'over' || v.phase === 'burnt') && blink ? C.urgent : C.barFrame;
    g.fillStyle(frame, 1).fillRect(x - 1, y - 1, B.w + 2, B.h + 2);
    const bands: [number, number, number][] = [
      [0, v.perfectAtMs, C.raw],
      [v.perfectAtMs, v.overAtMs, C.perfect],
      [v.overAtMs, v.burntAtMs, C.over],
      [v.burntAtMs, span, C.burnt],
    ];
    for (const [a, b, color] of bands) g.fillStyle(color, 1).fillRect(x + px(a), y, px(b) - px(a), B.h);
    g.fillStyle(C.marker, 1).fillRect(x + Math.min(B.w - 1, px(v.ms)), y - 1, 1, B.h + 2);
  }
}
