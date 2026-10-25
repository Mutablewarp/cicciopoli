/**
 * THE OLD SCHOOL arena: a warm 1930s diner painted in watercolour (canvas 2D in world units, no Phaser).
 * FAR: wall, window with blinds, clock, chalk menu board, poster, pendant lamps, checkered floor.
 * MID: the chrome-edged counter (the sauce bottles stand on it), stools, the glowing jukebox.
 * NEAR: dark foreground stool and milkshake in the bottom-left corner.
 */
import { ARENA } from '../../api';
import { painted, rgba, rrect, seeded, vgrad, wash, grain } from './kit/paint';

type Ctx = CanvasRenderingContext2D;

export const MID = { y: 150, h: 170 } as const;
export const NEAR = { y: 300, h: 60 } as const;
/** the counter top the sauce bottles stand on */
export const COUNTER = { x0: 330, top: 232 } as const;

const LINE_BG = '#4a3428';
const CREAM = '#efe2bd';
const MINT = '#9fc8b2';
const MAROON = '#93382b';
const CHROME = '#d9d4c8';
const FLOOR_Y = ARENA.floorY;

function lamp(ctx: Ctx, x: number): void {
  const g = ctx.createRadialGradient(x, 40, 4, x, 90, 120);
  g.addColorStop(0, 'rgba(255, 226, 160, 0.55)');
  g.addColorStop(1, 'rgba(255, 226, 160, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 130, 20, 260, 220);
  ctx.strokeStyle = LINE_BG;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, 22);
  ctx.lineTo(x, 30);
  ctx.stroke();
  painted(ctx, (c) => {
    c.beginPath();
    c.moveTo(x - 4, 30);
    c.lineTo(x + 4, 30);
    c.lineTo(x + 15, 44);
    c.quadraticCurveTo(x, 48, x - 15, 44);
    c.closePath();
  }, MAROON, '#5e2219', 1.4, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.ellipse(x, 45, 7, 3, 0, 0, Math.PI * 2);
  }, '#fff1c4', '#f0c060', 0);
}

function windowView(ctx: Ctx, rng: () => number): void {
  const x = 140;
  const y = 44;
  const w = 150;
  const h = 128;
  painted(ctx, (c) => rrect(c, x - 6, y - 6, w + 12, h + 12, 10), '#c7b48c', '#7d6a4a', 1.6, LINE_BG);
  ctx.save();
  rrect(ctx, x, y, w, h, 6);
  ctx.clip();
  vgrad(ctx, x, y, w, h, [[0, '#bcd3d6'], [0.7, '#e6dcc0'], [1, '#d7c39a']]);
  wash(ctx, rng, x, y + 60, w, 70, '#8a9aa6', 10, 10, 26, 0.35);
  ctx.fillStyle = rgba('#7f8c96', 0.65);
  for (const [bx, bw, bh] of [[x, 30, 64], [x + 34, 24, 84], [x + 62, 40, 54], [x + 108, 26, 76], [x + 128, 30, 60]] as const) {
    ctx.fillRect(bx, y + h - bh, bw, bh);
  }
  ctx.fillStyle = rgba('#fff3c9', 0.7);
  for (let i = 0; i < 14; i++) ctx.fillRect(x + 6 + rng() * (w - 12), y + h - 50 + rng() * 40, 2.5, 3.5);
  for (let i = 0; i < 6; i++) {
    const sy = y + 4 + i * 8;
    ctx.fillStyle = i % 2 ? '#e9dfc6' : '#f4ecd6';
    ctx.fillRect(x, sy, w, 6.5);
    ctx.strokeStyle = rgba(LINE_BG, 0.5);
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x, sy, w, 6.5);
  }
  ctx.restore();
  ctx.strokeStyle = LINE_BG;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.stroke();
}

function clock(ctx: Ctx): void {
  const x = 336;
  const y = 66;
  painted(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, 25, 0, Math.PI * 2);
  }, MAROON, '#5e2219', 1.6, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.arc(x, y, 20, 0, Math.PI * 2);
  }, '#fbf3dc', '#d8c7a0', 1.2, LINE_BG);
  ctx.fillStyle = LINE_BG;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 16, i % 3 ? 0.9 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = LINE_BG;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 8, y - 6);
  ctx.moveTo(x, y);
  ctx.lineTo(x - 2, y - 13);
  ctx.stroke();
}

