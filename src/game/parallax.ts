/**
 * Background: sky stretched over the whole view plus horizontally repeating parallax
 * strips bottom-aligned to the horizon. Strips are rows of plain images (TileSprite
 * would resample non power-of-two art in WebGL), repositioned from the camera's visible
 * rectangle every frame so any zoom / aspect ratio is covered with no gaps.
 */
import type Phaser from 'phaser';
import { DEPTH } from './depths';
import type { BackdropDef, LayerDef, ThemeConfig } from './themes';

export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Strip {
  def: LayerDef;
  depth: number;
  texW: number;
  images: Phaser.GameObjects.Image[];
  drift: number;
}

const FALLBACK_FILL = 0x2f7a24;

/** Lowest opaque colour in the middle column of a texture (what continues down into pits). */
function bottomColor(scene: Phaser.Scene, key: string): number {
  const src = scene.textures.get(key).getSourceImage();
  const x = Math.floor(src.width / 2);
  for (let y = src.height - 1; y >= 0; y--) {
    const c = scene.textures.getPixel(x, y, key);
    if (c && c.alpha > 200) return c.color;
  }
  return FALLBACK_FILL;
}

function darken(color: number, k: number): number {
  const r = Math.round(((color >> 16) & 255) * k);
  const g = Math.round(((color >> 8) & 255) * k);
  const b = Math.round((color & 255) * k);
  return (r << 16) | (g << 8) | b;
}

/** Coverage beyond the view on every side, world px: camera shake must never reveal an edge. */
const PAD = 16;
/** Pit filler starts this far above the front strip's bottom, hidden behind it. */
const FILL_OVERLAP = 16;
const FILL_DEEP_AT = 20;

export class Parallax {
  private readonly sky: Phaser.GameObjects.Image;
  private readonly strips: Strip[] = [];
  private readonly fill: Phaser.GameObjects.Rectangle;
  private readonly deep: Phaser.GameObjects.Rectangle;
  private readonly backdrop: { def: BackdropDef; sprite: Phaser.GameObjects.Sprite } | null = null;

  /**
   * @param horizonY world y of the ground surface the strips stand on
   * @param refTop camera top when it rests at the bottom of the level (vertical reference)
   */
  constructor(
    private readonly scene: Phaser.Scene,
    theme: ThemeConfig,
    private readonly horizonY: number,
    private refTop: number,
    /** level width, for the backdrop sweep */
    private readonly levelW = 0,
  ) {
    this.sky = scene.add.image(0, 0, theme.sky).setOrigin(0, 0).setDepth(DEPTH.sky);
    const bd = theme.backdrop;
    if (bd && scene.textures.exists(bd.key)) {
      const sprite = scene.add.sprite(0, 0, bd.key, 0).setDepth(DEPTH.backdrop);
      if (scene.anims.exists(bd.anim)) sprite.play(bd.anim);
      this.backdrop = { def: bd, sprite };
    }
    theme.layers.forEach((def, i) => {
      const texW = scene.textures.get(def.key).getSourceImage().width;
      this.strips.push({ def, depth: DEPTH.layerBase + i, texW: Math.max(16, texW), images: [], drift: 0 });
    });
    const front = theme.layers[theme.layers.length - 1];
    const color = front ? bottomColor(scene, front.key) : FALLBACK_FILL;
    // just behind the front strip so the overlap never covers it
    const depth = DEPTH.layerBase + theme.layers.length - 1.5;
    this.fill = scene.add.rectangle(0, 0, 8, 8, color).setOrigin(0, 0).setDepth(depth);
    this.deep = scene.add.rectangle(0, 0, 8, 8, darken(color, 0.62)).setOrigin(0, 0).setDepth(depth);
  }

  setReferenceTop(top: number): void {
    this.refTop = top;
  }

  private ensureImages(s: Strip, count: number): void {
    while (s.images.length < count) {
      s.images.push(this.scene.add.image(0, 0, s.def.key).setOrigin(0, 1).setDepth(s.depth));
    }
  }

  update(view: ViewRect, dtSec: number): void {
    const left = Math.floor(view.x) - PAD;
    const width = Math.ceil(view.w) + 2 * PAD;
    let frontBottom = this.horizonY;
    for (const s of this.strips) {
      s.drift += (s.def.drift ?? 0) * dtSec;
      const offset = view.x * s.def.factor + s.drift;
      const phase = ((offset % s.texW) + s.texW) % s.texW;
      this.ensureImages(s, Math.ceil((width + phase) / s.texW) + 2);
      const bottom = Math.round(this.horizonY + s.def.sink + (view.y - this.refTop) * (1 - s.def.vFactor));
      const x0 = view.x - phase - (phase < PAD ? s.texW : 0); // keep a strip left of the view too
      s.images.forEach((img, k) => img.setPosition(x0 + k * s.texW, bottom));
      frontBottom = bottom;
    }
    if (this.backdrop) {
      // anchored to the view, sweeping a share of it over the level: always in frame, any aspect
      const { def, sprite } = this.backdrop;
      const progress = this.levelW > view.w ? Math.min(1, Math.max(0, view.x / (this.levelW - view.w))) : 0;
      const cx = view.x + view.w * (def.x - def.sweep * progress);
      const cy = this.horizonY - def.rise + (view.y - this.refTop) * (1 - def.vFactor);
      sprite.setPosition(Math.round(cx), Math.round(cy));
    }
    const viewBottom = view.y + view.h + PAD;
    const skyBottom = Math.max(view.y + view.h * 0.5, Math.min(viewBottom, this.horizonY + 8));
    this.sky.setPosition(left, Math.floor(view.y) - PAD);
    this.sky.setDisplaySize(width, skyBottom - this.sky.y + 2);
    const fillTop = frontBottom - FILL_OVERLAP;
    this.fill.setPosition(left, fillTop);
    this.fill.setSize(width, Math.max(1, viewBottom - fillTop));
    this.fill.setVisible(viewBottom > frontBottom);
    const deepTop = frontBottom + FILL_DEEP_AT;
    this.deep.setPosition(left, deepTop);
    this.deep.setSize(width, Math.max(1, viewBottom - deepTop));
    this.deep.setVisible(viewBottom > deepTop);
  }
}
