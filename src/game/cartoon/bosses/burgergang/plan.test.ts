/**
 * Fairness of the Burger Gang boss: every round telegraphs each shot >= 500 ms and a hero that only
 * runs and jumps (no dash, no parry, no shooting the gang, a slower run, lower jump and a fatter hit box
 * than the real one) can survive it from any start x. Exhaustive reachability over (x, jump phase).
 */
import { describe, expect, it } from 'vitest';
import { CT_PLAYER } from '../../../../config/cartoon';
import { ARENA } from '../../api';
import { ATLAS, PARTS } from './art/atlas';
import { BG, BOXES, MIN_TELEGRAPH_MS } from './config';
import { FIRST, ROUNDS, frontX, pickRound, planRound, type Round, type Shot, type Stage } from './plan';

const F = ARENA.floorY;
const DT = 40;
const HERO = { w: CT_PLAYER.hitW + 4, h: CT_PLAYER.hitH + 2, run: CT_PLAYER.runSpeed * 0.9, vy: CT_PLAYER.jumpVy * 0.95, g: CT_PLAYER.gravity };
/** feet height above the floor at each step of a full jump */
const ARC: number[] = [];
for (let t = DT; ; t += DT) {
  const s = t / 1000;
  const y = HERO.vy * s - (HERO.g * s * s) / 2;
  if (y <= 0) break;
  ARC.push(y);
}
const CELL = (HERO.run * DT) / 1000;

function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hits(s: Shot, t: number, x: number, feet: number): boolean {
  const p = s.path(t);
  const l = x - HERO.w / 2;
  const r = x + HERO.w / 2;
  const top = feet - HERO.h;
  if (s.r !== undefined) {
    const cx = Math.max(l, Math.min(r, p.x));
    const cy = Math.max(top, Math.min(feet, p.y));
    return (cx - p.x) ** 2 + (cy - p.y) ** 2 < s.r * s.r;
  }
  const hw = (s.w ?? 0) / 2;
  const hh = (s.h ?? 0) / 2;
  return p.x + hw > l && p.x - hw < r && p.y + hh > top && p.y - hh < feet;
}

/** Can a hero standing at startX when the round begins reach its end unhurt? */
function survives(round: Round, stage: Stage, startX: number): boolean {
  const minX = CT_PLAYER.minX;
  const maxX = frontX(stage) - HERO.w / 2;
  const nx = Math.floor((maxX - minX) / CELL) + 1;
  const states = nx * (ARC.length + 1);
  let cur = new Uint8Array(states);
  cur[Math.round((Math.min(startX, maxX) - minX) / CELL)] = 1;
  for (let t = 0; t < round.durationMs; t += DT) {
    const now = t + DT;
    const live = round.shots.filter((s) => now >= s.at && now < s.at + s.lifeMs);
    const memo = new Int8Array(states).fill(-1);
    const next = new Uint8Array(states);
    let any = false;
    for (let st = 0; st < states; st++) {
      if (!cur[st]) continue;
      const i = st % nx;
      const j = Math.floor(st / nx);
      const js = j === 0 ? [0, 1] : [j + 1 > ARC.length ? 0 : j + 1];
      for (const di of [-1, 0, 1]) {
        const ni = i + di;
        if (ni < 0 || ni >= nx) continue;
        for (const nj of js) {
          const ns = nj * nx + ni;
          if (next[ns]) continue;
          if (memo[ns] === -1) {
            const feet = F - (nj === 0 ? 0 : (ARC[nj - 1] ?? 0));
            memo[ns] = live.some((s) => hits(s, now - s.at, minX + ni * CELL, feet)) ? 1 : 0;
          }
          if (memo[ns] === 0) {
            next[ns] = 1;
            any = true;
          }
        }
      }
    }
    if (!any) return false;
    cur = next;
  }
  return true;
}

function stageOf(phase: number, playerX: number, seed: number): Stage {
  const giant = phase >= 2;
  return { bx: giant ? BG.giantBx : BG.bx, s: giant ? BG.giant : 1, playerX, rng: seeded(seed) };
}

