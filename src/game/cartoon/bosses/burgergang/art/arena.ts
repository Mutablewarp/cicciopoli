/**
 * Arena of the final boss: the Ciccio's rooftop at night over Palermo. Far: watercolour night sky, moon,
 * Monte Pellegrino, sea and the city domes. Mid: neighbouring roofs, water tank, chimneys, the rooftop billboard
 * with the shirt's own BURGER GANG lettering (cut from the shirt, neon glow, flickers, marquee bulbs), string
 * lights (twinkle). Floor: tiled roof deck + brick parapet (clear walk line at ARENA.floorY). Near: a Palermo cat
 * on the parapet. Every wide layer runs BLEED past the arena edges; no prop is cut by the frame.
 */
import type Phaser from 'phaser';
import { ARENA } from '../../../api';
import { INK, LINE, anim, image, inked, sheet, worldSprite } from '../../../draw/canvas';
import { COL, PRE } from '../config';
import { GANG_SIGN } from './atlas';
import { ellipse, smooth } from './parts';
import { BLEED, MOON, seeded, sky } from './sky';

const K = {
  sky: `${PRE}sky`,
  roofs: `${PRE}roofs`,
  neon: `${PRE}neon`,
  lights: `${PRE}lights`,
  floor: `${PRE}floor`,
  cat: `${PRE}cat`,
  cloud: `${PRE}cloud`,
} as const;
const NEON_ANIM = `${PRE}neon-a`;
const LIGHTS_ANIM = `${PRE}lights-a`;
const W = ARENA.w;
const H = ARENA.h;
const ROOFS_Y = 150;
/** the billboard (legs to the roof) and the shirt lettering inside it */
const NEON = { x: 196, y: 104, w: 280, h: 156, board: 116, letters: { y: 30, w: 186, h: 93 }, glow: 16, dim: 0.55 } as const;
const DECK_Y = 294;
/** the cat sits on the parapet, whole, inside the left edge */
const CAT = { x: 26, y: 336 } as const;
/** neon frame sequence: mostly lit, a couple of electric hiccups */
const FLICKER = [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0];

