/**
 * Pure camera framing of level 6. World: the road spans x 0..ROAD_W, the truck centre is at y 0,
 * "ahead" is up (negative y). The view always shows the whole road plus some sidewalk and at least
 * RUSH_ROAD.viewAheadPx.min of road ahead (every obstacle >= 1.2 s on screen), at most max (the
 * spawn line stays off screen).
 * Upright view (portrait, near-square): the road runs up the screen; when the touch controls only
 * cover the bottom corners the road runs between them down to the bottom edge.
 * SIDE view (v9, a landscape window whose canvas aspect > RUSH_VIEW.side.aspect): the camera turns a quarter (rotation +PI/2), so world
 * "ahead" is screen RIGHT and world lane 0 is the top lane; the road + kerbs fill the free height, the road
 * ahead runs along the width and the extra width goes BEHIND the truck (left, where ▲ ▼ sit).
 */
import { ROAD_W } from '../../art/rush/keys';
import { RUSH_ROAD } from '../../config/rush';
import { RUSH_VIEW } from './config';

export interface FramingInput {
  cssW: number;
  cssH: number;
  dpr: number;
  insetTop: number;
  insetBottom: number;
  /** CSS px of a docked column on the left (the side view keeps the truck right of it) */
  insetLeft?: number;
  /** touch controls on screen (the side view reserves the ▲ ▼ column) */
  touch?: boolean;
  /** the window is taller than wide: a portrait phone stays upright even when its toolbars leave a wide canvas */
  portrait?: boolean;
  /** the view is turned now: it holds down to RUSH_VIEW.side.aspectHold (a toolbar showing never flips it) */
  wasSide?: boolean;
}

/** Where the camera looks: device px per world px, the world point at the canvas centre, its turn. */
export interface CamPose {
  zoom: number;
  centerX: number;
  centerY: number;
  rotation: number;
}

/** Axis-aligned world rect. */
export interface ViewRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface RushFraming extends CamPose, ViewRect {
  /** the side view: the camera is turned, the truck drives to the right */
  side: boolean;
  /** road ahead of the truck centre inside the free band (under the HUD does not count) */
  ahead: number;
  /** world y of the far edge of the free band ahead (warnings and the delivery arrow sit there) */
  freeTop: number;
}

/** World point -> device px on a w x h canvas (Phaser: screen = centre + zoom * R(rotation) * (p - c)). */
export function project(p: CamPose, w: number, h: number, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(p.rotation);
  const s = Math.sin(p.rotation);
  const dx = (x - p.centerX) * p.zoom;
  const dy = (y - p.centerY) * p.zoom;
  return { x: w / 2 + dx * c - dy * s, y: h / 2 + dx * s + dy * c };
}

/** The world rect a w x h canvas shows at this pose (its bounding box while the camera is mid-turn). */
export function cover(p: CamPose, w: number, h: number): ViewRect {
  const c = Math.abs(Math.cos(p.rotation));
  const s = Math.abs(Math.sin(p.rotation));
  const width = (w * c + h * s) / p.zoom;
  const height = (w * s + h * c) / p.zoom;
  return { left: p.centerX - width / 2, top: p.centerY - height / 2, width, height };
}

/** World vector that points UP on screen at this camera turn (screen-up texts rise along it). */
export function screenUp(rotation: number): { x: number; y: number } {
  return { x: -Math.sin(rotation), y: -Math.cos(rotation) };
}

/** The integer zoom up when it costs at most `most`, else down when it keeps enough of the ideal one. */
function snap(ideal: number, most: number, hiDpi: boolean): number {
  const V = RUSH_VIEW;
  const up = Math.ceil(ideal);
  const down = Math.floor(ideal);
  const keep = hiDpi ? V.integerKeepHiDpi : V.integerKeepLoDpi;
  return up <= most ? up : down >= 1 && down / ideal >= keep ? down : ideal;
}

