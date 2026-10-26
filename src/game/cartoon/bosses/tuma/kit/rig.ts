/**
 * Cut-out rig of the BOSS-B lane (Don Tuma, Happy Box): the mascot cut out of the owner's shirt photo
 * (scripts/level8/{tuma,happy}.mjs) as full-frame layers of the same size, each turning around its own
 * pivot, nested (an arm moves with the body it hangs on), driven by springs so every move overshoots a
 * little in the rubber-hose way; plus breathing, squash & stretch of the whole mascot, a hit flash and
 * crop-px -> world helpers for hit boxes and launch points. Units: "crop px" = px of the photo crop.
 */
import Phaser from 'phaser';
import type { Box, Vec } from '../../../api';

export interface RigPart<P extends string> {
  /** texture key of the layer (resampled by loadRig) */
  key: string;
  /** turning point, crop px */
  pivot: readonly [number, number];
  /** the part it hangs on (drawn inside it: behind it if listed before it, in front if after) */
  parent?: P;
}

export interface RigDef<P extends string> {
  /** crop size, crop px */
  w: number;
  h: number;
  /** the point of the crop that stands on the floor, crop px */
  anchor: readonly [number, number];
  /** draw order, back to front */
  parts: Readonly<Record<P, RigPart<P>>>;
}

const STIFF = 170;
const DAMP = 11;
const SQ_STIFF = 260;
const SQ_DAMP = 13;
const FLASH_MS = 55;
const FLASH_GAP_MS = 130;
/** colour-matrix brightness of a hit flash (the art stays readable under steady fire) */
const FLASH_BRIGHT = 1.35;

/** Damped spring toward `to` (underdamped: a small overshoot). */
class Spring {
  v = 0;
  to: number;
  constructor(public x = 0) {
    this.to = x;
  }
  step(s: number, k = STIFF, d = DAMP): void {
    this.v += (k * (this.to - this.x) - d * this.v) * s;
    this.x += this.v * s;
  }
}

interface Node {
  c: Phaser.GameObjects.Container;
  img: Phaser.GameObjects.Image;
  base: Vec;
  rot: Spring;
  dx: Spring;
  dy: Spring;
  sx: Spring;
  sy: Spring;
}

/** A part's pose target: rotation (degrees), offset (crop px), scale. Omitted = rest. */
export interface PartPose {
  rot?: number;
  dx?: number;
  dy?: number;
  sx?: number;
  sy?: number;
}

