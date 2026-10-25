/**
 * The CUCINA plans of level 7 (world px = art px of the stations, origin top-left), two pages each, one
 * station per screen like the Good Pizza prep screens (ref/level7_gp_build_*.png): page 0 = MONTAGGIO (a
 * steel panel of big pans round the wooden board where the burger grows, the trash, the tray with the
 * menù parts), page 1 = COTTURA right of it (the big griddle and fryer at the manifest sizes, their raw
 * pans next to them, the drinks racks). Each page is framed on its own (its own zoom: layout.ts); a big
 * screen shows both side by side at one zoom. The pages share their centre's y, so the camera glides
 * between them (and from the counter) without showing the void. Every page lists the art scales of its
 * pans / labels and the smallest side of its tap areas (`hit`, tested), so the framing can keep every
 * tap >= KITCHEN_VIEW.tapCss CSS px and pick the plan that holds the v7 sizes best (framing.ts).
 *  - tall: portrait phones with room (390x844 class): COTTURA stacks the griddle over the fryer.
 *  - compact: short portrait phones (an iPhone 13 in Safari, 360x640, 375x667): the same, packed tighter.
 *  - land / land43: landscape phones (wide / 4:3-ish free areas): the board on the left, bigger pans right of it;
 *    the griddle and the fryer side by side.
 *  - short: short and wide free areas the others do not fit.
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

/** Art scales of a page's pans (bin, contents, CHIUDI's brioche, sauce bottles, drinks racks and cans) and label tapes. */
export interface PageArt {
  readonly pan: number;
  readonly label: number;
}

export interface KitchenPage {
  /** what the page shows (plan px), its tab included */
  readonly view: Box;
  /** the tab that switches to the other page (its tap area) */
  readonly tab: Box;
  /** where the other page is */
  readonly dir: 'left' | 'right';
  readonly label: string;
  readonly art: PageArt;
  /** the smallest side of the page's tap areas, plan px (plan.test.ts) */
  readonly hit: number;
}

/** The burger's board: base drawing scale of the burger, its paper, the tray and the trash. */
export interface BoardArt {
  readonly stack: number;
  readonly paper: number;
  readonly tray: number;
  readonly trash: number;
}

export interface KitchenPlan {
  readonly name: 'tall' | 'compact' | 'short' | 'land' | 'land43';
  /** MONTAGGIO, COTTURA */
  readonly pages: readonly [KitchenPage, KitchenPage];
  /* ------------------------------------------------ MONTAGGIO */
  readonly art: BoardArt;
  /** the steel panel the pans sit in, the wooden board under the paper */
  readonly panel: Box;
  readonly board: Box;
  readonly paper: XY;
  /** world px the closed burger may rise over its base (a taller one shrinks into it) */
  readonly room: number;
  readonly tray: XY;
  readonly trash: XY;
  /** cold pan places, nearest the board first (at most KITCHEN_DECK.maxBins) */
  readonly coldRail: readonly Box[];
  /** sauce bottles: the order's (+ at most one decoy) */
  readonly sauces: readonly Box[];
  /** CHIUDI: the pan of brioche tops */
  readonly bun: Box;
  /* ------------------------------------------------ COTTURA */
  readonly griddle: XY;
  readonly fryer: XY;
  /** the raw pans of the griddle (nearest it first) and of the fryer */
  readonly griddleRail: readonly Box[];
  readonly fryRail: readonly Box[];
  /** the 4 drink places, two per rack (the racks and the cans fit them: layout.ts) */
  readonly drinks: readonly Box[];
}

const box = (x: number, y: number, w: number, h: number): Box => ({ x, y, w, h });
/** a page's local boxes moved by (dx, dy) */
const at = (dx: number, dy: number) => (b: Box): Box => box(b.x + dx, b.y + dy, b.w, b.h);
const xy = (dx: number, dy: number) => (p: XY): XY => ({ x: p.x + dx, y: p.y + dy });
/** gap between the two pages (plan px) */
const PAGE_GAP = 24;

interface Local {
  readonly w: number;
  readonly h: number;
}

