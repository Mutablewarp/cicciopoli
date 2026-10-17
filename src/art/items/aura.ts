/**
 * Brie shield (48x48 x4): translucent creamy aura around a ciccio-sized character
 * (feet at y=47, centred on x=24). The centre stays fully transparent.
 */
import { Raster } from './raster';

const AURA = { ring: '#fffaf0', ringShade: '#ece0c4', paste: '#fce6a0', spark: '#ffffff', gold: '#fcd468' };
const CX = 24;
const CY = 27;
const RX = 18.5;
const RY = 21.5;
const N = 2.4;
const TAU = Math.PI * 2;

/** Normalised superellipse radius: 1 on the aura ring, 0 at the centre. */
function rho(x: number, y: number): number {
  return Math.pow(Math.pow(Math.abs(x - CX) / RX, N) + Math.pow(Math.abs(y - CY) / RY, N), 1 / N);
}

function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b) % TAU;
  return d > Math.PI ? TAU - d : d;
}

/** Tiny plus-shaped sparkle; size 0 = dot, 1 = plus, 2 = long plus. */
function sparkle(r: Raster, x: number, y: number, size: number): void {
  r.set(x, y, AURA.spark);
  if (size < 1) return;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) r.set(x + dx, y + dy, size > 1 ? AURA.spark : AURA.gold, 0.95);
  if (size < 2) return;
  for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]] as const) r.set(x + dx, y + dy, AURA.gold, 0.8);
}

function auraFrame(i: number): Raster {
  const r = new Raster(48, 48);
  const hot = i * (TAU / 4) - (3 * Math.PI) / 4; // highlight starts top-left, travels clockwise
  for (let y = 0; y < 48; y++) {
    for (let x = 0; x < 48; x++) {
      const p = rho(x + 0.5, y + 0.5);
      if (p > 1.07) continue;
      const near = angleDist(Math.atan2(y + 0.5 - CY, x + 0.5 - CX), hot) < 0.5;
      const lit = x - CX + (y - CY) < 0; // top-left half of the ring catches the light
      // white bloomy "rind" ring, then a band of creamy brie "paste" fading inwards
      if (p > 1) r.set(x, y, AURA.ring, near ? 0.5 : 0.22);
      else if (p > 0.93) r.set(x, y, near ? AURA.spark : lit ? AURA.ring : AURA.ringShade, near ? 1 : 0.85);
      else if (p > 0.87) r.set(x, y, AURA.paste, near ? 0.6 : 0.42);
      else if (p > 0.8) r.set(x, y, AURA.paste, near ? 0.32 : 0.2);
      else if (p > 0.72) r.set(x, y, AURA.paste, 0.09);
    }
  }
  // three sparkles riding the ring, staggered in size so they twinkle as they orbit
  for (let k = 0; k < 3; k++) {
    const a = hot + 0.9 + (k * TAU) / 3;
    const sx = Math.round(CX + Math.cos(a) * RX * 0.97);
    const sy = Math.round(CY + Math.sin(a) * RY * 0.97);
    if (sy < 46) sparkle(r, sx, sy, (i + k) % 3);
  }
  return r;
}

export function shieldFrames(): Raster[] {
  return [0, 1, 2, 3].map(auraFrame);
}