function menuBoard(ctx: Ctx, rng: () => number): void {
  const x = 420;
  const y = 36;
  painted(ctx, (c) => rrect(c, x, y, 190, 100, 6), '#8a5a32', '#5a3418', 1.6, LINE_BG);
  painted(ctx, (c) => rrect(c, x + 7, y + 7, 176, 86, 3), '#34503f', '#1f3428', 0);
  wash(ctx, rng, x + 8, y + 8, 174, 84, '#6f8f7a', 8, 10, 30, 0.25);
  ctx.fillStyle = '#f5ecd2';
  ctx.textAlign = 'center';
  ctx.font = 'italic bold 19px Georgia, serif';
  ctx.fillText('The Old School', x + 95, y + 32);
  ctx.font = 'bold 9px Georgia, serif';
  ctx.fillText('SAPORI CLASSICI', x + 95, y + 52);
  ctx.fillText('GUSTO SENZA TEMPO', x + 95, y + 65);
  ctx.font = 'italic 8px Georgia, serif';
  ctx.fillStyle = '#f2c96a';
  ctx.fillText('manzo · doppio cheddar · bacon · BBQ', x + 95, y + 82);
}

function poster(ctx: Ctx): void {
  const x = 30;
  const y = 44;
  painted(ctx, (c) => rrect(c, x, y, 84, 96, 3), '#f6ead0', '#d9c49a', 1.4, LINE_BG);
  ctx.strokeStyle = '#c4473a';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 5, y + 5, 74, 86);
  painted(ctx, (c) => {
    c.beginPath();
    c.moveTo(x + 24, y + 48);
    c.bezierCurveTo(x + 24, y + 22, x + 60, y + 22, x + 60, y + 48);
    c.closePath();
  }, '#e9973b', '#b9622b', 1.4, LINE_BG);
  painted(ctx, (c) => rrect(c, x + 23, y + 49, 38, 5, 2), '#6d3c22', '#45230f', 1.2, LINE_BG);
  painted(ctx, (c) => rrect(c, x + 25, y + 55, 34, 6, 3), '#e9973b', '#b9622b', 1.2, LINE_BG);
  ctx.fillStyle = '#7a2a20';
  ctx.textAlign = 'center';
  ctx.font = 'italic bold 11px Georgia, serif';
  ctx.fillText("Solo da", x + 42, y + 75);
  ctx.fillText("Ciccio's!", x + 42, y + 86);
}

function floor(ctx: Ctx): void {
  const vx = ARENA.w / 2;
  const vy = 120;
  const rows = [FLOOR_Y, 323, 330, 339, 350, ARENA.h + 2];
  const tile = 40;
  const cols = 14;
  const xAt = (y: number, i: number): number => vx + (i * tile * (y - vy)) / (ARENA.h - vy);
  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = -cols; c < cols; c++) {
      const y0 = rows[r];
      const y1 = rows[r + 1];
      ctx.beginPath();
      ctx.moveTo(xAt(y0, c), y0);
      ctx.lineTo(xAt(y0, c + 1), y0);
      ctx.lineTo(xAt(y1, c + 1), y1);
      ctx.lineTo(xAt(y1, c), y1);
      ctx.closePath();
      ctx.fillStyle = (r + c + 2 * cols) % 2 === 0 ? '#2e2622' : '#efe5cb';
      ctx.fill();
    }
  }
  vgrad(ctx, 0, FLOOR_Y, ARENA.w, ARENA.h - FLOOR_Y, [[0, 'rgba(40, 24, 16, 0.35)'], [0.35, 'rgba(255, 236, 190, 0.12)'], [1, 'rgba(40, 24, 16, 0.25)']]);
  ctx.fillStyle = LINE_BG;
  ctx.fillRect(0, FLOOR_Y - 2.5, ARENA.w, 2.5);
}

