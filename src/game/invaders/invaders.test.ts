import { describe, expect, it } from 'vitest';
import { JET_FACE } from '../../art/space/jet';
import { TITLE_SIZE } from '../../art/space/title';
import { pickChain } from './chain';
import { CHAIN, FIELD, FORM, HITBOX, JET, SHIELDS, SHOT, SPAN, TRAY, UFO, WAVES } from './config';
import { extentOf, nextMarch, stepInterval, type March } from './formation';
import { computeFraming } from './framing';
import { bombRect, shotRect } from './projectiles';
import { ShieldMask } from './shieldMask';

const RULES = { stepX: 2, drop: 6, minX: 4, maxX: 220 };

describe('formation march', () => {
  const m: March = { ox: 40, oy: 50, dir: 1, frame: 0 };

  it('steps sideways and toggles the march frame', () => {
    const r = nextMarch(m, { left: 30, right: 150 }, RULES);
    expect(r.dropped).toBe(false);
    expect(r.march).toEqual({ ox: 42, oy: 50, dir: 1, frame: 1 });
  });

  it('drops a row and reverses at the right edge', () => {
    const r = nextMarch(m, { left: 100, right: 219 }, RULES);
    expect(r.dropped).toBe(true);
    expect(r.march).toEqual({ ox: 40, oy: 56, dir: -1, frame: 1 });
  });

  it('drops and reverses at the left edge', () => {
    const r = nextMarch({ ...m, dir: -1 }, { left: 5, right: 120 }, RULES);
    expect(r.dropped).toBe(true);
    expect(r.march.dir).toBe(1);
    expect(r.march.ox).toBe(40);
  });

  it('speeds up as the formation thins out', () => {
    expect(stepInterval(40, 40, 420, 70)).toBe(420);
    expect(stepInterval(20, 40, 420, 70)).toBeLessThan(420);
    expect(stepInterval(20, 40, 420, 70)).toBeGreaterThan(stepInterval(5, 40, 420, 70));
    expect(stepInterval(1, 40, 420, 70)).toBe(70);
  });

  it('measures the alive extent', () => {
    expect(extentOf([])).toBeNull();
    expect(extentOf([{ x: 50, halfW: 6 }, { x: 90, halfW: 7 }])).toEqual({ left: 44, right: 97 });
  });
});

describe('lightning chain', () => {
  const grid = [
    { id: 1, x: 100, y: 60 },
    { id: 2, x: 120, y: 60 },
    { id: 3, x: 100, y: 77 },
    { id: 4, x: 140, y: 60 },
    { id: 5, x: 30, y: 60 },
  ];

  it('strikes the lowest target above the jet first, then the nearest neighbours', () => {
    const order = pickChain(102, 240, grid, 3, 46);
    expect(order[0]).toBe(3);
    expect(order).toHaveLength(4);
    expect(new Set(order).size).toBe(4);
    expect(order).not.toContain(5);
  });

  it('stops chaining when nothing is within the radius', () => {
    expect(pickChain(30, 240, grid, 3, 15)).toEqual([5]);
  });

  it('returns nothing when no target is above the origin', () => {
    expect(pickChain(100, 50, grid, 3, 46)).toEqual([]);
  });
});

describe('shield mask', () => {
  const full = (): ShieldMask => new ShieldMask(10, 6, new Array(60).fill(255));

  it('finds the first solid pixel from the top or from the bottom', () => {
    const s = full();
    expect(s.hit(3, -2, 2, 4, true)).toEqual([3, 0]);
    expect(s.hit(3, 4, 2, 6, false)).toEqual([3, 5]);
    expect(s.hit(20, 0, 2, 2, true)).toBeNull();
  });

  it('erodes a ragged hole and reports every cleared pixel', () => {
    const s = full();
    const cleared = s.blast(5, 3, 2, () => 0.5);
    expect(cleared.length).toBeGreaterThan(8);
    expect(s.at(5, 3)).toBe(false);
    expect(s.at(0, 0)).toBe(true);
    expect(s.count()).toBe(60 - cleared.length);
    // a second blast on the same spot only clears what is left
    expect(s.blast(5, 3, 1, () => 0.5)).toHaveLength(0);
  });

  it('clears rectangles (invaders ploughing through)', () => {
    const s = full();
    expect(s.clearRect(-2, -2, 4, 4)).toHaveLength(4);
    expect(s.hit(0, 0, 2, 2, true)).toBeNull();
  });
});

