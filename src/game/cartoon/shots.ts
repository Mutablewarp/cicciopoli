/**
 * The hero's shots: PROVOLA GOAT (fast straight cheese), MEATBALL (lobbed bomb, splash on the floor or
 * on contact), NUGGETS (homing), their EX versions, and the SUPER PIOGGIA DI PATATINE (fries pouring
 * from a cloud onto the boss). Returns the hits; the round applies the damage.
 */
import type Phaser from 'phaser';
import type { CartoonWeapon, SfxName } from '../../contracts';
import { ARENA, FX, type Box, type Vec } from './api';
import { playFx } from './assets';
import { DEPTH } from './depths';
import type { RoundFx } from './fx';
import { centerOf, circleHitsBox } from './logic/rules';
import { CT_WEAPONS as W } from '../../config/cartoon';

export interface Target {
  box: Box;
  /** 'boss' or a minion index of the round's list */
  ref: number | 'boss';
}

export interface ShotHit {
  ref: number | 'boss';
  damage: number;
  at: Vec;
  /** EX / super damage: does not refill the cards */
  ex: boolean;
}

type Kind = 'straight' | 'lob' | 'homing' | 'fry';

interface Shot {
  kind: Kind;
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ay: number;
  r: number;
  damage: number;
  splash: number;
  age: number;
  life: number;
  ex: boolean;
  turn: number;
}

