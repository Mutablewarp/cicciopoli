/**
 * Level 7 art for the DOM screens, from the kitchen pack (src/art/kitchen.ts, imported lazily): the burger stack
 * built from KITCHEN.layer frames like the game builds it (bottom bun up to the top bun), and the order view from
 * behind the polished steel counter (the Sperlinga room with its pergola, ring lights and plants; the CICCIO'S neon
 * on the title card) for the title card and the pre-shift stage. Only the rasters needed are built, once per
 * session; a failed load is forgotten so the next screen tries again. Callers show the pixel stand-ins (scene.ts)
 * meanwhile, or for good if the pack lacks a part. The owner's face logo is never drawn here: it is an image over
 * the art (scene.ts, stage.ts).
 */
import { KITCHEN, LAYER, LAYER_H, type LayerKind, PAPER, layerFrame } from '../../art/kitchen/keys';
import { type BurgerId, burger } from '../../config/kitchenMenu';

export interface KitchenArt {
  /** the stage burger alone (AMERICAN BACONCHEESE), LAYER.w wide */
  burger: string;
  /** title card scene, THUMB size, with a BACON CHEESEBURGER on its paper */
  thumb: string;
  /** pre-shift backdrop without the burger for a box of this aspect (w / h); counter rows = STAGE_ART.counter */
  stage(aspect: number): string;
}

/** Rows above the top bun's body (frills) and below the bottom bun's base row (drapes) inside a layer frame. */
const FRILL = 3;
/** The counter top's steel surface (rows 0-13): the bun stands on this row of it. */
const STANDS_AT = 8;
/**
 * roomTop = the room row at the top of the scene (keys.ts roomWide 356x200: ceiling with ring lights ~0-50, pergola,
 * door and plants ~50-118, the tiled floor below), so the lights, the arches and a strip of floor show over the counter.
 */
const THUMB = { w: 192, h: 108, roomTop: 52, neonY: 3, counter: 30 } as const;
/** Pre-shift stage: art rows of the backdrop and the counter; the DOM burger stands STAGE_ART.stand rows above the bottom. */
export const STAGE_ART = { h: 100, roomTop: 40, counter: 30, stand: 30 - STANDS_AT } as const;
const BACKDROP = '#1c1a1e';

type Canvas = HTMLCanvasElement;
interface Parts {
  room: Canvas | null;
  /** brick with pothos, tiled where a wide box goes past the room's sides */
  fill: Canvas | null;
  neon: Canvas | null;
  counter: Canvas | null;
  paper: Canvas | null;
}
interface SceneSpec {
  w: number;
  h: number;
  roomTop: number;
  neonY: number | null;
  counter: number;
}

function canvas(w: number, h: number): [Canvas, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function stack(layers: readonly Canvas[], id: BurgerId): Canvas {
  const kinds: LayerKind[] = ['bunBottom', ...burger(id).ingredients, 'bunTop'];
  const body = kinds.reduce((n, k) => n + LAYER_H[k], 0);
  const below = LAYER.h - LAYER.baseRow;
  const [c, ctx] = canvas(LAYER.w, FRILL + body + below);
  let base = c.height - below;
  for (const kind of kinds) {
    ctx.drawImage(layers[layerFrame(kind)], 0, base - LAYER.baseRow);
    base -= LAYER_H[kind];
  }
  return c;
}

/** Tiles `img` across the width at row y. */
function band(ctx: CanvasRenderingContext2D, img: Canvas, w: number, y: number): void {
  for (let x = 0; x < w; x += img.width) ctx.drawImage(img, x, y);
}

function scene(spec: SceneSpec, p: Parts, food: Canvas | null): Canvas {
  const [c, ctx] = canvas(spec.w, spec.h);
  ctx.fillStyle = BACKDROP;
  ctx.fillRect(0, 0, spec.w, spec.h);
  const top = spec.h - spec.counter;
  if (p.fill) for (let y = 0; y < top; y += p.fill.height) band(ctx, p.fill, spec.w, y);
  if (p.room) ctx.drawImage(p.room, Math.round((spec.w - p.room.width) / 2), -spec.roomTop);
  if (p.counter) band(ctx, p.counter, spec.w, top);
  const stand = top + STANDS_AT;
  if (p.paper) ctx.drawImage(p.paper, Math.round(spec.w / 2 - PAPER.baseX), stand - PAPER.baseY);
  if (food) ctx.drawImage(food, Math.round((spec.w - food.width) / 2), stand + LAYER.h - LAYER.baseRow - food.height);
  if (p.neon && spec.neonY !== null) ctx.drawImage(p.neon, Math.round((spec.w - p.neon.width) / 2), spec.neonY);
  return c;
}

let art: Promise<KitchenArt | null> | undefined;

async function load(): Promise<KitchenArt | null> {
  const { KITCHEN_IMAGE_LIST, KITCHEN_SHEET_LIST } = await import('../../art/kitchen');
  const frames = (key: string): Canvas[] | null => KITCHEN_SHEET_LIST.find(([k]) => k === key)?.[1]().map((r) => r.toCanvas()) ?? null;
  const image = (key: string): Canvas | null => KITCHEN_IMAGE_LIST.find(([k]) => k === key)?.[1]().toCanvas() ?? null;
  const layers = frames(KITCHEN.layer);
  if (!layers) return null;
  const parts: Parts = {
    room: image(KITCHEN.roomWide),
    fill: image(KITCHEN.roomFill),
    neon: frames(KITCHEN.neon)?.[0] ?? null,
    counter: image(KITCHEN.counterTop),
    paper: image(KITCHEN.paper),
  };
  const stages = new Map<number, string>();
  return {
    burger: stack(layers, 'americanBaconcheese').toDataURL(),
    thumb: scene(THUMB, parts, stack(layers, 'baconCheeseburger')).toDataURL(),
    stage(aspect) {
      const w = Math.max(STAGE_ART.h, Math.round(STAGE_ART.h * aspect));
      let url = stages.get(w);
      if (!url) {
        url = scene({ w, h: STAGE_ART.h, roomTop: STAGE_ART.roomTop, neonY: null, counter: STAGE_ART.counter }, { ...parts, paper: null }, null).toDataURL();
        stages.set(w, url);
      }
      return url;
    },
  };
}

export function kitchenArt(): Promise<KitchenArt | null> {
  art ??= load()
    .catch(() => null)
    .then((a) => {
      if (!a) art = undefined;
      return a;
    });
  return art;
}