describe('framing', () => {
  const toCss = (f: ReturnType<typeof computeFraming>, v: { cssH: number; dpr: number }, worldY: number): number =>
    ((worldY - f.centerY) * f.zoom + (v.cssH * v.dpr) / 2) / v.dpr;

  it('uses an integer zoom on a portrait phone when little is lost, and fits the field width', () => {
    const f = computeFraming({ cssW: 390, cssH: 520, dpr: 3, insetTop: 0, insetBottom: 0 });
    expect(FIELD.w * f.zoom).toBeLessThanOrEqual(390 * 3);
    expect(f.centerX).toBe(FIELD.w / 2);
    const tall = computeFraming({ cssW: 360, cssH: 640, dpr: 3, insetTop: 70, insetBottom: 170 });
    expect(Number.isInteger(tall.zoom)).toBe(true);
  });

  it('keeps the play band under the HUD and clear of the corner controls in landscape', () => {
    const v = { cssW: 844, cssH: 390, dpr: 3, insetTop: 52, insetBottom: 91 };
    const f = computeFraming(v);
    const fieldCssW = (FIELD.w * f.zoom) / v.dpr;
    expect(toCss(f, v, SPAN.top)).toBeGreaterThanOrEqual(52 - 0.5);
    expect(toCss(f, v, SPAN.bottom)).toBeLessThanOrEqual(390);
    // centred and at most half the width: the d-pad (left) and buttons (right) never cover it
    expect(fieldCssW).toBeLessThanOrEqual(844 / 2);
    expect(fieldCssW).toBeGreaterThan(240);
  });

  it('falls back to the bottom inset when the field would reach the corners', () => {
    const v = { cssW: 600, cssH: 520, dpr: 2, insetTop: 52, insetBottom: 120 };
    const f = computeFraming(v);
    expect(toCss(f, v, SPAN.bottom)).toBeLessThanOrEqual(520 - 120 + 0.5);
  });

  it('keeps whole zoom steps when the loss is small and zooms fractionally when it is not', () => {
    const big = computeFraming({ cssW: 1920, cssH: 1080, dpr: 1, insetTop: 64, insetBottom: 0 });
    expect(Number.isInteger(big.zoom)).toBe(true);
    // 1280x720 @1x: a whole zoom of 2 would waste a third of the height
    const small = computeFraming({ cssW: 1280, cssH: 720, dpr: 1, insetTop: 64, insetBottom: 0 });
    expect(small.zoom).toBeGreaterThan(2.5);
    expect((SPAN.bottom - SPAN.top) * small.zoom).toBeLessThanOrEqual(720 - 64 + 0.5);
  });

  it('never ends the field flush with the window bottom, whatever the zoom', () => {
    for (const [cssW, cssH] of [[1280, 720], [1920, 1080], [1024, 768], [1440, 900]]) {
      const v = { cssW, cssH, dpr: 1, insetTop: 64, insetBottom: 0 };
      expect(toCss(computeFraming(v), v, SPAN.bottom)).toBeLessThanOrEqual(cssH - 11);
    }
  });

  // The jet was 29 px wide and framed at 5.22 (portrait) / 3.62 (landscape) device px per world px
  // on a 390x844 / 844x390 DPR 3 phone: 50 and 35 CSS px. The zoom pass must give >= 1.5 x that.
  const JET_ART_W = 41;
  it('draws the jet at least 1.5x bigger on a 390x844 portrait phone', () => {
    const f = computeFraming({ cssW: 390, cssH: 844, dpr: 3, insetTop: 76, insetBottom: 249 });
    expect((JET_ART_W * f.zoom) / 3).toBeGreaterThanOrEqual(1.5 * 50.5);
  });

  it('draws the jet at least 1.5x bigger on an 844x390 landscape phone', () => {
    const f = computeFraming({ cssW: 844, cssH: 390, dpr: 3, insetTop: 52, insetBottom: 91 });
    expect((JET_ART_W * f.zoom) / 3).toBeGreaterThanOrEqual(1.5 * 35);
  });
});

