/**
 * Shared kit of the counter customers (96x112, waist-up, facing the player): every body part is
 * painted from a material mask with top-left light into its own layer, outlined in ink, then stacked
 * back to front, so arms, heads and hair keep a dark line against what is behind them. Faces are
 * drawn straight on the head: big 4x5 eyes with a glint, brows, nose, a mouth per pose, cheeks.
 * Poses: idle; talk = mouth open + the Palermo "pinched fingers" hand; happy = closed eyes, big grin,
 * thumbs up; angry = frown, red cheeks, crossed arms, the anger mark. face() puts the features together,
 * finish() adds the pose's sparkles or anger mark.
 */
import { Mask, paintMask, type Tone } from '../../hills/mask';
import { Raster, outlineRaster } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { tones } from '../../rush/traffic';
import { sparkle } from './goldText';
import { KC } from './palette';

export const CW = 96;
export const CH = 112;
export type Pose = 'idle' | 'talk' | 'happy' | 'angry';
/** Same order as CUSTOMER_POSE in ../keys.ts. */
export const POSES: readonly Pose[] = ['idle', 'talk', 'happy', 'angry'];

/** Head centre / radii, shoulder line (top y, half width), half neck width. */
export interface Build {
  hx: number;
  hy: number;
  rx: number;
  ry: number;
  sy: number;
  sw: number;
  neck: number;
}

export const FACE_C = {
  line: '#4a1a14',
  mouth: '#6a1418',
  tongue: '#e8646a',
  teeth: KC.white,
  blush: '#f2948a',
  rage: '#e8362c',
  glint: KC.white,
} as const;

export { tones };

/** Paints a mask into its own layer, outlines it, stacks it onto r. */
export function layer(r: Raster, draw: (m: Mask) => void, pal: Readonly<Record<number, Tone>>, shadeDepth = 2): void {
  const m = new Mask(CW, CH);
  draw(m);
  const p = new Raster(CW, CH);
  paintMask(m, p, pal, { shadeDepth, openBottom: true });
  outlineRaster(p, KC.ink);
  r.blit(p, 0, 0);
}

/** Thick stroke of round dabs from (x0, y0) to (x1, y1). */
export function capsule(m: Mask, x0: number, y0: number, x1: number, y1: number, rad: number, id: number): void {
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) m.ellipse(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, rad, rad, id);
}

/** Torso with rounded shoulders down to the frame bottom, a round neckline cut out. */
export function torso(m: Mask, b: Build, id: number, neckline = 4): void {
  m.ellipse(48, b.sy + 12, b.sw, 12, id);
  m.rect(48 - b.sw, b.sy + 12, b.sw * 2 + 1, CH - b.sy - 12, id);
  if (neckline > 0) m.ellipse(b.hx, b.sy - 1, b.neck + 2, neckline, 0);
}

export function neck(r: Raster, b: Build, skin: Tone): void {
  layer(r, (m) => m.rect(b.hx - b.neck, b.hy + b.ry - 8, b.neck * 2 + 1, b.sy - b.hy - b.ry + 14, 1), { 1: { ...skin, light: skin.shade, base: skin.shade } }, 1);
}

/** Ears then the head (ellipse plus a fuller jaw), skin shaded from the top-left. */
export function head(r: Raster, b: Build, skin: Tone, jaw = 0.85): void {
  layer(r, (m) => {
    m.ellipse(b.hx - b.rx, b.hy + 3, 3, 4, 1);
    m.ellipse(b.hx + b.rx, b.hy + 3, 3, 4, 1);
  }, { 1: skin }, 1);
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy, b.rx, b.ry, 1);
    m.ellipse(b.hx, b.hy + Math.round(b.ry * 0.35), Math.round(b.rx * jaw), Math.round(b.ry * 0.62), 1);
  }, { 1: skin }, 3);
}

