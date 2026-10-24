/**
 * FINALE of level 6, the ROADCOASTER meme told with our truck: over the Terrasini sea at sunset
 * the side-view truck fires its boosters and climbs through the sky into space, then the famous
 * shot — the truck floating over the Earth (Sicily lit), Ciccio in a spacesuit at the wheel — with
 * the meme card (a hard cut under a white flash between the two). Skippable by tap after FINALE.skipAfterMs. Drawn on its own layer by the main
 * camera (the road layer is hidden meanwhile); the card is crisp overlay text.
 */
import Phaser from 'phaser';
import { RUSH, RUSH_ANIMS, zoneKey } from '../../art/rush/keys';
import { FINALE } from './config';
import type { Overlay } from './overlay';
import { SCENE_TEX, SKY_H } from './sceneArt';

const ease = (u: number): number => u * u * u;
const clamp01 = (u: number): number => Math.max(0, Math.min(1, u));
/** deep enough to reach the bottom of a tall portrait view (the stage fits by width there) */
const SEA_H = 600;

type Vis = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;
const STAR_COUNT = 90;
/** rows of the rush-space art: its size and where the Earth's limb crosses the centre column */
const SPACE_PX = 256;
const LIMB_Y = 140;
/** half height of the orbit truck art, and the air between it and the limb */
const ORBIT_HALF_H = 48;
const ORBIT_AIR = 24;

