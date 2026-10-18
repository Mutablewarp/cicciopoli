/**
 * Level 5 props the hero smashes: bricks (3 hits, four crack frames), crates and barrels
 * (one hit). Static bodies on top of the terrain, like crates; a broken one bursts into
 * rubble and may throw out pickups. Locked bricks are the arena gate: they only open with
 * the boss. Walls are the way forward, so every brick is reachable by a punch (one stage
 * per hit) and by the slam shockwave (two stages), see brawl/rules.ts.
 */
import type Phaser from 'phaser';
import { RAMPAGE, TILE } from '../../art/keys';
import { HULK, SCORE } from '../../config/tuning';
import type { Rect } from '../combat/club';
import { DEPTH } from '../depths';
import { dropToGround } from '../enemies/Enemy';
import type { EntitySpawn, SmashKind } from '../levels/types';
import { addScore, type PickupKind } from '../rules';
import type { LevelRun } from '../run';
import { brickFrame, hitResult, inBlast, stackAbove } from './rules';

export interface Smashable {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: SmashKind;
  hp: number;
  contents?: PickupKind;
  locked: boolean;
  /** a brick left hanging by a broken one below: it is about to crumble */
  crumbling?: boolean;
}

export type SmashResult = 'cracked' | 'broken' | 'clang';

const TEXTURE: Readonly<Record<SmashKind, string>> = { brick: RAMPAGE.brick, crate: RAMPAGE.crate, barrel: RAMPAGE.barrel };
/** Reinforced arena-gate bricks read as steel-blue. */
const LOCKED_TINT = 0xa9b4d8;
/** How far below a prop to look for the ground its chips fall to. */
const FALL_SEARCH_PX = 160;
/** Delay between two gate bricks blowing up, ms. */
const GATE_STAGGER_MS = 45;
/** A brick left hanging crumbles after this beat, so the gap under it is seen first. */
const CRUMBLE_LEAD_MS = 140;

export class Smashables {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private readonly all: Smashable[] = [];

  constructor(
    private readonly r: LevelRun,
    entities: readonly EntitySpawn[],
  ) {
    this.group = r.scene.physics.add.staticGroup();
    for (const e of entities) {
      if (e.spec.type !== 'smash') continue;
      this.add(e.spec.kind, e.col * TILE + TILE / 2, e.row * TILE + TILE / 2, e.spec.contents, e.spec.locked === true);
    }
  }

  private add(kind: SmashKind, x: number, y: number, contents: PickupKind | undefined, locked: boolean): void {
    const sprite = this.group.create(x, y, TEXTURE[kind], kind === 'brick' ? 0 : undefined) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(DEPTH.blocks);
    if (locked) sprite.setTint(LOCKED_TINT);
    this.all.push({ sprite, kind, hp: kind === 'brick' ? HULK.brickHits : 1, contents, locked });
  }

  /** Props still standing. */
  live(): Smashable[] {
    return this.all.filter((s) => s.sprite.active);
  }

  /** The locked gate bricks still standing. */
  gate(): Smashable[] {
    return this.live().filter((s) => s.locked);
  }

  /** Props overlapping a box (the punch hitbox). */
  inBox(box: Rect): Smashable[] {
    return this.live().filter((s) => {
      const { x, y } = s.sprite;
      return box.left < x + TILE / 2 && box.right > x - TILE / 2 && box.top < y + TILE / 2 && box.bottom > y - TILE / 2;
    });
  }

  /** Applies `damage` to one prop: a crack, a break, or a clang off the locked gate. */
  hit(s: Smashable, damage: number): SmashResult {
    const { svc, fx } = this.r;
    const { x, y } = s.sprite;
    if (s.locked) {
      fx.hitStar(x, y);
      svc.audio.sfx('armorClang');
      return 'clang';
    }
    const out = hitResult(s.hp, damage);
    s.hp = out.hp;
    if (out.dead) {
      this.burst(s);
      return 'broken';
    }
    s.sprite.setFrame(brickFrame(s.hp, damage));
    this.r.juice.rubble(x, y, 2, 0.7, this.floorY(s));
    svc.audio.sfx('smash');
    return 'cracked';
  }

  /** Slam shockwave: every prop in range takes the slam damage; returns how many broke. */
  blast(x: number, feetY: number, damage: number): number {
    let broken = 0;
    for (const s of this.live()) {
      if (s.locked) continue; // the gate only opens with the boss; no clang for every brick
      const { x: sx, y: sy } = s.sprite;
      const box = { left: sx - TILE / 2, right: sx + TILE / 2, top: sy - TILE / 2, bottom: sy + TILE / 2 };
      if (inBlast(x, feetY, box) && this.hit(s, damage) === 'broken') broken++;
    }
    return broken;
  }

  /** The boss is down: the gate bricks blow up one after the other. */
  openGate(): void {
    this.gate().forEach((s, i) => {
      s.locked = false;
      this.r.scene.time.delayedCall(i * GATE_STAGGER_MS, () => {
        if (s.sprite.active) this.burst(s, false);
      });
    });
  }

  /** World y of the terrain under a prop: where its chips come to rest. */
  private floorY(s: Smashable): number {
    const bottom = s.sprite.y + TILE / 2;
    return bottom + dropToGround(this.r.world, s.sprite.x, bottom, FALL_SEARCH_PX);
  }

  /** The wall cell a prop stands in. */
  private cellOf(s: Smashable): { col: number; row: number } {
    return { col: Math.floor(s.sprite.x / TILE), row: Math.floor(s.sprite.y / TILE) };
  }

  /** Bricks stacked on the cell of a prop that just broke have nothing under them: they crumble, bottom to top. */
  private crumbleAbove({ col, row }: { col: number; row: number }): void {
    const bricks = this.live()
      .filter((b) => b.kind === 'brick' && !b.locked && !b.crumbling)
      .map((b) => ({ b, ...this.cellOf(b) }));
    stackAbove(bricks, col, row).forEach(({ b }, i) => {
      b.crumbling = true;
      this.r.scene.time.delayedCall(CRUMBLE_LEAD_MS + i * GATE_STAGGER_MS, () => {
        if (b.sprite.active) this.burst(b, false);
      });
    });
  }

  /** Breaks a prop; `cascade` false when the caller already handles what hangs above it. */
  private burst(s: Smashable, cascade = true): void {
    const { svc, fx, juice, run, pickups } = this.r;
    const cell = this.cellOf(s);
    const { x, y } = s.sprite;
    const brick = s.kind === 'brick';
    juice.rubble(x, y, brick ? 4 : 6, s.kind === 'barrel' ? 1.3 : 1, this.floorY(s));
    juice.dust(x, y + TILE / 2, brick ? 0.6 : 0.8);
    svc.audio.sfx(brick ? 'rubble' : 'smash');
    addScore(run, brick ? SCORE.brick : SCORE.crate);
    if (!brick) fx.popup(x, y - 10, SCORE.crate);
    if (s.contents) {
      const n = s.contents === 'nugget' ? HULK.nuggets : 1;
      for (let i = 0; i < n; i++) pickups.pop(s.contents, x, y, (i - (n - 1) / 2) * 16);
    }
    this.group.remove(s.sprite, true, true);
    if (cascade) this.crumbleAbove(cell);
  }
}
