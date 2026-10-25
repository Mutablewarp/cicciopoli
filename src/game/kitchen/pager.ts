/**
 * The tabs of a paged kitchen (KitchenPlan.pages): on MONTAGGIO the "COTTURA" tab with an arrow to the right,
 * on COTTURA the "MONTAGGIO" tab with an arrow to the left. The COTTURA tab carries a live mini cook bar per
 * griddle slot / fryer basket in use (raw red -> PERFETTO gold -> troppo cotto -> bruciato, the white marker
 * moving; its frame blinks gold in the PERFETTO window, red when it starts to burn), so the cooking is watched
 * from MONTAGGIO. A tab pulses when something on the other page needs the player. World px, in the kitchen's
 * container; only the shown page's tab is visible.
 */
import type Phaser from 'phaser';
import { KITCHEN_COLORS, KITCHEN_FX, PAGER } from './config';
import { labelTexture } from './labels';
import type { BasketView, CookRing, GriddleSlotView } from './logic/types';
import type { KitchenPage, KitchenPlan } from './plan';

const C = KITCHEN_COLORS;
const PLATE = { fill: 0x1c1a20, alpha: 0.94, rim: 0xffd23a, glow: 0xfff2a0 } as const;
/** the arrow (tab px x the page's label scale), its gap to the text; the bar row under the text */
const ARROW = { w: 5, h: 9, gap: 3 } as const;
const BARS_GAP = 4;
const MARGIN = 4;
/** the bars' group gap (griddle | fryer), in bar gaps */
const GROUP_GAPS = 2;
/** the pulse: the tab grows this much and its rim glows */
const PULSE_GROW = 0.06;

