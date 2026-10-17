/**
 * Castle parallax strips (far + near). Shapes are stamped into a wrap-around label mask,
 * then a shading pass turns labels into colours (top-left rim light, lit windows).
 */
import { bayer, rng } from '../pixel';
import { PixBuf, rgba } from './buf';

const enum L { None, Wall, Roof, Win, WinDark, Groove, Rock }

class Sil {
  readonly m: Uint8Array;
  constructor(readonly w: number, readonly h: number) {
    this.m = new Uint8Array(w * h);
  }
  set(x: number, y: number, v: L): void {
    if (y < 0 || y >= this.h) return;
    this.m[y * this.w + (((x % this.w) + this.w) % this.w)] = v;
  }
  get(x: number, y: number): L {
    if (y < 0) return L.None;
    if (y >= this.h) return L.Rock;
    return this.m[y * this.w + (((x % this.w) + this.w) % this.w)] as L;
  }
  rect(x: number, y: number, w: number, h: number, v: L): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v);
  }
  /** Column from `top` down to the bottom edge. */
  tower(x: number, w: number, top: number, v: L = L.Wall): void {
    this.rect(x, top, w, this.h - top, v);
  }
  /** Pointed roof sitting on y = baseY, overhanging the tower by `over` px. */
  cone(x: number, w: number, baseY: number, height: number, over = 1): void {
    const cx = x + (w - 1) / 2;
    const half = w / 2 + over;
    for (let j = 0; j < height; j++) {
      const hw = Math.max(0, Math.round(half * (1 - j / height) - 0.25));
      for (let i = -hw; i <= hw; i++) this.set(Math.round(cx + i), baseY - j, L.Roof);
    }
    this.set(Math.round(cx), baseY - height, L.Roof);
    this.set(Math.round(cx), baseY - height - 1, L.Roof);
  }
  battlements(x: number, w: number, y: number, v: L = L.Wall): void {
    for (let i = 0; i < w; i++) if (Math.floor(i / 2) % 2 === 0 || i === w - 1) this.rect(x + i, y - 2, 1, 2, v);
  }
  /** Broken tower top: random notches eaten out of the top rows. */
  broken(x: number, w: number, top: number, seed: number): void {
    const r = rng(seed);
    for (let i = 0; i < w; i++) {
      const bite = Math.floor(r() * 7 + (i % 3 === 0 ? 3 : 0));
      for (let j = 0; j < bite; j++) this.set(x + i, top + j, L.None);
    }
  }
  window(x: number, y: number, lit: boolean): void {
    const v = lit ? L.Win : L.WinDark;
    this.rect(x, y + 1, 2, 3, v);
    this.set(x, y, v); // arched top: one pixel, offset left so the arch reads
  }
  groove(x: number, y0: number, y1: number): void {
    for (let y = y0; y <= y1; y++) if (this.get(x, y) === L.Wall) this.set(x, y, L.Groove);
  }
  rockProfile(base: number, amp: number, seed: number): void {
    const p = (Math.PI * 2) / this.w;
    for (let x = 0; x < this.w; x++) {
      const y = Math.round(base + amp * Math.sin(p * x * 3 + seed) + amp * 0.5 * Math.sin(p * x * 7 + seed * 2));
      for (let j = y; j < this.h; j++) if (this.get(x, j) === L.None) this.set(x, j, L.Rock);
    }
  }
}

interface Shades {
  wall: number; wallLit: number; wallTop: number; wallDark: number; mortar: number;
  roof: number; roofLit: number; roofDark: number;
  win: number; winHot: number; winLow: number; winDark: number; groove: number;
  rock: number; rockLit: number;
  haze: number; hazeRows: number;
}

function paint(s: Sil, c: Shades, bricks: boolean): HTMLCanvasElement {
  const buf = new PixBuf(s.w, s.h);
  for (let y = 0; y < s.h; y++) {
    for (let x = 0; x < s.w; x++) {
      const v = s.get(x, y);
      if (v === L.None) continue;
      const openUp = s.get(x, y - 1) === L.None;
      const openL = s.get(x - 1, y) === L.None;
      const openR = s.get(x + 1, y) === L.None;
      let col: number;
      if (v === L.Roof) col = openUp || openL ? c.roofLit : openR ? c.roofDark : (x + y) % 5 === 0 ? c.roofLit : c.roof;
      else if (v === L.Win) col = s.get(x, y - 1) !== L.Win ? c.winHot : s.get(x, y + 1) !== L.Win ? c.winLow : c.win;
      else if (v === L.WinDark) col = c.winDark;
      else if (v === L.Groove) col = c.groove;
      else if (v === L.Rock) col = openUp ? c.rockLit : c.rock;
      else if (openUp) col = c.wallTop;
      else if (openL) col = c.wallLit;
      else if (openR) col = c.wallDark;
      else if (bricks && (y % 6 === 5 || (x + (Math.floor(y / 6) % 2) * 4) % 8 === 0)) col = c.mortar;
      else col = c.wall;
      if (y >= s.h - c.hazeRows && (s.h - y) / c.hazeRows < 0.85 * bayer(x, y) + 0.1) col = c.haze;
      buf.set(x, y, col);
    }
  }
  return buf.toCanvas();
}

/* ------------------------------------------------------------------- FAR */

