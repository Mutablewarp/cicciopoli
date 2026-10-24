/**
 * Pure camera framing of level 6. World: the road spans x 0..ROAD_W, the truck centre is at y 0,
 * "ahead" is up (negative y). The view always shows the whole road plus some sidewalk and at least
 * RUSH_ROAD.viewAheadPx.min of road ahead (every obstacle >= 1.2 s on screen), at most max (the
 * spawn line stays off screen). Landscape: when the touch controls only cover the bottom corners
 * the road runs between them down to the bottom edge.
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
}

export interface RushFraming {
  /** device px per world px */
  zoom: number;
  /** world point at the centre of the canvas */
  centerX: number;
  centerY: number;
  /** visible world rect */
  left: number;
  top: number;
  width: number;
  height: number;
  /** road ahead of the truck centre inside the free band (under the HUD does not count) */
  ahead: number;
  /** world y of the top of the free band */
  freeTop: number;
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
  const up = Math.ceil(ideal);
  const down = Math.floor(ideal);
  const keep = hiDpi ? V.integerKeepHiDpi : V.integerKeepLoDpi;
  const zoom = up <= most ? up : down >= 1 && down / ideal >= keep ? down : ideal;
  // the truck rides behindPx above the bottom, lower when the zoom went up, higher when that shows
  // too much road ahead (narrow portrait, integer zoom: the spawn line stays hidden)
  const truckY = Math.min(Math.max(bottom - V.behindPx * zoom, top + A.min * zoom), top + A.max * zoom);
  const ahead = (truckY - top) / zoom;
  const centerY = (devH / 2 - truckY) / zoom;
  const width = devW / zoom;
  const height = devH / zoom;
  return {
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

/** Road + kerbs width in CSS px at this framing. */
export function roadCss(f: RushFraming, dpr: number): number {
  return ((ROAD_W + 2 * RUSH_VIEW.kerbPx) * f.zoom) / dpr;
}

export function computeFraming(v: FramingInput): RushFraming {
  const V = RUSH_VIEW;
  if (v.cssW > v.cssH && v.insetBottom > V.cornerMarginCss) {
    const wide = fit(v, V.cornerMarginCss);
    if (roadCss(wide, v.dpr) <= v.cssW - 2 * V.cornerReserveCss) return wide;
  }
  return fit(v, v.insetBottom);
}