interface Tab {
  readonly page: KitchenPage;
  /** scale of the label and the arrow: the page's label scale, less on a tab too narrow for them */
  readonly k: number;
  readonly box: Phaser.GameObjects.Container;
  readonly plate: Phaser.GameObjects.Graphics;
  readonly text: Phaser.GameObjects.Image;
  readonly arrow: Phaser.GameObjects.Graphics;
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
    this.tabs = paged ? plan.pages.map((p) => this.make(p)) : [];
    (this.tabs[0]?.box ?? this.root).add(this.bars);
  }

  private make(page: KitchenPage): Tab {
    const add = this.scene.add;
    const t = page.tab;
    // centred on the tab (it grows from its centre when it pulses)
    const box = add.container(t.x + t.w / 2, t.y + t.h / 2);
    const plate = add.graphics();
    const text = add.image(0, 0, labelTexture(this.scene, [page.label], 'float', C.text.cream)).setOrigin(0.5, 0.5);
    const k = Math.min(page.art.label, (t.w - 2 * MARGIN) / (text.width + ARROW.gap + ARROW.w));
    text.setScale(k);
    const arrow = add.graphics();
    box.add([plate, text, arrow]);
    this.root.add(box);
    const tab = { page, k, box, plate, text, arrow };
    this.drawPlate(tab, false);
    this.placeText(tab, false);
    return tab;
  }

  private drawPlate(t: Tab, glow: boolean): void {
    const { w, h } = t.page.tab;
    const g = t.plate.clear();
    g.fillStyle(glow ? PLATE.glow : PLATE.rim, 1).fillRect(-w / 2 + 1, -h / 2, w - 2, h).fillRect(-w / 2, -h / 2 + 1, w, h - 2);
    g.fillStyle(PLATE.fill, PLATE.alpha).fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, h - 4);
  }

  /** The label (higher when the bars are under it) and the gold arrow beside it, pointing where the other page is. */
  private placeText(t: Tab, bars: boolean): void {
    const k = t.k;
    const arrowW = ARROW.w * k;
    const gap = ARROW.gap * k;
    const textW = t.text.displayWidth;
    const all = textW + gap + arrowW;
    const right = t.page.dir === 'right';
    const cy = bars ? -t.page.tab.h / 2 + MARGIN + t.text.displayHeight / 2 + 2 : 0;
    t.text.setPosition(right ? -all / 2 + textW / 2 : all / 2 - textW / 2, cy);
    const ax = right ? all / 2 - arrowW : -all / 2;
    const g = t.arrow.clear();
    g.fillStyle(C.perfect, 1);
    const rows = Math.round(ARROW.h * k);
    for (let i = 0; i < rows; i++) {
      const u = 1 - Math.abs(i - (rows - 1) / 2) / (rows / 2);
      const len = Math.max(1, Math.round(arrowW * u));
      g.fillRect(right ? ax : ax + arrowW - len, Math.round(cy - rows / 2) + i, len, 1);
    }
  }

  /**
   * The tab of the page on screen (`at` = the camera between pages, 0..1), the cook bars on COTTURA's,
   * pulsing when `needs` (something on the other page wants the player).
   */
  sync(at: number, griddle: readonly (GriddleSlotView | null)[], fryer: readonly (BasketView | null)[], timeMs: number, needs: boolean): void {
    const beat = needs ? 0.5 + 0.5 * Math.sin((timeMs / PAGER.pulseMs) * Math.PI * 2) : 0;
    this.tabs.forEach((t, i) => {
      t.box.setAlpha(Math.max(0, 1 - Math.abs(at - i) * 2)).setVisible(Math.abs(at - i) < 0.5);
      t.box.setScale(1 + PULSE_GROW * beat);
      this.drawPlate(t, beat > 0.5);
    });
    const t = this.tabs[0];
    if (!t) return;
    const g = this.bars.clear();
    const items = [griddle, fryer].map((list) => list.filter((v): v is GriddleSlotView | BasketView => v !== null));
    const n = items[0].length + items[1].length;
    const had = t.text.y !== 0;
    if (had !== n > 0) this.placeText(t, n > 0);
    if (n === 0) return;
    const k = t.page.art.label;
    const both = items[0].length > 0 && items[1].length > 0;
    const gap = PAGER.bar.gap * k;
    const room = t.page.tab.w - 2 * MARGIN - (n - 1 + (both ? GROUP_GAPS : 0)) * gap;
    const bw = Math.max(4, Math.min(PAGER.bar.w * k, Math.floor(room / n)));
    const bh = Math.round(PAGER.bar.h * k);
    const w = n * bw + (n - 1) * gap + (both ? GROUP_GAPS * gap : 0);
    let x = Math.round(-w / 2);
    const y = Math.round(t.text.y + t.text.displayHeight / 2 + BARS_GAP * k);
    const blink = Math.floor(timeMs / KITCHEN_FX.cueBlinkMs) % 2 === 0;
    items.forEach((list, j) => {
      if (j === 1 && both) x += GROUP_GAPS * gap;
      for (const v of list) {
        this.bar(g, v, x, y, bw, bh, blink);
        x += bw + gap;
      }
    });
  }

  private bar(g: Phaser.GameObjects.Graphics, v: CookRing, x: number, y: number, w: number, h: number, blink: boolean): void {
    const span = v.burntAtMs * 1.08;
    const px = (ms: number): number => Math.round((Math.min(ms, span) / span) * w);
    const frame = v.phase === 'perfect' && blink ? C.perfect : (v.phase === 'over' || v.phase === 'burnt') && blink ? C.urgent : C.barFrame;
    g.fillStyle(frame, 1).fillRect(x - 1, y - 1, w + 2, h + 2);
    const bands: [number, number, number][] = [
      [0, v.perfectAtMs, C.raw],
      [v.perfectAtMs, v.overAtMs, C.perfect],
      [v.overAtMs, v.burntAtMs, C.over],
      [v.burntAtMs, span, C.burnt],
    ];
    for (const [a, b, color] of bands) g.fillStyle(color, 1).fillRect(x + px(a), y, px(b) - px(a), h);
    g.fillStyle(C.marker, 1).fillRect(x + Math.min(w - 1, px(v.ms)), y - 1, 1, h + 2);
  }
}