describe('playfield layout', () => {
  const widest = Math.max(...Object.values(HITBOX).map(([w]) => w));

  it('fits the jet, the formation march, the shields and the tray inside the field', () => {
    expect(JET.minX - 41 / 2).toBeGreaterThanOrEqual(0);
    expect(JET.maxX + 41 / 2).toBeLessThanOrEqual(FIELD.w);
    expect(JET.y + 20).toBeLessThanOrEqual(TRAY.y - 8);
    const width = (FORM.cols - 1) * FORM.dx + widest;
    // at least 25 beats to cross before the formation drops a row
    expect((FORM.maxX - FORM.minX - width) / FORM.stepX).toBeGreaterThanOrEqual(25);
    expect(FORM.maxX).toBeLessThanOrEqual(FIELD.w);
    const xs = SHIELDS.xs;
    expect(xs[0] - 16).toBeGreaterThanOrEqual(0);
    expect(xs[xs.length - 1] + 16).toBeLessThanOrEqual(FIELD.w);
    // 20 px food icons: a slot is at least as wide as an icon (no pile-up) and the row stays inside the field
    expect(TRAY.step).toBeGreaterThanOrEqual(20);
    expect(TRAY.x0 - 10).toBeGreaterThanOrEqual(0);
    expect(TRAY.x0 + (TRAY.max - 1) * TRAY.step + 10).toBeLessThanOrEqual(FIELD.w);
  });

  it('shows the wordmark inside the field and keeps the hit box on the face logo of the jet', () => {
    expect(TITLE_SIZE.w).toBeLessThanOrEqual(FIELD.w - 8);
    // jet frame 43 x 40 drawn around its centre (21.5, 20)
    const left = 21.5 - JET.hitW / 2;
    const top = 20 + JET.hitDy - JET.hitH / 2;
    expect(left).toBeGreaterThanOrEqual(JET_FACE.x);
    expect(left + JET.hitW).toBeLessThanOrEqual(JET_FACE.x + JET_FACE.size);
    expect(top).toBeGreaterThanOrEqual(JET_FACE.y);
    expect(top + JET.hitH).toBeLessThanOrEqual(JET_FACE.y + JET_FACE.size);
  });

  it('stacks UFO, formation, shields and jet from the top without overlap', () => {
    const lastRow = Math.max(...WAVES.map((w) => w.top)) + (FORM.rows - 1) * FORM.dy + 8;
    expect(UFO.y + 10).toBeLessThan(WAVES[0].top - 8);
    expect(lastRow).toBeLessThan(SHIELDS.top);
    expect(SHIELDS.top + 20).toBeLessThan(JET.y + JET.noseY);
    expect(FORM.invadeY).toBeGreaterThan(SHIELDS.top + 20);
    expect(FORM.invadeY).toBeLessThanOrEqual(JET.y + JET.noseY + 4);
    expect(UFO.y - 10).toBeGreaterThanOrEqual(SPAN.top);
  });

  it('keeps the hit boxes inside the art and the catch box as wide as the wings', () => {
    expect(JET.hitW).toBeLessThanOrEqual(15);
    expect(JET.hitH).toBeLessThanOrEqual(JET.catchH);
    expect(JET.catchW).toBeLessThanOrEqual(41);
    expect(JET.catchW).toBeGreaterThanOrEqual(26);
    const shot = shotRect({ x: 100, y: 100 });
    expect(shot.w).toBeLessThanOrEqual(6);
    expect(shot.y + shot.h).toBeLessThanOrEqual(100 + 8); // inside the stick (top 11 rows of 16)
    const bomb = bombRect({ sprite: { x: 100, y: 100 } });
    expect(bomb.w).toBeLessThanOrEqual(6);
    expect(bomb.h).toBeLessThanOrEqual(8);
  });
});

/**
 * The zoom pass shrank the field (224x288 -> 200x246) and enlarged the art, so distances changed.
 * Every time below is checked against the value of the old tuning (numbers kept inline, from the
 * old config: jet 14..210 @118, shot @320 from y 237, bombs 62/72/80 from the bottom row, march
 * of 31 steps per sweep, drop 6 down to y 238) so the zoom does not change the difficulty.
 */
describe('wave balance', () => {
  const within = (value: number, ref: number, tol: number): void => {
    expect(Math.abs(value / ref - 1)).toBeLessThanOrEqual(tol);
  };
  const widest = Math.max(...Object.values(HITBOX).map(([w]) => w));
  const sweepSteps = (FORM.maxX - FORM.minX - ((FORM.cols - 1) * FORM.dx + widest)) / FORM.stepX;
  const bottomRow = (top: number): number => top + (FORM.rows - 1) * FORM.dy;

  it('crosses the field in about the same time', () => {
    within((JET.maxX - JET.minX) / JET.speed, (210 - 14) / 118, 0.15);
  });

  it('lets a provola stick reach the top row in the same time', () => {
    within((JET.y + JET.noseY - WAVES[0].top) / SHOT.speed, (237 - 56) / 320, 0.05);
  });

  it('gives bombs the same flight time from the bottom row to the jet in every wave', () => {
    const old = [(56 + 68 + 7), (62 + 68 + 7), (68 + 68 + 7)].map((y, i) => (247.5 - y) / [62, 72, 80][i]);
    WAVES.forEach((w, i) => {
      const jetTop = JET.y + JET.hitDy - JET.hitH / 2;
      within((jetTop - (bottomRow(w.top) + 8)) / w.bombSpeed, old[i], 0.05);
    });
  });

  it('gives the formation the same time to land (no kills) in every wave', () => {
    const oldSweep = (216 - (7 * 20 + 14)) / 2;
    const old = [56, 62, 68].map((top, i) => ((238 - (top + 68 + 8)) / 6) * oldSweep * [360, 300, 250][i]);
    WAVES.forEach((w, i) => {
      const drops = (FORM.invadeY - (bottomRow(w.top) + 8)) / FORM.drop;
      within(drops * sweepSteps * w.baseStepMs, old[i], 0.05);
    });
  });

  it('keeps the UFO pass the same length and the lightning on the same neighbours', () => {
    within((FIELD.w + 48) / UFO.speed, (224 + 48) / 44, 0.03);
    // old: dx 20 / dy 17 / radius 46 reached 2 columns, 2 rows and the (2,1) / (1,2) diagonals but not (2,2) / 3 columns
    const d = (c: number, r: number): number => Math.hypot(c * FORM.dx, r * FORM.dy);
    for (const [c, r] of [[2, 0], [0, 2], [2, 1], [1, 2]] as const) expect(d(c, r)).toBeLessThanOrEqual(CHAIN.radius);
    for (const [c, r] of [[2, 2], [3, 0], [0, 3]] as const) expect(d(c, r)).toBeGreaterThan(CHAIN.radius);
  });
});
