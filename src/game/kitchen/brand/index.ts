/**
 * Ciccio's REAL branding for level 7, drawn in HIGH RESOLUTION (canvas 2D at the screen's density,
 * shown with LINEAR filtering), never as pixel art (docs/BRIEF.md §9 v5.1 points 4-5): the owner's
 * original face logo (plain, on the white disc, gold), the kraft wrap with its fold animation, the
 * RED cardboard boats with the face logo (the pixel-art food inside), the pale printed tray liner.
 *
 * Use (game lane):
 *   await loadBrandLogo(scene)                       // once, in boot; false = logo missing
 *   ensureBrandTextures(scene, zoom * artScale)      // on every layout; cheap when nothing changed
 *   scene.add.image(x, y, BRAND.wrap, 3).setScale(artScale * brandScale(scene, 'wrap'))
 * Each texture shows BRAND_SIZE[piece] art px at scale brandScale(); its frames match the pixel
 * key it stands for (wrap = KITCHEN.wrap, cone = KITCHEN.cone, starterBox = KITCHEN.starterBox,
 * faceDisc = KITCHEN.faceDisc), so the game swaps the key and the scale. A missing texture (no logo,
 * no canvas) = keep the pixel art.
 */
import Phaser from 'phaser';
import { FRY_ITEMS, FRY_STATE, KITCHEN, KITCHEN_ANIMS, STARTERS, type FryItemId } from '../../../art/kitchen/keys';
import { BOAT_H, BOAT_W, paintBoat } from './boat';
import type { PixelPick } from './kit';
import { LINER_H, LINER_W, paintLiner } from './liner';
import { DISC, FACE_H, FACE_W, paintDisc, paintFace, paintGoldFace } from './logo';
import { quantizeDensity, sheetLayout } from './sheet';
import { WRAP_H, WRAP_W, paintWrap } from './wrap';

export { BRAND_DENSITY, quantizeDensity, sheetLayout } from './sheet';

/** Texture keys. faceSrc = the loaded original PNG; the others are drawn by ensureBrandTextures(). */
export const BRAND = {
  faceSrc: 'brand-face-src',
  /** the original face logo, transparent around it */
  face: 'brand-face',
  /** the same, tinted gold (YOU ARE SO GOLDEN) */
  faceGold: 'brand-face-gold',
  /** frames 0 white disc with the face, 1 gold disc with the gold face (as KITCHEN.faceDisc) */
  faceDisc: 'brand-face-disc',
  /** frames 0-3 the fold, 3 = the wrapped burger (as KITCHEN.wrap) */
  wrap: 'brand-wrap',
  /** frames 0 empty red boat, 1 with golden fries (as KITCHEN.cone) */
  cone: 'brand-cone',
  /** frame = STARTERS index: the red boat with the menù starter (as KITCHEN.starterBox) */
  starterBox: 'brand-starter-box',
  /** the printed liner, laid over the pixel tray at BRAND_LINER_AT */
  liner: 'brand-liner',
} as const;

export type BrandPiece = Exclude<keyof typeof BRAND, 'faceSrc'>;
export const BRAND_PIECES: readonly BrandPiece[] = ['face', 'faceGold', 'faceDisc', 'wrap', 'cone', 'starterBox', 'liner'];

/** Logical size of one frame (art px) and the frame count of every piece. */
export const BRAND_SIZE: Readonly<Record<BrandPiece, { w: number; h: number; frames: number }>> = {
  face: { w: FACE_W, h: FACE_H, frames: 1 },
  faceGold: { w: FACE_W, h: FACE_H, frames: 1 },
  faceDisc: { w: DISC, h: DISC, frames: 2 },
  wrap: { w: WRAP_W, h: WRAP_H, frames: 4 },
  cone: { w: BOAT_W, h: BOAT_H, frames: 2 },
  starterBox: { w: BOAT_W, h: BOAT_H, frames: STARTERS.length },
  liner: { w: LINER_W, h: LINER_H, frames: 1 },
};

/** Top-left of the liner in tray px (KITCHEN.tray): it covers the tray's floor. */
export const BRAND_LINER_AT = { x: 8, y: 8 } as const;

/** The fold animation on BRAND.wrap (same frames / fps as KITCHEN_ANIMS.wrap). */
export const BRAND_WRAP_ANIM = 'brand-wrap-once';

export const BRAND_FACE_URL = `${import.meta.env.BASE_URL}brand/ciccio-face-hd.png`;

interface Sources {
  logo: HTMLImageElement | HTMLCanvasElement | null;
  pick: PixelPick;
}
type Painter = (ctx: CanvasRenderingContext2D, frame: number, k: number, src: Sources) => void;

const fried = (id: FryItemId): number => FRY_ITEMS.indexOf(id) * FRY_STATE.count + FRY_STATE.perfect;

/** How each piece is painted (one frame, art px, on a context scaled by k); `logo` = needs the logo. */
const PAINT: Readonly<Record<BrandPiece, { logo: boolean; paint: Painter }>> = {
  face: { logo: true, paint: (ctx, _f, _k, s) => s.logo && paintFace(ctx, s.logo) },
  faceGold: { logo: true, paint: (ctx, _f, k, s) => s.logo && paintGoldFace(ctx, s.logo, k) },
  faceDisc: { logo: true, paint: (ctx, f, k, s) => s.logo && paintDisc(ctx, s.logo, f === 1, k) },
  wrap: { logo: false, paint: (ctx, f, _k, s) => paintWrap(ctx, f, s.pick) },
  cone: { logo: false, paint: (ctx, f, _k, s) => paintBoat(ctx, f === 1 ? s.pick(KITCHEN.fryItem, fried('patatine')) : null, s.logo) },
  starterBox: { logo: false, paint: (ctx, f, _k, s) => paintBoat(ctx, s.pick(KITCHEN.fryItem, fried(STARTERS[f])), s.logo) },
  liner: { logo: false, paint: (ctx) => paintLiner(ctx) },
};

