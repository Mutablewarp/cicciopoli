/**
 * Enemy registry + manager. Each map letter maps to an EnemyKind; the factory table
 * decides which class spawns. Level 2 registers bat / demon / spirit factories here, level 5
 * the brute and the mega burger boss.
 */
import type Phaser from 'phaser';
import { TILE } from '../../art/keys';
import type { EnemyKind, EntitySpawn } from '../levels/types';
import type { Enemy, EnemyHost } from './Enemy';
import { Armor, Chili, Pickle } from './hillsEnemies';
import { Bat, Demon, Spirit } from './infernoEnemies';
import { Brute, MegaBurger } from './rampageEnemies';

export type EnemyFactory = (scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, feetY: number) => Enemy;

export const ENEMY_FACTORIES: Partial<Record<EnemyKind, EnemyFactory>> = {
  pickle: (s, g, x, y) => new Pickle(s, g, x, y),
  chili: (s, g, x, y) => new Chili(s, g, x, y),
  armor: (s, g, x, y) => new Armor(s, g, x, y),
  bat: (s, g, x, y) => new Bat(s, g, x, y),
  demon: (s, g, x, y) => new Demon(s, g, x, y),
  spirit: (s, g, x, y) => new Spirit(s, g, x, y),
  brute: (s, g, x, y) => new Brute(s, g, x, y),
  megaburger: (s, g, x, y) => new MegaBurger(s, g, x, y),
};

export class Enemies {
  readonly group: Phaser.Physics.Arcade.Group;
  private readonly list: Enemy[] = [];
  private readonly byObj = new Map<Phaser.GameObjects.GameObject, Enemy>();

  constructor(private readonly scene: Phaser.Scene, entities: readonly EntitySpawn[]) {
    this.group = scene.physics.add.group();
    for (const e of entities) {
      if (e.spec.type === 'enemy') this.spawn(e.spec.kind, e.col * TILE + TILE / 2, (e.row + 1) * TILE);
    }
  }

  /** Adds one enemy standing at (x, feetY); returns it (null for a kind with no factory). */
  spawn(kind: EnemyKind, x: number, feetY: number): Enemy | null {
    const make = ENEMY_FACTORIES[kind];
    if (!make) return null;
    const enemy = make(this.scene, this.group, x, feetY);
    this.list.push(enemy);
    this.byObj.set(enemy.sprite, enemy);
    return enemy;
  }

  of(obj: Phaser.GameObjects.GameObject): Enemy | undefined {
    const e = this.byObj.get(obj);
    return e && e.alive ? e : undefined;
  }

  /** False for fliers (bats, spirits): they pass through terrain and blocks. */
  isWalker(obj: Phaser.GameObjects.GameObject | null): boolean {
    const e = obj ? this.byObj.get(obj) : undefined;
    return !e || e.body.allowGravity;
  }

  alive(): Enemy[] {
    return this.list.filter((e) => e.alive);
  }

  update(dtMs: number, host: EnemyHost): void {
    for (const e of this.list) e.update(dtMs, host);
  }
}
