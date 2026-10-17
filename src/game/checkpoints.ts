/** Checkpoint pennants: activated by walking past them; the last one is the respawn point. */
import type Phaser from 'phaser';
import { TILE } from '../art/keys';
import { DEPTH } from './depths';
import { addGlow } from './fxArt';
import type { EntitySpawn } from './levels/types';
import type { ThemeConfig } from './themes';

interface Post {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  feetY: number;
  active: boolean;
}

export interface RespawnPoint {
  x: number;
  feetY: number;
}

export class Checkpoints {
  private readonly posts: Post[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: ThemeConfig,
    entities: readonly EntitySpawn[],
    private respawn: RespawnPoint,
  ) {
    for (const e of entities) {
      if (e.spec.type !== 'checkpoint') continue;
      const x = e.col * TILE + TILE / 2;
      const feetY = (e.row + 1) * TILE;
      const sprite = scene.add.sprite(x, feetY + 1, theme.checkpoint.key, 0).setOrigin(0.5, 1).setDepth(DEPTH.checkpoint);
      this.posts.push({ sprite, x, feetY, active: false });
    }
  }

  get point(): RespawnPoint {
    return this.respawn;
  }

  /** Activates the first inactive post the hero has passed; returns it (or null). */
  update(heroX: number): RespawnPoint | null {
    for (const p of this.posts) {
      if (p.active || heroX < p.x - 4) continue;
      p.active = true;
      if (this.scene.anims.exists(this.theme.checkpoint.anim)) p.sprite.play(this.theme.checkpoint.anim);
      if (this.theme.lights) addGlow(this.scene, p.x, p.feetY - 26, { depth: DEPTH.glow, alpha: 0.95, pulse: 0.25 });
      this.respawn = { x: p.x, feetY: p.feetY };
      return this.respawn;
    }
    return null;
  }
}
