import { describe, expect, it } from 'vitest';
import { HULK } from '../keys';
import { FRAME, renderPose } from './body';
import { auraFrames } from './fx/aura';
import { BURST_H, BURST_W, burstFrames } from './fx/burst';
import { DUST_H, DUST_MAX_H, DUST_W, dustFrames, rubbleChips, SHOCK_H, SHOCK_W, shockFrames } from './fx/ground';
import { TEXT_H, TEXT_W, spaccaText } from './fx/text';
import { BRIDGE, HEAD_H, HEAD_W, headRows, LENS_ROWS } from './head';
import { headIcon, portrait } from './icons';
import { POSES, RUN_FPS, RUN_SLIDE, RUN_SPEED } from './poses';
import { bounds, type Raster } from '../ciccio/raster';
import { legJoints } from './rig';

const frames = POSES.map(renderPose);

describe('hulk sheet', () => {
  it('has one pose per frame index in keys.ts', () => {
    expect(POSES.length).toBe(HULK.frameCount);
  });

  it('keeps the feet on row 63 and a one-pixel margin on the frame sides and top (nothing clipped)', () => {
    frames.forEach(({ raster }, i) => {
      const b = bounds(raster);
      expect(b, `frame ${i}`).not.toBeNull();
      if (!b) return;
      expect(b.x0, `frame ${i} left`).toBeGreaterThanOrEqual(1);
      expect(b.x1, `frame ${i} right`).toBeLessThanOrEqual(FRAME - 2);
      expect(b.y0, `frame ${i} top`).toBeGreaterThanOrEqual(1);
      expect(b.y1, `frame ${i} feet`).toBe(FRAME - 1);
    });
  });

  it('matches the idle size spec (~62 px of hero + outline, 44-52 px wide, body centred on x = 32)', () => {
    for (const i of HULK.idle) {
      const b = bounds(frames[i].raster);
      expect(b).not.toBeNull();
      if (!b) continue;
      expect(b.x1 - b.x0 + 1).toBeGreaterThanOrEqual(44);
      expect(b.x1 - b.x0 + 1).toBeLessThanOrEqual(52);
      expect(b.y1 - b.y0 + 1).toBeGreaterThanOrEqual(60);
      expect(b.y1 - b.y0 + 1).toBeLessThanOrEqual(63);
      expect(Math.abs((b.x0 + b.x1) / 2 - 32)).toBeLessThanOrEqual(3);
    }
  });

  it('stands upright: the head sits clearly above the chest in every frame but the crouches', () => {
    const crouched = new Set<number>([HULK.land, HULK.slam[0], HULK.slam[2], HULK.slam[3]]);
    frames.forEach(({ anchors }, i) => {
      if (crouched.has(i)) return;
      expect(anchors.chest.y - anchors.head.y, `frame ${i}`).toBeGreaterThanOrEqual(11);
    });
  });

  it('keeps the idle head still (at most 1 px of bobbing) and the idle proportions identical', () => {
    const ys = HULK.idle.map((i) => frames[i].anchors.head.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(1);
    const widths = HULK.idle.map((i) => {
      const b = bounds(frames[i].raster);
      return b ? b.x1 - b.x0 : 0;
    });
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(3);
  });

  it('shows a 3-4 row neck of about 12 px, then a trapezius slope of 4-6 px per row out to the shoulders', () => {
    const w = widths(frames[0].raster);
    const head = Math.max(...w.slice(2, 14));
    const chin = w.findIndex((v, y) => y > 14 && v <= 15);
    expect(chin, 'first neck row').toBeGreaterThan(14);
    const neck = w.slice(chin).findIndex((v) => v > 15);
    expect(neck, 'neck rows').toBeGreaterThanOrEqual(3);
    expect(neck, 'neck rows').toBeLessThanOrEqual(5);
    expect(Math.max(...w.slice(chin, chin + neck)), 'neck width').toBeLessThanOrEqual(15);
    expect(Math.min(...w.slice(chin, chin + neck)), 'neck width').toBeGreaterThanOrEqual(10);
    const shoulders = w.findIndex((v, y) => y > chin && v >= 42);
    expect(shoulders - (chin + neck), 'slope rows').toBeGreaterThanOrEqual(3);
    expect(shoulders - (chin + neck), 'slope rows').toBeLessThanOrEqual(5);
    for (let y = chin + neck; y < shoulders; y++) expect(w[y + 1] - w[y], `slope row ${y}`).toBeGreaterThanOrEqual(4);
    expect(Math.max(...w), 'shoulder width').toBeGreaterThanOrEqual(44);
    expect(head, 'head is wider than the neck').toBeGreaterThan(Math.max(...w.slice(chin, chin + neck)) + 4);
  });

  it('keeps 3+ neck rows in every raised-arm frame (arms out to the sides, not shrugged to the ears)', () => {
    for (const i of [HULK.jump, HULK.apex, HULK.slam[1], ...HULK.roar, ...HULK.victory]) {
      const { raster, anchors } = frames[i];
      // only the columns around the head count: a raised fist far to the side does not hide the neck
      const w = Array.from({ length: FRAME }, (_, y) => {
        const xs = Array.from({ length: 19 }, (_, k) => anchors.head.x - 9 + k).filter((x) => raster.get(x, y) !== null);
        return xs.length === 0 ? 0 : xs[xs.length - 1] - xs[0] + 1;
      });
      const chin = w.findIndex((v, y) => y > 14 && v <= 16);
      const rows = w.slice(chin).findIndex((v) => v > 16);
      expect(chin, `frame ${i} chin`).toBeGreaterThan(14);
      expect(rows, `frame ${i} neck rows`).toBeGreaterThanOrEqual(3);
    }
  });

  it('is a V: shoulders widest, the silhouette narrowing row by row, real air between each arm and the waist', () => {
    for (const i of HULK.idle) {
      const r = frames[i].raster;
      const w = widths(r);
      expect(Math.max(...w), `idle ${i} widest`).toBeLessThanOrEqual(52);
      expect(w.indexOf(Math.max(...w)), `idle ${i} widest row`).toBeLessThanOrEqual(33);
      expect(Math.max(...w.slice(29, 33)), `idle ${i} shoulders`).toBeGreaterThanOrEqual(48);
      expect(w[36], `idle ${i} row 36`).toBeLessThanOrEqual(w[31] + 1);
      expect(w[44], `idle ${i} row 44`).toBeLessThanOrEqual(w[31] - 6);
      expect(w[48], `idle ${i} row 48`).toBeLessThanOrEqual(w[31] - 11);
      expect(w[51], `idle ${i} legs`).toBeLessThanOrEqual(w[31] * 0.6);
      // background (not outline) between the arms and the waist: 2+ px on the far side, a sliver on the near one
      for (let y = 36; y <= 39; y++) expect(gaps(r, y)[0], `idle ${i} row ${y} far gap`).toBeGreaterThanOrEqual(2);
      expect(Math.max(...[34, 35, 36, 37, 38].map((y) => gaps(r, y)[1])), `idle ${i} near gap`).toBeGreaterThanOrEqual(1);
    }
  });

  it('wears baggy torn trousers: two leg tubes under a belt, a crotch notch, a ragged hem near the knee, long bare legs', () => {
    const r = frames[0].raster;
    const purple = (c: string): boolean => {
      const [cr, cg, cb] = [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16));
      return cb > cg + 12 && cr > cg + 6;
    };
    const rows = r.px.flatMap((c, i) => (c !== null && purple(c) ? [Math.floor(i / FRAME)] : []));
    expect(Math.min(...rows), 'waistband').toBeGreaterThanOrEqual(31);
    expect(Math.min(...rows), 'waistband').toBeLessThanOrEqual(34);
    expect(Math.max(...rows), 'hem').toBeGreaterThanOrEqual(46);
    expect(Math.max(...rows), 'hem').toBeLessThanOrEqual(54);
    // the crotch notch: the first row where the two legs part
    const crotch = Array.from({ length: 24 }, (_, k) => 36 + k).find((y) => [31, 32, 33, 34].some((x) => r.get(x, y) === null));
    expect(crotch, 'crotch row').toBeDefined();
    expect(crotch ?? 0, 'crotch row').toBeGreaterThanOrEqual(39);
    expect(crotch ?? 0, 'crotch row').toBeLessThanOrEqual(43);
    expect(63 - (crotch ?? 0), 'rows of leg under the crotch').toBeGreaterThanOrEqual(20);
    // two separate purple tubes at row 44, apart by the notch
    const runs: number[] = [];
    let prev = false;
    for (let x = 0; x < FRAME; x++) {
      const c = r.get(x, 44);
      const on = c !== null && purple(c);
      if (on && !prev) runs.push(x);
      prev = on;
    }
    expect(runs.length, 'trouser tubes at row 44').toBeGreaterThanOrEqual(2);
    // the hem is ragged: the lowest purple row differs a lot from column to column on each leg
    const hemRows = (x0: number, x1: number): Set<number> => {
      const out = new Set<number>();
      for (let x = x0; x <= x1; x++) {
        const ys = Array.from({ length: 24 }, (_, k) => 30 + k).filter((y) => { const c = r.get(x, y); return c !== null && purple(c); });
        if (ys.length > 0) out.add(Math.max(...ys));
      }
      return out;
    };
    expect(hemRows(20, 31).size, 'far leg hem').toBeGreaterThanOrEqual(4);
    expect(hemRows(36, 46).size, 'near leg hem').toBeGreaterThanOrEqual(3);
  });

  it('breathes: the idle frames differ in the head, chest and shoulders, not only in the fists', () => {
    const upper = (i: number): (string | null)[] => frames[i].raster.px.slice(0, 33 * FRAME);
    const diff = (a: number, b: number): number => upper(a).filter((c, k) => c !== upper(b)[k]).length;
    expect(diff(HULK.idle[0], HULK.idle[2])).toBeGreaterThanOrEqual(30);
  });

  it('keeps the head within 3 px of its idle height (and 3 px of its column in the crouches) in every grounded frame: no hunch', () => {
    const idle = frames[0].anchors.head;
    const airborne = new Set<number>([HULK.jump, HULK.apex, HULK.fall, ...HULK.slam.slice(1, 2), ...HULK.victory, ...HULK.roar]);
    frames.forEach(({ anchors }, i) => {
      if (airborne.has(i)) return;
      expect(anchors.head.y - idle.y, `frame ${i} drop`).toBeLessThanOrEqual(3);
    });
    for (const i of [HULK.land, HULK.slam[0], HULK.slam[2], HULK.slam[3]]) {
      expect(Math.abs(frames[i].anchors.head.x - idle.x), `crouch ${i} x`).toBeLessThanOrEqual(3);
    }
  });

  it('slides planted feet back RUN_SLIDE px per frame, which cancels the top run speed at the pack frame rate', () => {
    expect(RUN_FPS).toBeGreaterThanOrEqual(16);
    expect(RUN_FPS).toBeLessThanOrEqual(20);
    expect(RUN_FPS * RUN_SLIDE).toBeGreaterThanOrEqual(RUN_SPEED * 0.95);
    expect(RUN_FPS * RUN_SLIDE).toBeLessThanOrEqual(RUN_SPEED * 1.05);
    const run = HULK.run.map((i) => POSES[i]);
    // each leg is planted for 3 frames (heel strike, down, push-off): F in 0-2, B in 4-6
    for (const [side, first] of [['legF', 0], ['legB', 4]] as const) {
      const ankle = (k: number): readonly [number, number] => legJoints(run[k], run[k][side], side === 'legF').ankle;
      for (const k of [first, first + 1, first + 2]) expect(ankle(k)[1], `${side} ${k} on the floor`).toBeGreaterThan(55);
      for (const k of [first, first + 1]) expect(ankle(k + 1)[0] - ankle(k)[0], `${side} ${k}`).toBeCloseTo(-RUN_SLIDE, 1);
    }
  });

  it('plants a flat sole: 6+ px of floor contact in every run frame, and the same stride for both feet', () => {
    for (const i of HULK.run) {
      const { raster } = frames[i];
      let best = 0;
      let cur = 0;
      for (let x = 0; x < FRAME; x++) {
        cur = raster.get(x, FRAME - 1) !== null ? cur + 1 : 0;
        best = Math.max(best, cur);
      }
      expect(best, `frame ${i} sole`).toBeGreaterThanOrEqual(6);
    }
    const run = HULK.run.map((i) => POSES[i]);
    const contact = (k: number, side: 'legF' | 'legB'): number => legJoints(run[k], run[k][side], side === 'legF').ankle[0] - run[k].pelvis[0];
    expect(contact(0, 'legF')).toBeCloseTo(contact(4, 'legB'), 1);
  });

  it('keeps the run narrow and the head in the idle column (no pop), with a symmetric bob', () => {
    const idleX = frames[0].anchors.head.x;
    const ys = HULK.run.map((i) => frames[i].anchors.head.y);
    for (const i of HULK.run) {
      const b = bounds(frames[i].raster);
      expect(b ? b.x1 - b.x0 + 1 : 0, `frame ${i} width`).toBeLessThanOrEqual(46);
      expect(Math.abs(frames[i].anchors.head.x - idleX), `frame ${i} head x`).toBeLessThanOrEqual(1);
    }
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(4);
    for (let k = 0; k < 4; k++) expect(ys[k], `step ${k}`).toBe(ys[k + 4]);
  });

  it('puts every anchor inside the frame, the head anchor on the glasses and the fist on opaque pixels', () => {
    frames.forEach(({ raster, anchors }, i) => {
      for (const a of [anchors.hand, anchors.chest, anchors.back, anchors.head]) {
        expect(a.x >= 0 && a.y >= 0 && a.x < FRAME && a.y < FRAME, `frame ${i}`).toBe(true);
      }
      expect(raster.get(anchors.head.x, anchors.head.y), `frame ${i} lens`).not.toBeNull();
      expect(raster.get(anchors.hand.x, anchors.hand.y), `frame ${i} fist`).not.toBeNull();
    });
  });

  it('ties the head anchor to the head grid bridge', () => {
    expect(frames[0].anchors.head.x - BRIDGE.x).toBeGreaterThan(0);
  });

  it('extends the fist clearly in front of the chest on the punch strike', () => {
    const strike = frames[HULK.punch[1]].anchors;
    expect(strike.hand.x - strike.chest.x).toBeGreaterThanOrEqual(18);
    const windup = frames[HULK.punch[0]].anchors;
    expect(windup.hand.x).toBeLessThan(strike.hand.x - 12);
    expect(strike.hand.y, 'strike fist at chest height').toBeLessThanOrEqual(30);
    expect(strike.hand.y, 'strike fist at chest height').toBeGreaterThanOrEqual(25);
  });

  it('draws every face on the same grid and keeps the lenses identical in all of them', () => {
    const faces = ['grit', 'roar', 'hurt', 'joy'] as const;
    for (const f of faces) {
      const rows = headRows(f);
      expect(rows, f).toHaveLength(HEAD_H);
      rows.forEach((r) => expect(r, f).toHaveLength(HEAD_W));
    }
    const lens = (f: (typeof faces)[number]): string => headRows(f).slice(LENS_ROWS[0], LENS_ROWS[1] + 1).join('|');
    expect(new Set(faces.map(lens)).size).toBe(1);
    expect(new Set(faces.map((f) => headRows(f).join())).size).toBe(faces.length);
  });

  it('is deterministic', () => {
    const again = POSES.map(renderPose);
    again.forEach((f, i) => expect(f.raster.px).toEqual(frames[i].raster.px));
  });
});

