/**
 * The GOLDEN TICKET art (vector, drawn at scale k): an ornate golden banknote with an engraved
 * guilloché border and corner rosettes, the owner's ORIGINAL face logo tinted gold
 * (public/brand/ciccio-face-hd.png, never redrawn), CICCIO'S, BIGLIETTO D'ORO, a serial number and a
 * huge YOU ARE SO GOLDEN; the chocolate-bar-like Ciccio's wrapper in two torn halves; the shine band.
 */
import type Phaser from 'phaser';
import { INK, image } from './draw/canvas';
import { goldLogo } from '../kitchen/brand/logo';
import { CT_FONT } from '../../config/cartoon';

export const TICKET = { w: 300, h: 150 } as const;
export const WRAP = { w: 320, h: 176, tearY: 98 } as const;
/** the ticket is drawn this much finer than k: it is shown up to 1.5x */
const TICKET_OVERSAMPLE = 1.6;
const BRONZE = '#6b4508';
/** the same serial as the ticket of the results / title cards (src/ui/cartoon/thumb.ts) */
const SERIAL = 'N° 0000161';

export interface GoldenKeys {
  ticket: string;
  wrapTop: string;
  wrapBottom: string;
  shine: string;
  /** texture scale of the ticket (show it at size s with setScale(s / ticketK)) */
  ticketK: number;
  /** texture scale of the wrapper halves */
  wrapK: number;
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, fill: string | CanvasGradient, ink: number, font: string = CT_FONT.display): void {
  ctx.font = `900 ${size}px ${font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (ink > 0) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink;
    ctx.strokeText(s, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(s, x, y);
}

/** Interlaced sine cords along a rectangle's perimeter (the engraved banknote border). */
function guilloche(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  const per = 2 * (w + h);
  const at = (s: number): [number, number, number, number] => {
    if (s < w) return [x + s, y, 0, 1];
    if (s < w + h) return [x + w, y + s - w, -1, 0];
    if (s < 2 * w + h) return [x + w - (s - w - h), y + h, 0, -1];
    return [x, y + h - (s - 2 * w - h), 1, 0];
  };
  ctx.lineWidth = 0.45;
  for (let j = 0; j < 6; j++) {
    const phase = (j * Math.PI) / 3;
    const amp = j % 2 ? 4.2 : 3;
    ctx.strokeStyle = j % 2 ? 'rgba(107,69,8,0.75)' : 'rgba(255,248,214,0.8)';
    ctx.beginPath();
    for (let s = 0; s <= per; s += 0.7) {
      const [px, py, nx, ny] = at(s);
      const o = Math.sin((s / 9) * Math.PI * 2 + phase) * amp;
      ctx.lineTo(px + nx * o, py + ny * o);
    }
    ctx.closePath();
    ctx.stroke();
  }
}

/** Spirograph rosette (hypotrochoid). */
function rosette(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, r: number, d: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.4;
  ctx.beginPath();
  const turns = r * Math.PI * 2;
  for (let t = 0; t <= turns; t += 0.04) {
    const q = ((R - r) / r) * t;
    ctx.lineTo(cx + (R - r) * Math.cos(t) + d * Math.cos(q), cy + (R - r) * Math.sin(t) - d * Math.sin(q));
  }
  ctx.stroke();
}

function paintTicket(ctx: CanvasRenderingContext2D, logo: CanvasImageSource | null, kk: number): void {
  const { w, h } = TICKET;
  const gold = ctx.createLinearGradient(0, 0, w, h);
  gold.addColorStop(0, '#fff0a8');
  gold.addColorStop(0.35, '#f2c64e');
  gold.addColorStop(0.6, '#ffe68c');
  gold.addColorStop(1, '#d99a26');
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 9);
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.save(); // faint sunburst engraving
  ctx.clip();
  ctx.strokeStyle = 'rgba(150,100,20,0.18)';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + Math.cos(a) * w, h / 2 + Math.sin(a) * w);
    ctx.stroke();
  }
  ctx.restore();
  guilloche(ctx, 13, 13, w - 26, h - 26);
  ctx.strokeStyle = BRONZE;
  ctx.lineWidth = 0.9;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.beginPath();
  ctx.roundRect(2, 2, w - 4, h - 4, 9);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  for (const [cx, cy] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]] as const) {
    ctx.beginPath();
    ctx.arc(cx, cy, 11, 0, Math.PI * 2);
    ctx.fillStyle = '#f7d36a';
    ctx.fill();
    ctx.strokeStyle = BRONZE;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    rosette(ctx, cx, cy, 10, 3.5, 5, 'rgba(107,69,8,0.85)');
  }
  // medallion with the original face logo, gold
  const mx = 66;
  const my = h / 2 + 4;
  const med = ctx.createRadialGradient(mx - 8, my - 10, 4, mx, my, 40);
  med.addColorStop(0, '#fff3b8');
  med.addColorStop(1, '#c98a1c');
  ctx.beginPath();
  ctx.ellipse(mx, my, 34, 40, 0, 0, Math.PI * 2);
  ctx.fillStyle = med;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  rosette(ctx, mx, my, 36, 7, 9, 'rgba(107,69,8,0.25)');
  if (logo) {
    const lh = 62;
    const lw = (lh * 358) / 512;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(goldLogo(logo, Math.ceil(lw * kk), Math.ceil(lh * kk)), mx - lw / 2, my - lh / 2, lw, lh);
    ctx.restore();
  }
  const ink = ctx.createLinearGradient(0, 30, 0, 60);
  ink.addColorStop(0, '#8a5a10');
  ink.addColorStop(1, '#4a2c04');
  text(ctx, "CICCIO'S", 192, 38, 24, ink, 0);
  text(ctx, "· BIGLIETTO D'ORO ·", 192, 58, 10, BRONZE, 0, CT_FONT.script);
  const shine = ctx.createLinearGradient(0, 74, 0, 112);
  shine.addColorStop(0, '#fffbe6');
  shine.addColorStop(1, '#f2b631');
  text(ctx, 'YOU ARE', 192, 82, 19, shine, 3.4);
  text(ctx, 'SO GOLDEN', 192, 106, 24, shine, 3.8);
  ctx.font = `700 7px ${CT_FONT.script}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#7a1e10';
  ctx.fillText(SERIAL, w - 26, h - 27);
  ctx.textAlign = 'left';
  ctx.fillText(SERIAL, 26, 27);
}

