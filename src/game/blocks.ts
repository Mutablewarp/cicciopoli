/**
 * Solid level props that are sprites rather than tiles: ? blocks (bumped from below,
 * then "used") and wooden crates (broken by cheese / club). Both are static bodies.
 */
import type Phaser from 'phaser';
import { TILE } from '../art/keys';
import { DEPTH } from './depths';
import type { Fx } from './fx';
import type { EntitySpawn } from './levels/types';
import type { PickupKind } from './rules';
import type { ThemeConfig } from './themes';

export interface QBlock {
  sprite: Phaser.Physics.Arcade.Sprite;
  contents: PickupKind;
  used: boolean;
  /** top edge y of the block */
  top: number;
}

export class Blocks {
  readonly qblocks: Phaser.Physics.Arcade.StaticGroup;
  readonly crates: Phaser.Physics.Arcade.StaticGroup;
  private readonly q = new Map<Phaser.GameObjects.GameObject, QBlock>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly theme: ThemeConfig,
    private readonly fx: Fx,
    entities: readonly EntitySpawn[],
  ) {
    this.qblocks = scene.physics.add.staticGroup();
    this.crates = scene.physics.add.staticGroup();
    for (const e of entities) {
      const x = e.col * TILE + TILE / 2;
      const y = e.row * TILE + TILE / 2;
      if (e.spec.type === 'qblock') this.addQBlock(x, y, e.spec.contents);
      else if (e.spec.type === 'crate') this.addCrate(x, y);
    }
  }

  private addQBlock(x: number, y: number, contents: PickupKind): void {
    const s = this.qblocks.create(x, y, this.theme.qblock.key, 0) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(DEPTH.blocks);
    if (this.scene.anims.exists(this.theme.qblock.anim)) s.play({ key: this.theme.qblock.anim, startFrame: Math.floor(x / TILE) % 4 });
    this.q.set(s, { sprite: s, contents, used: false, top: y - TILE / 2 });
  }

  private addCrate(x: number, y: number): void {
    const s = this.crates.create(x, y, this.theme.crate) as Phaser.Physics.Arcade.Sprite;
    s.setDepth(DEPTH.blocks);
  }

  qblockOf(obj: Phaser.GameObjects.GameObject): QBlock | undefined {
    return this.q.get(obj);
  }

  /** Hop animation; returns the contents the first time, null once used. */
  bump(b: QBlock): PickupKind | null {
    const s = b.sprite;
    this.scene.tweens.killTweensOf(s);
    s.y = b.top + TILE / 2;
    this.scene.tweens.add({ targets: s, y: s.y - 5, duration: 70, yoyo: true, ease: 'Quad.easeOut' });
    if (b.used) return null;
    b.used = true;
    s.anims.stop();
    s.setFrame(this.theme.qblock.usedFrame);
    return b.contents;
  }

  /** Smashes a crate (splinters + poof). Returns false if it was already gone. */
  breakCrate(obj: Phaser.GameObjects.GameObject): boolean {
    const s = obj as Phaser.Physics.Arcade.Sprite;
    if (!s.active) return false;
    this.fx.crateBits(s.x, s.y);
    this.fx.poof(s.x, s.y);
    this.crates.remove(s, true, true);
    return true;
  }

  /** Crate sprites still standing (club hit tests). */
  liveCrates(): Phaser.Physics.Arcade.Sprite[] {
    return this.crates.getChildren().filter((c) => c.active) as Phaser.Physics.Arcade.Sprite[];
  }
}