/** Neighbouring roofs (mid layer, y from ROOFS_Y): softer ink, darker, never flat-bright on top. */
function roofs(ctx: CanvasRenderingContext2D): void {
  const rnd = seeded(77);
  const soft = (fill: string): void => {
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = 'rgba(28,21,17,0.55)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
  };
  const y = (v: number): number => v - ROOFS_Y;
  // left: tiled roof slope + building
  ctx.beginPath();
  ctx.moveTo(-BLEED, y(248));
  ctx.lineTo(70, y(220));
  ctx.lineTo(150, y(250));
  ctx.lineTo(150, y(300));
  ctx.lineTo(-BLEED, y(300));
  ctx.closePath();
  soft('#6b3f43');
  ctx.strokeStyle = 'rgba(28,21,17,0.3)';
  for (let i = 1; i < 6; i++) {
    ctx.beginPath();
    ctx.moveTo(-BLEED, y(248 + i * 9));
    ctx.lineTo(150, y(250 + i * 9));
    ctx.stroke();
  }
  // water tank on stilts
  ctx.strokeStyle = 'rgba(28,21,17,0.8)';
  ctx.lineWidth = 2;
  for (const sx of [96, 132]) {
    ctx.beginPath();
    ctx.moveTo(sx, y(214));
    ctx.lineTo(sx + (sx < 110 ? -6 : 6), y(262));
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(88, y(172), 52, 44, 6);
  soft('#57617a');
  ctx.beginPath();
  ctx.moveTo(84, y(174));
  ctx.lineTo(114, y(158));
  ctx.lineTo(144, y(174));
  ctx.closePath();
  soft('#474f66');
  // right building block with lit windows (behind the boss)
  ctx.beginPath();
  ctx.rect(470, y(214), 180, 90);
  soft('#4d3b52');
  for (let wx = 0; wx < 6; wx++) {
    for (let wy = 0; wy < 2; wy++) {
      ctx.beginPath();
      ctx.rect(484 + wx * 26, y(226 + wy * 26), 10, 14);
      soft(rnd() < 0.55 ? '#f3c46a' : '#2f2540');
    }
  }
  // chimneys + TV antenna
  for (const [cx, ch] of [[214, 52], [400, 40], [610, 60]] as const) {
    ctx.beginPath();
    ctx.rect(cx - 10, y(300 - ch), 20, ch);
    soft('#8a4a38');
    ctx.beginPath();
    ctx.rect(cx - 13, y(300 - ch - 6), 26, 7);
    soft('#9a5844');
  }
  ctx.strokeStyle = 'rgba(28,21,17,0.75)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(330, y(296));
  ctx.lineTo(330, y(214));
  for (const [ay, aw] of [[222, 22], [234, 16], [246, 11]] as const) {
    ctx.moveTo(330 - aw, ay - ROOFS_Y);
    ctx.lineTo(330 + aw, ay - ROOFS_Y);
  }
  ctx.stroke();
  // the far edge of our own roof (soft, darker than the walk line)
  ctx.fillStyle = '#5a4552';
  ctx.fillRect(-BLEED, y(286), W + BLEED * 2, 30);
}

/**
 * Rooftop billboard: dark board on two legs, marquee bulbs round the edge (frame 1 swaps the lit ones), a neon
 * CICCIO'S and the shirt's own BURGER GANG lettering (gang.webp) glowing pink; frame 1 is the electric hiccup.
 */
function sign(ctx: CanvasRenderingContext2D, f: number, letters: CanvasImageSource): void {
  const lit = f === 0;
  const { w, board } = NEON;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  for (const lx of [44, w - 44]) {
    ctx.beginPath();
    ctx.moveTo(lx, board);
    ctx.lineTo(lx, NEON.h);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.roundRect(10, 6, w - 20, board - 6, 12);
  inked(ctx, '#211722', LINE * 1.2);
  const per = Math.round((w - 40) / 14);
  for (let i = 0; i <= per; i++) {
    for (const by of [12, board - 6]) {
      ellipse(ctx, 20 + i * ((w - 40) / per), by, 2, 2);
      inked(ctx, (i + f) % 2 === 0 ? '#ffe9a8' : '#6a5a4a', 0.8);
    }
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 13px "Arial Black", "Helvetica Neue", Arial, sans-serif';
  ctx.save();
  ctx.shadowColor = '#ffe2a0';
  ctx.shadowBlur = lit ? 10 : 2;
  ctx.fillStyle = lit ? '#ffe9b8' : '#8a7a5a';
  ctx.fillText("CICCIO'S", w / 2, 22);
  ctx.restore();
  const L = NEON.letters;
  ctx.save();
  ctx.globalAlpha = lit ? 1 : NEON.dim;
  ctx.shadowColor = COL.pink;
  ctx.shadowBlur = lit ? NEON.glow : 0;
  ctx.drawImage(letters, (w - L.w) / 2, L.y, L.w, L.h);
  ctx.restore();
}

/** Two sagging strings of bulbs across the top; frame 1 swaps the bright bulbs. */
function lights(ctx: CanvasRenderingContext2D, f: number): void {
  const colors = ['#ffd85a', '#ff6f6f', '#7fe08a', '#7fc8ff', '#ff9fd0'];
  const strings: [number, number, number, number, number][] = [[-BLEED, 2, 330, 10, 14], [330, 10, W + BLEED, 0, 16]];
  let n = 0;
  for (const [x0, y0, x1, y1, sag] of strings) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag * 2, x1, y1);
    ctx.stroke();
    for (let t = 0.04; t < 1; t += 0.075) {
      const x = (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * ((x0 + x1) / 2) + t * t * x1;
      const y = (1 - t) * (1 - t) * y0 + 2 * t * (1 - t) * ((y0 + y1) / 2 + sag * 2) + t * t * y1;
      const c = colors[n % colors.length] ?? '#ffd85a';
      const on = (n + f) % 2 === 0;
      if (on) {
        const g = ctx.createRadialGradient(x, y + 5, 1, x, y + 5, 10);
        g.addColorStop(0, `${c}aa`);
        g.addColorStop(1, `${c}00`);
        ctx.fillStyle = g;
        ctx.fillRect(x - 10, y - 5, 20, 20);
      }
      ellipse(ctx, x, y + 5, 2.6, 3.6);
      inked(ctx, on ? c : '#6a5a5a', 1);
      n++;
    }
  }
}

/** Roof deck (tiles in perspective) and the brick parapet face; the walk line is ARENA.floorY. */
function floor(ctx: CanvasRenderingContext2D): void {
  const top = 0;
  const walk = ARENA.floorY - DECK_Y;
  const g = ctx.createLinearGradient(0, top, 0, walk + 8);
  g.addColorStop(0, '#6c5257');
  g.addColorStop(1, '#a98370');
  ctx.fillStyle = g;
  ctx.fillRect(-BLEED, top, W + BLEED * 2, walk + 8);
  ctx.strokeStyle = 'rgba(40,24,22,0.35)';
  ctx.lineWidth = 1;
  for (let x = -BLEED - 22; x < W + BLEED + 22; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x + 10, top);
    ctx.lineTo(x - 4, walk + 8);
    ctx.stroke();
  }
  // stone cap: the clear walk line
  ctx.beginPath();
  ctx.rect(-BLEED, walk + 4, W + BLEED * 2, 8);
  inked(ctx, '#e9d2a8', LINE);
  ctx.beginPath();
  ctx.rect(-BLEED, walk + 12, W + BLEED * 2, H + BLEED - DECK_Y - walk - 10);
  const b = ctx.createLinearGradient(0, walk + 12, 0, H + BLEED - DECK_Y);
  b.addColorStop(0, '#b45a3c');
  b.addColorStop(1, '#5e2a22');
  inked(ctx, b, LINE);
  ctx.strokeStyle = 'rgba(28,21,17,0.55)';
  ctx.lineWidth = 1;
  for (let row = 0; row < 6; row++) {
    const yy = walk + 12 + row * 9;
    ctx.beginPath();
    ctx.moveTo(-BLEED, yy);
    ctx.lineTo(W + BLEED, yy);
    ctx.stroke();
    for (let x = (row % 2) * 12 - BLEED; x < W + BLEED; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, yy);
      ctx.lineTo(x, yy + 9);
      ctx.stroke();
    }
  }
}