const STARTS = [24, 130, 250, 360, 450, 520];
const SEEDS = [1, 7, 42];

describe('burger gang rounds', () => {
  ROUNDS.forEach((pool, phase) => {
    for (const kind of pool) {
      it(`phase ${phase + 1} · ${kind}: telegraphs >= ${MIN_TELEGRAPH_MS} ms and a warning is on screen`, () => {
        const r = planRound(kind, stageOf(phase, 200, 3));
        expect(r.shots.length).toBeGreaterThan(0);
        for (const s of r.shots) {
          expect(s.at - s.warnAt).toBeGreaterThanOrEqual(MIN_TELEGRAPH_MS);
          const shown = r.cues.some((c) => c.at === s.warnAt && c.flash) || r.marks.some((m) => m.at === s.warnAt);
          expect(shown).toBe(true);
        }
      });
      it(`phase ${phase + 1} · ${kind}: survivable by running and jumping from anywhere`, () => {
        for (const seed of SEEDS) {
          for (const x of STARTS) {
            const st = stageOf(phase, x, seed);
            expect(survives(planRound(kind, st), stageOf(phase, x, seed), x), `seed ${seed} start ${x}`).toBe(true);
          }
        }
      });
    }
  });

  it('every phase has 3-5 patterns, opens with its own round and offers a pink parry', () => {
    ROUNDS.forEach((pool, phase) => {
      expect(pool.length).toBeGreaterThanOrEqual(3);
      expect(pool.length).toBeLessThanOrEqual(5);
      expect(pool).toContain(FIRST[phase]);
      const pink = pool.some((k) => planRound(k, stageOf(phase, 200, 5)).shots.some((s) => s.pink));
      expect(pink).toBe(true);
    });
  });

  it('the checker rejects an unfair attack (a long low wall) and a standing target', () => {
    const wall: Round = {
      kind: 'fizz',
      cues: [],
      marks: [],
      shots: [{ at: 600, warnAt: 0, kind: 'wave', w: 1400, h: 30, lifeMs: 2000, path: () => ({ x: 320, y: F - 15 }) }],
      durationMs: 2600,
    };
    expect(survives(wall, stageOf(0, 200, 1), 200)).toBe(false);
    const fizz = planRound('fizz', stageOf(0, 200, 1));
    const standing = fizz.shots.some((s) => Array.from({ length: 200 }, (_, i) => i * 40).some((t) => t < s.lifeMs && hits(s, t, 200, F)));
    expect(standing).toBe(true);
  });

  it('never repeats a round twice in a row', () => {
    const rng = seeded(9);
    let last = pickRound(0, null, rng);
    for (let i = 0; i < 60; i++) {
      const k = pickRound(i % 3, last, rng);
      expect(k).not.toBe(last);
      last = k;
    }
  });

  it('a parried can never bursts: its burst depends on it', () => {
    const r = planRound('cans', stageOf(1, 200, 1));
    const bursts = r.shots.filter((s) => s.parent !== undefined);
    expect(bursts.length).toBe(9);
    for (const b of bursts) expect(r.shots[b.parent ?? -1]?.kind).toBe('can');
  });
});

describe('burger gang stance', () => {
  it('leaves no pocket behind the boss at any sway phase', () => {
    for (const [bx, s] of [[BG.bx, 1], [BG.giantBx, BG.giant]] as const) {
      const rightEdge = bx + (BOXES.back.x + BOXES.back.w) * s - BG.sway;
      expect(rightEdge).toBeGreaterThan(CT_PLAYER.maxX - CT_PLAYER.hitW / 2);
      // the touch boxes have no gap between the bun and the floor behind him
      expect(BOXES.back.x).toBeLessThanOrEqual(BOXES.body.x + BOXES.body.w);
    }
  });

  it('keeps the cup arm inside the arena', () => {
    for (const [bx, s] of [[BG.bx, 1], [BG.giantBx, BG.giant]] as const) {
      expect(bx + ((PARTS.armR.ox + (PARTS.armR.w / ATLAS.tex) - ATLAS.foot.x) * BG.wu) * s + BG.sway).toBeLessThanOrEqual(ARENA.w);
    }
  });
});
