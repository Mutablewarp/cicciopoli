/**
 * Pure camera framing of level 8. At push 1 the whole ARENA is visible, as big as it fits, never under
 * the HUD bar (insetTop). Portrait: full width inside the free band down to the touch controls
 * (insetBottom), so the controls sit BELOW the fight, never over it. Landscape: the arena fills the
 * height down to the bottom edge (controls overlaid in the side bands / bottom corners).
 * Where the arena is small on screen (a phone held upright) fights PUSH IN (up to pushMax): the camera
 * zooms on the part of the arena that matters (the hero, the boss, the hazards near the hero, the floor)
 * and follows it, clamped to the arena edges.
 * k = texture scale = device px per world unit at full push, quantised and clamped to KMAX.
 */
import { ARENA, KMAX, type Box, type Vec } from '../api';
import { CT_VIEW } from '../../../config/cartoon';

export interface FramingInput {
  cssW: number;
  cssH: number;
  /** device px per CSS px of the canvas backing store */
  dpr: number;
  insetTop: number;
  insetBottom: number;
}

export interface ArenaFraming {
  /** device px per world unit (camera zoom) at push 1 */
  zoom: number;
  /** world point at the canvas centre at push 1 */
  centerX: number;
  centerY: number;
  /** texture scale for the art (canvas px per world unit) */
  k: number;
  /** the arena on screen at push 1, CSS px of the game host */
  css: { x: number; y: number; w: number; h: number };
  portrait: boolean;
  /** CSS px per world unit at push 1 */
  zoomCss: number;
  /** the free band the arena is framed in (CSS px) and the host centre minus the band centre */
  band: { w: number; h: number; dx: number; dy: number };
  /** the camera may push in up to this factor (1 = never: the arena is big enough on screen) */
  pushMax: number;
}

/** Camera zoom + centre (world units at the canvas centre). */
export interface CameraPose {
  zoom: number;
  centerX: number;
  centerY: number;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export function quantizeK(deviceZoom: number): number {
  const q = Math.ceil(deviceZoom / CT_VIEW.kStep - 1e-6) * CT_VIEW.kStep;
  return Math.max(1, Math.min(KMAX, q));
}

export function computeFraming(v: FramingInput): ArenaFraming {
  const W = Math.max(1, v.cssW);
  const H = Math.max(1, v.cssH);
  const portrait = H > W;
  const m = CT_VIEW.marginCss;
  const top = Math.min(Math.max(0, v.insetTop), H * 0.3);
  const bottom = portrait ? Math.max(top + 1, H - Math.min(Math.max(0, v.insetBottom), H * 0.6)) : H;
  const bandH = bottom - top;
  const pad = portrait ? m : 0;
  const zoomCss = Math.max(0.05, Math.min((W - pad * 2) / ARENA.w, (bandH - pad * 2) / ARENA.h));
  const w = ARENA.w * zoomCss;
  const h = ARENA.h * zoomCss;
  const x = (W - w) / 2;
  const y = top + (bandH - h) / 2;
  const dpr = Math.max(1, v.dpr);
  const zoom = zoomCss * dpr;
  // a small arena on screen (a phone held upright) pushes in during the fight, up to push.max
  const pushMax = clamp(CT_VIEW.push.minZoomCss / zoomCss, 1, CT_VIEW.push.max);
  return {
    zoom,
    centerX: ARENA.w / 2 + (W / 2 - (x + w / 2)) / zoomCss,
    centerY: ARENA.h / 2 + (H / 2 - (y + h / 2)) / zoomCss,
    k: quantizeK(zoom * pushMax),
    css: { x, y, w, h },
    portrait,
    zoomCss,
    band: { w: W, h: bandH, dx: 0, dy: H / 2 - (top + bandH / 2) },
    pushMax,
  };
}

/**
 * Push and wanted view centre that keep `need` (world box) in view: as close as pushMax allows, the
 * view bottom on the need box bottom (the floor stays at the bottom edge), centred on it horizontally.
 */
export function pushFor(f: ArenaFraming, need: Box): { push: number; want: Vec } {
  const visW1 = f.band.w / f.zoomCss;
  const visH1 = f.band.h / f.zoomCss;
  const push = clamp(Math.min(visW1 / Math.max(1, need.w), visH1 / Math.max(1, need.h)), 1, f.pushMax);
  return { push, want: { x: need.x + need.w / 2, y: need.y + need.h - visH1 / push / 2 } };
}

/** The camera at `push` (1 = the whole arena) centred as near `want` as the arena edges allow. */
export function cameraPose(f: ArenaFraming, push: number, want: Vec): CameraPose {
  const zc = f.zoomCss * push;
  const visW = f.band.w / zc;
  const visH = f.band.h / zc;
  const cx = visW >= ARENA.w ? ARENA.w / 2 : clamp(want.x, visW / 2, ARENA.w - visW / 2);
  const cy = visH >= ARENA.h ? ARENA.h / 2 : clamp(want.y, visH / 2, ARENA.h - visH / 2);
  return { zoom: f.zoom * push, centerX: cx + f.band.dx / zc, centerY: cy + f.band.dy / zc };
}