/** Arms for the pose: sleeve id 1, skin id 2 (hands; forearms too with `short` sleeves). */
export function arms(r: Raster, b: Build, pose: Pose, sleeve: Tone, skin: Tone, short = false): void {
  const lx = 48 - b.sw + 4;
  const rx = 48 + b.sw - 4;
  const top = b.sy + 9;
  const pal = { 1: sleeve, 2: skin };
  const hangs = (m: Mask, x: number, side: -1 | 1, len = CH - top): void => {
    capsule(m, x, top, x + side * 2, top + len, 5, 1);
    if (short) capsule(m, x + side * 2, top + 18, x + side * 2, top + len, 4, 2);
  };
  if (pose === 'angry') {
    // upper arms down to the elbows, forearms folded across the chest
    layer(r, (m) => {
      hangs(m, lx, -1, 22);
      hangs(m, rx, 1, 22);
    }, pal);
    layer(r, (m) => {
      capsule(m, lx + 1, top + 20, rx - 9, top + 13, 5, short ? 2 : 1);
      m.ellipse(rx - 7, top + 13, 4, 4, 2);
    }, pal);
    layer(r, (m) => {
      capsule(m, rx - 1, top + 22, lx + 9, top + 16, 5, short ? 2 : 1);
      m.ellipse(lx + 7, top + 16, 4, 4, 2);
    }, pal);
    return;
  }
  layer(r, (m) => hangs(m, lx, -1), pal);
  if (pose === 'idle') {
    layer(r, (m) => hangs(m, rx, 1), pal);
    return;
  }
  // right arm (viewer's right) raised: elbow out, forearm up, hand beside the chin
  const ex = rx + 6;
  const ey = top + 26;
  const hx = b.hx + b.rx + 2;
  const hy = b.hy + b.ry + 2;
  layer(r, (m) => {
    capsule(m, rx, top, ex, ey, 5, 1);
    capsule(m, ex, ey, hx + 2, hy + 8, 4, short ? 2 : 1);
  }, pal);
  layer(r, (m) => {
    if (pose === 'talk') {
      // pinched fingers pointing up ("ma che vuoi?")
      m.ellipse(hx, hy + 3, 4, 4, 2);
      m.poly([[hx - 4, hy + 1], [hx + 4, hy + 1], [hx + 1, hy - 7], [hx - 1, hy - 7]], 2);
    } else {
      // thumbs up
      m.rect(hx - 4, hy - 1, 9, 8, 2);
      m.rect(hx - 4, hy - 7, 3, 7, 2);
    }
  }, { 2: skin }, 1);
  if (pose === 'talk') {
    for (let y = hy - 5; y < hy; y += 2) r.set(hx, y, skin.shade);
  } else {
    for (let y = hy + 1; y < hy + 7; y += 2) rectR(r, hx - 1, y, 5, 1, skin.shade);
  }
}

/** Eyes 4x5 with a glint (closed arcs when happy, flattened when angry). */
export function eyes(r: Raster, b: Build, pose: Pose, ex: number, ey: number, ink: string = KC.ink): void {
  for (const side of [-1, 1] as const) {
    const x = b.hx + side * ex - 2;
    if (pose === 'happy') {
      rectR(r, x, ey, 4, 1, ink);
      r.set(x - 1, ey + 1, ink);
      r.set(x + 4, ey + 1, ink);
      continue;
    }
    const top = pose === 'angry' ? 1 : 0;
    rectR(r, x + 1, ey + top, 2, 1, ink);
    rectR(r, x, ey + 1, 4, 3, ink);
    rectR(r, x + 1, ey + 4, 2, 1, ink);
    r.set(x + 1, ey + 1, FACE_C.glint);
    if (pose === 'talk') r.set(x + 2, ey + 2, FACE_C.glint);
  }
}

/** Brows (2 px thick): arched, raised when talking or happy, slanted down to the nose when angry. */
export function brows(r: Raster, b: Build, pose: Pose, ex: number, y: number, col: string, w = 6): void {
  for (const side of [-1, 1] as const) {
    const inner = b.hx + side * (ex - 3);
    for (let i = 0; i < w; i++) {
      const x = inner + side * i;
      let dy = i === 0 || i === w - 1 ? 1 : 0;
      if (pose === 'talk' || pose === 'happy') dy -= 2;
      if (pose === 'angry') dy = Math.round((w - 1 - i) * 0.6) - 1;
      rectR(r, x, y + dy, 1, 2, col);
    }
  }
}

export function nose(r: Raster, b: Build, skin: Tone, y: number, big = false): void {
  const w = big ? 5 : 3;
  rectR(r, b.hx - 1, y - (big ? 4 : 2), 1, big ? 4 : 2, skin.light);
  rectR(r, b.hx - Math.floor(w / 2), y, w, 1, skin.dark ?? skin.shade);
  rectR(r, b.hx + Math.ceil(w / 2) - 1, y - 2, 1, 2, skin.shade);
  if (big) rectR(r, b.hx - 2, y - 1, 5, 1, skin.shade);
}

