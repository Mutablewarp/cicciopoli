/**
 * Camera rig: integer-ish zoom from the viewport maths, smooth follow with look-ahead
 * in the facing direction and a vertical dead zone, clamped to the level. When the view
 * is taller than the level (portrait) it extends upward into the sky.
 */
import type Phaser from 'phaser';
import { CAMERA } from '../config/tuning';
import type { ViewportInfo } from '../contracts';
import { computeZoom } from './viewport';
import type { ViewRect } from './parallax';

export interface FollowTarget {
  x: number;
  /** feet y */
  bottom: number;
  /** head y (body top) */
  top: number;
  facing: 1 | -1;
  onGround: boolean;
}

/**
 * Screen shake measured in world px, identical on every device: Phaser's intensity is a
 * share of the canvas width in device pixels and is applied after the zoom, so the same
 * number shakes ~1.5 tiles on a DPR-3 phone and half that on a desktop.
 */
export function shakeWorld(cam: Phaser.Cameras.Scene2D.Camera, ms: number, px: number): void {
  cam.shake(ms, px / Math.max(1, cam.width * cam.zoom));
}

function smooth(rate: number, dt: number): number {
  return 1 - Math.exp(-rate * dt);
}

export class CameraRig {
  private zoom = 1;
  private viewX = 0;
  private viewY = 0;
  private look = 0;
  private focusY = 0;
  /** visible top-left after device-pixel snapping */
  private shownX = 0;
  private shownY = 0;
  /**
   * Hazard-floor levels (lava): rest on the level bottom so the danger stays in view, and
   * only rise when the hero climbs into the top margin of the view.
   */
  preferBottom = false;
  /** World px the view may extend below the level bottom (overlay controls in landscape). */
  private extraBottom = 0;
  /** Feet position in the view (0 top … 1 bottom), lowered by overlay controls. */
  private feetAt: number = CAMERA.feetAt;

  constructor(
    private readonly cam: Phaser.Cameras.Scene2D.Camera,
    private readonly levelW: number,
    private readonly levelH: number,
    /** solid ground (or lava) between the main walking line and the level bottom */
    private readonly groundDepth = 0,
  ) {}

  /** Re-reads the canvas size and recomputes the zoom (rotation / resize). */
  applyViewport(viewport: ViewportInfo, canvasW: number, canvasH: number): void {
    this.cam.setSize(canvasW, canvasH);
    this.zoom = computeZoom(viewport.cssW, viewport.cssH, viewport.dpr).zoom;
    this.cam.setZoom(this.zoom);
    // Overlay touch controls cover the bottom band: keep the walking line above them by
    // letting the view sink into the (visually extended) ground below the level.
    const covered = (viewport.insetBottom * viewport.dpr) / this.zoom;
    this.feetAt = Math.min(CAMERA.feetAt, 1 - covered / Math.max(1, this.viewH));
    this.extraBottom = Math.max(0, Math.min(CAMERA.maxExtraBottom, covered - this.groundDepth + CAMERA.insetMargin));
    this.clampAndApply();
  }

  get viewW(): number {
    return this.cam.width / this.zoom;
  }

  get viewH(): number {
    return this.cam.height / this.zoom;
  }

  /** Camera top when resting on the level bottom. */
  get restTop(): number {
    return this.levelH - this.viewH + this.extraBottom;
  }

  view(): ViewRect {
    return { x: this.shownX, y: this.shownY, w: this.viewW, h: this.viewH };
  }

  /** Jumps straight to the target (level start, respawn). */
  snapTo(t: FollowTarget): void {
    this.look = t.facing * CAMERA.lookAhead;
    this.focusY = t.bottom;
    this.viewX = t.x + this.look - this.viewW / 2;
    this.viewY = this.targetY(t);
    this.clampAndApply();
  }

  private targetY(t: FollowTarget): number {
    if (this.preferBottom) return Math.min(this.restTop, t.top - this.viewH * CAMERA.topMargin);
    return this.focusY - this.viewH * this.feetAt;
  }

  update(t: FollowTarget, dt: number): void {
    this.look += (t.facing * CAMERA.lookAhead - this.look) * smooth(CAMERA.lookAheadRate, dt);
    if (t.onGround) this.focusY = t.bottom;
    else if (t.bottom < this.focusY - CAMERA.deadUp) this.focusY = t.bottom + CAMERA.deadUp;
    else if (t.bottom > this.focusY + CAMERA.deadDown) this.focusY = t.bottom - CAMERA.deadDown;
    const tx = t.x + this.look - this.viewW / 2;
    const ty = this.targetY(t);
    this.viewX += (tx - this.viewX) * smooth(CAMERA.followX, dt);
    this.viewY += (ty - this.viewY) * smooth(CAMERA.followY, dt);
    this.clampAndApply();
  }

  private clampAndApply(): void {
    const w = this.viewW;
    const h = this.viewH;
    this.viewX = w >= this.levelW ? (this.levelW - w) / 2 : Math.max(0, Math.min(this.levelW - w, this.viewX));
    const bottom = this.levelH + this.extraBottom;
    this.viewY = h >= this.levelH ? bottom - h : Math.max(0, Math.min(bottom - h, this.viewY));
    // snap to whole device pixels so every art pixel keeps the same size on screen
    this.shownX = Math.round(this.viewX * this.zoom) / this.zoom;
    this.shownY = Math.round(this.viewY * this.zoom) / this.zoom;
    // Phaser zooms around the camera centre: convert the visible top-left into scroll.
    const k = 1 - 1 / this.zoom;
    this.cam.setScroll(this.shownX - (this.cam.width / 2) * k, this.shownY - (this.cam.height / 2) * k);
  }
}
