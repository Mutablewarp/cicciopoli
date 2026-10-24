import { describe, expect, it } from 'vitest';
import { RUSH_DELIVERY } from '../../config/rush';
import { computeFraming } from '../../game/rush/framing';
import { Raster, packColor } from '../hills/raster';
import { RUSH_ANIM_LIST, RUSH_IMAGES, RUSH_SHEETS } from './assets';
import { RU } from './colors';
import { PICKUP, RUSH, RUSH_ANIMS, RUSH_ZONES, TRUCK_FRAME, zoneKey } from './keys';
import { TERRASINI_DOOR_ROW } from './mare';
import { extraKey } from './scenery';
import { SIDE_L_H, STOREFRONT } from './street';
import { CLIMB_PITCH, climbLevel, pitchPoint, pitchRaster } from './truckFly';

/** [frame width, frame height, frame count] required by RUSH in keys.ts. */
const SHEET_SPEC: Readonly<Record<string, readonly [number, number, number]>> = {
  [RUSH.truck]: [40, 64, TRUCK_FRAME.count],
  [RUSH.truckFly]: [160, 96, 4],
  [RUSH.cars]: [24, 40, 6],
  [RUSH.suv]: [28, 48, 3],
  [RUSH.van]: [28, 56, 2],
  [RUSH.scooter]: [12, 24, 2],
  [RUSH.ape]: [20, 32, 2],
  [RUSH.blinker]: [24, 40, 2],
  [RUSH.puddle]: [32, 24, 2],
  [RUSH.pickups]: [20, 20, PICKUP.frames],
  [RUSH.shield]: [48, 72, 4],
  [RUSH.grip]: [40, 24, 4],
  [RUSH.popcorn]: [6, 6, 4],
  [RUSH.radar]: [40, 16, 2],
  [RUSH.flame]: [12, 24, 4],
  [RUSH.customer]: [16, 24, 8],
  [RUSH.zone]: [40, 64, 4],
  [RUSH.driverPortraits]: [32, 32, 3],
};

const IMAGE_SPEC: Readonly<Record<string, readonly [number, number]>> = {
  [RUSH.truckShadow]: [40, 24],
  [RUSH.truckSide]: [160, 80],
  [RUSH.truckOrbit]: [160, 96],
  [RUSH.space]: [256, 256],
  [RUSH.bus]: [32, 96],
  [RUSH.cone]: [12, 12],
  [RUSH.barrier]: [40, 16],
  [RUSH.works]: [40, 40],
  [RUSH.bag]: [12, 14],
  [RUSH.parachute]: [16, 14],
  [RUSH.speedLine]: [2, 24],
  ...Object.fromEntries(
    RUSH_ZONES.flatMap((z) => [
      [zoneKey(z, 'road'), [120, 128]],
      [zoneKey(z, 'sideL'), [128, z === 'stadio' ? 256 : SIDE_L_H]],
      [zoneKey(z, 'sideR'), [128, 256]],
      [zoneKey(z, 'fill'), [256, 256]],
      [extraKey(z, 'sideRPlain'), [128, 256]],
      [extraKey(z, 'fillR'), [256, 256]],
    ]),
  ),
};

/** keys.ts frame rates of RUSH_ANIMS. */
const FPS: Readonly<Record<string, number>> = {
  [RUSH_ANIMS.drive]: 10, [RUSH_ANIMS.fly]: 14, [RUSH_ANIMS.sideFly]: 12, [RUSH_ANIMS.scooter]: 6,
  [RUSH_ANIMS.ape]: 6, [RUSH_ANIMS.blink]: 3, [RUSH_ANIMS.puddle]: 3, [RUSH_ANIMS.shield]: 10,
  [RUSH_ANIMS.grip]: 12, [RUSH_ANIMS.radar]: 4, [RUSH_ANIMS.flame]: 16, [RUSH_ANIMS.zone]: 6,
  [RUSH_ANIMS.customerA]: 6, [RUSH_ANIMS.customerB]: 6,
};