/** COTTURA's local boxes placed right of MONTAGGIO (size m), centred on the same y. */
function cottura(m: Local, c: Local): { dx: number; dy: number } {
  return { dx: m.w + PAGE_GAP, dy: (m.h - c.h) / 2 };
}

/** MONTAGGIO's pans: x1.25 (72 CSS px wide at zoom 1.2), labels x1.875 (the widest line, 36 font px, fills a 72 px cell). */
const M_ART: PageArt = { pan: 1.25, label: 1.875 };
const mCell = (h: number) => (x: number, y: number): Box => box(x, y, 72, h);

/* ------------------------------------------------------------------ tall */

// MONTAGGIO 325 x 346: four pans across the top, two pans and the tab down the left of the board, the sauces and
// CHIUDI down its right, the tray under it with the trash beside it. Cells 72 x 62.
const TM: Local = { w: 325, h: 346 };
// COTTURA 220 x 282: the griddle (80% of the page's width), the fryer under it with the griddle's two pans beside it,
// the fryer's three pans and the tab in a row under it, the four drinks along the bottom. Pans x1, labels x1.25
// (cells 86 / 55 x 46, drinks 55 x 46).
const TC: Local = { w: 220, h: 282 };
const tc = cottura(TM, TC);
const tcb = at(tc.dx, tc.dy);
const tcp = xy(tc.dx, tc.dy);
const tCell = mCell(62);
const t: KitchenPlan = {
  name: 'tall',
  pages: [
    { view: box(0, 0, TM.w, TM.h), tab: box(0, 188, 72, 62), dir: 'right', label: 'COTTURA', art: M_ART, hit: 60 },
    { view: tcb(box(0, 0, TC.w, TC.h)), tab: tcb(box(165, 188, 55, 46)), dir: 'left', label: 'MONTAGGIO', art: { pan: 1, label: 1.25 }, hit: 46 },
  ],
  art: { stack: 3, paper: 2.25, tray: 2, trash: 1.4 },
  panel: box(-2, -2, 329, 254),
  board: box(74, 64, 177, 186),
  paper: { x: 77, y: 203 },
  room: 166,
  tray: { x: 0, y: 254 },
  trash: { x: 280, y: 300 },
  coldRail: [tCell(84, 0), tCell(169, 0), tCell(0, 0), tCell(253, 0), tCell(0, 64), tCell(0, 126)],
  sauces: [tCell(253, 64), tCell(253, 126)],
  bun: tCell(253, 188),
  griddle: tcp({ x: 0, y: 0 }),
  fryer: tcp({ x: 0, y: 94 }),
  griddleRail: [box(134, 94, 86, 46), box(134, 140, 86, 46)].map(tcb),
  fryRail: [0, 55, 110].map((x) => tcb(box(x, 188, 55, 46))),
  drinks: [0, 55, 110, 165].map((x) => tcb(box(x, 236, 55, 46))),
};

/* ------------------------------------------------------------------ compact */

