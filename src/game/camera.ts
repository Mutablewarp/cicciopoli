/**
 * Camera rig: integer-ish zoom from the viewport maths, smooth follow with look-ahead
 * in the facing direction (scaled to the view width, longer in flight) and a vertical
 * dead zone, clamped to the level. When the view is taller than the level (portrait) it
 * extends upward into the sky; overlaid HUD (insetTop) and touch controls (insetBottom)
 * let it extend above / below the level so Ciccio is never drawn under them.
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
  /** airborne with the crunchy wings: look further ahead */
  flying?: boolean;
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
  /** World px at the top of the view covered by the overlaid HUD bar. */
  private topBand = 0;

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
    this.topBand = (viewport.insetTop * viewport.dpr) / this.zoom;
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

  /** Look-ahead distance: a share of the view width, so narrow portrait views see further. */
  lookAhead(flying: boolean): number {
    const share = flying ? CAMERA.lookShareFlight : CAMERA.lookShare;
    const max = flying ? CAMERA.lookMaxFlight : CAMERA.lookMax;
    return Math.max(CAMERA.lookAhead, Math.min(max, this.viewW * share));
  }

  /** Jumps straight to the target (level start, respawn). */
  snapTo(t: FollowTarget): void {
    this.look = t.facing * this.lookAhead(t.flying ?? false);
    this.focusY = t.bottom;
    this.viewX = t.x + this.look - this.viewW / 2;
    this.viewY = this.targetY(t);
    this.clampAndApply(t);
  }

  private targetY(t: FollowTarget): number {
    if (this.preferBottom) {
      // head room measured in the part of the view the HUD leaves visible
      const room = this.topBand + (this.viewH - this.topBand) * CAMERA.topMargin;
      return Math.min(this.restTop, t.top - room);
    }
    return this.focusY - this.viewH * this.feetAt;
  }

  update(t: FollowTarget, dt: number): void {
    this.look += (t.facing * this.lookAhead(t.flying ?? false) - this.look) * smooth(CAMERA.lookAheadRate, dt);
    if (t.onGround) this.focusY = t.bottom;
    else if (t.bottom < this.focusY - CAMERA.deadUp) this.focusY = t.bottom + CAMERA.deadUp;
    else if (t.bottom > this.focusY + CAMERA.deadDown) this.focusY = t.bottom - CAMERA.deadDown;
    const tx = t.x + this.look - this.viewW / 2;
    const ty = this.targetY(t);
    this.viewX += (tx - this.viewX) * smooth(CAMERA.followX, dt);
    this.viewY += (ty - this.viewY) * smooth(CAMERA.followY, dt);
    this.clampAndApply(t);
  }

  /** Clamps to the level (plus the inset bands) and keeps the head below the HUD bar. */
  private clampAndApply(t?: FollowTarget): void {
    const w = this.viewW;
    const h = this.viewH;
    this.viewX = w >= this.levelW ? (this.levelW - w) / 2 : Math.max(0, Math.min(this.levelW - w, this.viewX));
    const bottom = this.levelH + this.extraBottom;
    this.viewY = h >= this.levelH ? bottom - h : Math.max(-this.topBand, Math.min(bottom - h, this.viewY));
    if (t) {
      // a high jump pushes the view up into the sky rather than under the HUD
      const headLimit = t.top - this.topBand - CAMERA.headMargin;
      this.viewY = Math.max(Math.min(this.viewY, headLimit), -this.topBand - CAMERA.maxExtraTop);
    }
    // snap to whole device pixels so every art pixel keeps the same size on screen
    this.shownX = Math.round(this.viewX * this.zoom) / this.zoom;
    this.shownY = Math.round(this.viewY * this.zoom) / this.zoom;
    // Phaser zooms around the camera centre: convert the visible top-left into scroll.
    const k = 1 - 1 / this.zoom;
    this.cam.setScroll(this.shownX - (this.cam.width / 2) * k, this.shownY - (this.cam.height / 2) * k);
  }
}
