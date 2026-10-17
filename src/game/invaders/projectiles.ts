/**
 * Ciccio's provola-stick shots (max 2 on screen) and the invaders' bombs (alien goo,
 * meteor bits). Movement only; collisions live in battle.ts.
 */
import type Phaser from 'phaser';
import { SPACE, SPACE_ANIMS } from '../../art/space/keys';
import { FIELD, SHOT } from './config';
import { Z } from './fx';
import type { Rect } from './shields';

export interface Bomb {
  sprite: Phaser.GameObjects.Sprite;
  vy: number;
}

export class Projectiles {
  shots: Phaser.GameObjects.Sprite[] = [];
  bombs: Bomb[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  fire(x: number, y: number): boolean {
    if (this.shots.length >= SHOT.max) return false;
    const s = this.scene.add.sprite(Math.round(x), Math.round(y), SPACE.shot, 0).setDepth(Z.shots);
    s.play(SPACE_ANIMS.shot);
    this.shots.push(s);
    return true;
  }

  bomb(x: number, y: number, goo: boolean, vy: number): void {
    const s = this.scene.add.sprite(Math.round(x), Math.round(y), goo ? SPACE.goo : SPACE.rock, 0).setDepth(Z.bombs);
    s.play(goo ? SPACE_ANIMS.goo : SPACE_ANIMS.rock);
    this.bombs.push({ sprite: s, vy });
  }

  update(dt: number): void {
    const sec = dt / 1000;
    for (const s of this.shots) s.y -= SHOT.speed * sec;
    for (const b of this.bombs) b.sprite.y += b.vy * sec;
    this.shots = this.shots.filter((s) => (s.y > -8 ? true : (s.destroy(), false)));
    this.bombs = this.bombs.filter((b) => (b.sprite.y < FIELD.h + 8 ? true : (b.sprite.destroy(), false)));
  }

  removeShot(s: Phaser.GameObjects.Sprite): void {
    this.shots = this.shots.filter((x) => x !== s);
    s.destroy();
  }

  removeBomb(b: Bomb): void {
    this.bombs = this.bombs.filter((x) => x !== b);
    b.sprite.destroy();
  }

  clearBombs(): { x: number; y: number }[] {
    const at = this.bombs.map((b) => ({ x: b.sprite.x, y: b.sprite.y }));
    for (const b of this.bombs) b.sprite.destroy();
    this.bombs = [];
    return at;
  }

  clearShots(): void {
    for (const s of this.shots) s.destroy();
    this.shots = [];
  }
}

export function shotRect(s: Phaser.GameObjects.Sprite): Rect {
  return { x: s.x - 2, y: s.y - 5, w: 4, h: 8 };
}

export function bombRect(b: Bomb): Rect {
  return { x: b.sprite.x - 2, y: b.sprite.y - 3, w: 4, h: 6 };
}
