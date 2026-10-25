/**
 * What the CUCINA's things stand on, drawn under them in world px: the soft shadows every station,
 * pan, rack, the tray and the bin cast on the worktop (light from the top-left), the steel panel the
 * MONTAGGIO pans sit in (a recess: dark top / left inner edge, lit bottom / right) and the wooden
 * board under the paper where the burger grows (Good Pizza's peel). Also the padlock of a locked pan.
 */
import type Phaser from 'phaser';
import { BIN, FRYER, GRIDDLE, SHEET_SPEC, SHELF, TRAY, KITCHEN } from '../../art/kitchen/keys';
import { FURNITURE, MONTAGGIO, TRASH_SCALE } from './config';
import type { KitchenLayout, Rect } from './layout';

const F = FURNITURE;
const [TRASH_W, TRASH_H] = SHEET_SPEC[KITCHEN.trash];

/** Rect with its corner pixels cut (pixel-art rounding). */
function rounded(g: Phaser.GameObjects.Graphics, r: Rect, color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillRect(r.x + 1, r.y, r.w - 2, r.h);
  g.fillRect(r.x, r.y + 1, 1, r.h - 2);
  g.fillRect(r.x + r.w - 1, r.y + 1, 1, r.h - 2);
}

/** Everything that casts a shadow, world px. */
function casters(l: KitchenLayout): Rect[] {
  const ts = MONTAGGIO.trayScale;
  return [
    { ...l.griddle, w: GRIDDLE.w, h: GRIDDLE.h },
    { ...l.fryer, w: FRYER.w, h: FRYER.h },
    ...l.shelves.map((s) => ({ ...s, w: SHELF.w, h: SHELF.h })),
    { ...l.tray, w: TRAY.w * ts, h: TRAY.h * ts },
    { ...l.trash, w: TRASH_W * TRASH_SCALE, h: TRASH_H * TRASH_SCALE },
    ...l.bins.map((b) => ({ x: b.x, y: b.y, w: BIN.w, h: BIN.h })),
    ...l.locked.map((b) => ({ x: b.x, y: b.y, w: BIN.w, h: BIN.h })),
  ];
}

function panel(g: Phaser.GameObjects.Graphics, r: Rect): void {
  const P = F.panel;
  rounded(g, r, P.rim);
  const i = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 };
  g.fillStyle(P.fill, 1).fillRect(i.x, i.y, i.w, i.h);
  g.fillStyle(P.dark, 1).fillRect(i.x, i.y, i.w, 1).fillRect(i.x, i.y, 1, i.h);
  g.fillStyle(P.lit, 1).fillRect(i.x + 1, i.y + i.h - 1, i.w - 1, 1).fillRect(i.x + i.w - 1, i.y + 1, 1, i.h - 1);
}

/** The board: a thick wooden peel, lit top edge, darker front edge, broken grain lines. */
function board(g: Phaser.GameObjects.Graphics, r: Rect): void {
  const B = F.board;
  rounded(g, { ...r, h: r.h + 2 }, B.rim);
  const i = { x: r.x + 1, y: r.y + 1, w: r.w - 2, h: r.h - 2 };
  g.fillStyle(B.fill, 1).fillRect(i.x, i.y, i.w, i.h);
  g.fillStyle(B.lit, 1).fillRect(i.x, i.y, i.w, 1).fillRect(i.x, i.y, 1, i.h);
  g.fillStyle(B.grain, 1).fillRect(i.x, i.y + i.h, i.w, 1);
  for (let y = i.y + 5, n = 0; y < i.y + i.h - 3; y += B.grainEvery, n++) {
    const off = (n * 23) % 31;
    for (let x = i.x + 4 + off; x < i.x + i.w - 8; x += 37) g.fillRect(x, y, Math.min(19 + (n % 3) * 5, i.x + i.w - 4 - x), 1);
  }
}

/** Draws the furniture of this layout (cleared first). */
export function drawFurniture(g: Phaser.GameObjects.Graphics, l: KitchenLayout): void {
  g.clear();
  const S = F.shadow;
  panel(g, l.panel);
  board(g, l.board);
  for (const [o, r] of [S.far, S.near].flatMap((o) => casters(l).map((r) => [o, r] as const))) rounded(g, { ...r, x: r.x + o.dx, y: r.y + o.dy }, S.color, o.alpha);
}

/** A padlock (FURNITURE.lock px) with its top-left at (x, y): a thick shackle over a light body with a keyhole. */
export function padlock(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  const L = F.lock;
  // shackle: outer rim, two metal columns, inner rim round a 2 px hole
  g.fillStyle(L.rim, 1).fillRect(x + 4, y, 8, 1).fillRect(x + 3, y + 1, 1, 7).fillRect(x + 12, y + 1, 1, 7);
  g.fillRect(x + 6, y + 3, 4, 1).fillRect(x + 6, y + 4, 1, 4).fillRect(x + 9, y + 4, 1, 4);
  g.fillStyle(L.metal, 1).fillRect(x + 4, y + 1, 8, 2).fillRect(x + 4, y + 3, 2, 5).fillRect(x + 10, y + 3, 2, 5);
  // body: rim, lit top / left, dark bottom row, keyhole
  rounded(g, { x, y: y + 8, w: L.w, h: L.h - 8 }, L.rim);
  g.fillStyle(L.body, 1).fillRect(x + 1, y + 9, L.w - 2, L.h - 10);
  g.fillStyle(L.lit, 1).fillRect(x + 1, y + 9, L.w - 2, 1).fillRect(x + 1, y + 9, 1, L.h - 10);
  g.fillStyle(L.dark, 1).fillRect(x + 2, y + L.h - 2, L.w - 3, 1);
  g.fillStyle(L.rim, 1).fillRect(x + 7, y + 11, 2, 4).fillRect(x + 6, y + 12, 4, 1);
}
