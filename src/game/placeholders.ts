/**
 * Visible stand-ins for missing art so a broken or unfinished pack never crashes a level:
 * outlined boxes in a hint colour, registered through the normal art pipeline.
 */
import type Phaser from 'phaser';
import type { AnimDef, ArtPack } from '../contracts';
import { makeCanvas, ctxOf, PAL } from '../art/pixel';
import { registerArtPack } from '../art/register';

export interface TexSpec {
  key: string;
  /** frame (or tile) size */
  w: number;
  h: number;
  /** >1 or set = spritesheet with this many frames */
  frames?: number;
  kind?: 'image' | 'sheet' | 'tileset';
  color?: string;
}

export interface AnimSpec {
  key: string;
  sheet: string;
  frames: number[];
  frameRate: number;
  repeat: number;
}

/** Animation spec shorthands used by the theme tables. */
export const loop = (key: string, sheet: string, frames: number[], frameRate: number): AnimSpec => ({ key, sheet, frames, frameRate, repeat: -1 });
export const once = (key: string, sheet: string, frames: number[], frameRate: number): AnimSpec => ({ key, sheet, frames, frameRate, repeat: 0 });
export const seq = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

function drawFrame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, i: number): void {
  if (color === 'transparent') return;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = PAL.ink;
  ctx.fillRect(x, y, w, 1);
  ctx.fillRect(x, y + h - 1, w, 1);
  ctx.fillRect(x, y, 1, h);
  ctx.fillRect(x + w - 1, y, 1, h);
  // a moving tick shows which frame is playing
  ctx.fillRect(x + 1 + (i % Math.max(1, w - 2)), y + Math.floor(h / 2), 1, 1);
}

function canvasFor(spec: TexSpec): HTMLCanvasElement {
  const n = spec.frames ?? 1;
  const cols = spec.kind === 'tileset' ? 8 : n;
  const rows = Math.ceil(n / cols);
  const c = makeCanvas(spec.w * cols, spec.h * rows);
  const ctx = ctxOf(c);
  for (let i = 0; i < n; i++) {
    drawFrame(ctx, (i % cols) * spec.w, Math.floor(i / cols) * spec.h, spec.w, spec.h, spec.color ?? '#ff00cc', i);
  }
  return c;
}

/** Registers placeholders for every missing texture; returns the keys that were missing. */
export function ensureTextures(scene: Phaser.Scene, specs: readonly TexSpec[]): string[] {
  const missing = specs.filter((s) => !scene.textures.exists(s.key));
  if (missing.length === 0) return [];
  const pack: ArtPack = { name: 'placeholders', sheets: [], images: [], tilesets: [], anims: [] };
  for (const s of missing) {
    const canvas = canvasFor(s);
    if (s.kind === 'tileset') pack.tilesets.push({ key: s.key, canvas, tileSize: s.w });
    else if (s.kind === 'sheet' || (s.frames ?? 1) > 1) pack.sheets.push({ key: s.key, canvas, frameWidth: s.w, frameHeight: s.h });
    else pack.images.push({ key: s.key, canvas });
  }
  registerArtPack(scene, pack);
  return missing.map((s) => s.key);
}

/** Creates any missing animation, clamping frames to what the (possibly placeholder) sheet has. */
export function ensureAnims(scene: Phaser.Scene, specs: readonly AnimSpec[]): void {
  for (const a of specs) {
    if (scene.anims.exists(a.key) || !scene.textures.exists(a.sheet)) continue;
    const count = scene.textures.get(a.sheet).frameTotal - 1; // minus __BASE
    const frames = a.frames.filter((f) => f < count);
    const def: AnimDef = { ...a, frames: frames.length > 0 ? frames : [0] };
    scene.anims.create({
      key: def.key,
      frames: scene.anims.generateFrameNumbers(def.sheet, { frames: def.frames }),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}
