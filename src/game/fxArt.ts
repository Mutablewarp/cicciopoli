/**
 * Tiny gameplay-only textures that belong to no themed pack: the light-blue flight trail,
 * lava bubbles and a round light used with ADD blending. Pixel art drawn with the
 * shared helpers, deterministic, registered once per session.
 */
import type Phaser from 'phaser';
import type { ArtPack } from '../contracts';
import { bayer, buildFrames, ctxOf, makeCanvas, PAL, paintGrid, px } from '../art/pixel';
import { registerArtPack } from '../art/register';

export const FX_ART = {
  /** sheet 6x6, frames 0-2: big puff, small puff, spark */
  trail: 'fx-trail',
  /** sheet 10x8, frames 0-4: dome swelling out of the lava, pop, droplets */
  bubble: 'fx-bubble',
  bubblePop: 'fx-bubble-pop',
  /** image 48x48, warm posterised halo (ADD blend) */
  glow: 'fx-glow',
  /** image 32x64, molten lava body under the surface strip (seamless horizontally) */
  lavaDeep: 'fx-lava-deep',
  /** sheet 26x14, frames 0-2: the boss's low ground shockwave, leading edge on the right */
  wave: 'fx-wave',
  waveLoop: 'fx-wave-loop',
} as const;

const TRAIL_PAL = { w: '#f4fcff', b: '#9edcfc', d: '#4aa8e8' };
const TRAIL: readonly (readonly string[])[] = [
  ['..dd..', '.dbbd.', 'dbwwbd', 'dbwwbd', '.dbbd.', '..dd..'],
  ['......', '..bb..', '.bwwb.', '.bwwb.', '..bb..', '......'],
  ['......', '......', '..wb..', '..bd..', '......', '......'],
];

const BUBBLE_PAL = { k: '#2a0806', o: PAL.lavaOrange, y: PAL.lavaYellow, h: PAL.lavaHot, r: PAL.lavaRed };
const BUBBLE: readonly (readonly string[])[] = [
  ['..........', '..........', '..........', '..........', '..........', '....kk....', '...kyhk...', '..kooyok..'],
  ['..........', '..........', '..........', '....kkk...', '...kooyk..', '..kooyhyk.', '..kooooyk.', '.krooooork'],
  ['..........', '...kkkk...', '..kooohk..', '.kooooyhk.', '.koooooyk.', '.kroooook.', '.krroooork', 'krrrooorrk'],
  ['...h..y...', '.y......h.', '..k....k..', '.k......k.', '..........', '..........', '..........', '..........'],
  ['..........', '.y......o.', '..........', '...o...y..', '..........', '..........', '..........', '..........'],
];

/** Posterised pixel light: concentric rings of rising opacity (reads as lighting, not as a shape). */
const GLOW_RINGS: readonly (readonly [number, string])[] = [
  [1, 'rgba(232,100,28,0.16)'],
  [0.78, 'rgba(240,120,36,0.26)'],
  [0.56, 'rgba(252,150,48,0.4)'],
  [0.34, 'rgba(252,200,110,0.6)'],
];

