/**
 * Everything level 6 draws, wired to two cameras: the main camera frames the road world (zoomed,
 * shaken on crashes, turned a quarter in the v9 side view), a second zoom-1 camera draws the crisp
 * overlay text in device pixels. A re-framing (rotation, resize, HUD inset) eases the main camera
 * over RUSH_VIEW.easeMs instead of jumping; the finale takes the camera over, unturned.
 */
import Phaser from 'phaser';
import type { ViewportInfo } from '../../contracts';
import { Ambience } from './ambience';
import { FANS, FX, RUSH_VIEW } from './config';
import { EntityView } from './entityView';
import { computeFraming, cover, type CamPose, type RushFraming } from './framing';
import { Fx } from './fx';
import type { RushSnapshot } from './logic/types';
import { Overlay } from './overlay';
import { Scenery } from './scenery';
import { TruckView } from './truckView';

export interface Look {
  highContrast: boolean;
  reducedMotion: boolean;
}

const smooth = (u: number): number => u * u * (3 - 2 * u);
const POSE_KEYS = ['zoom', 'centerX', 'centerY', 'rotation'] as const;

export class RushView {
  readonly world: Phaser.GameObjects.Layer;
  readonly top: Phaser.GameObjects.Layer;
  readonly scenery: Scenery;
  readonly ents: EntityView;
  readonly truck: TruckView;
  readonly fx: Fx;
  readonly overlay: Overlay;
  private readonly ambience: Ambience;
  private readonly uiCam: Phaser.Cameras.Scene2D.Camera;
  framing: RushFraming;
  /** the main camera now (eases towards `framing`); the overlay projects through it */
  readonly pose: CamPose = { zoom: 1, centerX: 0, centerY: 0, rotation: 0 };
  private from: CamPose = { ...this.pose };
  private easeT = 1;
  private placed = false;
  private calm = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly viewport: ViewportInfo,
  ) {
    this.world = scene.add.layer().setDepth(0);
    this.top = scene.add.layer().setDepth(10);
    this.ambience = new Ambience(scene, this.world);
    this.scenery = new Scenery(scene, this.world, this.pose);
    this.ents = new EntityView(scene, this.world, this.pose);
    this.truck = new TruckView(scene, this.world);
    this.fx = new Fx(scene, this.world, () => this.reducedMotion, this.pose);
    this.overlay = new Overlay(scene, this.top, this.pose, this.truck.pos);
    this.uiCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'rush-ui');
    this.uiCam.ignore(this.world);
    scene.cameras.main.ignore(this.top);
    this.framing = computeFraming(this.input(false));
    this.layout();
  }

  /** device px per CSS px */
  get dpr(): number {
    return this.viewport.dpr;
  }

  /** prefers-reduced-motion or the level setting */
  get reducedMotion(): boolean {
    return this.calm || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  setLook(l: Look): void {
    this.calm = l.reducedMotion;
    this.scenery.setDark(l.highContrast);
    this.ents.setContrast(l.highContrast);
  }

  /** A layer the finale draws on with the main camera (the overlay camera skips it). */
  stageLayer(layer: Phaser.GameObjects.Layer): void {
    this.uiCam.ignore(layer);
  }

  private input(wasSide: boolean): Parameters<typeof computeFraming>[0] {
    // the touch controls show on touch screens only (ui/layout.ts): the side view keeps the truck right of ▲ ▼
    return { ...this.viewport, touch: document.querySelector('.is-touch') !== null, wasSide };
  }

  /** Re-frames both cameras for the current canvas / insets: eased while the game runs, at once otherwise. */
  layout(): void {
    const cam = this.scene.cameras.main;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    cam.setSize(W, H);
    this.uiCam.setSize(W, H);
    const f = computeFraming(this.input(this.framing.side));
    this.framing = f;
    this.ents.layout(f);
    this.truck.setSide(f.side);
    this.overlay.layout(f, W, H, this.viewport.dpr, this.viewport.insetTop, this.viewport.insetBottom);
    if (!this.world.visible) return; // the finale owns the main camera
    const moved = POSE_KEYS.some((k) => Math.abs(this.pose[k] - f[k]) > 1e-6);
    if (this.placed && moved && !this.scene.sys.isPaused()) {
      this.from = { ...this.pose };
      this.easeT = 0;
    } else {
      this.easeT = 1;
      for (const k of POSE_KEYS) this.pose[k] = f[k];
    }
    this.placed = true;
    this.apply();
  }

  /** Per frame: the camera eases towards the framing. */
  tick(dtMs: number): void {
    if (this.easeT >= 1 || !this.world.visible) return;
    this.easeT = Math.min(1, this.easeT + dtMs / RUSH_VIEW.easeMs);
    const u = smooth(this.easeT);
    for (const k of POSE_KEYS) this.pose[k] = this.from[k] + (this.framing[k] - this.from[k]) * u;
    this.apply();
  }

  private apply(): void {
    const cam = this.scene.cameras.main;
    const p = this.pose;
    cam.setZoom(p.zoom).setRotation(p.rotation);
    cam.centerOn(p.centerX, p.centerY);
    const rect = cover(p, cam.width, cam.height);
    this.scenery.layout(rect, this.framing.side);
    this.fx.layout(rect);
    this.ambience.layout(rect);
  }

  /** Behind the setup panel: the road scrolls by and the truck idles on it. */
  attract(d: number, snap: RushSnapshot, timeMs: number, dtMs: number): void {
    this.scenery.update(d, 0, 0);
    this.truck.update(snap, timeMs, dtMs);
    this.ambience.update(0, 0, this.reducedMotion, dtMs);
  }

  draw(snap: RushSnapshot, timeMs: number, dtMs: number): void {
    this.scenery.update(snap.distance, snap.timeMs, snap.zoneIndex, snap.shopD);
    this.truck.update(snap, timeMs, dtMs);
    this.ents.sync(snap, timeMs);
    const fever = snap.phase === 'play' ? snap.fever : 0;
    this.fx.speedLines(snap.phase === 'play' && (snap.truck.flying || snap.power === 'sprint' || fever > 0), dtMs, fever > 0);
    this.fx.fever(fever, timeMs);
    this.ambience.update(snap.phase === 'play' ? snap.speed : 0, snap.zoneIndex, this.reducedMotion, dtMs);
    this.overlay.update(snap.timeLeftMs, snap.phase === 'play', fever);
    const truck = this.truck.pos;
    for (const fan of this.scenery.landmarks.cheers()) {
      this.overlay.bubble(fan, FANS.cheers[Math.floor(Math.random() * FANS.cheers.length)], () => truck.top - FX.bubbleTruckGapPx);
    }
  }

  /** New run: forget everything on the road. */
  reset(): void {
    this.scenery.reset();
    this.ents.clear();
    this.truck.reset();
    this.fx.clear();
    this.ambience.clear();
    this.overlay.clear();
    this.scene.cameras.main.resetFX();
  }

  /** Finale on / off: the road world hides while the cinematic plays, on an unturned camera. */
  showWorld(on: boolean): void {
    this.world.setVisible(on);
    this.ambience.show(on);
    if (!on) {
      this.easeT = 1;
      this.scene.cameras.main.setRotation(0);
      return;
    }
    this.placed = false;
    this.layout();
  }
}