function fit(v: FramingInput, bottomCss: number): RushFraming {
  const V = RUSH_VIEW;
  const A = RUSH_ROAD.viewAheadPx;
  const devW = Math.max(1, v.cssW * v.dpr);
  const devH = Math.max(1, v.cssH * v.dpr);
  const top = Math.min(v.insetTop * v.dpr, devH * 0.5);
  const bottom = Math.max(top + 1, devH - bottomCss * v.dpr);
  const freeH = bottom - top;
  const sides = devW / (ROAD_W + 2 * V.minSidePx);
  const ideal = Math.min(freeH / (A.min + V.behindPx), sides);
  const hiDpi = v.dpr >= 2;
  const most = Math.min(freeH / (A.min + (hiDpi ? V.behindPx : V.behindTightPx)), sides) * (1 + V.integerSnap);
  const zoom = snap(ideal, most, hiDpi);
  // the truck rides behindPx above the bottom, lower when the zoom went up, higher when that shows
  // too much road ahead (narrow portrait, integer zoom: the spawn line stays hidden)
  const truckY = Math.min(Math.max(bottom - V.behindPx * zoom, top + A.min * zoom), top + A.max * zoom);
  const ahead = (truckY - top) / zoom;
  const centerY = (devH / 2 - truckY) / zoom;
  const width = devW / zoom;
  const height = devH / zoom;
  return {
    side: false,
    rotation: 0,
    zoom,
    centerX: ROAD_W / 2,
    centerY,
    left: ROAD_W / 2 - width / 2,
    top: centerY - height / 2,
    width,
    height,
    ahead,
    freeTop: centerY - height / 2 + top / zoom,
  };
}

/** Side view: across the road = screen height (under the HUD), along it = screen width. */
function fitSide(v: FramingInput): RushFraming {
  const V = RUSH_VIEW;
  const S = V.side;
  const A = RUSH_ROAD.viewAheadPx;
  const devW = Math.max(1, v.cssW * v.dpr);
  const devH = Math.max(1, v.cssH * v.dpr);
  const top = Math.min(v.insetTop * v.dpr, devH * 0.5);
  const freeH = devH - top;
  const left = Math.max(v.touch ? S.controlsCss : 0, v.insetLeft ?? 0) * v.dpr;
  const hiDpi = v.dpr >= 2;
  const across = freeH / (ROAD_W + 2 * S.minSidePx);
  const ideal = Math.min(across, (devW - left) / (A.min + S.behindPx));
  const most = Math.min(across, (devW - left) / (A.min + (hiDpi ? S.behindPx : S.behindTightPx))) * (1 + V.integerSnap);
  const zoom = snap(ideal, most, hiDpi);
  // as much road ahead as allowed, the rest of the width behind the truck
  const ahead = Math.min(A.max, Math.max(A.min, (devW - left) / zoom - S.behindPx));
  const truckX = devW - ahead * zoom;
  // screen = centre + zoom * (-(y - cy), x - cx): the truck at truckX, the road centred in the free height
  const centerY = (truckX - devW / 2) / zoom;
  const centerX = ROAD_W / 2 - top / (2 * zoom);
  const width = devH / zoom;
  const height = devW / zoom;
  return {
    side: true,
    rotation: Math.PI / 2,
    zoom,
    centerX,
    centerY,
    left: centerX - width / 2,
    top: centerY - height / 2,
    width,
    height,
    ahead,
    freeTop: centerY - height / 2,
  };
}

/** Road + kerbs across in CSS px at this framing (width upright, height in the side view). */
export function roadCss(f: RushFraming, dpr: number): number {
  return ((ROAD_W + 2 * RUSH_VIEW.kerbPx) * f.zoom) / dpr;
}

/** The side view: a landscape window with a wide canvas (hysteresis while it is on). */
export function sideView(v: FramingInput): boolean {
  const S = RUSH_VIEW.side;
  return !v.portrait && v.cssW > v.cssH * (v.wasSide ? S.aspectHold : S.aspect);
}

export function computeFraming(v: FramingInput): RushFraming {
  const V = RUSH_VIEW;
  if (sideView(v)) return fitSide(v);
  if (v.cssW > v.cssH && v.insetBottom > V.cornerMarginCss) {
    const wide = fit(v, V.cornerMarginCss);
    if (roadCss(wide, v.dpr) <= v.cssW - 2 * V.cornerReserveCss) return wide;
  }
  return fit(v, v.insetBottom);
}