/** Background pixels inside the silhouette of row y, left and right of the body centre (outline pixels are not background). */
function gaps(r: Raster, y: number): [number, number] {
  const xs = Array.from({ length: FRAME }, (_, x) => x).filter((x) => r.get(x, y) !== null);
  let left = 0;
  let right = 0;
  for (let x = xs[0] + 1; x < xs[xs.length - 1]; x++) {
    if (r.get(x, y) !== null) continue;
    if (x < 32) left++;
    else right++;
  }
  return [left, right];
}

function widths(r: Raster): number[] {
  return Array.from({ length: FRAME }, (_, y) => {
    let x0 = FRAME;
    let x1 = -1;
    for (let x = 0; x < FRAME; x++) {
      if (r.get(x, y) === null) continue;
      x0 = Math.min(x0, x);
      x1 = x;
    }
    return x1 < 0 ? 0 : x1 - x0 + 1;
  });
}

function opaque(r: Raster): number {
  return r.px.filter((c) => c !== null).length;
}

describe('hulk images and FX', () => {
  it('builds a 16x16 icon and a 64x64 portrait with transparent corners', () => {
    const icon = headIcon();
    const big = portrait();
    expect([icon.w, icon.h, big.w, big.h]).toEqual([16, 16, 64, 64]);
    expect(icon.get(0, 0)).toBeNull();
    expect(big.get(0, 0)).toBeNull();
    expect(bounds(big)?.y1).toBe(63);
  });

  it('builds every FX frame at its contract size and never leaves one empty', () => {
    const sets: [string, Raster[], number, number][] = [
      ['shock', shockFrames(), SHOCK_W, SHOCK_H],
      ['burst', burstFrames(), BURST_W, BURST_H],
      ['rubble', rubbleChips(), 8, 8],
      ['dust', dustFrames(), DUST_W, DUST_H],
      ['aura', auraFrames(), 64, 64],
    ];
    for (const [name, list, w, h] of sets) {
      list.forEach((r, i) => {
        expect([r.w, r.h], `${name} ${i}`).toEqual([w, h]);
        expect(opaque(r), `${name} ${i}`).toBeGreaterThan(0);
      });
    }
    expect(shockFrames()).toHaveLength(6);
    expect(burstFrames()).toHaveLength(5);
    expect(rubbleChips()).toHaveLength(6);
    expect(dustFrames()).toHaveLength(6);
    expect(auraFrames()).toHaveLength(4);
  });

  it('draws the aura sparks as dots and diamonds, never as plus signs', () => {
    for (const f of auraFrames()) {
      f.px.forEach((c, i) => {
        if (c === null) return;
        const [x, y] = [i % f.w, Math.floor(i / f.w)];
        const on = (dx: number, dy: number): boolean => f.get(x + dx, y + dy) !== null;
        const plus = on(1, 0) && on(-1, 0) && on(0, 1) && on(0, -1);
        const diagonals = on(1, 1) || on(-1, 1) || on(1, -1) || on(-1, -1);
        expect(plus && !diagonals, `aura pixel ${x},${y}`).toBe(false);
      });
    }
  });

  it('keeps the dust cloud low and solid: below the knees, no dithered fade, thinner at the end', () => {
    const heights = dustFrames().map((f, i) => {
      const b = bounds(f);
      expect(b, `dust ${i}`).not.toBeNull();
      f.px.forEach((c, k) => {
        if (c === null) return;
        const [x, y] = [k % f.w, Math.floor(k / f.w)];
        const joined = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => f.get(x + dx, y + dy) !== null);
        expect(joined, `dust ${i} stray pixel ${x},${y}`).toBe(true);
      });
      return b ? b.y1 - b.y0 + 1 : 0;
    });
    heights.forEach((h, i) => expect(h, `dust ${i} height`).toBeLessThanOrEqual(DUST_MAX_H));
    expect(heights[5]).toBeLessThan(Math.max(...heights));
  });

  it('draws the SPACCA! lettering on a 64x24 canvas inside its margins', () => {
    const t = spaccaText();
    expect([t.w, t.h]).toEqual([TEXT_W, TEXT_H]);
    const b = bounds(t);
    expect(b).not.toBeNull();
    if (!b) return;
    expect(b.x0).toBeGreaterThanOrEqual(0);
    expect(b.x1).toBeLessThanOrEqual(TEXT_W - 1);
    expect(b.x1 - b.x0).toBeGreaterThan(48);
  });
});