function buildGlow(): HTMLCanvasElement {
  const size = 48;
  const c = makeCanvas(size, size);
  const ctx = ctxOf(c);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      let color = '';
      for (const [edge, col] of GLOW_RINGS) if (d < edge) color = col;
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

const DEEP_TONES = ['#3c0806', '#5a0c06', PAL.lavaDeep, '#b01c0c', PAL.lavaRed] as const;
const TAU = Math.PI * 2;

/**
 * Deep lava (QA VIS-02): continues the strip's last row (lavaRed), darkens into a slow
 * molten body of dithered blobs crossed by dark wavy crust lines like the box art.
 * Every wave has whole periods over 32 px, so the image tiles horizontally.
 */
function buildLavaDeep(): HTMLCanvasElement {
  const W = 32;
  const H = 64;
  const c = makeCanvas(W, H);
  const ctx = ctxOf(c);
  for (let x = 0; x < W; x++) {
    const a = (x / W) * TAU;
    const crusts = [22 + Math.round(2.2 * Math.sin(a) + Math.sin(2 * a + 1)), 46 + Math.round(2 * Math.sin(2 * a + 2) + Math.sin(a + 0.5))];
    for (let y = 0; y < H; y++) {
      // 1 at the top (strip colour) easing to the dark body by row 14
      const top = Math.max(0, 1 - y / 14);
      const blob = 0.42 + 0.22 * Math.sin(2 * a + y * 0.21) * Math.cos(a - y * 0.13) + 0.12 * Math.sin(3 * a + y * 0.37);
      const v = top + (1 - top) * blob * 0.85;
      let tone: string = DEEP_TONES[Math.max(0, Math.min(4, Math.floor(v * 4 + bayer(x, y) - 0.25)))];
      for (const cy of crusts) {
        if (y === cy) tone = '#22060a';
        else if (y === cy - 1) tone = '#b01c0c'; // hot rim just above the crust
        else if (y === cy + 1) tone = '#3c0806';
      }
      px(ctx, x, y, tone);
    }
  }
  return c;
}

const WAVE_W = 26;
const WAVE_H = 14;
const WAVE_TONES = { ink: '#2a0830', white: '#fff4fc', magenta: '#e0309c', purple: '#8a1a78' };

/** Wedge of magenta shock with a white rim and ink outline; the three frames pulse its height. */
function buildWave(): HTMLCanvasElement {
  return buildFrames(3, WAVE_W, WAVE_H, (ctx, i) => {
    const edge = WAVE_W - 5;
    for (let x = 0; x <= edge; x++) {
      const h = Math.max(2, Math.round((WAVE_H - 1 + (i === 1 ? -1 : 0)) * Math.pow((x + 1) / (edge + 1), 1.3)));
      for (let y = 0; y < h; y++) {
        const top = WAVE_H - h;
        const row = top + y;
        let tone = y === 0 ? WAVE_TONES.ink : y === 1 ? WAVE_TONES.white : WAVE_TONES.magenta;
        if (y > 1 && (x + y + i) % 4 === 0 && row > WAVE_H - 5) tone = WAVE_TONES.purple;
        if (x === edge) tone = WAVE_TONES.ink;
        px(ctx, x, row, tone);
      }
      px(ctx, x, WAVE_H - 1, WAVE_TONES.ink);
    }
  });
}

function buildFxPack(): ArtPack {
  return {
    name: 'gameplay-fx',
    sheets: [
      { key: FX_ART.trail, canvas: buildFrames(TRAIL.length, 6, 6, (ctx, i) => paintGrid(ctx, TRAIL[i], TRAIL_PAL)), frameWidth: 6, frameHeight: 6 },
      { key: FX_ART.bubble, canvas: buildFrames(BUBBLE.length, 10, 8, (ctx, i) => paintGrid(ctx, BUBBLE[i], BUBBLE_PAL)), frameWidth: 10, frameHeight: 8 },
      { key: FX_ART.wave, canvas: buildWave(), frameWidth: WAVE_W, frameHeight: WAVE_H },
    ],
    images: [
      { key: FX_ART.glow, canvas: buildGlow() },
      { key: FX_ART.lavaDeep, canvas: buildLavaDeep() },
    ],
    tilesets: [],
    anims: [
      { key: FX_ART.bubblePop, sheet: FX_ART.bubble, frames: [0, 1, 2, 3, 4], frameRate: 9, repeat: 0 },
      { key: FX_ART.waveLoop, sheet: FX_ART.wave, frames: [0, 1, 2], frameRate: 14, repeat: -1 },
    ],
  };
}

/** Registers the gameplay fx textures (idempotent, ~1 ms the first time). */
export function ensureFxArt(scene: Phaser.Scene): void {
  if (scene.textures.exists(FX_ART.glow)) return;
  registerArtPack(scene, buildFxPack());
}

/** Additive pulsing light (torches, braziers, spirits, the hole). Caller owns the image. */
export function addGlow(
  scene: Phaser.Scene,
  x: number,
  y: number,
  o: { depth: number; scale?: number; alpha?: number; pulse?: number },
): Phaser.GameObjects.Image {
  const alpha = o.alpha ?? 0.8;
  const img = scene.add.image(Math.round(x), Math.round(y), FX_ART.glow).setDepth(o.depth).setScale(o.scale ?? 1).setAlpha(alpha);
  img.setBlendMode('ADD');
  if (o.pulse) {
    scene.tweens.add({ targets: img, alpha: alpha * (1 - o.pulse), duration: 420 + ((x * 7) % 260), yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
  return img;
}