// MONTAGGIO 307 x 298 (an iPhone 13 in Safari leaves it 390 x 369 CSS px under the ticket): four pans across the top,
// one down the left of the board over the tab and the trash, four down its right, the tray (x1.75) under the board.
// Cells 72 x 58 (the tray's places 52.5 wide: the page's smallest tap side).
const CM: Local = { w: 307, h: 298 };
// COTTURA 243 x 230: the griddle with a pan and the tab beside it, the fryer right under it with four pans beside it
// (the griddle's second one nearest), the four drinks along the bottom. Pans x1, labels x1.43; cells 65 / 54.5 x 46,
// drinks 60.75 x 45.
const CC: Local = { w: 243, h: 230 };
const cc = cottura(CM, CC);
const ccb = at(cc.dx, cc.dy);
const ccp = xy(cc.dx, cc.dy);
const cCell = mCell(58);
const c: KitchenPlan = {
  name: 'compact',
  pages: [
    { view: box(0, 0, CM.w, CM.h), tab: box(0, 120, 72, 58), dir: 'right', label: 'COTTURA', art: M_ART, hit: 52.5 },
    { view: ccb(box(0, 0, CC.w, CC.h)), tab: ccb(box(178, 46, 65, 46)), dir: 'left', label: 'MONTAGGIO', art: { pan: 1, label: 1.43 }, hit: 45 },
  ],
  art: { stack: 3, paper: 1.875, tray: 1.75, trash: 1.2 },
  panel: box(-2, -2, 311, 302),
  board: box(74, 60, 159, 155),
  paper: { x: 82, y: 175 },
  room: 138,
  tray: { x: 0, y: 217 },
  trash: { x: 20, y: 180 },
  coldRail: [cCell(78, 0), cCell(157, 0), cCell(0, 60), cCell(235, 60), cCell(0, 0), cCell(235, 0)],
  sauces: [cCell(235, 120), cCell(235, 180)],
  bun: cCell(235, 240),
  griddle: ccp({ x: 0, y: 0 }),
  fryer: ccp({ x: 0, y: 93 }),
  griddleRail: [box(178, 0, 65, 46), box(188.5, 93, 54.5, 46)].map(ccb),
  fryRail: [box(134, 93, 54.5, 46), box(134, 139, 54.5, 46), box(188.5, 139, 54.5, 46)].map(ccb),
  drinks: [0, 60.75, 121.5, 182.25].map((x) => ccb(box(x, 185, 60.75, 45))),
};

/* ------------------------------------------------------------------ short */

// COTTURA 320 x 208 (short, land, land43): the griddle and the fryer side by side, their five pans under them, the two
// racks (two drinks each, places 60 wide) and the tab along the bottom, 4 px over the page's edge (a landscape page fills
// the screen's height: the last row of the labels stays on it). Cells 64 x 54 (pans x1.1, labels x1.625).
const SC: Local = { w: 320, h: 208 };
type Cottura = Pick<KitchenPlan, 'griddle' | 'fryer' | 'griddleRail' | 'fryRail' | 'drinks'> & { page: KitchenPage };
function sideBySide(m: Local): Cottura {
  const c = cottura(m, SC);
  const b = at(c.dx, c.dy);
  const p = xy(c.dx, c.dy);
  const cell = (x: number): Box => b(box(x, 94, 64, 54));
  return {
    page: { view: b(box(0, 0, SC.w, SC.h)), tab: b(box(240, 148, 80, 56)), dir: 'left', label: 'MONTAGGIO', art: { pan: 1.1, label: 1.625 }, hit: 54 },
    griddle: p({ x: 2, y: 0 }),
    fryer: p({ x: 186, y: 0 }),
    griddleRail: [cell(64), cell(0)],
    fryRail: [cell(192), cell(256), cell(128)],
    drinks: [0, 60, 120, 180].map((x) => b(box(x, 148, 60, 56))),
  };
}

// short MONTAGGIO 360 x 278: five pans across the top, two down each side of the board, the tray under it, the
// trash and the tab beside the tray. Cells 72 x 60.
const SM: Local = { w: 360, h: 278 };
const sCell = mCell(60);
const { page: shortC, ...shortCook } = sideBySide(SM);
const s: KitchenPlan = {
  name: 'short',
  pages: [{ view: box(0, 0, SM.w, SM.h), tab: box(288, 186, 72, 92), dir: 'right', label: 'COTTURA', art: M_ART, hit: 60 }, shortC],
  art: { stack: 3, paper: 2.25, tray: 2, trash: 1.4 },
  panel: box(-2, -2, 364, 186),
  board: box(74, 62, 212, 120),
  paper: { x: 94, y: 136 },
  room: 101,
  tray: { x: 0, y: 186 },
  trash: { x: 246, y: 236 },
  coldRail: [sCell(144, 0), sCell(72, 0), sCell(216, 0), sCell(0, 0), sCell(288, 0), sCell(0, 62)],
  sauces: [sCell(0, 122), sCell(288, 62)],
  bun: sCell(288, 122),
  ...shortCook,
};

/* ------------------------------------------------------------------ land / land43 */