export function buildFar(): HTMLCanvasElement {
  const s = new Sil(512, 160);
  const r = rng(707);
  for (let k = 0; k < 16; k++) {
    const x = Math.floor((k / 16) * 512 + r() * 20);
    const w = 6 + Math.floor(r() * 10);
    const top = 60 + Math.floor(r() * 56);
    s.tower(x, w, top);
    const kind = r();
    if (kind < 0.55) s.cone(x, w, top - 1, Math.round(w * (1.4 + r())), 1);
    else if (kind < 0.8) s.battlements(x, w, top);
    else s.broken(x, w, top, k * 31);
    if (r() < 0.5) s.window(x + Math.floor(w / 2) - 1, top + 8 + Math.floor(r() * 10), r() < 0.6);
  }
  // two tall spiky clusters echo the box tower in the distance
  for (const [cx, seed] of [[120, 3], [372, 9]] as const) {
    const q = rng(seed);
    s.tower(cx - 12, 26, 96);
    for (let n = 0; n < 4; n++) {
      const w = 3 + Math.floor(q() * 3);
      const x = cx - 10 + n * 6;
      const top = 30 + Math.floor(q() * 40);
      s.tower(x, w, top);
      s.cone(x, w, top - 1, 8 + Math.floor(q() * 6), 0);
    }
  }
  s.rect(0, 128, 512, 32, L.Wall);
  s.rockProfile(122, 4, 1.3);
  return paint(s, {
    wall: rgba('#6a1a30'), wallLit: rgba('#7a2236'), wallTop: rgba('#842838'), wallDark: rgba('#5e162a'), mortar: rgba('#6a1a30'),
    roof: rgba('#64182e'), roofLit: rgba('#782034'), roofDark: rgba('#58142a'),
    win: rgba('#b0443a'), winHot: rgba('#c8583e'), winLow: rgba('#9a3a38'), winDark: rgba('#58142a'), groove: rgba('#5e162a'),
    rock: rgba('#6a1a30'), rockLit: rgba('#7a2236'),
    haze: rgba('#8a2a3a'), hazeRows: 40,
  }, false);
}

/* ------------------------------------------------------------------ NEAR */

function castleA(s: Sil): void {
  s.tower(18, 108, 138);
  s.battlements(18, 108, 138);
  s.tower(22, 18, 94);
  s.cone(22, 18, 93, 30, 2);
  s.tower(66, 24, 76);
  s.battlements(66, 24, 76);
  s.tower(72, 12, 60);
  s.cone(72, 12, 59, 22, 1);
  s.tower(106, 16, 104);
  s.broken(106, 16, 104, 77);
  for (const [x, y, lit] of [[30, 104, true], [30, 120, false], [76, 86, true], [82, 86, true], [76, 104, false], [112, 116, true], [50, 150, true], [96, 150, false]] as const) {
    s.window(x, y, lit);
  }
}

/** The big needle tower from the box: a domed base with a fan of thin spires. */
function gothicSpire(s: Sil): void {
  const cx = 214;
  s.tower(cx - 26, 52, 132);
  for (let j = 0; j < 14; j++) {
    const hw = Math.round(26 * Math.sqrt(1 - ((13 - j) / 14) ** 2));
    s.rect(cx - hw, 118 + j, hw * 2, 1, L.Wall);
  }
  const needles: [number, number, number][] = [[-22, 5, 84], [-14, 7, 54], [-5, 9, 22], [6, 7, 40], [15, 6, 66], [22, 4, 96]];
  for (const [dx, w, top] of needles) {
    s.tower(cx + dx - Math.floor(w / 2), w, top);
    s.cone(cx + dx - Math.floor(w / 2), w, top - 1, 10 + Math.floor(w * 1.5), 0);
    s.groove(cx + dx, top + 6, 130);
  }
  for (let y = 70; y < 132; y += 12) for (let i = -12; i <= 12; i++) if (s.get(cx + i, y) === L.Wall) s.set(cx + i, y, L.Groove);
  s.window(cx - 1, 140, true);
  s.window(cx - 13, 146, true);
  s.window(cx + 11, 146, false);
  s.rect(cx - 4, 160, 8, 30, L.WinDark); // gate
}

function castleB(s: Sil): void {
  s.tower(300, 22, 116);
  s.broken(300, 22, 116, 5);
  s.window(309, 134, true);
  s.tower(356, 116, 146);
  s.battlements(356, 116, 146);
  s.tower(360, 16, 102);
  s.cone(360, 16, 101, 26, 2);
  s.tower(396, 28, 64);
  s.battlements(396, 28, 64);
  s.tower(403, 14, 44);
  s.cone(403, 14, 43, 26, 2);
  s.tower(446, 18, 110);
  s.battlements(446, 18, 110);
  s.tower(484, 12, 128);
  s.broken(484, 12, 128, 13);
  for (const [x, y, lit] of [[367, 112, true], [367, 128, true], [405, 76, true], [413, 76, false], [409, 96, true], [409, 116, true], [454, 122, false], [430, 156, true], [380, 158, true], [470, 158, true]] as const) {
    s.window(x, y, lit);
  }
}

export function buildNear(): HTMLCanvasElement {
  const s = new Sil(512, 192);
  castleA(s);
  gothicSpire(s);
  castleB(s);
  s.tower(150, 10, 150);
  s.cone(150, 10, 149, 16, 1);
  s.tower(262, 14, 140);
  s.broken(262, 14, 140, 21);
  s.rockProfile(176, 5, 0.4);
  return paint(s, {
    wall: rgba('#2a1018'), wallLit: rgba('#46182a'), wallTop: rgba('#5c2232'), wallDark: rgba('#1c0a10'), mortar: rgba('#220c14'),
    roof: rgba('#321220'), roofLit: rgba('#4e1c2a'), roofDark: rgba('#200a12'),
    win: rgba('#fcb040'), winHot: rgba('#fce48a'), winLow: rgba('#e8701c'), winDark: rgba('#12060a'), groove: rgba('#3e1622'),
    rock: rgba('#1e0a10'), rockLit: rgba('#3a1420'),
    haze: rgba('#1e0a10'), hazeRows: 0,
  }, true);
}