/** Per-texture data: the density it was drawn at. */
interface BrandData {
  k?: number;
}
const densityOf = (tex: Phaser.Textures.Texture): number => (tex.customData as BrandData).k ?? 0;

/** Pixel-art frames from the scene's textures (the kitchen pack or its stand-ins). */
function phaserPick(scene: Phaser.Scene): PixelPick {
  const tm = scene.textures;
  return (key, frame) => {
    if (!tm.exists(key) || !tm.get(key).has(String(frame))) return null;
    const f = tm.getFrame(key, frame);
    return { src: f.source.image as HTMLCanvasElement | HTMLImageElement, x: f.cutX, y: f.cutY, w: f.cutWidth, h: f.cutHeight };
  };
}

/** Draws (or redraws at a new density) one piece; false when it was already drawn at k. */
function drawPiece(scene: Phaser.Scene, piece: BrandPiece, k: number, src: Sources): boolean {
  const tm = scene.textures;
  const key = BRAND[piece];
  const old = tm.exists(key) ? tm.get(key) : null;
  if (old && densityOf(old) === k) return false;
  const size = BRAND_SIZE[piece];
  const L = sheetLayout(size.w, size.h, size.frames, k);
  if (old && !(old instanceof Phaser.Textures.CanvasTexture)) tm.remove(old);
  const tex = old instanceof Phaser.Textures.CanvasTexture ? old.setSize(L.w, L.h) : tm.createCanvas(key, L.w, L.h);
  if (!tex) return false;
  const ctx = tex.getContext();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, L.w, L.h);
  L.cells.forEach((c, i) => {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.rect(0, 0, size.w, size.h);
    ctx.clip(); // nothing spills into the gutter / the next frame (LINEAR would show it)
    PAINT[piece].paint(ctx, i, k, src);
    ctx.restore();
    // frames keep their identity across redraws: running sprites / anims stay valid
    if (tex.has(String(i))) tex.get(i).setSize(L.fw, L.fh, c.x, c.y);
    else tex.add(i, 0, c.x, c.y, L.fw, L.fh);
  });
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.LINEAR);
  (tex.customData as BrandData).k = k;
  return true;
}

/**
 * Loads the original face logo (BRAND.faceSrc). Resolves when the loader is done: true = loaded
 * (or already there), false = missing (the logo pieces are then not drawn: the pixel disc stays).
 */
export function loadBrandLogo(scene: Phaser.Scene): Promise<boolean> {
  if (scene.textures.exists(BRAND.faceSrc)) return Promise.resolve(true);
  return new Promise((resolve) => {
    scene.load.image(BRAND.faceSrc, BRAND_FACE_URL);
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => resolve(scene.textures.exists(BRAND.faceSrc)));
    scene.load.start();
  });
}

/**
 * Creates / refreshes the brand textures for `pxPerArtPx` device px per art px (the biggest on-screen
 * scale they are shown at, e.g. camera zoom x MONTAGGIO.scale). Cheap when the quantised density is
 * unchanged. Call after the kitchen art is registered (the boats and the wrap copy its food frames)
 * and after loadBrandLogo(). Returns the pieces redrawn: their sprites must take the new size
 * (sprite.setFrame(sprite.frame.name) and the new brandScale()).
 */
export function ensureBrandTextures(scene: Phaser.Scene, pxPerArtPx: number, pieces: readonly BrandPiece[] = BRAND_PIECES): BrandPiece[] {
  const tm = scene.textures;
  const logo = tm.exists(BRAND.faceSrc) ? (tm.get(BRAND.faceSrc).getSourceImage() as HTMLImageElement | HTMLCanvasElement) : null;
  const src: Sources = { logo, pick: phaserPick(scene) };
  const want = quantizeDensity(pxPerArtPx);
  const drawn = pieces.filter((piece) => {
    if (PAINT[piece].logo && !logo) return false;
    // the logo is never drawn bigger than the original: upscaling would only blur it
    const k = PAINT[piece].logo && logo && piece !== 'faceDisc' ? Math.min(want, quantizeDensity(logo.height / FACE_H)) : want;
    return drawPiece(scene, piece, k, src);
  });
  if (tm.exists(BRAND.wrap) && !scene.anims.exists(BRAND_WRAP_ANIM)) {
    const [, , frames, frameRate, repeat] = KITCHEN_ANIMS.wrap;
    scene.anims.create({ key: BRAND_WRAP_ANIM, frames: frames.map((frame) => ({ key: BRAND.wrap, frame })), frameRate, repeat });
  }
  return drawn;
}

/** Scale that shows a brand texture at its art size (multiply by the art scale it is shown at); 1 if missing. */
export function brandScale(scene: Phaser.Scene, piece: BrandPiece): number {
  const key = BRAND[piece];
  const k = scene.textures.exists(key) ? densityOf(scene.textures.get(key)) : 0;
  return k > 0 ? 1 / k : 1;
}
