/** Magenta comic starburst impact pop (no text): 5 frames of 64 x 48, centre (32, 24). */
import { rng } from '../../pixel';
import { Raster } from '../../ciccio/raster';
import { INK } from '../palette';
import { crumble, fillPoly, ringed, type Pt } from './poly';

export const BURST_W = 64;
export const BURST_H = 48;

const MAGENTA = { hi: '#ff6fb4', base: '#e8227e', sh: '#a80f5c' };
const CORE = '#fff0f6';

/** Spiky star: `spikes` outer points of radius R / inner points of radius r (jittered, deterministic). */
function star(cx: number, cy: number, R: number, ratio: number, spikes: number, seed: number, squash = 0.76): Pt[] {
  const rand = rng(seed);
  const pts: Pt[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const outer = i % 2 === 0;
    const rad = outer ? R * (0.85 + rand() * 0.3) : R * ratio * (0.85 + rand() * 0.3);
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * squash]);
  }
  return pts;
}

function body(R: number, hollow: number): Raster {
  const r = new Raster(BURST_W, BURST_H);
  const pts = star(32, 24, R, 0.52, 11, 7);
  fillPoly(r, pts, (x, y) => {
    const t = (x - 32) * -0.6 + (y - 24) * -0.8;
    return t > R * 0.28 ? MAGENTA.hi : t < -R * 0.3 ? MAGENTA.sh : MAGENTA.base;
  });
  fillPoly(r, star(32, 24, R * 0.5, 0.55, 11, 11), CORE);
  if (hollow > 0) {
    const cut = new Raster(BURST_W, BURST_H);
    fillPoly(cut, star(32, 24, R * hollow, 0.55, 11, 11), INK);
    for (let i = 0; i < cut.px.length; i++) if (cut.px[i] !== null) r.px[i] = null;
  }
  return r;
}

/** grow -> full pop -> hollow -> scattered tips */
export function burstFrames(): Raster[] {
  const specs: readonly { R: number; hollow: number; fade: number }[] = [
    { R: 10, hollow: 0, fade: 0 },
    { R: 20, hollow: 0, fade: 0 },
    { R: 30, hollow: 0, fade: 0 },
    { R: 31, hollow: 0.6, fade: 0.12 },
    { R: 32, hollow: 0.78, fade: 0.4 },
  ];
  return specs.map(({ R, hollow, fade }, i) => ringed(crumble(body(R, hollow), fade, 40 + i), INK));
}
