/**
 * The CUCINA plans of level 7 (world px = art px, origin top-left), laid out like the Good Pizza prep
 * screen (ref/level7_gp_build_toppings.png): MONTAGGIO = a neat panel of big pans (a top row and a
 * column each side) framing the wooden board where the burger grows, the trash at its edge, the tray
 * right under the board; COTTURA = the griddle and the fryer with their raw pans and the drinks racks.
 * 'tall' (phones held upright) stacks MONTAGGIO over COTTURA; on a phone too short for both, its two
 * halves are two pages (`pages`) switched by a tab or a swipe. 'wide' (landscape, desktop) has
 * COTTURA on the right, like the oven. The griddle's raw pans sit next to the griddle, the fryer's next
 * to the fryer. Every tap area is at least HIT_MIN px on each side (tested).
 */

export type Orient = 'portrait' | 'landscape';

export interface XY {
  readonly x: number;
  readonly y: number;
}
export interface Box extends XY {
  readonly w: number;
  readonly h: number;
}

/** A pan place (its tap area): the pan on top, its label tape on the front lip. */
export const CELL = { w: 50, h: 46 } as const;
/** No tap area of a plan is narrower or shorter than this (world px; the framing keeps it >= 44 CSS px). */
export const HIT_MIN = 44;

export interface KitchenPage {
  /** what the page shows (plan px), its tab included */
  readonly view: Box;
  /** the tab that switches to the other page (its tap area) */
  readonly tab: Box;
  /** where the other page is: the tab's arrow */
  readonly dir: 'up' | 'down';
  readonly label: string;
}

export interface KitchenPlan {
  readonly size: { readonly w: number; readonly h: number };
  readonly griddle: XY;
  readonly fryer: XY;
  /** drawn at TRASH_SCALE */
  readonly trash: XY;
  readonly shelves: readonly XY[];
  /** drawn at MONTAGGIO.scale; the closed burger may rise MONTAGGIO.room over its base */
  readonly paper: XY;
  /** drawn at MONTAGGIO.trayScale */
  readonly tray: XY;
  /** the wooden board under the paper and the steel panel the MONTAGGIO pans sit in */
  readonly board: Box;
  readonly panel: Box;
  /** pan places of the griddle pans (nearest the griddle first), of the fryer pans (nearest the fryer
   * first) and of the cold ones (nearest the board first): a group that overflows its own places takes
   * the free ones nearest its station, on the cooking side first for the cooking groups (layout.ts) */
  readonly griddleRail: readonly Box[];
  readonly fryRail: readonly Box[];
  readonly coldRail: readonly Box[];
  readonly sauces: readonly Box[];
  readonly bun: Box;
  /** MONTAGGIO and COTTURA as two pages when the plan does not fit one screen (null: never paged) */
  readonly pages: readonly [KitchenPage, KitchenPage] | null;
}

const cell = (x: number, y: number, w: number = CELL.w): Box => ({ x, y, w, h: CELL.h });
const col = (x: number, ys: readonly number[], w: number = CELL.w): Box[] => ys.map((y) => cell(x, y, w));

export const KITCHEN_PLAN: Readonly<Record<Orient, KitchenPlan>> = {
  // MONTAGGIO y 0..184 (top row of 6, a column each side of the board, the trash bottom left, sauces and
  // CHIUDI on the right), COTTURA y 186..370 (the tray under the board; the griddle left with its two pans
  // over and under it, the fryer right with its column of four; the racks under them)
  portrait: {
    size: { w: 300, h: 370 },
    panel: { x: -2, y: -2, w: 304, h: 188 },
    board: { x: 56, y: 50, w: 188, h: 132 },
    paper: { x: 74, y: 136 },
    trash: { x: 5, y: 139 },
    coldRail: [cell(100, 0), cell(150, 0), cell(50, 0), cell(200, 0), cell(0, 0), cell(250, 0), ...col(0, [46, 92])],
    sauces: col(250, [46, 92]),
    bun: cell(250, 138),
    tray: { x: 48, y: 187 },
    griddle: { x: 8, y: 258 },
    fryer: { x: 140, y: 258 },
    shelves: [{ x: 56, y: 322 }, { x: 152, y: 322 }],
    griddleRail: [cell(0, 186, 48), cell(0, 324)],
    fryRail: [cell(250, 278), cell(250, 232), cell(250, 324), cell(250, 186)],
    pages: [
      { view: { x: 0, y: 0, w: 300, h: 230 }, tab: { x: 50, y: 186, w: 200, h: HIT_MIN }, dir: 'down', label: 'COTTURA' },
      { view: { x: 0, y: 186, w: 300, h: 230 }, tab: { x: 50, y: 372, w: 200, h: HIT_MIN }, dir: 'up', label: 'MONTAGGIO' },
    ],
  },
  // MONTAGGIO x 0..250 (top row of 5, a column each side of the board), the tray under it; COTTURA on the
  // right (griddle over fryer, the fryer's five pans round it), the racks under it; the griddle's pans at
  // the top row's right end, next to it. 4 px under the racks' labels: they never touch the screen's edge.
  landscape: {
    size: { w: 410, h: 270 },
    panel: { x: -2, y: -2, w: 254, h: 188 },
    board: { x: 53, y: 50, w: 144, h: 132 },
    paper: { x: 49, y: 134 },
    trash: { x: 5, y: 139 },
    coldRail: [cell(100, 0), cell(50, 0), cell(0, 0), ...col(0, [46, 92], 49)],
    sauces: col(201, [46, 92], 49),
    bun: cell(201, 138, 49),
    tray: { x: 0, y: 187 },
    griddle: { x: 260, y: 0 },
    fryer: { x: 276, y: 62 },
    shelves: [{ x: 208, y: 218 }, { x: 304, y: 218 }],
    griddleRail: [cell(200, 0), cell(150, 0)],
    fryRail: [cell(269, 124), cell(319, 124), cell(362, 66, 48), cell(269, 170), cell(319, 170)],
    pages: null,
  },
};
