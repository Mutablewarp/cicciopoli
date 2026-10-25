/**
 * The 1930s film over the whole arena: animated grain, sepia wash, vignette, light flicker, dust
 * specks and the odd scratch, a tiny gate jitter; calm (reduced motion) = slow grain, faint flicker,
 * rare specks, no jitter. Drawn in world units above everything but the frame. Only two layers cover
 * the whole arena (fill rate on phones): the grain, and the wash + vignette whose alpha flickers.
 */
import type Phaser from 'phaser';
import { ARENA, type Vec } from './api';
import { image, sheet } from './draw/canvas';
import { DEPTH } from './depths';
import { CT_FILM as C } from '../../config/cartoon';

const GRAIN = 'ct-core-grain';
const VIGNETTE = 'ct-core-vignette';
const SPECKS = 'ct-core-specks';
const GRAIN_PX = 192;
const SPECK_FRAMES = 6;

function noise(ctx: CanvasRenderingContext2D): void {
  // grain texture in device-ish px: a k = 1 canvas of random dark / light dots
  for (let i = 0; i < GRAIN_PX * GRAIN_PX * 0.08; i++) {
    const v = Math.random();
    ctx.fillStyle = v < 0.6 ? `rgba(30,18,8,${0.25 + Math.random() * 0.5})` : `rgba(255,244,220,${0.2 + Math.random() * 0.4})`;
    ctx.fillRect(Math.random() * GRAIN_PX, Math.random() * GRAIN_PX, 1 + (Math.random() < 0.1 ? 1 : 0), 1);
  }
}

function speck(ctx: CanvasRenderingContext2D, f: number): void {
  ctx.strokeStyle = 'rgba(24,14,6,0.8)';
  ctx.fillStyle = 'rgba(24,14,6,0.8)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  if (f === 0) ctx.arc(8, 8, 1.4, 0, Math.PI * 2);
  else if (f === 1) ctx.ellipse(8, 8, 2.6, 1.6, 0.6, 0, Math.PI * 2);
  else if (f === 2) {
    ctx.moveTo(3, 12);
    ctx.bezierCurveTo(6, 2, 10, 14, 13, 4);
  } else if (f === 3) {
    ctx.moveTo(4, 4);
    ctx.quadraticCurveTo(12, 6, 11, 13);
  } else if (f === 4) ctx.arc(8, 8, 0.9, 0, Math.PI * 2);
  else {
    ctx.fillStyle = 'rgba(255,246,226,0.85)';
    ctx.arc(8, 8, 1.6, 0, Math.PI * 2);
  }
  if (f === 2 || f === 3) ctx.stroke();
  else ctx.fill();
}

export class Film {
  private readonly grain: Phaser.GameObjects.TileSprite;
  /** wash + vignette: its alpha dips are the projector flicker */
  private readonly vignette: Phaser.GameObjects.Image;
  private readonly specks: Phaser.GameObjects.Image[] = [];
  private readonly scratch: Phaser.GameObjects.Rectangle;
  private readonly objects: Phaser.GameObjects.GameObject[];
  private frame = 0;
  private flickerMs = 0;
  private scratchMs = 0;

  constructor(
    scene: Phaser.Scene,
    k: number,
    private readonly calm: () => boolean,
  ) {
    sheet(scene, GRAIN, GRAIN_PX, GRAIN_PX, 1, 1, (ctx) => noise(ctx));
    image(scene, VIGNETTE, 160, 90, Math.max(1, k / 2), (ctx) => {
      ctx.fillStyle = C.sepia;
      ctx.fillRect(0, 0, 160, 90);
      const g = ctx.createRadialGradient(80, 45, 18, 80, 45, 96);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.55, 'rgba(30,16,6,0.12)');
      g.addColorStop(1, C.vignetteEdge);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 160, 90);
    });
    const specks = `${SPECKS}-${k}`;
    sheet(scene, specks, 16, 16, SPECK_FRAMES, k, speck);
    const cx = ARENA.w / 2;
    const cy = ARENA.h / 2;
    this.grain = scene.add.tileSprite(cx, cy, ARENA.w, ARENA.h, GRAIN).setAlpha(C.grainAlpha);
    this.vignette = scene.add.image(cx, cy, VIGNETTE).setDisplaySize(ARENA.w, ARENA.h);
    this.scratch = scene.add.rectangle(0, cy, 0.7, ARENA.h, 0xfff3d8, 0.5).setVisible(false);
    for (let i = 0; i < C.specks; i++) this.specks.push(scene.add.image(0, 0, specks, i % SPECK_FRAMES).setScale(1 / k).setVisible(false));
    this.objects = [this.grain, this.vignette, this.scratch, ...this.specks];
    this.objects.forEach((o, i) => (o as Phaser.GameObjects.Image).setDepth(DEPTH.film + i * 0.01));
  }

  /** Grain sized for the current zoom (device px per world unit): ~1.5 device px per grain dot. */
  layout(zoom: number): void {
    const s = 1.5 / Math.max(0.5, zoom);
    this.grain.setTileScale(s, s);
  }

  /** Advances the film; returns the gate jitter offset (world units) for the camera. */
  update(dtMs: number): Vec {
    const calm = this.calm();
    this.frame++;
    if (this.frame % (calm ? C.grainEveryFramesCalm : C.grainEveryFrames) === 0) {
      this.grain.setTilePosition(Math.random() * 512, Math.random() * 512);
    }
    this.flickerMs -= dtMs;
    if (this.flickerMs <= 0) {
      this.flickerMs = C.flickerEveryMs * (calm ? 3 : 1);
      this.vignette.setAlpha(1 - Math.random() * (calm ? C.flickerMaxCalm : C.flickerMax));
    }
    const chance = calm ? C.speckChanceCalm : C.speckChance;
    for (const s of this.specks) {
      if (s.visible && Math.random() < 0.5) s.setVisible(false);
      else if (!s.visible && Math.random() < chance / C.specks) {
        s.setPosition(Math.random() * ARENA.w, Math.random() * ARENA.h).setAngle(Math.random() * 360).setVisible(true);
      }
    }
    this.scratchMs -= dtMs;
    if (this.scratchMs <= 0 && !calm && Math.random() < C.scratchChance) {
      this.scratchMs = 120 + Math.random() * 200;
      this.scratch.setX(Math.random() * ARENA.w);
    }
    this.scratch.setVisible(this.scratchMs > 0);
    if (this.scratchMs > 0) this.scratch.x += (Math.random() - 0.5) * 2;
    if (calm || Math.random() > C.jitterChance) return { x: 0, y: 0 };
    return { x: (Math.random() - 0.5) * C.jitter, y: (Math.random() - 0.5) * C.jitter };
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
  }
}
