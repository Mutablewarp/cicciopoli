/**
 * The invader formation at runtime: sprites, the march beat (formation.ts), entry from
 * above, carriers that flash (they drop a lightning capsule) and bomber selection.
 */
import Phaser from 'phaser';
import { SPACE } from '../../art/space/keys';
import { FORM, HITBOX, WAVES, type InvaderKind, type WaveDef } from './config';
import { extentOf, nextMarch, stepInterval, type March } from './formation';
import { Z } from './fx';
import type { Rect } from './shields';

export interface Invader {
  id: number;
  kind: InvaderKind;
  row: number;
  col: number;
  /** first frame of its 2-frame march in the sheet */
  base: number;
  carrier: boolean;
  alive: boolean;
  sprite: Phaser.GameObjects.Sprite;
}

const SHEET: Readonly<Record<InvaderKind, string>> = {
  alienA: SPACE.alienA,
  alienB: SPACE.alienB,
  planet: SPACE.planet,
  asteroid: SPACE.asteroid,
  pebble: SPACE.asteroid,
};

const ENTER_MS = 900;

export class Swarm {
  invaders: Invader[] = [];
  march: March = { ox: 0, oy: 0, dir: 1, frame: 0 };
  wave: WaveDef = WAVES[0];
  private beat = 0;
  private enterMs = 0;
  private flashMs = 0;
  private nextId = 1;

  constructor(private readonly scene: Phaser.Scene) {}

  spawn(waveIndex: number): void {
    this.clear();
    this.wave = WAVES[waveIndex];
    const width = (FORM.cols - 1) * FORM.dx;
    this.march = { ox: Math.round(112 - width / 2), oy: this.wave.top, dir: 1, frame: 0 };
    const carriers = new Set<number>();
    while (carriers.size < this.wave.carriers) carriers.add(Phaser.Math.Between(0, FORM.cols * 2 - 1));
    this.wave.rows.forEach((kind, row) => {
      for (let col = 0; col < FORM.cols; col++) {
        const base = kind === 'planet' ? ((col + row) % 3) * 2 : kind === 'pebble' ? 2 : 0;
        const sprite = this.scene.add.sprite(0, -40, SHEET[kind], base).setDepth(Z.invaders);
        // carriers sit in the two lowest rows so a capsule has a chance to be caught
        const carrier = row >= this.wave.rows.length - 2 && carriers.has((row - (this.wave.rows.length - 2)) * FORM.cols + col);
        this.invaders.push({ id: this.nextId++, kind, row, col, base, carrier, alive: true, sprite });
      }
    });
    this.beat = this.wave.baseStepMs;
    this.enterMs = ENTER_MS;
    this.place();
  }

  get entering(): boolean {
    return this.enterMs > 0;
  }

  alive(): Invader[] {
    return this.invaders.filter((i) => i.alive);
  }

  pos(inv: Invader): { x: number; y: number } {
    return { x: this.march.ox + inv.col * FORM.dx, y: this.march.oy + inv.row * FORM.dy };
  }

  rect(inv: Invader): Rect {
    const { x, y } = this.pos(inv);
    const [w, h] = HITBOX[inv.kind];
    return { x: x - w / 2, y: y - h / 2, w, h };
  }

  /** Advances the beat; returns 'step' / 'drop' on a beat, else null. */
  update(dt: number): 'step' | 'drop' | null {
    this.flashMs = (this.flashMs + dt) % 1000;
    if (this.enterMs > 0) {
      this.enterMs = Math.max(0, this.enterMs - dt);
      this.place();
      return null;
    }
    const alive = this.alive();
    if (alive.length === 0) return null;
    this.beat -= dt;
    let result: 'step' | 'drop' | null = null;
    if (this.beat <= 0) {
      this.beat += stepInterval(alive.length, this.invaders.length, this.wave.baseStepMs, this.wave.minStepMs);
      const ext = extentOf(alive.map((i) => ({ x: this.pos(i).x, halfW: HITBOX[i.kind][0] / 2 })));
      if (ext) {
        const r = nextMarch(this.march, ext, FORM);
        this.march = r.march;
        result = r.dropped ? 'drop' : 'step';
      }
    }
    this.place();
    return result;
  }

  /** Lowest alive invader of the column nearest to x (or of a random column). */
  bomber(jetX: number, aim: boolean): Invader | null {
    const alive = this.alive();
    if (alive.length === 0) return null;
    const cols = [...new Set(alive.map((i) => i.col))];
    const col = aim
      ? cols.reduce((b, c) => (Math.abs(this.march.ox + c * FORM.dx - jetX) < Math.abs(this.march.ox + b * FORM.dx - jetX) ? c : b))
      : cols[Phaser.Math.Between(0, cols.length - 1)];
    return alive.filter((i) => i.col === col).reduce((b, i) => (i.row > b.row ? i : b));
  }

  /** Bottom edge of the lowest alive invader (world y), or -Infinity. */
  lowest(): number {
    return this.alive().reduce((m, i) => Math.max(m, this.rect(i).y + this.rect(i).h), -Infinity);
  }

  kill(inv: Invader): void {
    inv.alive = false;
    inv.sprite.destroy();
  }

  pushUp(px: number): void {
    this.march = { ...this.march, oy: this.march.oy - px };
    this.place();
  }

  clear(): void {
    for (const i of this.invaders) if (i.alive) i.sprite.destroy();
    this.invaders = [];
  }

  private place(): void {
    const k = this.enterMs / ENTER_MS;
    const lift = Math.round(120 * k * k);
    // carriers (they hold a lightning capsule) shimmer electric blue now and then
    const flash = this.flashMs < 160 || (this.flashMs > 260 && this.flashMs < 340);
    for (const inv of this.invaders) {
      if (!inv.alive) continue;
      const { x, y } = this.pos(inv);
      inv.sprite.setPosition(x, y - lift).setFrame(inv.base + this.march.frame);
      if (inv.carrier && flash) inv.sprite.setTint(0x9ae8ff);
      else if (inv.carrier) inv.sprite.clearTint();
    }
  }
}
