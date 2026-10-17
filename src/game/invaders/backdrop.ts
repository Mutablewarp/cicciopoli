/**
 * Space backdrop filling the whole view in any aspect: navy gradient, three parallax star
 * layers drifting down, a nebula + distant planet + moon, a faint playfield frame, and the
 * wordmark in the side panel when landscape leaves room for it.
 */
import type Phaser from 'phaser';
import { ITEMS } from '../../art/keys';
import { SPACE } from '../../art/space/keys';
import { FIELD, FOOD_POINTS, POINTS, SHAKE, TRAY } from './config';
import { Z } from './fx';

export interface ViewRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Drifter {
  img: Phaser.GameObjects.Image;
  /** position relative to the view (0..1) at t = 0 */
  rx: number;
  ry: number;
  speed: number;
  offset: number;
}

const STAR_SPEED = [5, 11, 22];

export class Backdrop {
  private readonly sky: Phaser.GameObjects.Image;
  private readonly stars: Phaser.GameObjects.TileSprite[];
  private readonly scroll = [0, 0, 0];
  private readonly drifters: Drifter[];
  private readonly side: Phaser.GameObjects.Image;
  private readonly legend: Phaser.GameObjects.Container;
  private view: ViewRect = { x: 0, y: 0, w: FIELD.w, h: FIELD.h };

  constructor(private readonly scene: Phaser.Scene) {
    this.sky = scene.add.image(0, 0, SPACE.sky).setOrigin(0, 0).setDepth(Z.sky);
    this.stars = [SPACE.starsFar, SPACE.starsMid, SPACE.starsNear].map((key, i) =>
      scene.add.tileSprite(0, 0, 128, 128, key).setOrigin(0, 0).setDepth(Z.stars + i),
    );
    const drift = (key: string, rx: number, ry: number, speed: number): Drifter => ({
      img: scene.add.image(0, 0, key).setDepth(Z.deco),
      rx,
      ry,
      speed,
      offset: 0,
    });
    this.drifters = [drift(SPACE.nebula, 0.3, 0.32, 2), drift(SPACE.farPlanet, 0.94, 0.18, 3), drift(SPACE.farMoon, 0.05, 0.78, 3.5)];
    // dim enough that the formation always reads in front of them
    this.drifters[0].img.setDepth(Z.deco - 1).setAlpha(0.7);
    this.drifters[1].img.setAlpha(0.55);
    this.drifters[2].img.setAlpha(0.6);
    // transparent until the intro's big centre wordmark leaves (revealSide): never two titles at once
    this.side = scene.add.image(0, 0, SPACE.title).setDepth(Z.side).setVisible(false).setAlpha(0);
    this.legend = buildLegend(scene).setDepth(Z.side).setVisible(false);
    // faint playfield edges + the tray baseline (only noticeable when the view is wider)
    const g = scene.add.graphics().setDepth(Z.frame);
    g.fillStyle(0x2c3a8a, 0.45);
    g.fillRect(-2, 0, 1, FIELD.h);
    g.fillRect(FIELD.w + 1, 0, 1, FIELD.h);
    g.fillStyle(0x3a4a9a, 0.6);
    g.fillRect(0, TRAY.y - 9, FIELD.w, 1);
  }

  layout(view: ViewRect): void {
    this.view = view;
    const pad = SHAKE.px + 2; // the hit shake must never bare the camera background
    this.sky.setPosition(view.x - pad, view.y - pad).setDisplaySize(view.w + pad * 2, view.h + pad * 2);
    for (const s of this.stars) s.setPosition(view.x - pad, view.y - pad).setSize(Math.ceil(view.w + pad * 2), Math.ceil(view.h + pad * 2));
    const panel = (view.w - FIELD.w) / 2;
    const tw = this.side.width;
    const fits = panel >= tw + 16;
    this.side.setVisible(fits);
    if (fits) {
      const scale = Math.max(1, Math.min(2, Math.floor((panel - 16) / tw)));
      this.side.setScale(scale).setPosition(Math.round(-panel / 2), Math.round(view.y + view.h * 0.3));
    }
    const legendFits = panel >= LEGEND_W + 16;
    this.legend.setVisible(legendFits);
    if (legendFits) this.legend.setPosition(Math.round(FIELD.w + panel / 2 - LEGEND_W / 2), Math.round(view.y + view.h * 0.3 - 30));
    this.place();
  }

  /** Fades the side-panel wordmark in (it shows only when landscape leaves room for it). */
  revealSide(): void {
    this.scene.tweens.add({ targets: this.side, alpha: 1, duration: 420 });
  }

  /** warp > 1 speeds the stars up (black hole). */
  update(dt: number, warp = 1): void {
    const sec = dt / 1000;
    this.stars.forEach((s, i) => {
      this.scroll[i] = (this.scroll[i] + STAR_SPEED[i] * warp * sec) % 128;
      s.tilePositionY = -Math.round(this.scroll[i]);
    });
    for (const d of this.drifters) d.offset += d.speed * sec;
    this.place();
  }

  private place(): void {
    const v = this.view;
    for (const d of this.drifters) {
      const h = d.img.height;
      const range = v.h + h;
      const y = (((d.ry * v.h + d.offset) % range) + range) % range;
      d.img.setPosition(Math.round(v.x + d.rx * v.w), Math.round(v.y + y - h / 2));
    }
  }
}

const LEGEND_W = 40;

/** Classic score table for the side panel: sprite + "= points" in the pixel digits. */
function buildLegend(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const rows: readonly [string, number, number][] = [
    [SPACE.alienA, 0, POINTS.alienA],
    [SPACE.planet, 4, POINTS.planet],
    [SPACE.asteroid, 0, POINTS.asteroid],
    [SPACE.food, 3, FOOD_POINTS],
  ];
  rows.forEach(([key, frame, pts], i) => {
    const y = i * 20;
    c.add(scene.add.image(8, y, key, frame));
    c.add(scene.add.rectangle(21, y, 4, 1, 0xfce4c0).setOrigin(0, 0.5));
    c.add(scene.add.rectangle(21, y + 2, 4, 1, 0xfce4c0).setOrigin(0, 0.5));
    String(pts).split('').forEach((d, k) => c.add(scene.add.image(28 + k * 5, y + 4, ITEMS.digits, Number(d)).setOrigin(0, 1)));
  });
  // capsule = one FULMINE charge
  const y = rows.length * 20 + 2;
  c.add(scene.add.image(8, y, SPACE.capsule, 2));
  c.add(scene.add.rectangle(21, y, 4, 1, 0xfce4c0).setOrigin(0, 0.5));
  c.add(scene.add.rectangle(21, y + 2, 4, 1, 0xfce4c0).setOrigin(0, 0.5));
  c.add(scene.add.image(33, y + 1, SPACE.boltIcon));
  return c;
}
