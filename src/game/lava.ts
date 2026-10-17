/**
 * Level 2 lava: the animated surface strip across the whole level (in front of the island
 * bases, so islands stand in it and a fall reads as sinking), the molten body below, a
 * pulsing additive glow band, embers and bubbles rising from the surface, a slow ember
 * haze drifting in the background and a splash when Ciccio falls in.
 */
import Phaser from 'phaser';
import { INFERNO, INFERNO_ANIMS, ITEM_ANIMS, ITEMS } from '../art/keys';
import { DEPTH } from './depths';
import { FX_ART } from './fxArt';
import type { ViewRect } from './parallax';

const STRIP = 32;
const GLOW_W = 64;
/** glow band bottom, px below the surface line (overlaps the bright crest) */
const GLOW_SINK = 10;
/** bubbles pop just under the crest, inside the hot band */
const BUBBLE_DY = 9;

/** Random emit zone over a rectangle that is moved with the camera every frame. */
function zoneOf(r: Phaser.Geom.Rectangle): Phaser.Types.GameObjects.Particles.RandomZoneSource {
  return {
    getRandomPoint: (p) => {
      p.x = r.x + Math.random() * r.width;
      p.y = r.y + Math.random() * r.height;
    },
  };
}

export class Lava {
  private readonly glows: Phaser.GameObjects.Image[] = [];
  private readonly splashes: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly sparkZone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private readonly hazeZone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private bubbleMs = 0;
  private t = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    width: number,
    height: number,
    /** world y of the top of the lava strip */
    readonly surfaceY: number,
  ) {
    const anim = scene.anims.exists(INFERNO_ANIMS.lava);
    // a strip past both level ends: camera shake at the edges never shows a gap
    for (let x = -2 * STRIP; x < width + 2 * STRIP; x += STRIP) {
      const s = scene.add.sprite(x, surfaceY, INFERNO.lava, 0).setOrigin(0, 0).setDepth(DEPTH.lava);
      if (anim) s.play(INFERNO_ANIMS.lava);
    }
    // the strip's last row is lavaRed: the textured deep lava continues from that colour,
    // a flat dark fill backs it far below (beyond any camera sink or shake)
    const bodyTop = surfaceY + STRIP - 1;
    const deep = Phaser.Display.Color.HexStringToColor('#3c0806').color;
    scene.add.rectangle(-2 * STRIP, bodyTop, width + 4 * STRIP, height - surfaceY + 160, deep).setOrigin(0, 0).setDepth(DEPTH.lava);
    if (scene.textures.exists(FX_ART.lavaDeep)) {
      for (let x = -2 * STRIP; x < width + 2 * STRIP; x += STRIP) scene.add.image(x, bodyTop, FX_ART.lavaDeep).setOrigin(0, 0).setDepth(DEPTH.lava);
    }
    for (let x = -GLOW_W; x < width + GLOW_W; x += GLOW_W) {
      const g = scene.add.image(x, surfaceY + GLOW_SINK, INFERNO.lavaGlow).setOrigin(0, 1).setDepth(DEPTH.lavaGlow);
      this.glows.push(g.setBlendMode(Phaser.BlendModes.ADD));
    }
    scene.add.particles(0, 0, INFERNO.ember, {
      frame: [0, 0, 1, 2],
      lifespan: { min: 900, max: 2100 },
      speedY: { min: -64, max: -22 },
      speedX: { min: -10, max: 10 },
      alpha: { start: 1, end: 0 },
      frequency: 110,
      emitZone: { type: 'random', source: zoneOf(this.sparkZone) },
    }).setDepth(DEPTH.lavaFx);
    scene.add.particles(0, 0, INFERNO.ember, {
      frame: [1, 2, 3],
      lifespan: { min: 3500, max: 6500 },
      speedY: { min: -20, max: -7 },
      speedX: { min: -5, max: 13 },
      alpha: { start: 0.85, end: 0 },
      frequency: 170,
      emitZone: { type: 'random', source: zoneOf(this.hazeZone) },
    }).setDepth(DEPTH.haze);
    this.splashes = scene.add.particles(0, 0, INFERNO.ember, {
      frame: [0, 1],
      lifespan: { min: 450, max: 900 },
      speed: { min: 70, max: 170 },
      angle: { min: 225, max: 315 },
      gravityY: 420,
      alpha: { start: 1, end: 0.2 },
      emitting: false,
    }).setDepth(DEPTH.lavaFx);
  }

  update(view: ViewRect, dtMs: number): void {
    this.t += dtMs / 1000;
    const a = 0.82 + 0.16 * Math.sin(this.t * 2.1);
    for (const g of this.glows) g.setAlpha(a);
    this.sparkZone.setTo(view.x - 16, this.surfaceY + 3, view.w + 32, 4);
    this.hazeZone.setTo(view.x - 40, view.y + view.h * 0.3, view.w + 80, view.h * 0.75);
    this.bubbleMs -= dtMs;
    if (this.bubbleMs > 0) return;
    this.bubbleMs = Phaser.Math.Between(140, 340);
    this.bubble(view.x + Math.random() * view.w);
  }

  private bubble(x: number): void {
    const s = this.scene.add.sprite(Math.round(x), this.surfaceY + BUBBLE_DY, FX_ART.bubble, 0);
    s.setOrigin(0.5, 1).setDepth(DEPTH.lavaFx);
    if (!this.scene.anims.exists(FX_ART.bubblePop)) {
      s.destroy();
      return;
    }
    s.play(FX_ART.bubblePop);
    s.once('animationcomplete', () => s.destroy());
  }

  /** Ciccio fell in: a spray of embers, flames licking up and a ring of bubbles at the spot. */
  splash(x: number): void {
    this.splashes.explode(22, x, this.surfaceY + 4);
    for (const dx of [-10, 0, 9]) this.bubble(x + dx);
    for (const [dx, frame] of [[-7, 2], [6, 0]] as const) {
      const f = this.scene.add.sprite(Math.round(x + dx), this.surfaceY + 8, ITEMS.flame, frame).setOrigin(0.5, 1).setDepth(DEPTH.lavaFx);
      if (this.scene.anims.exists(ITEM_ANIMS.flame)) f.play({ key: ITEM_ANIMS.flame, startFrame: frame });
      this.scene.tweens.add({ targets: f, y: f.y - 10, alpha: 0, delay: 200, duration: 420, onComplete: () => f.destroy() });
    }
  }
}