/** The wrapper: dark chocolate paper, gold foil ends, CICCIO'S; `half` keeps one side of the tear. */
function paintWrapper(ctx: CanvasRenderingContext2D, half: 'top' | 'bottom'): void {
  const { w, h, tearY } = WRAP;
  ctx.save();
  ctx.beginPath(); // zigzag tear
  const teeth = 16;
  const edge = half === 'top' ? 0 : h;
  ctx.moveTo(0, edge);
  ctx.lineTo(w, edge);
  for (let i = teeth; i >= 0; i--) ctx.lineTo((i / teeth) * w, tearY + (i % 2 ? 5 : -5));
  ctx.closePath();
  ctx.clip();
  const paper = ctx.createLinearGradient(0, 0, 0, h);
  paper.addColorStop(0, '#6a2f18');
  paper.addColorStop(0.5, '#4a1f0f');
  paper.addColorStop(1, '#2e1208');
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 6);
  ctx.fillStyle = paper;
  ctx.fill();
  for (const x of [4, w - 34]) {
    const foil = ctx.createLinearGradient(x, 0, x + 30, 0);
    foil.addColorStop(0, '#b8862a');
    foil.addColorStop(0.5, '#ffe38a');
    foil.addColorStop(1, '#a8761c');
    ctx.fillStyle = foil;
    ctx.fillRect(x, 4, 30, h - 8);
    ctx.strokeStyle = 'rgba(90,50,8,0.6)';
    ctx.lineWidth = 0.6;
    for (let y = 10; y < h - 8; y += 6) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 30, y + 3);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(243,230,200,0.12)';
  ctx.fillRect(34, h * 0.38, w - 68, h * 0.24);
  const cream = ctx.createLinearGradient(0, 50, 0, 100);
  cream.addColorStop(0, '#fff6dc');
  cream.addColorStop(1, '#f2c14e');
  text(ctx, "CICCIO'S", w / 2, 72, 40, cream, 6);
  text(ctx, 'EDIZIONE SPECIALE', w / 2, 112, 13, '#f2c14e', 3);
  ctx.beginPath();
  ctx.roundRect(4, 4, w - 8, h - 8, 6);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

/** Registers the golden ticket textures at scale k (once per k); `logoKey` = the loaded original logo. */
export function loadGoldenArt(scene: Phaser.Scene, k: number, logoKey: string | null): GoldenKeys {
  const kk = k * TICKET_OVERSAMPLE;
  const keys: GoldenKeys = { ticket: `ct-core-ticket-${k}`, wrapTop: `ct-core-wrap-top-${k}`, wrapBottom: `ct-core-wrap-bottom-${k}`, shine: 'ct-core-shine', ticketK: kk, wrapK: k };
  const logo = logoKey && scene.textures.exists(logoKey) ? (scene.textures.get(logoKey).getSourceImage() as HTMLImageElement) : null;
  image(scene, keys.ticket, TICKET.w, TICKET.h, kk, (ctx) => paintTicket(ctx, logo, kk));
  image(scene, keys.wrapTop, WRAP.w, WRAP.h, k, (ctx) => paintWrapper(ctx, 'top'));
  image(scene, keys.wrapBottom, WRAP.w, WRAP.h, k, (ctx) => paintWrapper(ctx, 'bottom'));
  image(scene, keys.shine, 64, 64, 2, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,240,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  return keys;
}