function cat(ctx: CanvasRenderingContext2D): void {
  smooth(ctx, [[8, 44], [6, 26], [10, 14], [8, 4], [14, 9], [20, 9], [26, 4], [25, 15], [28, 28], [30, 44]]);
  inked(ctx, '#1f1820', LINE);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.moveTo(29, 42);
  ctx.quadraticCurveTo(40, 40, 36, 28);
  ctx.stroke();
  ctx.fillStyle = '#ffd85a';
  for (const ex of [14, 21]) {
    ellipse(ctx, ex, 15, 1.8, 2.2);
    ctx.fill();
  }
}

/** A layer drawn BLEED wider on both sides (and taller by `down` below), shifted so x = 0 stays the arena edge. */
function wide(draw: (ctx: CanvasRenderingContext2D) => void, top = 0): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    ctx.translate(BLEED, top);
    draw(ctx);
  };
}

export function loadArena(scene: Phaser.Scene, k: number): void {
  if (!scene.textures.exists(GANG_SIGN.key)) throw new Error('burger gang sign not loaded');
  const letters = scene.textures.get(GANG_SIGN.key).getSourceImage() as CanvasImageSource;
  image(scene, K.sky, W + BLEED * 2, H + BLEED * 2, k, wide(sky, BLEED));
  image(scene, K.roofs, W + BLEED * 2, ARENA.floorY - ROOFS_Y, k, wide(roofs));
  sheet(scene, K.neon, NEON.w, NEON.h, 2, k, (ctx, f) => sign(ctx, f, letters));
  anim(scene, NEON_ANIM, K.neon, FLICKER, 12);
  sheet(scene, K.lights, W + BLEED * 2, 70, 2, k, (ctx, f) => wide((c) => lights(c, f))(ctx));
  anim(scene, LIGHTS_ANIM, K.lights, 2, 1.6);
  image(scene, K.floor, W + BLEED * 2, H + BLEED - DECK_Y, k, wide(floor));
  image(scene, K.cat, 42, 46, k, cat);
  image(scene, K.cloud, 150, 40, k, (ctx) => {
    smooth(ctx, [[10, 30], [24, 16], [48, 12], [70, 4], [96, 10], [120, 8], [140, 24], [126, 34], [40, 36]]);
    ctx.fillStyle = 'rgba(160,140,200,0.55)';
    ctx.fill();
  });
}

export function buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
  const s = (x: number, y: number, key: string, depth: number): Phaser.GameObjects.Sprite => worldSprite(scene, x, y, key, k).setDepth(depth);
  const cloud = s(MOON.x - 140, MOON.y + 18, K.cloud, -49).setAlpha(0.8);
  const drift = scene.tweens.add({ targets: cloud, x: MOON.x + 180, duration: 46000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  cloud.once('destroy', () => drift.remove());
  const roofsTop = ROOFS_Y + (ARENA.floorY - ROOFS_Y) / 2;
  return [
    s(W / 2, H / 2, K.sky, -50),
    cloud,
    s(W / 2, roofsTop, K.roofs, -45),
    s(NEON.x, NEON.y, K.neon, -42).play(NEON_ANIM),
    s(W / 2, 35, K.lights, -40).play(LIGHTS_ANIM),
    s(W / 2, DECK_Y + (H + BLEED - DECK_Y) / 2, K.floor, -30),
    s(CAT.x, CAT.y, K.cat, 30),
  ];
}