const sheets = new Map(RUSH_SHEETS.map(([key, build]) => [key, build()]));
const images = new Map(RUSH_IMAGES.map(([key, build]) => [key, build()]));
const strips = RUSH_ZONES.flatMap((z) => [...(['road', 'sideL', 'sideR'] as const).map((p) => zoneKey(z, p)), extraKey(z, 'sideRPlain')]);

const opaqueCount = (r: Raster): number => r.px.reduce((n, c) => n + (c !== 0 ? 1 : 0), 0);
const rowDiff = (r: Raster, a: number, b: number): number => {
  let n = 0;
  for (let x = 0; x < r.w; x++) if (r.get(x, a) !== r.get(x, b)) n++;
  return n;
};
const rowDiff2 = (a: Raster, b: Raster, y: number): number => {
  let n = 0;
  for (let x = 0; x < a.w; x++) if (a.get(x, y) !== b.get(x, y)) n++;
  return n;
};
const colDiff = (r: Raster, a: number, b: number): number => {
  let n = 0;
  for (let y = 0; y < r.h; y++) if (r.get(a, y) !== r.get(b, y)) n++;
  return n;
};

describe('rush art pack (manifest in src/art/rush/keys.ts)', () => {
  it('produces every RUSH key and every zone key exactly once', () => {
    const wanted = [
      ...Object.values(RUSH),
      ...RUSH_ZONES.flatMap((z) => (['road', 'sideL', 'sideR', 'fill'] as const).map((p) => zoneKey(z, p))),
      ...RUSH_ZONES.flatMap((z) => (['sideRPlain', 'fillR'] as const).map((p) => extraKey(z, p))),
    ];
    const made = [...RUSH_SHEETS.map(([k]) => k), ...RUSH_IMAGES.map(([k]) => k)];
    expect(made.sort()).toEqual([...wanted].sort());
  });

  it('sheets have the contracted frame sizes and counts, and no frame is empty', () => {
    for (const [key, [w, h, n]] of Object.entries(SHEET_SPEC)) {
      const frames = sheets.get(key) ?? [];
      expect(frames, key).toHaveLength(n);
      frames.forEach((f, i) => {
        expect([f.w, f.h], key).toEqual([w, h]);
        expect(opaqueCount(f), `${key} #${i}`).toBeGreaterThan(4);
      });
    }
  });

  it('images have the contracted sizes', () => {
    for (const [key, [w, h]] of Object.entries(IMAGE_SPEC)) {
      const r = images.get(key);
      expect([r?.w, r?.h], key).toEqual([w, h]);
    }
  });

  it('every RUSH_ANIMS key loops over existing frames at the manifest frame rate', () => {
    expect(RUSH_ANIM_LIST.map(([k]) => k).sort()).toEqual(Object.values(RUSH_ANIMS).sort());
    for (const [key, sheet, frames, fps] of RUSH_ANIM_LIST) {
      const n = sheets.get(sheet)?.length ?? 0;
      expect(frames.length, key).toBeGreaterThan(0);
      for (const f of frames) expect(f, key).toBeLessThan(n);
      expect(fps, key).toBe(FPS[key]);
    }
  });

  it('road and side strips are opaque and seamless: the wrap seam is no harsher than the rows inside', () => {
    for (const key of strips) {
      const r = images.get(key) as Raster;
      expect(opaqueCount(r), key).toBe(r.w * r.h);
      let worst = 0;
      for (let y = 0; y + 1 < r.h; y++) worst = Math.max(worst, rowDiff(r, y, y + 1));
      // asphalt speckle is random per row, so allow a few px of noise on top of the worst inner row
      expect(rowDiff(r, r.h - 1, 0), key).toBeLessThanOrEqual(worst + Math.ceil(r.w * 0.05));
    }
  });

  it('fillers tile both ways', () => {
    for (const z of RUSH_ZONES.flatMap((zone) => [zoneKey(zone, 'fill'), extraKey(zone, 'fillR')])) {
      const r = images.get(z) as Raster;
      expect(opaqueCount(r), z).toBe(r.w * r.h);
      let worstRow = 0;
      let worstCol = 0;
      for (let i = 0; i + 1 < r.h; i++) worstRow = Math.max(worstRow, rowDiff(r, i, i + 1));
      for (let i = 0; i + 1 < r.w; i++) worstCol = Math.max(worstCol, colDiff(r, i, i + 1));
      expect(rowDiff(r, r.h - 1, 0), z).toBeLessThanOrEqual(worstRow);
      expect(colDiff(r, r.w - 1, 0), z).toBeLessThanOrEqual(worstCol);
    }
  });

  it('each left-strip landmark is drawn once per period, taller than any view plus the landmark', () => {
    // [zone, a colour only the landmark uses, its length in rows]: Politeama roof, tower top, pier
    const marks = [['centro', '#869aa2', 112], ['mare', '#d8c8a0', 22], ['mare', '#bcb8ae', 8]] as const;
    const views = [[390, 844, 3], [360, 640, 2], [375, 667, 2], [430, 932, 3], [768, 1024, 2], [844, 390, 3], [1280, 720, 1], [1920, 1080, 1], [2560, 1440, 1]];
    // the portrait controls take up to ~30 % of the height under the road: the view grows taller
    const tallest = Math.max(...views.flatMap(([cssW, cssH, dpr]) => [0, 0.3].map((k) => computeFraming({ cssW, cssH, dpr, insetTop: 0, insetBottom: cssH * k }).height)));
    for (const [z, colour, len] of marks) {
      const r = images.get(zoneKey(z, 'sideL')) as Raster;
      const rows: number[] = [];
      for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) if (r.get(x, y) === packColor(colour)) rows.push(y);
      expect(rows.length, `${z} ${colour}`).toBeGreaterThan(0);
      expect(Math.max(...rows) - Math.min(...rows), `${z} ${colour}`).toBeLessThan(len);
      expect(r.h - len, `${z} ${colour}`).toBeGreaterThan(tallest + 64);
    }
  });

  it('fillers are 4x4 grids of different 64 px blocks, and no right filler copies its left one', () => {
    const blocks = (r: Raster): string[] => {
      const out: string[] = [];
      for (let by = 0; by < r.h; by += 64) {
        for (let bx = 0; bx < r.w; bx += 64) {
          const rows: string[] = [];
          for (let y = by; y < by + 64; y++) rows.push(Array.from(r.px.subarray(y * r.w + bx, y * r.w + bx + 64)).join());
          out.push(rows.join('|'));
        }
      }
      return out;
    };
    for (const z of RUSH_ZONES) {
      const [l, rt] = [images.get(zoneKey(z, 'fill')) as Raster, images.get(extraKey(z, 'fillR')) as Raster];
      for (const r of [l, rt]) expect(new Set(blocks(r)).size, z).toBe(16);
      expect(Array.from(l.px).join() === Array.from(rt.px).join(), z).toBe(false);
    }
  });

  it('a plain right strip matches the strip with the shop everywhere but the storefront rows', () => {
    for (const z of RUSH_ZONES) {
      const shop = images.get(zoneKey(z, 'sideR')) as Raster;
      const plain = images.get(extraKey(z, 'sideRPlain')) as Raster;
      const { y, len } = STOREFRONT[z];
      let inside = 0;
      for (let row = 0; row < shop.h; row++) {
        const diff = rowDiff2(shop, plain, row);
        if (row >= y && row < y + len) inside += diff;
        else expect(diff, `${z} row ${row}`).toBe(0);
      }
      expect(inside, z).toBeGreaterThan(len * 20);
    }
  });

  it('the Terrasini customer waits at the lit door, clear of the blade sign', () => {
    expect(TERRASINI_DOOR_ROW).toBe(RUSH_DELIVERY.shop.doorRow);
    const shop = images.get(zoneKey('mare', 'sideR')) as Raster;
    const customer = TERRASINI_DOOR_ROW - 6; // sprite centre, 24 px tall (src/game/rush/entityView.ts)
    expect(shop.get(24, customer - 3)).toBe(packColor(RU.amberHot));
    const signRows: number[] = [];
    for (let row = 0; row < shop.h; row++) if (shop.get(5, row) === packColor(RU.vinyl)) signRows.push(row);
    expect(signRows.length).toBeGreaterThanOrEqual(28);
    for (const row of signRows) expect(Math.abs(row - customer), `sign row ${row}`).toBeGreaterThan(12);
  });

  it('lane dashes line up across the wrap of every road strip (32 px rhythm)', () => {
    for (const z of RUSH_ZONES) {
      const r = images.get(zoneKey(z, 'road')) as Raster;
      const lane = r.get(39, 0);
      for (let y = 0; y < r.h; y++) expect(r.get(39, y) === lane, `${z} y${y}`).toBe(y % 32 < 16);
    }
  });

  it('the truck roof carries the white script + burger and the booster frames add the side rockets', () => {
    const truck = sheets.get(RUSH.truck) ?? [];
    const vinyl = packColor(RU.vinyl);
    let script = 0;
    for (let y = 30; y < 42; y++) for (let x = 5; x < 35; x++) if (truck[0].get(x, y) === vinyl) script++;
    expect(script).toBeGreaterThan(90);
    for (const i of TRUCK_FRAME.fly) {
      let left = 0;
      for (let y = 20; y < 44; y++) for (let x = 0; x < 3; x++) if (truck[i].get(x, y) !== 0) left++;
      expect(left, `frame ${i}`).toBeGreaterThan(20);
    }
    expect(opaqueCount(truck[TRUCK_FRAME.driveA])).toBeGreaterThan(1800);
  });

  it('the climbing truck is pitched on the pixel grid: no pixel lost or doubled, pitchPoint agrees', () => {
    for (let i = 0; i < 4; i++) {
      const level = climbLevel(i);
      expect(opaqueCount(pitchRaster(level, CLIMB_PITCH)), `frame ${i}`).toBe(opaqueCount(level));
    }
    const dot = new Raster(160, 96);
    dot.set(150, 20, '#ffffff');
    const moved = pitchRaster(dot, CLIMB_PITCH);
    const [x, y] = pitchPoint(150, 20, CLIMB_PITCH, 160, 96);
    expect(moved.get(x, y)).toBe(packColor('#ffffff'));
    expect(y).toBeLessThan(20); // the nose goes up
  });

  it('the delivery zone glows: over a quarter of every frame is bright green', () => {
    const greens = new Set([RU.green, RU.greenLight, RU.white].map(packColor));
    for (const f of sheets.get(RUSH.zone) ?? []) {
      expect(f.px.reduce((n, c) => n + (greens.has(c) ? 1 : 0), 0)).toBeGreaterThan((f.w * f.h) / 4);
    }
  });

  it('Sicily sits just under the limb, inside the rows a wide screen keeps (y < 180)', () => {
    const space = images.get(RUSH.space) as Raster;
    let high = 0;
    let all = 0;
    for (let y = 140; y < space.h; y++) {
      for (let x = 96; x < 190; x++) {
        const c = space.get(x, y);
        const [r, g, b] = [(c >>> 16) & 255, (c >>> 8) & 255, c & 255];
        if (g <= r || g <= b) continue; // green land only (sea is blue, Africa is sand)
        all++;
        if (y < 180) high++;
      }
    }
    expect(all).toBeGreaterThan(600);
    expect(high / all).toBeGreaterThan(0.98);
  });

  it('is deterministic', () => {
    for (const [key, build] of RUSH_SHEETS) {
      build().forEach((f, i) => expect(Array.from(f.px), `${key} #${i}`).toEqual(Array.from((sheets.get(key) ?? [])[i].px)));
    }
    for (const [key, build] of RUSH_IMAGES) expect(Array.from(build().px), key).toEqual(Array.from((images.get(key) as Raster).px));
  });
});
