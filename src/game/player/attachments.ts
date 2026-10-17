/**
 * Sprites pinned to Ciccio's per-frame anchors (from the ciccio art pack): Provola badge
 * on the chest, Thai club in the hand, Brie aura around him, crunchy wings on the back.
 * Level 2 can register more specs with `Attachments.add`.
 */
import type Phaser from 'phaser';
import { ITEM_ANIMS, ITEMS } from '../../art/keys';
import type { CiccioFrameAnchors, FrameAnchor, PowerState } from '../../contracts';
import { DEPTH } from '../depths';

export type AnchorName = keyof CiccioFrameAnchors | 'feet';

export interface AttachmentSpec {
  id: string;
  key: string;
  anim?: string;
  anchor: AnchorName;
  /** origin for the right-facing pose (mirrored when facing left) */
  originX: number;
  originY: number;
  depth: number;
  /** follow the anchor's angle (held club) */
  rotate: boolean;
  /** far tip relative to the origin, texture px (right-facing): rotation is clamped so it stays above the feet */
  tip?: readonly [number, number];
  /** follow squash & stretch (worn items) or only the power scale (auras) */
  squash: boolean;
  alpha?: number;
  visible(powers: PowerState): boolean;
}

const FRAME = 48;
const DEFAULT_ANCHORS: CiccioFrameAnchors = {
  hand: { x: 32, y: 31, angle: 0.5 },
  chest: { x: 25, y: 29 },
  back: { x: 19, y: 25 },
  head: { x: 26, y: 16 },
};

export const DEFAULT_ATTACHMENTS: AttachmentSpec[] = [
  {
    id: 'wings', key: ITEMS.wings, anim: ITEM_ANIMS.wings, anchor: 'back', originX: 16 / 32, originY: 12 / 24,
    depth: DEPTH.behindHero, rotate: false, squash: true, visible: (p) => p.wings,
  },
  {
    id: 'badge', key: ITEMS.badge, anchor: 'chest', originX: 0.5, originY: 0.5,
    depth: DEPTH.attach, rotate: false, squash: true, visible: (p) => p.goat,
  },
  {
    id: 'club', key: ITEMS.club, anchor: 'hand', originX: 5.5 / 24, originY: 19.5 / 24, tip: [15.5, -16.5],
    depth: DEPTH.attach + 1, rotate: true, squash: false, visible: (p) => p.thai,
  },
  {
    id: 'shield', key: ITEMS.shield, anim: ITEM_ANIMS.shield, anchor: 'feet', originX: 0.5, originY: 1,
    depth: DEPTH.shield, rotate: false, squash: false, alpha: 0.9, visible: (p) => p.brie,
  },
];

interface Live {
  spec: AttachmentSpec;
  sprite: Phaser.GameObjects.Sprite;
}

export interface HeroPose {
  sprite: Phaser.GameObjects.Sprite;
  facing: 1 | -1;
  /** power scale (Brie) */
  scale: number;
  /** squash & stretch multipliers */
  sqX: number;
  sqY: number;
  /** false during the invulnerability blink */
  shown: boolean;
}

/** Largest rotation <= angle that keeps the rotated tip at or above `maxY` (screen y grows down). */
export function clampTipAngle(angle: number, handY: number, tip: readonly [number, number], scale: number, maxY: number): number {
  let a = angle;
  for (let i = 0; i < 60; i++) {
    const tipY = handY + scale * (tip[0] * Math.sin(a) + tip[1] * Math.cos(a));
    if (tipY <= maxY) return a;
    a -= 0.05;
  }
  return a;
}

/** World position of a rotated texture point relative to the origin. */
export function rotatedPoint(x: number, y: number, v: readonly [number, number], angle: number, scale: number, facing: 1 | -1): { x: number; y: number } {
  const rx = v[0] * Math.cos(angle) - v[1] * Math.sin(angle);
  const ry = v[0] * Math.sin(angle) + v[1] * Math.cos(angle);
  return { x: x + facing * rx * scale, y: y + ry * scale };
}

export class Attachments {
  private readonly live: Live[] = [];
  private readonly tips = new Map<string, { x: number; y: number }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly anchors: readonly CiccioFrameAnchors[],
    specs: readonly AttachmentSpec[] = DEFAULT_ATTACHMENTS,
  ) {
    specs.forEach((s) => this.add(s));
  }

  add(spec: AttachmentSpec): void {
    const sprite = this.scene.add.sprite(0, 0, spec.key, 0).setDepth(spec.depth).setVisible(false);
    if (spec.alpha !== undefined) sprite.setAlpha(spec.alpha);
    if (spec.anim && this.scene.anims.exists(spec.anim)) sprite.play(spec.anim);
    this.live.push({ spec, sprite });
  }

  /** The live sprite of an attachment (e.g. to speed up the wing flap). */
  get(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.live.find((l) => l.spec.id === id)?.sprite;
  }

  /** Last world position of an attachment's tip (club head), if it has one. */
  tip(id: string): { x: number; y: number } | null {
    return this.tips.get(id) ?? null;
  }

  private anchorOf(frame: number, name: keyof CiccioFrameAnchors): FrameAnchor {
    return (this.anchors[frame] ?? DEFAULT_ANCHORS)[name] ?? DEFAULT_ANCHORS[name];
  }

  /** World position of a frame anchor for the current pose. */
  anchorWorld(pose: HeroPose, name: keyof CiccioFrameAnchors): { x: number; y: number; angle: number } {
    const frame = Number(pose.sprite.frame.name) || 0;
    const a = this.anchorOf(frame, name);
    const sx = pose.scale * pose.sqX;
    const sy = pose.scale * pose.sqY;
    return {
      x: pose.sprite.x + pose.facing * (a.x + 0.5 - FRAME / 2) * sx,
      y: pose.sprite.y + (a.y + 0.5 - FRAME) * sy,
      angle: a.angle ?? 0,
    };
  }

  update(pose: HeroPose, powers: PowerState): void {
    for (const { spec, sprite } of this.live) {
      const on = spec.visible(powers);
      sprite.setVisible(on && pose.shown);
      if (!on) continue;
      const left = pose.facing < 0;
      const sx = pose.scale * (spec.squash ? pose.sqX : 1);
      const sy = pose.scale * (spec.squash ? pose.sqY : 1);
      sprite.setScale(sx, sy).setFlipX(left);
      sprite.setOrigin(left ? 1 - spec.originX : spec.originX, spec.originY);
      if (spec.anchor === 'feet') {
        sprite.setPosition(pose.sprite.x, pose.sprite.y).setRotation(0);
        continue;
      }
      const p = this.anchorWorld(pose, spec.anchor);
      const angle = spec.tip ? clampTipAngle(p.angle, p.y, spec.tip, sy, pose.sprite.y - 1) : p.angle;
      sprite.setPosition(p.x, p.y).setRotation(spec.rotate ? (left ? -angle : angle) : 0);
      if (spec.tip) this.tips.set(spec.id, rotatedPoint(p.x, p.y, spec.tip, angle, sx, pose.facing));
    }
  }

  destroy(): void {
    this.live.forEach((l) => l.sprite.destroy());
    this.live.length = 0;
  }
}