/** Back wall, window, clock, menu board, poster, lamps and the checkered floor (640 x 360). */
export function drawFar(ctx: Ctx): void {
  const rng = seeded(1937);
  vgrad(ctx, 0, 0, ARENA.w, FLOOR_Y, [[0, '#e8d6ab'], [0.35, CREAM], [1, '#e2cc98']]);
  wash(ctx, rng, 0, 20, ARENA.w, 210, '#c9b27a', 26, 20, 70, 0.22);
  wash(ctx, rng, 0, 20, ARENA.w, 210, '#f7ecd0', 16, 20, 60, 0.35);
  vgrad(ctx, 0, 196, ARENA.w, FLOOR_Y - 196, [[0, MINT], [1, '#7fae98']]);
  ctx.strokeStyle = rgba('#5d8a74', 0.6);
  ctx.lineWidth = 0.8;
  for (let y = 206; y < FLOOR_Y; y += 10) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.w, y);
    ctx.stroke();
  }
  for (let x = 0; x < ARENA.w; x += 16) {
    ctx.beginPath();
    ctx.moveTo(x, 196);
    ctx.lineTo(x, FLOOR_Y);
    ctx.stroke();
  }
  wash(ctx, rng, 0, 196, ARENA.w, 120, '#5d8a74', 14, 14, 40, 0.18);
  vgrad(ctx, 0, 190, ARENA.w, 7, [[0, '#f4f1ea'], [0.5, CHROME], [1, '#8c867a']]);
  vgrad(ctx, 0, 0, ARENA.w, 22, [[0, '#6f2a20'], [1, MAROON]]);
  vgrad(ctx, 0, 22, ARENA.w, 4, [[0, '#f4f1ea'], [1, '#9a948a']]);
  windowView(ctx, rng);
  clock(ctx);
  menuBoard(ctx, rng);
  poster(ctx);
  for (const x of [96, 250, 560]) lamp(ctx, x);
  floor(ctx);
  grain(ctx, rng, 0, 0, ARENA.w, ARENA.h, 2600, '#5a3f2a', 0.18);
}

function stool(ctx: Ctx, x: number, y: number, s: number): void {
  ctx.fillStyle = rgba('#2a1a12', 0.25);
  ctx.beginPath();
  ctx.ellipse(x, FLOOR_Y - 1, 15 * s, 3 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  painted(ctx, (c) => rrect(c, x - 2.5 * s, y, 5 * s, FLOOR_Y - y - 3, 2), CHROME, '#8c867a', 1.2, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.ellipse(x, FLOOR_Y - 3, 11 * s, 3 * s, 0, 0, Math.PI * 2);
  }, CHROME, '#8c867a', 1.2, LINE_BG);
  painted(ctx, (c) => rrect(c, x - 16 * s, y - 8 * s, 32 * s, 9 * s, 4 * s), '#c23d2f', '#7f2018', 1.4, LINE_BG);
  painted(ctx, (c) => {
    c.beginPath();
    c.ellipse(x, y - 8 * s, 16 * s, 4 * s, 0, 0, Math.PI * 2);
  }, '#d9584a', '#9c2a1f', 1.4, LINE_BG);
}

function jukebox(ctx: Ctx, rng: () => number): void {
  const x = 24;
  const w = 88;
  const top = 168;
  const glow = ctx.createRadialGradient(x + w / 2, top + 50, 10, x + w / 2, top + 50, 90);
  glow.addColorStop(0, 'rgba(255, 190, 90, 0.35)');
  glow.addColorStop(1, 'rgba(255, 190, 90, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 60, top - 50, w + 120, 200);
  const body = (c: Ctx): void => {
    c.beginPath();
    c.moveTo(x, FLOOR_Y);
    c.lineTo(x, top + 40);
    c.bezierCurveTo(x, top - 14, x + w, top - 14, x + w, top + 40);
    c.lineTo(x + w, FLOOR_Y);
    c.closePath();
  };
  painted(ctx, body, '#7b3c22', '#4a2010', 1.8, LINE_BG);
  const bands = ['#f2a33a', '#f6d35a', '#8cc66a'];
  bands.forEach((col, i) => {
    const inset = 6 + i * 7;
    ctx.beginPath();
    ctx.moveTo(x + inset, FLOOR_Y - 34);
    ctx.lineTo(x + inset, top + 40);
    ctx.bezierCurveTo(x + inset, top - 10 + inset * 1.1, x + w - inset, top - 10 + inset * 1.1, x + w - inset, top + 40);
    ctx.lineTo(x + w - inset, FLOOR_Y - 34);
    ctx.strokeStyle = col;
    ctx.lineWidth = 5;
    ctx.stroke();
  });
  painted(ctx, (c) => rrect(c, x + 26, top + 26, w - 52, 40, 4), '#f6e6b8', '#cdb27a', 1.2, LINE_BG);
  ctx.fillStyle = '#2e2622';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, top + 36 + i * 8, 13, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  painted(ctx, (c) => rrect(c, x + 22, top + 76, w - 44, 54, 4), '#5a2a16', '#2e140a', 1.2, LINE_BG);
  ctx.strokeStyle = '#c9a25a';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 24 + i * 7, top + 78);
    ctx.lineTo(x + 24 + i * 7 + 8, top + 128);
    ctx.moveTo(x + 24 + i * 7 + 8, top + 78);
    ctx.lineTo(x + 24 + i * 7, top + 128);
    ctx.stroke();
  }
  wash(ctx, rng, x, top, w, 150, '#ffcf7a', 6, 10, 24, 0.25);
}

