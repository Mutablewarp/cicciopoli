/**
 * YOU ARE SO GOLDEN: the 3-star finale at the counter. The room dims under the lit beam: the lights
 * flash, the neon and the face-logo disc on the wall give way to the lettering; gold rays spin behind
 * the golden burger trophy as it drops in, in sparkles, confetti rains, and the huge golden lettering pops with
 * the owner's ORIGINAL face logo tinted gold (hi-res, never pixelated). All of it centred on the
 * SCREEN: on a tall screen face, lettering (KITCHEN_GOLDEN.layout.textW of the width) and trophy one
 * over the other; on a wide one the lettering over the face and the trophy side by side. The
 * fanfare plays over the music. ~5 s, a tap skips it after 2 s. Everything is placed from the current
 * framing on every frame (the HUD hides, the phone rotates: it stays centred and whole).
 */
import type Phaser from 'phaser';
import { KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { BRAND, BRAND_SIZE, brandScale } from './brand';
import { KITCHEN_COLORS, KITCHEN_GOLDEN } from './config';
import type { Point } from './layout';
import type { KitchenView } from './view';

const G = KITCHEN_GOLDEN;
const L = G.layout;
const TROPHY = 96;
const TEXT_W = 180;
const TEXT_H = 60;
const FACE = BRAND_SIZE.faceGold;
const SPARKLE_EVERY_MS = 220;
const DIM_ALPHA = 0.55;

interface Spots {
  text: Point;
  textScale: number;
  /** trophy: bottom centre */
  trophy: Point;
  /** face: centre; the same scale as the trophy */
  face: Point;
  scale: number;
}

export class GoldenFinale {
  private t = 0;
  private sparkleT = 0;
  private finished = false;
  private readonly objs: Phaser.GameObjects.GameObject[] = [];
  private readonly confetti: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly rays: Phaser.GameObjects.Image;
  private readonly trophy: Phaser.GameObjects.Sprite;
  private readonly title: Phaser.GameObjects.Image;
  private readonly face: Phaser.GameObjects.Image | null;
  /** tweened: trophy drop 0..1, lettering pop 0..1, rays grow 0..1 */
  private readonly anim = { drop: 0, pop: 0, rays: 0 };
  /** the trophy's breathing (x its scale) */
  private readonly breath = { k: 1 };

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly view: KitchenView,
    private readonly calm: boolean,
    private readonly onDone: () => void,
  ) {
    const top = view.counter.top;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      top.add(o);
      this.objs.push(o);
      return o;
    };
    view.show('counter', true);
    view.counter.gold = true;
    scene.tweens.add({ targets: view.counter.shade, alpha: DIM_ALPHA, duration: 400 });
    this.rays = scene.add.image(0, 0, KITCHEN.goldRays).setAlpha(0);
    view.counter.behind.add(this.rays);
    this.objs.push(this.rays);
    scene.tweens.add({ targets: this.anim, rays: 1, duration: 700, ease: 'Quad.easeOut' });
    scene.tweens.add({ targets: this.rays, alpha: G.raysAlpha, duration: 700, ease: 'Quad.easeOut' });
    if (!calm) scene.tweens.add({ targets: this.rays, angle: 360, duration: G.raysSpinMs, repeat: -1 });
    this.trophy = add(scene.add.sprite(0, 0, KITCHEN.goldenBurger, 0).setOrigin(0.5, 1));
    if (scene.anims.exists(KITCHEN_ANIMS.golden[0])) this.trophy.play(KITCHEN_ANIMS.golden[0]);
    scene.tweens.add({ targets: this.anim, drop: 1, duration: calm ? 300 : G.dropMs, ease: calm ? 'Quad.easeOut' : 'Bounce.easeOut' });
    this.title = add(scene.add.image(0, 0, KITCHEN.goldenText).setScale(0).setAlpha(0));
    // the gold face only from the original logo (no logo file: no face, never a pixel one)
    this.face = scene.textures.exists(BRAND.faceGold) ? add(scene.add.image(0, 0, BRAND.faceGold).setAlpha(0)) : null;
    scene.tweens.add({ targets: this.anim, pop: 1, delay: calm ? 300 : G.textAtMs, duration: 420, ease: 'Back.easeOut' });
    const v = view.framing.view;
    this.confetti = scene.add
      .particles(0, 0, KITCHEN.confetti, {
        frame: [0, 1, 2, 3, 4, 5],
        x: { min: 0, max: v.w },
        y: -6,
        speedY: { min: 30, max: 80 },
        speedX: { min: -25, max: 25 },
        rotate: { min: 0, max: 360 },
        gravityY: 20,
        lifespan: v.h * 25,
        frequency: (G.ms / (calm ? G.confettiCalm : G.confetti)) * 2,
        quantity: 2,
      })
      .setDepth(45);
    scene.tweens.add({ targets: this.breath, k: 1.04, duration: 500, yoyo: true, repeat: -1, delay: G.dropMs });
    this.place();
  }

  /** Lettering, trophy and face centred on the screen (counter px of CounterFrame.view), all of them whole. */
  private spots(): Spots {
    const v = this.view.counter.frame?.view ?? { x: 0, y: 0, w: TEXT_W, h: TEXT_H + TROPHY };
    const m = L.margin * Math.min(v.w, v.h);
    const gap = L.gap * Math.min(v.w, v.h);
    const cx = v.x + v.w / 2;
    const avail = v.h - 2 * m;
    if (v.h >= v.w * L.tallAspect) {
      // face / lettering / trophy, one over the other
      const textScale = Math.min((L.textW * v.w) / TEXT_W, (L.textH * avail) / TEXT_H);
      const th = TEXT_H * textScale;
      const scale = Math.min(L.scaleMax, (L.trophyW * v.w) / TROPHY, (avail - th - 2 * gap) / (TROPHY + FACE.h));
      const y0 = v.y + (v.h - (FACE.h * scale + gap + th + gap + TROPHY * scale)) / 2;
      const face = { x: cx, y: y0 + (FACE.h * scale) / 2 };
      const text = { x: cx, y: y0 + FACE.h * scale + gap + th / 2 };
      return { text, textScale, trophy: { x: cx, y: text.y + th / 2 + gap + TROPHY * scale }, face, scale };
    }
    // the lettering over the face and the trophy, side by side
    const textScale = Math.min((L.textW * v.w) / TEXT_W, (L.textH * avail) / TEXT_H);
    const th = TEXT_H * textScale;
    const scale = Math.min(L.scaleMax, (avail - th - gap) / TROPHY, (L.trophyW * v.w) / (TROPHY + FACE.w));
    const y0 = v.y + (v.h - (th + gap + TROPHY * scale)) / 2;
    const rowW = (FACE.w + TROPHY) * scale + gap;
    const bottom = y0 + th + gap + TROPHY * scale;
    return {
      text: { x: cx, y: y0 + th / 2 },
      textScale,
      face: { x: cx - rowW / 2 + (FACE.w * scale) / 2, y: bottom - (TROPHY * scale) / 2 },
      trophy: { x: cx + rowW / 2 - (TROPHY * scale) / 2, y: bottom },
      scale,
    };
  }

  private place(): void {
    const v = this.view.counter.frame?.view ?? this.view.framing.view;
    const { trophy, text, textScale, face, scale } = this.spots();
    this.rays.setPosition(trophy.x, trophy.y - (TROPHY * scale) / 2).setScale(scale * (0.6 + 0.4 * this.anim.rays));
    // it drops from over the top of the screen to its spot
    this.trophy.setPosition(trophy.x, v.y + (trophy.y - v.y) * this.anim.drop).setScale(scale * this.breath.k);
    this.title.setPosition(text.x, text.y).setScale(textScale * this.anim.pop).setAlpha(Math.min(1, this.anim.pop));
    this.face?.setPosition(face.x, face.y).setScale(scale * this.anim.pop * brandScale(this.scene, 'faceGold')).setAlpha(Math.min(1, this.anim.pop));
    const w = this.view.framing.view;
    this.confetti.setPosition(w.x, w.y);
  }

  update(dtMs: number): void {
    if (this.finished) return;
    this.t += dtMs;
    this.place();
    const flash = !this.calm && Math.floor(this.t / G.flashEveryMs) % 2 === 0;
    this.view.counter.flashBulbs(this.calm || flash);
    this.sparkleT -= dtMs;
    if (this.sparkleT <= 0 && this.t > G.dropMs * 0.6) {
      this.sparkleT = SPARKLE_EVERY_MS;
      const r = this.trophy;
      const size = TROPHY * r.scaleY;
      const at = { x: r.x + (Math.random() - 0.5) * size, y: r.y - size / 2 + (Math.random() - 0.5) * size * 0.8 };
      this.view.fx.sparkle(this.view.counter.top, at);
      if (Math.random() < 0.3) this.view.fx.burst(this.view.counter.world(at), [KITCHEN_COLORS.perfect, 0xffffff], 6);
    }
    if (this.t >= G.ms) this.finish();
  }

  /** A tap: ends it once it has played a little. */
  skip(): void {
    if (this.t >= G.skipAfterMs) this.finish();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.onDone();
  }

  destroy(): void {
    this.finished = true;
    this.scene.tweens.killTweensOf(this.anim);
    this.scene.tweens.killTweensOf(this.breath);
    for (const o of this.objs) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.confetti.destroy();
    const c = this.view.counter;
    this.scene.tweens.killTweensOf(c.shade);
    c.shade.setAlpha(0);
    c.gold = false;
    c.flashBulbs(false);
  }
}
