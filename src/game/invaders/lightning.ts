/**
 * FULMINE bolts drawn as crisp world pixels: a jagged white core, cyan halo, blue glow,
 * small forks and yellow sparks. Each arc flickers (re-jagged every few frames) and fades.
 */
import type Phaser from 'phaser';
import { Z } from './fx';

interface Arc {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  age: number;
}

const LIFE_MS = 300;
const REDRAW_MS = 45;

type Pt = [number, number];

/** Midpoint displacement between two points; returns the polyline. */
function jagged(x0: number, y0: number, x1: number, y1: number): Pt[] {
  let pts: Pt[] = [[x0, y0], [x1, y1]];
  let amp = Math.hypot(x1 - x0, y1 - y0) * 0.2;
  for (let level = 0; level < 4; level++) {
    const next: Pt[] = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1];
      const [bx, by] = pts[i];
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const off = (Math.random() - 0.5) * 2 * amp;
      next.push([(ax + bx) / 2 + (-(by - ay) / len) * off, (ay + by) / 2 + ((bx - ax) / len) * off], pts[i]);
    }
    pts = next;
    amp *= 0.55;
  }
  return pts;
}

function rasterise(pts: readonly Pt[], into: Set<number>): void {
  for (let i = 1; i < pts.length; i++) {
    let x = Math.round(pts[i - 1][0]);
    let y = Math.round(pts[i - 1][1]);
    const x1 = Math.round(pts[i][0]);
    const y1 = Math.round(pts[i][1]);
    const dx = Math.abs(x1 - x);
    const dy = -Math.abs(y1 - y);
    const sx = x < x1 ? 1 : -1;
    const sy = y < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      into.add(((y + 2048) << 12) | (x + 2048));
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
  }
}

const unpack = (k: number): Pt => [(k & 4095) - 2048, (k >> 12) - 2048];

export class Lightning {
  private readonly g: Phaser.GameObjects.Graphics;
  private arcs: Arc[] = [];
  private redraw = 0;

  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(Z.bolt);
  }

  add(x0: number, y0: number, x1: number, y1: number): void {
    this.arcs.push({ x0, y0, x1, y1, age: 0 });
    this.redraw = 0;
  }

  update(dt: number): void {
    if (this.arcs.length === 0) return;
    for (const a of this.arcs) a.age += dt;
    this.arcs = this.arcs.filter((a) => a.age < LIFE_MS);
    this.redraw -= dt;
    if (this.redraw > 0 && this.arcs.length > 0) return;
    this.redraw = REDRAW_MS;
    this.draw();
  }

  clear(): void {
    this.arcs = [];
    this.g.clear();
  }

  private draw(): void {
    const g = this.g;
    g.clear();
    for (const a of this.arcs) {
      const fade = a.age > LIFE_MS - 110 ? (LIFE_MS - a.age) / 110 : 1;
      const core = new Set<number>();
      const fork = new Set<number>();
      const pts = jagged(a.x0, a.y0, a.x1, a.y1);
      rasterise(pts, core);
      for (let i = 2; i < pts.length - 2; i += 3) {
        if (Math.random() < 0.45) continue;
        const [px, py] = pts[i];
        const ang = Math.atan2(a.y1 - a.y0, a.x1 - a.x0) + (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.6);
        const len = 4 + Math.random() * 6;
        rasterise(jagged(px, py, px + Math.cos(ang) * len, py + Math.sin(ang) * len), fork);
      }
      g.fillStyle(0x3a5cff, 0.28 * fade);
      for (const k of core) {
        const [x, y] = unpack(k);
        g.fillRect(x - 2, y - 1, 5, 3);
      }
      g.fillStyle(0x8ad8ff, 0.9 * fade);
      for (const k of core) {
        const [x, y] = unpack(k);
        g.fillRect(x - 1, y, 3, 1);
        g.fillRect(x, y - 1, 1, 3);
      }
      for (const k of fork) {
        const [x, y] = unpack(k);
        g.fillRect(x, y, 1, 1);
      }
      g.fillStyle(0xffffff, fade);
      for (const k of core) {
        const [x, y] = unpack(k);
        g.fillRect(x, y, 1, 1);
      }
      g.fillStyle(0xfcf070, fade);
      for (const [x, y] of [[a.x1 - 2, a.y1 - 1], [a.x1 + 2, a.y1 + 1], [a.x1 + 1, a.y1 - 2], [a.x1 - 1, a.y1 + 2]]) {
        g.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
  }
}
