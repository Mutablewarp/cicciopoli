/**
 * Small textures the level 6 scene builds itself (the 'rush' pack covers everything else): the cross
 * street that marks a zone boundary, its zebra crossings, the portal signs over the road, the
 * finish line, the finale sky column and a 2x2 particle pixel. Same pixel rules as the art packs.
 */
import type Phaser from 'phaser';
import { ROAD_W } from '../../art/rush/keys';
import { FONT_H, drawText, textWidth } from '../../art/rush/font';
import { Raster, hash2, outlineRaster } from '../../art/hills/raster';
import { rectR } from '../../art/rampage/draw';

export const SCENE_TEX = {
  px: 'rush-scene-px',
  xing: 'rush-scene-xing',
  zebra: 'rush-scene-zebra',
  finish: 'rush-scene-finish',
  sky: 'rush-scene-sky',
  sign: (i: number): string => `rush-scene-sign-${i}`,
} as const;

/** Cross street band height (world px) and the portal sign size. */
export const XING_H = 40;
const SIGN_W = ROAD_W + 16;

/** Boundary signs: 1 = into ZONA STADIO, 2 = into Terrasini, 3 = the finish. */
export const BOUND_SIGNS: readonly { text: string; board: string; edge: string }[] = [
  { text: 'ZONA STADIO', board: '#2458b8', edge: '#f4f4f4' },
  { text: 'BENVENUTI A TERRASINI', board: '#7a4422', edge: '#f4e6c8' },
  { text: 'TRAGUARDO', board: '#c8202a', edge: '#f4f4f4' },
];

/** Sky of the finale, bottom to top: sunset over the sea up to black space. */
const SKY: readonly string[] = ['#ffb24a', '#f8843c', '#ec5c58', '#c8406e', '#8a3080', '#52286e', '#2c1c50', '#16123a', '#0a0a22', '#05050f'];
const SKY_BAND = 64;

const ASPHALT = '#34343c';
const ASPHALT_DARK = '#2a2a30';
const KERB = '#a6a6ae';
const KERB_DARK = '#6c6c76';
const PAINT = '#e8e8e2';
const POST = '#5c5c66';

function crossing(): Raster {
  const r = new Raster(32, XING_H);
  for (let y = 0; y < XING_H; y++) {
    for (let x = 0; x < 32; x++) r.set(x, y, hash2(x, y, 61) < 0.12 ? ASPHALT_DARK : ASPHALT);
  }
  rectR(r, 0, 0, 32, 2, KERB);
  rectR(r, 0, 2, 32, 1, KERB_DARK);
  rectR(r, 0, XING_H - 3, 32, 1, KERB_DARK);
  rectR(r, 0, XING_H - 2, 32, 2, KERB);
  rectR(r, 2, XING_H / 2 - 1, 14, 2, PAINT); // dashed centre line of the cross street
  return r;
}

/** Zebra crossings on the main road, both sides of the junction (transparent elsewhere). */
function zebra(): Raster {
  const r = new Raster(ROAD_W, XING_H);
  for (const y0 of [4, XING_H - 11]) {
    for (let x = 2; x < ROAD_W - 2; x++) if (x % 8 < 5) rectR(r, x, y0, 1, 7, PAINT);
  }
  return r;
}

function finish(): Raster {
  const r = new Raster(ROAD_W, 12);
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < ROAD_W; x++) r.set(x, y, (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? '#f4f4f4' : '#1a1a1e');
  }
  return r;
}

/** A portal over the road: two posts on the kerbs, a beam, the board with the place name. */
function sign(text: string, board: string, edge: string): Raster {
  const h = FONT_H + 10;
  const r = new Raster(SIGN_W, h + 4);
  rectR(r, 1, 2, 3, h + 1, POST);
  rectR(r, SIGN_W - 4, 2, 3, h + 1, POST);
  rectR(r, 1, 6, SIGN_W - 2, 2, POST);
  const w = textWidth(text) + 10;
  const x0 = Math.round((SIGN_W - w) / 2);
  rectR(r, x0 + 1, 2, w, h, '#16161a'); // drop shadow on the road
  rectR(r, x0, 1, w, h, edge);
  rectR(r, x0 + 1, 2, w - 2, h - 2, board);
  drawText(r, text, x0 + 5, 6, edge);
  outlineRaster(r, '#101014');
  return r;
}

function sky(): Raster {
  const h = SKY.length * SKY_BAND;
  const r = new Raster(4, h);
  for (let y = 0; y < h; y++) {
    const band = SKY.length - 1 - Math.floor(y / SKY_BAND);
    const inBand = y % SKY_BAND;
    for (let x = 0; x < 4; x++) {
      // dithered seam: the top rows of each band borrow the colour above
      const up = band + 1 < SKY.length && inBand < 6 && (x + y) % 2 === 0 && inBand < 6 - (x % 2) * 3;
      r.set(x, y, SKY[up ? band + 1 : band]);
    }
  }
  return r;
}

function px(): Raster {
  const r = new Raster(2, 2);
  rectR(r, 0, 0, 2, 2, '#ffffff');
  return r;
}

/** Registers the scene textures once (idempotent across restarts). */
export function ensureSceneArt(scene: Phaser.Scene): void {
  const add = (key: string, r: Raster): void => {
    if (!scene.textures.exists(key)) scene.textures.addCanvas(key, r.toCanvas());
  };
  add(SCENE_TEX.px, px());
  add(SCENE_TEX.xing, crossing());
  add(SCENE_TEX.zebra, zebra());
  add(SCENE_TEX.finish, finish());
  add(SCENE_TEX.sky, sky());
  BOUND_SIGNS.forEach((s, i) => add(SCENE_TEX.sign(i + 1), sign(s.text, s.board, s.edge)));
}

/** Height of the finale sky texture (world px). */
export const SKY_H = SKY.length * SKY_BAND;