export class Shots {
  private readonly list: Shot[] = [];
  private rainMs = 0;
  private rainAcc = 0;
  private cloud: Phaser.GameObjects.Sprite | null = null;
  private cloudX: number = ARENA.w / 2;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
    private readonly fx: RoundFx,
    private readonly sfx: (n: SfxName) => void,
    private readonly rng: () => number,
  ) {}

  private add(kind: Kind, key: string, from: Vec, vx: number, vy: number, o: Partial<Shot>): void {
    const sprite = this.scene.add.sprite(from.x, from.y, key).setScale(1 / this.k).setDepth(kind === 'fry' ? DEPTH.rain : DEPTH.shot);
    playFx(sprite, key);
    sprite.setRotation(kind === 'straight' ? Math.atan2(vy, vx) : 0).setFlipX(kind !== 'straight' && vx < 0);
    this.list.push({ kind, sprite, x: from.x, y: from.y, vx, vy, ay: 0, r: 5, damage: 1, splash: 0, age: 0, life: 1000, ex: false, turn: 0, ...o });
  }

  /** One normal shot of `weapon`; returns the ms until the next one. */
  fire(weapon: CartoonWeapon, from: Vec, dir: Vec): number {
    this.fx.muzzle(from);
    if (weapon === 'provola') {
      const c = W.provola;
      this.add('straight', FX.provola, from, dir.x * c.speed, dir.y * c.speed, { r: c.r, damage: c.damage, life: c.lifeMs });
      this.sfx('cheese');
      return c.intervalMs;
    }
    if (weapon === 'meatball') {
      const c = W.meatball;
      this.lob(FX.meatball, from, dir, c.vx, c.vy, c.upVy, { r: c.r, damage: c.damage, splash: c.splash, ay: c.gravity, life: c.lifeMs });
      this.sfx('lob');
      return c.intervalMs;
    }
    const c = W.nuggets;
    const a = Math.atan2(dir.y, dir.x) + (this.rng() * 2 - 1) * c.spread;
    this.add('homing', FX.nugget, from, Math.cos(a) * c.speed, Math.sin(a) * c.speed, { r: c.r, damage: c.damage, life: c.lifeMs, turn: c.turnRate });
    this.sfx('nugget');
    return c.intervalMs;
  }

  private lob(key: string, from: Vec, dir: Vec, vx: number, vy: number, upVy: number, o: Partial<Shot>): void {
    const sx = dir.x === 0 ? 0 : Math.sign(dir.x);
    const diag = dir.x !== 0 && dir.y !== 0;
    const fvx = sx * vx * (diag ? 0.75 : 1);
    const fvy = dir.y === 0 ? vy : diag ? (vy + upVy) / 2 : upVy;
    this.add('lob', key, from, fvx, fvy, o);
  }

  /** The EX shot of `weapon` (one card). */
  ex(weapon: CartoonWeapon, from: Vec, dir: Vec): void {
    const E = W.ex;
    this.fx.blast(from, 0.5);
    this.sfx('ex');
    if (weapon === 'provola') {
      this.add('straight', FX.provolaEx, from, dir.x * E.provola.speed, dir.y * E.provola.speed, { r: E.provola.r, damage: E.provola.damage, life: E.provola.lifeMs, ex: true });
    } else if (weapon === 'meatball') {
      const m = E.meatball;
      this.lob(FX.meatballEx, from, dir, m.vx, m.vy, m.upVy, { r: m.r, damage: m.damage, splash: m.splash, ay: m.gravity, life: m.lifeMs, ex: true });
    } else {
      const n = E.nuggets;
      const base = Math.atan2(dir.y, dir.x);
      for (let i = 0; i < n.count; i++) {
        const a = base + (i / (n.count - 1) - 0.5) * n.fan;
        this.add('homing', FX.nuggetEx, from, Math.cos(a) * n.speed, Math.sin(a) * n.speed, { r: W.nuggets.r + 1, damage: n.damage, life: W.nuggets.lifeMs, turn: W.nuggets.turnRate, ex: true });
      }
    }
  }

  /** PIOGGIA DI PATATINE over the boss for rainMs. */
  superRain(bossX: number): void {
    const S = W.super;
    this.rainMs = S.rainMs;
    this.rainAcc = 0;
    this.cloudX = bossX;
    this.cloud?.destroy();
    this.cloud = this.scene.add.sprite(bossX, -40, FX.friesCloud).setScale(1 / this.k).setDepth(DEPTH.rain);
    playFx(this.cloud, FX.friesCloud);
    this.scene.tweens.add({ targets: this.cloud, y: S.cloudY, duration: 320, ease: 'Back.Out' });
    this.sfx('friesRain');
  }

  get raining(): boolean {
    return this.rainMs > 0;
  }

  private rain(dtMs: number, bossX: number): void {
    const S = W.super;
    if (!this.cloud) return;
    this.cloudX += (bossX - this.cloudX) * Math.min(1, dtMs / 250);
    this.cloud.x = this.cloudX;
    if (this.rainMs <= 0) return;
    this.rainMs -= dtMs;
    this.rainAcc += (dtMs / S.rainMs) * S.fries;
    for (; this.rainAcc >= 1; this.rainAcc--) {
      const x = this.cloudX + (this.rng() * 2 - 1) * S.spread;
      this.add('fry', FX.fry, { x, y: S.cloudY + 14 }, 0, S.fallSpeed * (0.85 + this.rng() * 0.3), { r: S.r, damage: S.damage, life: 2000, ex: true });
    }
    if (this.rainMs > 0) return;
    const c = this.cloud;
    this.cloud = null;
    this.scene.tweens.add({ targets: c, y: -60, alpha: 0, duration: 380, onComplete: () => c.destroy() });
  }

  update(dtMs: number, targets: readonly Target[], bossX: number): ShotHit[] {
    const dt = dtMs / 1000;
    const hits: ShotHit[] = [];
    this.rain(dtMs, bossX);
    for (const s of this.list) {
      s.age += dtMs;
      if (s.kind === 'homing') this.steer(s, targets, dt);
      s.vy += s.ay * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      const hit = targets.find((t) => circleHitsBox(s, s.r, t.box));
      const floor = s.y >= ARENA.floorY - 2 && s.kind !== 'straight' && s.kind !== 'homing';
      if (hit || floor || s.age >= s.life) this.end(s, hit, floor, targets, hits);
      else {
        s.sprite.setPosition(s.x, s.y);
        if (s.kind === 'homing') s.sprite.setRotation(Math.atan2(s.vy, Math.abs(s.vx)) * Math.sign(s.vx || 1));
        if (s.kind === 'lob') s.sprite.angle += (s.vx >= 0 ? 1 : -1) * 540 * dt;
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) if (!this.list[i].sprite.active) this.list.splice(i, 1);
    return hits;
  }

  private steer(s: Shot, targets: readonly Target[], dt: number): void {
    let best: Vec | null = null;
    let bd = Infinity;
    for (const t of targets) {
      const c = centerOf(t.box);
      const d = (c.x - s.x) ** 2 + (c.y - s.y) ** 2;
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    if (!best) return;
    const sp = Math.hypot(s.vx, s.vy);
    const cur = Math.atan2(s.vy, s.vx);
    let diff = Math.atan2(best.y - s.y, best.x - s.x) - cur;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const a = cur + Math.max(-s.turn * dt, Math.min(s.turn * dt, diff));
    s.vx = Math.cos(a) * sp;
    s.vy = Math.sin(a) * sp;
  }

  private end(s: Shot, hit: Target | undefined, floor: boolean, targets: readonly Target[], hits: ShotHit[]): void {
    const at = { x: s.x, y: Math.min(s.y, ARENA.floorY - 2) };
    if (s.kind === 'lob' && (hit || floor)) {
      for (const t of targets) if (circleHitsBox(at, s.splash, t.box)) hits.push({ ref: t.ref, damage: s.damage, at, ex: s.ex });
      this.fx.blast(at, s.splash / 26);
      this.sfx('blast');
    } else if (hit) {
      hits.push({ ref: hit.ref, damage: s.damage, at, ex: s.ex });
      this.fx.hit(at);
    } else if (s.kind === 'fry' && floor) {
      this.fx.dust(at);
    }
    s.sprite.destroy();
  }

  clear(): void {
    for (const s of this.list) s.sprite.destroy();
    this.list.length = 0;
    this.cloud?.destroy();
    this.cloud = null;
    this.rainMs = 0;
  }
}
