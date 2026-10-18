/**
 * Pickups (nugget coins, fries trays, burger, brie, provola, thai, crunchy): static overlap
 * bodies, idle animation, sprite-only bob, collected exactly once. Power-ups can rise out
 * of ? blocks.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../art/keys';
import { DEPTH } from './depths';
import type { Fx } from './fx';
import { addGlow, FX_ART } from './fxArt';
import type { PickupKind } from './rules';

const ART: Record<PickupKind, { key: string; anim: string }> = {
  nugget: { key: ITEMS.nugget, anim: ITEM_ANIMS.nugget },
  fries: { key: ITEMS.fries, anim: ITEM_ANIMS.fries },
  burger: { key: ITEMS.burger, anim: ITEM_ANIMS.burger },
  brie: { key: ITEMS.brie, anim: ITEM_ANIMS.brie },
  goat: { key: ITEMS.provola, anim: ITEM_ANIMS.provola },
  thai: { key: ITEMS.thai, anim: ITEM_ANIMS.thai },
  crunchy: { key: ITEMS.crunchy, anim: ITEM_ANIMS.crunchy },
};

/** Wings catch column: width and how far it reaches below the sprite top (into the pedestal). */
const WINGS_CATCH_W = 20;
const WINGS_CATCH_BELOW = 24;

export interface Pickup {
  sprite: Phaser.Physics.Arcade.Sprite;
  kind: PickupKind;
  baseY: number;
  phase: number;
  taken: boolean;
  bob: boolean;
  /** halo behind the special pickup (crunchy wings) */
  glow?: Phaser.GameObjects.Image;
}

export class Pickups {
  readonly group: Phaser.Physics.Arcade.StaticGroup;
  private readonly items = new Map<Phaser.GameObjects.GameObject, Pickup>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly fx: Fx,
  ) {
    this.group = scene.physics.add.staticGroup();
  }

  spawn(kind: PickupKind, x: number, y: number): Pickup {
    const art = ART[kind];
    const sprite = this.group.create(x, y, art.key, 0) as Phaser.Physics.Arcade.Sprite;
    sprite.setDepth(DEPTH.pickups);
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(12, 12, true);
    // the wings must be impossible to skip: a catch column from the pedestal up to the top of
    // the level, so walking into them, hopping on them or jumping high over them all collect
    if (kind === 'crunchy') {
      const top = y - sprite.height / 2;
      body.setSize(WINGS_CATCH_W, top + WINGS_CATCH_BELOW, false).setOffset((sprite.width - WINGS_CATCH_W) / 2, -top);
    }
    const phase = (x * 0.37) % (Math.PI * 2);
    if (this.scene.anims.exists(art.anim)) {
      const frames = Math.max(1, this.scene.anims.get(art.anim).frames.length);
      sprite.play({ key: art.anim, startFrame: Math.floor(phase * 2) % frames });
    }
    // coins sit still (their arcs trace jump lines); trays and power-ups bob
    const p: Pickup = { sprite, kind, baseY: y, phase, taken: false, bob: kind !== 'nugget' };
    if (kind === 'crunchy' && this.scene.textures.exists(FX_ART.glow)) {
      p.glow = addGlow(this.scene, x, y, { depth: DEPTH.pickups - 1, alpha: 0.95, pulse: 0.4 });
    }
    this.items.set(sprite, p);
    return p;
  }

  /** A power-up climbs out of a ? block, then becomes collectable sitting on top of it. */
  rise(kind: PickupKind, x: number, blockTopY: number): void {
    const p = this.spawn(kind, x, blockTopY + 8);
    const body = p.sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    p.sprite.setDepth(DEPTH.blocks - 1);
    p.bob = false;
    this.scene.tweens.add({
      targets: p.sprite,
      y: blockTopY - 8,
      duration: 480,
      ease: 'Sine.easeOut',
      onComplete: () => {
        if (p.taken) return;
        p.sprite.setDepth(DEPTH.pickups);
        p.baseY = blockTopY - 8;
        p.bob = true;
        body.enable = true;
        body.updateFromGameObject();
      },
    });
  }

  /** A pickup thrown out of a smashed prop: arcs `dx` sideways, lands at height `y`, then waits to be collected. */
  pop(kind: PickupKind, x: number, y: number, dx: number): void {
    const p = this.spawn(kind, x, y);
    const body = p.sprite.body as Phaser.Physics.Arcade.StaticBody;
    const bob = p.bob;
    body.enable = false;
    p.bob = false;
    const t = { v: 0 };
    this.scene.tweens.add({
      targets: t,
      v: 1,
      duration: 420,
      onUpdate: () => p.sprite.setPosition(x + dx * t.v, y - 88 * t.v * (1 - t.v)),
      onComplete: () => {
        if (p.taken) return;
        p.sprite.setPosition(x + dx, y);
        p.baseY = y;
        p.bob = bob;
        body.enable = true;
        body.updateFromGameObject();
      },
    });
  }

  get(obj: Phaser.GameObjects.GameObject): Pickup | undefined {
    const p = this.items.get(obj);
    return p && !p.taken ? p : undefined;
  }

  /** Removes a pickup with a sparkle; returns false if it was already taken. */
  take(p: Pickup): boolean {
    if (p.taken) return false;
    p.taken = true;
    (p.sprite.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.items.delete(p.sprite);
    const small = p.kind === 'nugget';
    this.fx.sparkleBurst(p.sprite.x, p.sprite.y, small ? 3 : 6, small ? 7 : 12);
    this.scene.tweens.killTweensOf(p.sprite);
    p.sprite.destroy();
    if (p.glow) {
      this.scene.tweens.killTweensOf(p.glow);
      p.glow.destroy();
    }
    return true;
  }

  /** Fries popped by a ? block: flies up, sparkles, collected automatically. */
  popFries(x: number, blockTopY: number, onDone: () => void): void {
    const s = this.scene.add.sprite(x, blockTopY - 4, ITEMS.fries, 0).setDepth(DEPTH.pickups);
    if (this.scene.anims.exists(ITEM_ANIMS.fries)) s.play(ITEM_ANIMS.fries);
    this.scene.tweens.add({
      targets: s,
      y: blockTopY - 34,
      duration: 300,
      ease: 'Quad.easeOut',
      yoyo: true,
      hold: 40,
      onYoyo: () => {
        this.fx.sparkle(s.x, s.y);
        onDone();
      },
      onComplete: () => s.destroy(),
    });
    this.scene.tweens.add({ targets: s, alpha: 0, delay: 420, duration: 200 });
  }

  update(timeMs: number): void {
    const t = timeMs / 1000;
    for (const p of this.items.values()) {
      if (p.bob) p.sprite.y = p.baseY + Math.round(Math.sin(t * 2.6 + p.phase) * 1.5);
    }
  }
}
