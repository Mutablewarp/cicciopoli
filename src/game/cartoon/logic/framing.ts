/**
 * Pure camera framing of level 8. At push 1 the whole ARENA is visible, as big as it fits, never under
 * the HUD bar (insetTop). Portrait: full width inside the free band down to the touch controls
 * (insetBottom), so the controls sit BELOW the fight, never over it. Landscape: the arena fills the
 * height down to the bottom edge (controls overlaid in the side bands / bottom corners).
 * Where the arena is small on screen (a phone held upright) fights PUSH IN to pushMax: the camera zooms
 * until the hero and the boss read on a phone (CT_VIEW.push.minZoomCss) and pans to keep the hero, the side of
 * the boss facing the hero and the hazards near it in view (in that order), easing out (down to pushFar) when
 * they are far apart, clamped to the arena edges. A phone held sideways pushes in a little (landZoomCss) only
 * while the hero, the hazards near it and the whole boss fit. k = texture scale = device px per world unit
 * at full push, quantised and clamped to KMAX.
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
  /** the phone is held upright (ViewportInfo.portrait); omitted = the host is taller than wide. In Safari the
   * portrait host can be wider than tall (browser bars + the controls band), and it must still push in. */
  portrait?: boolean;
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
  /** a fight eases out to this factor (push.fitZoomCss) to show the hero and the whole boss together */
  pushFit: number;
  /** and down to this one (push.farZoomCss) to keep the side of the boss facing the hero in view */
  pushFar: number;
}

/** What a pushed fight camera keeps in view (world units). */
export interface Focus {
  /** always in view: the hero and the room around it */
  hero: Box;
  /** in view when it fits after the boss side: the hero and the hazards near it */
  near: Box;
  /** its side facing the hero (push.bossShow) in view when it fits with the hero, the rest as the view allows
   * (null = none) */
  boss: Box | null;
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
  const portrait = v.portrait ?? H > W;
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
  // a small arena pushes in during the fight (up to push.max): a phone held upright a lot, one held sideways a little
  const P = CT_VIEW.push;
  const pushMax = clamp((portrait ? P.minZoomCss : P.landZoomCss) / zoomCss, 1, P.max);
  const pushFit = portrait ? clamp(P.fitZoomCss / zoomCss, 1, pushMax) : 1;
  const pushFar = portrait ? clamp(P.farZoomCss / zoomCss, 1, pushFit) : 1;
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
    pushFit,
    pushFar,
  };
}

export function union(a: Box, b: Box): Box {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** The `share` of the boss box on the side facing the hero (the whole box when the hero is level with it). */
export function bossSlice(boss: Box, hero: Box, share: number): Box {
  const hx = hero.x + hero.w / 2;
  const w = boss.w * share;
  if (hx < boss.x) return { ...boss, w };
  if (hx > boss.x + boss.w) return { ...boss, x: boss.x + boss.w - w, w };
  return boss;
}

/**
 * Push and wanted view centre of a fight: the push that fits everything (the hero, the hazards near it, the
 * whole boss) between pushFit and pushMax; when that does not fit at pushFit, the push that fits the hero and
 * the boss side facing the hero, down to pushFar (it follows their distance only: no zoom pumping as hazards
 * come and go). Horizontally the centre of everything as far as keeping the hero, that boss side and the hazards
 * near the hero in view allows (only the hero and that boss side, or only the hero, when the view is too narrow:
 * the edge arrows point at the hazards left out); vertically the view bottom on push.floorY, raised when the hero
 * would leave the top.
 */
export function follow(f: ArenaFraming, focus: Focus): { push: number; want: Vec } {
  const P = CT_VIEW.push;
  const near = union(focus.hero, focus.near);
  const must = focus.boss ? union(focus.hero, bossSlice(focus.boss, focus.hero, P.bossShow)) : focus.hero;
  const wish = union(near, must);
  const all = focus.boss ? union(near, focus.boss) : near;
  // fit the width and the height from the top of the box down to the floor (a jumping boss stays in view)
  const fit = (b: Box): number => Math.min(f.band.w / f.zoomCss / Math.max(1, b.w), f.band.h / f.zoomCss / Math.max(1, P.floorY - b.y));
  const fitAll = fit(all);
  const push = fitAll >= f.pushFit ? Math.min(fitAll, f.pushMax) : clamp(fit(must), f.pushFar, f.pushFit);
  const zc = f.zoomCss * push;
  const visW = f.band.w / zc;
  const visH = f.band.h / zc;
  const keep = wish.w <= visW ? wish : must.w <= visW ? must : focus.hero;
  const x = clamp(all.x + all.w / 2, keep.x + keep.w - visW / 2, keep.x + visW / 2);
  const y = Math.min(P.floorY - visH / 2, focus.hero.y + visH / 2);
  return { push, want: { x, y } };
}

/** Push and centre showing `box` as big as the band allows (between the whole arena and pushMax): the finale. */
export function frameBox(f: ArenaFraming, box: Box): { push: number; want: Vec } {
  const push = clamp(Math.min(f.band.w / f.zoomCss / Math.max(1, box.w), f.band.h / f.zoomCss / Math.max(1, box.h)), 1, f.pushMax);
  return { push, want: { x: box.x + box.w / 2, y: box.y + box.h / 2 } };
}

/** `want` moved the least so that `box` is inside the view at `push` (when the view is big enough for it). */
export function keepInView(f: ArenaFraming, push: number, want: Vec, box: Box): Vec {
  const zc = f.zoomCss * push;
  const visW = f.band.w / zc;
  const visH = f.band.h / zc;
  const x = box.w <= visW ? clamp(want.x, box.x + box.w - visW / 2, box.x + visW / 2) : want.x;
  const y = box.h <= visH ? clamp(want.y, box.y + box.h - visH / 2, box.y + visH / 2) : want.y;
  return { x, y };
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

/** The arena part the band shows at `pose` (the canvas outside the HUD / controls insets, clipped to the arena). */
export function viewRect(f: ArenaFraming, pose: CameraPose): Box {
  const zc = pose.zoom / (f.zoom / f.zoomCss);
  const w = f.band.w / zc;
  const h = f.band.h / zc;
  const left = pose.centerX - f.band.dx / zc - w / 2;
  const top = pose.centerY - f.band.dy / zc - h / 2;
  const x = Math.max(0, left);
  const y = Math.max(0, top);
  return { x, y, w: Math.max(0, Math.min(ARENA.w, left + w) - x), h: Math.max(0, Math.min(ARENA.h, top + h) - y) };
}
