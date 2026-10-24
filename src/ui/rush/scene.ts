/**
 * Level 6 pixel scenery for the DOM screens: Palermo at sunset (Monte Pellegrino, liberty palazzi with lit
 * windows, a church dome, palms) above a street. Used by the title card thumbnail (thumbs.ts) and the
 * stage of the pre-run panel (setup.ts). The real side-view truck (art pack, lazy) is laid over it; until
 * it loads, a pixel stand-in van is shown.
 */
import { PAL } from '../../art/pixel';
import { pixelSvg, seeded } from '../dom';
import { Grid } from '../grid';

const PALETTE = {
  P: '#2a1048', Q: '#4e1660', R: '#8a2268', S: '#d0405a', T: '#f07a3c', U: '#fcb048',
  s: '#ffe08a', z: '#fff6d0', m: '#5a2052', M: '#702a5c',
  d: '#2a0e2c', e: '#3c1838', L: '#fcc060', l: '#c8783c', p: '#1c0a1e',
  w: '#6a3e4a', K: '#c89a80', a: '#3a3242', D: PAL.cream,
};
const SKY = ['P', 'Q', 'R', 'S', 'T', 'U'];

/** Sky bands with a one-row checker dither between them, the sun low on the right, the mountain on the left. */
function sky(g: Grid, horizon: number): void {
  for (let y = 0; y < horizon; y++) {
    const t = (y / horizon) * SKY.length;
    const band = Math.floor(t);
    const mix = t - band > 0.8 && band < SKY.length - 1;
    for (let x = 0; x < g.w; x++) g.put(x, y, mix && (x + y) % 2 === 0 ? SKY[band + 1] : SKY[band]);
  }
  const sx = Math.round(g.w * 0.74);
  const r = Math.max(2, Math.round(horizon * 0.28));
  for (let y = horizon - r; y < horizon; y++) {
    for (let x = sx - r; x <= sx + r; x++) {
      const d = Math.hypot(x - sx, y - horizon + 0.5);
      if (d <= r) g.put(x, y, d < r * 0.55 ? 'z' : 's');
    }
  }
  // Monte Pellegrino: a long flat-topped headland, dark on the sunset
  const mw = Math.round(g.w * 0.46);
  const mh = Math.max(3, Math.round(horizon * 0.42));
  for (let x = 0; x < mw; x++) {
    const u = x / mw;
    const top = horizon - Math.round(mh * Math.min(1, Math.sin(Math.min(1, u * 1.6) * Math.PI * 0.5) * (1.15 - u * 0.9)));
    for (let y = top; y < horizon; y++) g.put(x, y, y === top ? 'M' : 'm');
  }
}

/** Liberty palazzi with balconies and lit windows, a church dome and palms, standing on the pavement row. */
function city(g: Grid, base: number, seed: number): void {
  const rnd = seeded(seed);
  let x = 0;
  while (x < g.w) {
    const w = 4 + Math.floor(rnd() * 4);
    const h = Math.max(3, Math.round(base * (0.22 + rnd() * 0.22)));
    const top = base - h;
    g.rect(x, top, w, h, 'd');
    g.rect(x, top, w, 1, 'e');
    for (let y = top + 2; y < base - 1; y += 2) {
      for (let i = x + 1; i < x + w - 1; i += 2) g.put(i, y, rnd() < 0.45 ? 'L' : 'l');
    }
    x += w + (rnd() < 0.3 ? 1 : 0);
  }
  const cx = Math.round(g.w * 0.42);
  const dh = Math.max(2, Math.round(base * 0.16));
  const top = base - Math.round(base * 0.5);
  g.stamp(cx - 1, top - dh - 1, ['.d.', 'ddd']);
  for (let j = 0; j < dh; j++) g.rect(cx - 1 - j, top - dh + j + 1, 3 + j * 2, 1, 'd');
  g.rect(cx - dh, top + 1, dh * 2 + 1, base - top - 1, 'd');
  for (const px of [Math.round(g.w * 0.08), Math.round(g.w * 0.62), Math.round(g.w * 0.93)]) palm(g, px, base);
}

function palm(g: Grid, x: number, base: number): void {
  const h = Math.max(4, Math.round(base * 0.45));
  for (let y = base - h; y < base; y++) g.put(x + (y < base - h / 2 ? 1 : 0), y, 'p');
  g.stamp(x - 2, base - h - 1, ['.ppp.p', 'pp.ppp', 'p..p.p']);
}

/** Pavement and kerb at `base`; asphalt with lane dashes below when the grid has room for it. */
function street(g: Grid, base: number): void {
  g.rect(0, base, g.w, 1, 'w');
  g.rect(0, base + 1, g.w, 1, 'K');
  if (g.h - base < 4) return;
  g.rect(0, base + 2, g.w, g.h - base - 2, 'a');
  for (let x = 1; x < g.w; x += 6) g.rect(x, g.h - 2, 3, 1, 'D');
}

/** 20x10 stand-in van, side view facing right: matte black box, red checkered band, cab window, two wheels. */
const VAN = [
  '.kkkkkkkkkkkkk......',
  'kBBBBBBBBBBBBBk.....',
  'kbbwwbwwwbbbbbkkkk..',
  'kbbbbbbbbbbbbbkcckk.',
  'krWrWrWrWrWrWrkccckk',
  'kWrWrWrWrWrWrWkbbbyk',
  'kbbbbbbbbbbbbbbbbbbk',
  'kbbkkkbbbbbbbbkkkbbk',
  'kkkgGgkkkkkkkkgGgkkk',
  '...kkk........kkk...',
];
const VAN_PAL = {
  k: '#0a0a0c', B: '#44444e', b: '#26262c', w: '#ffffff', r: '#e81c24', W: '#f4f0e8',
  c: '#8ad0f0', y: '#ffe080', g: '#6a6a72', G: '#b4b4bc',
};

export const vanSvg = (cls = ''): string => pixelSvg(VAN, VAN_PAL, cls);

/** Title card art (32x18): the van parked in front of the skyline; the real truck replaces it via `.has-truck`. */
export function rushThumb(): string {
  const g = new Grid('P');
  sky(g, 13);
  city(g, 13, 606);
  street(g, 13);
  const svg = g.svg(PALETTE);
  const van = vanSvg().replace('<svg class=""', '<svg class="cc-thumb__van" x="6" y="8" width="20" height="10"');
  const truck = '<image class="cc-thumb__truck" x="5" y="6.5" width="22" height="11" preserveAspectRatio="xMidYMax meet"/>';
  return svg.replace('</svg>', `${van}${truck}</svg>`);
}

/** Wide backdrop of the pre-run stage down to the kerb (the road below is CSS so its dashes can scroll). */
export function skylineSvg(): string {
  const g = new Grid('P', 96, 26);
  sky(g, 24);
  city(g, 24, 1961);
  street(g, 24);
  return g.svg(PALETTE).replace('xMidYMid slice', 'xMidYMax slice');
}