// land MONTAGGIO 436 x 241 (an iPhone 13 in landscape leaves it 525 x 290 CSS px right of the ticket): the tab and a pan over
// the tall board on the left (156 wide: the burger clear of its edges; room for the tallest burger), eight pans in two rows
// right of it, the second row reaching down to the tray (x1.75), the trash beside the tray. Cells 70 wide, the top row 66
// tall like the tab and the pan over the board, the second 90 (its pans in its middle); pans x1.35 (78 CSS px wide at zoom
// 1.2), labels x1.84 (the widest line fills the 70 px cell, letters 11 CSS px).
const LM: Local = { w: 436, h: 241 };
const lCell = (x: number, row: 0 | 1): Box => (row ? box(x, 68, 70, 90) : box(x, 0, 70, 66));
const { page: landC, ...landCook } = sideBySide(LM);
const land: KitchenPlan = {
  name: 'land',
  pages: [{ view: box(0, 0, LM.w, LM.h), tab: box(0, 0, 78, 66), dir: 'right', label: 'COTTURA', art: { pan: 1.35, label: 1.84 }, hit: 52.5 }, landC],
  art: { stack: 3, paper: 1.75, tray: 1.75, trash: 1.2 },
  panel: box(-2, -2, 440, 162),
  board: box(0, 68, 156, 173),
  paper: { x: 11.5, y: 204 },
  room: 157,
  tray: { x: 158, y: 160.5 },
  trash: { x: 400, y: 200 },
  coldRail: [lCell(156, 0), lCell(226, 0), lCell(296, 0), lCell(366, 0), box(78, 0, 78, 66), lCell(366, 1)],
  sauces: [lCell(226, 1), lCell(296, 1)],
  bun: lCell(156, 1),
  ...landCook,
};

// land43 MONTAGGIO 388 x 269 (667 x 375 leaves it 466 x 323 CSS px): the tab and the trash over the tall board on the left
// (152 wide: the burger clear of its edges), nine pans in three rows right of it, the tray under them (its drink place
// reaches to the page's right edge). Cells 78.7 x 62, pans x1.5 (86 CSS px wide at zoom 1.2), labels x2.
const KM: Local = { w: 388, h: 269 };
const K_W = 236 / 3;
const kCell = (col: number, row: number): Box => box(152 + col * K_W, row * 62, K_W, 62);
const { page: land43C, ...land43Cook } = sideBySide(KM);
const land43: KitchenPlan = {
  name: 'land43',
  pages: [{ view: box(0, 0, KM.w, KM.h), tab: box(0, 0, 100, 58), dir: 'right', label: 'COTTURA', art: { pan: 1.5, label: 2 }, hit: 52.5 }, land43C],
  art: { stack: 3, paper: 1.75, tray: 1.75, trash: 1.2 },
  panel: box(150, -2, 240, 190),
  board: box(0, 60, 152, 209),
  paper: { x: 9.5, y: 232 },
  room: 190,
  tray: { x: 153.5, y: 188.5 },
  trash: { x: 112, y: 11 },
  coldRail: [kCell(0, 1), kCell(1, 1), kCell(0, 0), kCell(1, 0), kCell(2, 0), kCell(2, 1)],
  sauces: [kCell(0, 2), kCell(1, 2)],
  bun: kCell(2, 2),
  ...land43Cook,
};

export const KITCHEN_PLANS: readonly KitchenPlan[] = [t, c, s, land, land43];

/** The box round both pages (a big screen shows them side by side). */
export function planBox(p: KitchenPlan): Box {
  const [a, b] = p.pages.map((g) => g.view);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return box(x, y, Math.max(a.x + a.w, b.x + b.w) - x, Math.max(a.y + a.h, b.y + b.h) - y);
}

/** The page (0 MONTAGGIO, 1 COTTURA) a plan x belongs to: left or right of the gap between them. */
export function pageOfX(p: KitchenPlan, x: number): 0 | 1 {
  const a = p.pages[0].view;
  return x < (a.x + a.w + p.pages[1].view.x) / 2 ? 0 : 1;
}