export class Finale {
  readonly layer: Phaser.GameObjects.Layer;
  private readonly climb: Vis[] = [];
  private readonly truck: Phaser.GameObjects.Sprite;
  private readonly sea: Phaser.GameObjects.TileSprite;
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly space: Phaser.GameObjects.Image;
  private readonly orbit: Phaser.GameObjects.Image;
  private readonly card: Phaser.GameObjects.Text[] = [];
  private readonly cardBg: Phaser.GameObjects.Rectangle;
  private readonly prompt: Phaser.GameObjects.Text;
  private t = 0;
  private zoom = 1;
  /** camera centre over the sea before the climb: tall portrait views keep the horizon low */
  private restY = -70;
  /** orbit shot: truck offset from the view centre (world px) */
  private orbitAt = { x: 0, y: 0 };
  private finished = false;
  private cut = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly overlay: Overlay,
    overlayLayer: Phaser.GameObjects.Layer,
    lines: readonly string[],
    private readonly onCut: () => void,
    private readonly onDone: () => void,
  ) {
    this.layer = scene.add.layer().setDepth(1);
    const add = <T extends Vis>(o: T, climb = true): T => {
      this.layer.add(o);
      if (climb) this.climb.push(o);
      return o;
    };
    // sky column (sunset at the sea, black at the top) with stars above it
    add(scene.add.rectangle(0, -SKY_H + 2, 4000, 2400, 0x05050f).setOrigin(0.5, 1));
    add(scene.add.tileSprite(0, 2, 1600, SKY_H, SCENE_TEX.sky).setOrigin(0.5, 1));
    const stars = add(scene.add.graphics());
    for (let i = 0; i < STAR_COUNT; i++) {
      const sx = ((i * 73) % 800) - 400;
      const sy = -SKY_H * 0.45 - ((i * 151) % 900);
      stars.fillStyle(i % 7 === 0 ? 0xfff2b0 : 0xffffff, i % 3 === 0 ? 1 : 0.6).fillRect(sx, sy, 1, 1);
    }
    const sun = add(scene.add.graphics());
    [[0xffe9a0, 26], [0xffc860, 22], [0xff9a40, 16]].forEach(([c, r]) => sun.fillStyle(c, 1).fillCircle(46, -4, r));
    this.sea = add(scene.add.tileSprite(-800, 0, 1600, SEA_H, zoneKey('mare', 'fill')).setOrigin(0, 0));
    const coast = add(scene.add.graphics());
    coast.fillStyle(0x3a1c3a, 1).fillPoints(
      [
        { x: -300, y: 0 }, { x: -300, y: -34 }, { x: -170, y: -30 }, { x: -120, y: -18 }, { x: -96, y: -12 }, { x: -60, y: 0 },
      ].map((p) => new Phaser.Geom.Point(p.x, p.y)),
      true,
    );
    coast.fillRect(-150, -48, 8, 18).fillRect(-152, -50, 12, 3); // the coastal tower
    this.trail = add(
      scene.add.particles(0, 0, SCENE_TEX.px, {
        lifespan: { min: 300, max: 700 },
        speedX: { min: -90, max: -30 },
        speedY: { min: 10, max: 60 },
        scale: { start: 2, end: 0.5 },
        alpha: { start: 1, end: 0 },
        tint: [0xffe070, 0xff8a2a, 0xffffff, 0xff5a3a],
        emitting: false,
      }),
    );
    this.truck = add(scene.add.sprite(-90, -24, RUSH.truckFly, 0));
    if (scene.anims.exists(RUSH_ANIMS.sideFly)) this.truck.play(RUSH_ANIMS.sideFly);
    this.space = add(scene.add.image(0, 0, RUSH.space).setAlpha(0), false);
    this.orbit = add(scene.add.image(0, 0, RUSH.truckOrbit).setAlpha(0), false);
    // the meme card (overlay camera)
    this.cardBg = scene.add.rectangle(0, 0, 1, 1, 0x07070f, 0.78).setStrokeStyle(2, 0xffd23a).setOrigin(0.5, 0).setAlpha(0);
    overlayLayer.add(this.cardBg);
    lines.forEach((s, i) => {
      const color = i === 0 ? '#ffd23a' : s === 'NIENTE PANICO' ? '#7dff8a' : '#fff6dc';
      const t = overlay.text(s, i === 0 ? 12 : 8, color).setOrigin(0.5, 0).setAlpha(0);
      overlayLayer.add(t);
      this.card.push(t);
    });
    this.prompt = overlay.text('TOCCA PER CONTINUARE', 7, '#fff6dc').setOrigin(0.5, 1).setAlpha(0);
    overlayLayer.add(this.prompt);
  }

  /**
   * Canvas size in device px. Portrait: the card on top, the truck below it, the Earth at the
   * bottom. Landscape: the card on the left, the truck floating on the right.
   */
  layout(w: number, h: number, unit: number): void {
    this.zoom = Math.min(w / FINALE.stageW, h / FINALE.stageH);
    const viewW = w / this.zoom;
    const viewH = h / this.zoom;
    this.restY = -Math.max(70, viewH * FINALE.horizonLow);
    // whole-number scales keep every art pixel square
    const s = Math.ceil(Math.max(viewW, viewH) / SPACE_PX);
    this.space.setScale(s);
    const limb = (LIMB_Y - SPACE_PX / 2) * s;
    const orbitScale = Math.max(1, Math.floor((viewW * 0.55) / 160));
    this.orbit.setScale(orbitScale);
    const gap = 6 * unit;
    const pad = 12 * unit;
    const cardH = this.card.reduce((sum, t) => sum + t.height + gap, -gap) + 2 * pad;
    const cardW = Math.max(...this.card.map((t) => t.width)) + 28 * unit;
    const wide = w > h * 1.25;
    const cx = wide ? Math.max(cardW / 2 + 8 * unit, w * 0.26) : w / 2;
    const top = wide ? (h - cardH) / 2 : 10 * unit;
    let y = top + pad;
    this.card.forEach((t) => {
      t.setPosition(cx, y);
      y += t.height + gap;
    });
    this.cardBg.setPosition(cx, top).setSize(cardW, cardH);
    const cardBottom = (top + cardH - h / 2) / this.zoom;
    const floating = limb - ORBIT_HALF_H * orbitScale - ORBIT_AIR;
    this.orbitAt = wide ? { x: viewW * 0.2, y: floating } : { x: 0, y: Math.min(floating, (cardBottom + limb) / 2 - 10) };
    this.prompt.setPosition(w / 2, h - 14 * unit);
  }

  /** Tap: ends the cinematic once it played for skipAfterMs. */
  skip(): void {
    if (this.t >= FINALE.skipAfterMs) this.finish();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    this.onDone();
  }

  update(dtMs: number): void {
    if (this.finished) return;
    this.t += dtMs;
    const F = FINALE;
    const cam = this.scene.cameras.main;
    cam.setZoom(this.zoom);
    const u = clamp01(this.t / F.climbMs);
    const climbY = -24 - (SKY_H + 260) * ease(u);
    const x = -90 + 150 * u;
    // the fly frames are drawn nose-up: no rotation, every art pixel stays square
    this.truck.setPosition(x, climbY + Math.sin(this.t / 90) * 1.5);
    this.trail.emitParticleAt(x - 60, climbY + 26, 3);
    this.sea.tilePositionX = this.t * 0.02;
    const camY = Math.min(this.restY, climbY + 30);
    // orbit shot: a hard cut under a white flash, then a slow drift
    const f = this.t >= F.climbMs ? 1 : 0;
    if (f > 0 && !this.cut) {
      this.cut = true;
      this.overlay.flash(0xffffff, F.flashAlpha, F.flashMs);
      this.onCut();
    }
    const o = clamp01((this.t - F.climbMs) / (F.totalMs - F.climbMs));
    cam.centerOn(0, Math.round(camY));
    this.space.setPosition(0, Math.round(camY + o * 8)).setAlpha(f);
    this.orbit
      .setPosition(this.orbitAt.x + Math.sin(this.t / 1300) * F.driftPx, camY + this.orbitAt.y + Math.cos(this.t / 1700) * F.driftPx * 0.5)
      .setRotation(Math.sin(this.t / 1500) * F.spinRad)
      .setAlpha(f);
    if (f >= 1) for (const c of this.climb) c.setVisible(false);
    this.card.forEach((t, i) => t.setAlpha(clamp01((this.t - F.cardAtMs - i * F.lineMs) / 200)));
    this.cardBg.setAlpha(clamp01((this.t - F.cardAtMs + 150) / 200));
    this.prompt.setAlpha(this.t >= F.skipAfterMs + 600 ? 0.55 + 0.45 * Math.sin(this.t / 160) : 0);
    if (this.t >= F.totalMs) this.finish();
  }

  destroy(): void {
    this.layer.destroy(true);
    for (const t of this.card) t.destroy();
    this.cardBg.destroy();
    this.prompt.destroy();
  }
}
