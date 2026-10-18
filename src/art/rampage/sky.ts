/** Dusk sky gradient plus comic-book clouds and dark demolition smoke (seamless at 512 px). */
import { mix } from '../pixel';
import { Mask, paintMask, type Tone } from '../hills/mask';
import { Raster, outlineRaster, packColor } from '../hills/raster';
import { RC } from './colors';

export const LAYER_W = 512;

const SKY_STOPS: readonly { at: number; color: string }[] = [
  { at: 0, color: RC.skyTop },
  { at: 0.2, color: RC.skyA },
  { at: 0.42, color: RC.skyB },
  { at: 0.62, color: RC.skyC },
  { at: 0.78, color: RC.skyD },
  { at: 0.9, color: RC.skyE },
  { at: 1, color: RC.skyLow },
];

/** Smooth per-row gradient: the texture is stretched over the view, so no dither (it would streak). */
export function buildSky(): Raster {
  const r = new Raster(16, 512);
  for (let y = 0; y < r.h; y++) {
    const t = y / (r.h - 1);
    let k = 0;
    while (k < SKY_STOPS.length - 2 && t > SKY_STOPS[k + 1].at) k++;
    const a = SKY_STOPS[k];
    const b = SKY_STOPS[k + 1];
    const c = packColor(mix(a.color, b.color, Math.max(0, Math.min(1, (t - a.at) / (b.at - a.at)))));
    for (let x = 0; x < r.w; x++) r.set(x, y, c);
  }
  return r;
}

/** [dx, dy, radius] circles relative to the cloud anchor (centre of the flat underside). */
type Puffs = readonly (readonly [number, number, number])[];

const BIG_CLOUD: Puffs = [[-24, 0, 8], [-12, -5, 11], [2, -9, 14], [17, -4, 11], [28, 1, 8], [-4, 2, 9], [12, 2, 8]];
const MID_CLOUD: Puffs = [[-15, 0, 6], [-5, -4, 9], [7, -6, 10], [18, -1, 7], [2, 2, 6]];
const SMALL_CLOUD: Puffs = [[-9, 0, 5], [0, -4, 7], [10, -1, 6], [2, 2, 4]];
const SMOKE: Puffs = [[0, 0, 8], [-9, -3, 6], [8, -2, 7], [-2, -11, 9], [11, -13, 8], [3, -23, 11], [-8, -22, 7], [14, -27, 9], [8, -37, 12], [-3, -38, 8], [20, -42, 8], [13, -50, 10]];

const CLOUD_TONE: Tone = { light: RC.cloudLight, base: RC.cloud, shade: RC.cloudShade };
const SMOKE_TONE: Tone = { light: RC.smokeLight, base: RC.smoke, shade: RC.smokeShade };

function puffs(m: Mask, x: number, y: number, list: Puffs, id: number): void {
  for (const [dx, dy, rad] of list) m.ellipse(x + dx, y + dy, rad, rad, id);
}

function paint(r: Raster, m: Mask, id: number, tone: Tone, line: string): void {
  const layer = new Raster(r.w, r.h, true);
  paintMask(m, layer, { [id]: tone }, { shadeDepth: 3, lightDepth: 2 });
  outlineRaster(layer, line);
  r.blit(layer, 0, 0);
}

export function buildClouds(): Raster {
  const clouds = new Mask(LAYER_W, 128, true);
  puffs(clouds, 56, 52, BIG_CLOUD, 1);
  puffs(clouds, 172, 92, SMALL_CLOUD, 1);
  puffs(clouds, 276, 40, MID_CLOUD, 1);
  puffs(clouds, 366, 88, MID_CLOUD, 1);
  puffs(clouds, 452, 58, BIG_CLOUD, 1);
  const smoke = new Mask(LAYER_W, 128, true);
  puffs(smoke, 214, 120, SMOKE, 2);
  puffs(smoke, 488, 122, [[0, 0, 7], [-7, -2, 5], [7, -3, 5], [0, -11, 8], [9, -19, 8], [2, -27, 9], [10, -34, 7]], 2);
  const r = new Raster(LAYER_W, 128, true);
  paint(r, smoke, 2, SMOKE_TONE, RC.skyTop);
  paint(r, clouds, 1, CLOUD_TONE, RC.cloudLine);
  return r;
}
