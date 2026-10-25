/**
 * Level 8 drawing plumbing shared by every lane (OWNER: integrator): vector textures drawn with canvas 2D
 * at texture scale k (canvas px per world unit), registered with LINEAR filtering and shown at 1 / k so a
 * sprite is always measured in world units. Style helpers (eyes, gloves, hoses) live in each lane.
 */
import Phaser from 'phaser';

/** Cartoon ink (outlines) and paper (highlights / film base). */
export const INK = '#1c1511';
export const PAPER = '#f3e6c8';
/** Default outline width in world units. */
export const LINE = 2.2;
/** Widest sheet canvas before frames wrap to a new row (browser / iOS limits). */
const MAX_SHEET_W = 4096;

export type Draw = (ctx: CanvasRenderingContext2D, frame: number) => void;

function canvas(w: number, h: number): CanvasRenderingContext2D {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  return ctx;
}

function linear(scene: Phaser.Scene, key: string): void {
  scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/**
 * Sprite sheet of `frames` frames of w x h world units drawn at scale k. `draw` gets a context already
 * translated to the frame and scaled by k, so it draws in world units. Frames wrap into rows.
 */
export function sheet(scene: Phaser.Scene, key: string, w: number, h: number, frames: number, k: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const fw = Math.ceil(w * k);
  const fh = Math.ceil(h * k);
  const cols = Math.max(1, Math.min(frames, Math.floor(MAX_SHEET_W / fw)));
  const rows = Math.ceil(frames / cols);
  const ctx = canvas(cols * fw, rows * fh);
  for (let i = 0; i < frames; i++) {
    ctx.save();
    ctx.translate((i % cols) * fw, Math.floor(i / cols) * fh);
    ctx.beginPath();
    ctx.rect(0, 0, fw, fh);
    ctx.clip();
    ctx.scale(k, k);
    draw(ctx, i);
    ctx.restore();
  }
  scene.textures.addSpriteSheet(key, ctx.canvas as unknown as HTMLImageElement, { frameWidth: fw, frameHeight: fh });
  linear(scene, key);
}

/** Single image of w x h world units drawn at scale k. */
export function image(scene: Phaser.Scene, key: string, w: number, h: number, k: number, draw: Draw): void {
  if (scene.textures.exists(key)) return;
  const ctx = canvas(w * k, h * k);
  ctx.scale(k, k);
  draw(ctx, 0);
  scene.textures.addCanvas(key, ctx.canvas);
  linear(scene, key);
}

/** Animation over frames of a sheet (all frames when `frames` is a count). */
export function anim(scene: Phaser.Scene, key: string, sheetKey: string, frames: number | readonly number[], fps: number, repeat = -1): void {
  if (scene.anims.exists(key)) return;
  const list = typeof frames === 'number' ? Array.from({ length: frames }, (_, i) => i) : [...frames];
  scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(sheetKey, { frames: list }), frameRate: fps, repeat });
}

/** Fill the current path, then outline it in ink (width in world units). */
export function inked(ctx: CanvasRenderingContext2D, fill: string | CanvasGradient, width = LINE): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A sprite showing a k-scaled texture at world size (scale 1 / k). */
export function worldSprite(scene: Phaser.Scene, x: number, y: number, key: string, k: number, frame?: number): Phaser.GameObjects.Sprite {
  return scene.add.sprite(x, y, key, frame).setScale(1 / k);
}

/** Drop every texture and anim whose key starts with `prefix` (boss unload). */
export function unloadPrefix(scene: Phaser.Scene, prefix: string): void {
  for (const a of scene.anims.toJSON().anims) if (a.key.startsWith(prefix)) scene.anims.remove(a.key);
  for (const key of scene.textures.getTextureKeys()) if (key.startsWith(prefix)) scene.textures.remove(key);
}