/** Counter, stools and jukebox: canvas MID.h tall, drawn in world coordinates (placed at y = MID.y). */
export function drawMid(ctx: Ctx): void {
  const rng = seeded(1938);
  ctx.translate(0, -MID.y);
  jukebox(ctx, rng);
  const x0 = COUNTER.x0;
  const top = COUNTER.top;
  painted(ctx, (c) => rrect(c, x0, top + 6, ARENA.w - x0 + 10, FLOOR_Y - top - 6, 3), '#b8392d', '#7a2017', 1.8, LINE_BG);
  ctx.strokeStyle = rgba('#5e1810', 0.55);
  ctx.lineWidth = 1;
  for (let x = x0 + 14; x < ARENA.w; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, top + 18);
    ctx.lineTo(x, FLOOR_Y - 14);
    ctx.stroke();
  }
  vgrad(ctx, x0, top + 14, ARENA.w - x0, 4, [[0, '#f8f5ee'], [1, '#8c867a']]);
  vgrad(ctx, x0, FLOOR_Y - 12, ARENA.w - x0, 12, [[0, '#3a2a22'], [1, '#1f1510']]);
  painted(ctx, (c) => rrect(c, x0 - 4, top - 2, ARENA.w - x0 + 14, 10, 4), CHROME, '#8c867a', 1.6, LINE_BG);
  vgrad(ctx, x0, top - 1, ARENA.w - x0, 3, [[0, '#ffffff'], [1, 'rgba(255, 255, 255, 0)']]);
  painted(ctx, (c) => rrect(c, x0 + 12, top - 20, 18, 18, 2), CHROME, '#8c867a', 1.2, LINE_BG);
  painted(ctx, (c) => rrect(c, x0 + 15, top - 15, 12, 4, 1), '#fbf3dc', '#d8c7a0', 0);
  for (const [x, s] of [[360, 1], [430, 1]] as const) stool(ctx, x, 280, s);
  grain(ctx, rng, 0, MID.y, ARENA.w, MID.h, 900, '#3a2418', 0.2);
}

/** Dark foreground stool and a soda-fountain milkshake in the bottom-left corner (canvas NEAR.h, world coords). */
export function drawNear(ctx: Ctx): void {
  ctx.translate(0, -NEAR.y);
  const ink = '#24160f';
  const rim = 'rgba(255, 214, 150, 0.55)';
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.ellipse(18, 346, 44, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(10, 346, 16, 20);
  ctx.fillStyle = rgba('#c23d2f', 0.35);
  ctx.beginPath();
  ctx.ellipse(18, 343, 36, 6, 0, Math.PI, 0);
  ctx.fill();
  // the milkshake peeks up from below the frame: nothing in the foreground rises above the floor line
  ctx.translate(0, 34);
  const x = 92;
  const glass = (c: Ctx): void => {
    c.beginPath();
    c.ellipse(x, 360, 13, 3.5, 0, 0, Math.PI * 2);
    c.moveTo(x - 2.5, 358);
    c.lineTo(x - 2.5, 344);
    c.quadraticCurveTo(x - 13, 338, x - 14, 318);
    c.lineTo(x + 14, 318);
    c.quadraticCurveTo(x + 13, 338, x + 2.5, 344);
    c.lineTo(x + 2.5, 358);
    c.closePath();
  };
  glass(ctx);
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x - 5, 315, 8, 6, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 5, 314, 8, 7, 0, 0, Math.PI * 2);
  ctx.ellipse(x, 308, 7, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + 1, 300, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x + 7, 300);
  ctx.rotate(0.35);
  ctx.fillRect(-1.5, -16, 3, 22);
  ctx.restore();
  ctx.strokeStyle = rim;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x - 12, 322);
  ctx.quadraticCurveTo(x - 11, 336, x - 3, 342);
  ctx.stroke();
}
