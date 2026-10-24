/**
 * Everything level 6 draws, wired to two cameras: the main camera frames the road world (zoomed,
 * shaken on crashes), a second zoom-1 camera draws the crisp overlay text in device pixels.
 */
import Phaser from 'phaser';
import type { ViewportInfo } from '../../contracts';
import { EntityView } from './entityView';
import { computeFraming, type RushFraming } from './framing';
import { Fx } from './fx';
import type { RushSnapshot } from './logic/types';
import { Overlay } from './overlay';
import { Scenery } from './scenery';
import { TruckView } from './truckView';

export interface Look {
  highContrast: boolean;
  reducedMotion: boolean;
}

export class RushView {
  readonly world: Phaser.GameObjects.Layer;
  readonly top: Phaser.GameObjects.Layer;
  readonly scenery: Scenery;
  readonly ents: EntityView;
  readonly truck: TruckView;
  readonly fx: Fx;
  readonly overlay: Overlay;
  private readonly uiCam: Phaser.Cameras.Scene2D.Camera;
  framing: RushFraming;
  private calm = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly viewport: ViewportInfo,
  ) {
    this.world = scene.add.layer().setDepth(0);
    this.top = scene.add.layer().setDepth(10);
    this.scenery = new Scenery(scene, this.world);
    this.ents = new EntityView(scene, this.world);
    this.truck = new TruckView(scene, this.world);
    this.fx = new Fx(scene, this.world, () => this.reducedMotion);
    this.overlay = new Overlay(scene, this.top);
    this.uiCam = scene.cameras.add(0, 0, scene.scale.width, scene.scale.height, false, 'rush-ui');
    this.uiCam.ignore(this.world);
    scene.cameras.main.ignore(this.top);
    this.framing = computeFraming(viewport);
    this.layout();
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

  /** Re-frames both cameras for the current canvas / insets. */
  layout(): void {
    const cam = this.scene.cameras.main;
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    cam.setSize(W, H);
    this.uiCam.setSize(W, H);
    const f = computeFraming(this.viewport);
    this.framing = f;
    cam.setZoom(f.zoom);
    cam.centerOn(f.centerX, f.centerY);
    this.scenery.layout(f);
    this.ents.layout(f);
    this.fx.layout(f);
    this.overlay.layout(f, W, H, this.viewport.dpr, this.viewport.insetTop, this.viewport.insetBottom);
  }

  draw(snap: RushSnapshot, timeMs: number, dtMs: number): void {
    this.scenery.update(snap.distance, snap.timeMs, snap.zoneIndex, snap.shopD);
    this.truck.update(snap, timeMs, dtMs);
    this.ents.sync(snap, timeMs);
    this.fx.speedLines(snap.phase === 'play' && (snap.truck.flying || snap.power === 'sprint'), dtMs);
    this.overlay.update(snap.timeLeftMs, snap.phase === 'play');
  }

  /** New run: forget everything on the road. */
  reset(): void {
    this.scenery.reset();
    this.ents.clear();
    this.truck.reset();
    this.fx.clear();
    this.overlay.clear();
    this.scene.cameras.main.resetFX();
  }

  /** Finale on / off: the road world hides while the cinematic plays. */
  showWorld(on: boolean): void {
    this.world.setVisible(on);
    if (on) this.layout();
  }
}