/** Mouth for the pose, centred on (hx, y). `braces` adds grey brackets on the teeth. */
export function mouth(r: Raster, b: Build, pose: Pose, y: number, lips: string = FACE_C.line, braces = false): void {
  const x = b.hx;
  if (pose === 'idle') {
    rectR(r, x - 3, y + 1, 7, 1, lips);
    r.set(x - 4, y, lips);
    r.set(x + 4, y, lips);
  } else if (pose === 'talk') {
    rectR(r, x - 3, y - 1, 7, 5, lips);
    rectR(r, x - 2, y, 5, 3, FACE_C.mouth);
    rectR(r, x - 2, y, 5, 1, FACE_C.teeth);
    rectR(r, x - 1, y + 2, 3, 1, FACE_C.tongue);
    rectR(r, x - 2, y + 4, 5, 1, lips);
    if (braces) [x - 2, x, x + 2].forEach((bx) => r.set(bx, y, KC.steelShade));
  } else if (pose === 'happy') {
    rectR(r, x - 6, y - 1, 13, 1, lips);
    rectR(r, x - 5, y, 11, 4, lips);
    rectR(r, x - 3, y + 4, 7, 1, lips);
    rectR(r, x - 5, y, 11, 2, FACE_C.teeth);
    rectR(r, x - 4, y + 2, 9, 2, FACE_C.mouth);
    rectR(r, x - 2, y + 3, 5, 1, FACE_C.tongue);
    if (braces) for (let bx = x - 4; bx <= x + 4; bx += 2) r.set(bx, y + 1, KC.steelShade);
  } else {
    rectR(r, x - 4, y, 9, 4, lips);
    rectR(r, x - 3, y + 1, 7, 2, FACE_C.teeth);
    for (const bx of [x - 1, x + 1]) rectR(r, bx, y + 1, 1, 2, KC.steelShade);
    r.set(x - 5, y + 4, lips);
    r.set(x + 5, y + 4, lips);
  }
}

export function cheeks(r: Raster, b: Build, pose: Pose, ex: number, y: number): void {
  if (pose !== 'happy' && pose !== 'angry') return;
  const col = pose === 'angry' ? FACE_C.rage : FACE_C.blush;
  for (const side of [-1, 1] as const) rectR(r, b.hx + side * (ex + 2) - 2, y, 4, 2, col);
}

/** The manga anger mark near the top of the head. */
export function angerMark(r: Raster, x: number, y: number): void {
  const rows = ['.r.r.', 'rr.rr', '.....', 'rr.rr', '.r.r.'];
  const m = new Raster(CW, CH);
  rows.forEach((row, j) => [...row].forEach((ch, i) => ch === 'r' && m.set(x + i, y + j, FACE_C.rage)));
  outlineRaster(m, KC.ink);
  r.blit(m, 0, 0);
}

export interface FaceOpts {
  ex?: number;
  brow: string;
  browW?: number;
  lips?: string;
  braces?: boolean;
  bigNose?: boolean;
  /** hide the mouth in idle (Turi's moustache covers it) */
  hush?: boolean;
}

export function face(r: Raster, b: Build, pose: Pose, skin: Tone, o: FaceOpts): void {
  const ex = o.ex ?? 8;
  const ey = b.hy + 1;
  eyes(r, b, pose, ex, ey);
  brows(r, b, pose, ex, ey - 5, o.brow, o.browW);
  nose(r, b, skin, b.hy + 9, o.bigNose);
  cheeks(r, b, pose, ex, b.hy + 8);
  if (!(o.hush && pose === 'idle')) mouth(r, b, pose, b.hy + 13, o.lips, o.braces);
}

/** Round frames (radius 5) around both eyes with a bridge and lens glints. */
export function roundGlasses(r: Raster, b: Build, ex: number, frame: string): void {
  for (const side of [-1, 1] as const) {
    const cx = b.hx + side * ex;
    const cy = b.hy + 3;
    for (let a = 0; a < 40; a++) {
      const t = (a / 40) * Math.PI * 2;
      r.set(Math.round(cx - 0.5 + Math.cos(t) * 5), Math.round(cy + Math.sin(t) * 4.5), frame);
    }
    r.set(cx + 2, cy - 2, KC.glassLight);
  }
  rectR(r, b.hx - 2, b.hy + 2, 4, 1, frame);
}

export function finish(r: Raster, b: Build, pose: Pose): void {
  if (pose === 'angry') angerMark(r, b.hx + b.rx - 5, b.hy - b.ry - 1);
  if (pose === 'happy') {
    sparkle(r, b.hx - b.rx - 6, b.hy - b.ry + 4, 2);
    sparkle(r, b.hx + b.rx + 7, b.hy - 4, 1);
  }
}