export class Rig<P extends string> {
  readonly root: Phaser.GameObjects.Container;
  /** world position of the anchor (feet on the floor) */
  x: number;
  y: number;
  /** extra lift (world units, up) */
  lift = 0;
  /** whole-rig tilt, degrees */
  angle = 0;
  /** phase growth multiplier */
  grow = 1;
  private readonly nodes: Record<P, Node>;
  private sq = new Spring();
  private flashMs = 0;
  private sinceFlash = FLASH_GAP_MS;
  private lit = false;
  private t = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly def: RigDef<P>,
    /** world units per crop px */
    private readonly s: number,
    /** texture px per crop px of the layers */
    texScale: number,
    x: number,
    y: number,
    depth: number,
  ) {
    this.x = x;
    this.y = y;
    this.root = scene.add.container(x, y).setDepth(depth);
    const names = Object.keys(def.parts) as P[];
    const nodes = {} as Record<P, Node>;
    for (const n of names) {
      const p = def.parts[n];
      const img = scene.add.image(0, 0, p.key).setOrigin(p.pivot[0] / def.w, p.pivot[1] / def.h).setScale(1 / texScale);
      // WebGL only (canvas: no flash, the hit sparks still show); the FX pass runs only while flashing
      img.preFX?.addColorMatrix().brightness(FLASH_BRIGHT);
      img.preFX?.disable();
      const from = p.parent ? def.parts[p.parent].pivot : def.anchor;
      const base = { x: p.pivot[0] - from[0], y: p.pivot[1] - from[1] };
      nodes[n] = { c: scene.add.container(base.x, base.y), img, base, rot: new Spring(), dx: new Spring(), dy: new Spring(), sx: new Spring(1), sy: new Spring(1) };
    }
    // in draw order: a child declared before its parent sits behind the parent's own layer
    for (const n of names) {
      const parent = def.parts[n].parent;
      (parent ? nodes[parent].c : this.root).add(nodes[n].c);
      nodes[n].c.add(nodes[n].img);
    }
    this.nodes = nodes;
    // placed at once: the round shows the boss under its title card before the first update
    this.update(0);
  }

  /** Spring target of a part (missing fields go back to rest). `snap` jumps there at once. */
  pose(part: P, p: PartPose, snap = false): void {
    const n = this.nodes[part];
    n.rot.to = p.rot ?? 0;
    n.dx.to = p.dx ?? 0;
    n.dy.to = p.dy ?? 0;
    n.sx.to = p.sx ?? 1;
    n.sy.to = p.sy ?? 1;
    if (snap) for (const k of [n.rot, n.dx, n.dy, n.sx, n.sy]) (k.x = k.to), (k.v = 0);
  }

  /** Spring impulse on the whole mascot: + squashes (wide, short), - stretches (tall, thin). */
  kick(a: number): void {
    this.sq.v += a * 30;
  }

  /** Spin impulse on one part (degrees / s). */
  nudge(part: P, degPerS: number): void {
    this.nodes[part].rot.v += degPerS;
  }

  flash(): void {
    if (this.sinceFlash < FLASH_GAP_MS) return;
    this.flashMs = FLASH_MS;
    this.sinceFlash = 0;
  }

  setTint(color: number | null): void {
    for (const n of Object.values<Node>(this.nodes)) if (color === null) n.img.clearTint();
    else n.img.setTint(color);
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v);
  }

  get scale(): number {
    return this.s * this.grow;
  }

  /** Crop px -> world point at rest (ignores the animation: hit boxes stay steady). */
  at(cx: number, cy: number): Vec {
    const [ax, ay] = this.def.anchor;
    return { x: this.x + (cx - ax) * this.scale, y: this.y - this.lift + (cy - ay) * this.scale };
  }

  box(cx: number, cy: number, cw: number, ch: number): Box {
    const p = this.at(cx, cy);
    return { x: p.x, y: p.y, w: cw * this.scale, h: ch * this.scale };
  }

  /** Crop px of a part -> world point where it is now (follows the part's animation: launch points). */
  live(part: P, cx: number, cy: number): Vec {
    const [px, py] = this.def.parts[part].pivot;
    const m = this.nodes[part].c.getWorldTransformMatrix();
    const out = m.transformPoint(cx - px, cy - py);
    return { x: out.x, y: out.y };
  }

  update(dt: number): void {
    this.t += dt;
    this.sinceFlash += dt;
    const step = Math.min(dt, 50) / 1000;
    for (const n of Object.values<Node>(this.nodes)) {
      for (const k of [n.rot, n.dx, n.dy]) k.step(step);
      for (const k of [n.sx, n.sy]) k.step(step, SQ_STIFF, SQ_DAMP);
      n.c.setPosition(n.base.x + n.dx.x, n.base.y + n.dy.x).setAngle(n.rot.x).setScale(n.sx.x, n.sy.x);
    }
    this.sq.v += (-SQ_STIFF * this.sq.x - SQ_DAMP * this.sq.v) * step;
    this.sq.x += this.sq.v * step;
    const breathe = 0.012 * Math.sin(this.t / 320);
    const s = this.scale;
    this.root.setPosition(this.x, this.y - this.lift).setAngle(this.angle).setScale(s * (1 + this.sq.x * 0.8 - breathe * 0.5), s * (1 - this.sq.x + breathe));
    if (this.flashMs > 0) this.flashMs -= dt;
    const lit = this.flashMs > 0;
    if (lit === this.lit) return;
    this.lit = lit;
    for (const n of Object.values<Node>(this.nodes)) {
      if (lit) n.img.preFX?.enable();
      else n.img.preFX?.disable();
    }
  }

  destroy(): void {
    this.root.destroy();
  }
}

/**
 * Resamples the preloaded layer bitmaps (`src` keys, BossDef.assets) into textures (`dst` keys) at `texScale`
 * texture px per crop px with high-quality smoothing (crisp at any k, no oversized textures), LINEAR filtered.
 * Throws when a bitmap did not load: the CORE then falls back to the stand-in boss.
 */
export function loadRig(scene: Phaser.Scene, layers: readonly { src: string; dst: string }[], w: number, h: number, texScale: number): void {
  for (const { src, dst } of layers) bake(scene, [src], dst, w, h, texScale);
}

/** All the layers flattened into one texture (the rig at rest, e.g. a small copy of the boss as a minion). */
export function loadFlat(scene: Phaser.Scene, layers: readonly { src: string }[], dst: string, w: number, h: number, texScale: number): void {
  bake(scene, layers.map((l) => l.src), dst, w, h, texScale);
}

function bake(scene: Phaser.Scene, srcs: readonly string[], dst: string, w: number, h: number, texScale: number): void {
  if (scene.textures.exists(dst)) return;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * texScale));
  c.height = Math.max(1, Math.round(h * texScale));
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2d canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  for (const src of srcs) {
    if (!scene.textures.exists(src)) throw new Error(`level 8 art missing: ${src}`);
    ctx.drawImage(scene.textures.get(src).getSourceImage() as CanvasImageSource, 0, 0, c.width, c.height);
  }
  scene.textures.addCanvas(dst, c);
  scene.textures.get(dst).setFilter(Phaser.Textures.FilterMode.LINEAR);
}
