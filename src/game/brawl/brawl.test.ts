import { describe, expect, it } from 'vitest';
import { ENEMY, ENEMY_HP, FINALE, HULK, MOVE, type MoveParams } from '../../config/tuning';
import { createRun, nextLevel } from '../rules';
import { createMotor, NO_INPUT, stepPlatformer } from '../player/motor';
import { finaleSchedule } from './finale';
import { bossStuns, brickFrame, enemyHp, hitResult, inBlast, inLandingShock, punchBox, stackAbove } from './rules';
import { SlamMode, type SlamPhase } from './slam';

const DT = 1 / 60;

describe('hit points', () => {
  it('pickles and chilies die from 1 punch, the armour burger from 2, the brute from 3, the boss from 8', () => {
    const punches = (kind: string): number => {
      let hp = enemyHp(kind);
      let n = 0;
      while (hp > 0) {
        hp = hitResult(hp, 1).hp;
        n++;
      }
      return n;
    };
    expect(['pickle', 'chili', 'armor', 'brute', 'megaburger'].map(punches)).toEqual([1, 1, 2, 3, 8]);
  });

  it('a slam (2 damage) kills pickles, chilies and armour burgers outright and wounds the heavies', () => {
    const slam = HULK.slam.enemyDamage;
    expect(hitResult(ENEMY_HP.armor, slam).dead).toBe(true);
    expect(hitResult(ENEMY_HP.brute, slam)).toEqual({ hp: 1, dead: false });
    expect(hitResult(ENEMY_HP.megaburger, slam)).toEqual({ hp: 6, dead: false });
  });

  it('damage never takes hit points below 0 and an unlisted kind has 1', () => {
    expect(hitResult(1, 5)).toEqual({ hp: 0, dead: true });
    expect(enemyHp('unknown')).toBe(1);
  });
});

describe('bricks', () => {
  it('break in 3 punches or in a slam plus a punch, showing a worse crack each time', () => {
    const hits: number = HULK.brickHits;
    expect(hits).toBe(3);
    let hp = hits;
    const frames: number[] = [brickFrame(hp, 0)];
    hp = hitResult(hp, 1).hp;
    frames.push(brickFrame(hp, 1));
    hp = hitResult(hp, 1).hp;
    frames.push(brickFrame(hp, 1));
    expect(frames).toEqual([0, 1, 2]);
    expect(hitResult(hp, 1).dead).toBe(true);
    const afterSlam = hitResult(hits, HULK.slam.brickDamage);
    expect(afterSlam.dead).toBe(false);
    expect(brickFrame(afterSlam.hp, HULK.slam.brickDamage)).toBe(3);
    expect(hitResult(afterSlam.hp, 1).dead).toBe(true);
  });
});

describe('fist reach', () => {
  const src = { left: 100, right: 122, centerY: 183, facing: 1 as const };

  it('the punch reaches 30 px in front of the body and covers head and feet height', () => {
    const box = punchBox(src);
    expect(box.left).toBe(122);
    expect(box.right).toBe(122 + HULK.punch.reach);
    expect(box.top).toBe(183 - HULK.punch.vUp);
    expect(box.bottom).toBe(183 + HULK.punch.vDown);
    expect(punchBox({ ...src, facing: -1 }).right).toBe(100);
  });

  it('the slam shockwave reaches radius 48 sideways and the band just above the ground', () => {
    const near = { left: 150, right: 166, top: 192, bottom: 208 };
    expect(inBlast(110, 208, near)).toBe(true);
    expect(inBlast(110, 208, { ...near, left: 170, right: 186 })).toBe(false);
    expect(inBlast(110, 208, { ...near, top: 100, bottom: 116 })).toBe(false);
  });

  it('the landing shock only dazes things at the hero feet', () => {
    expect(inLandingShock(100, 208, { left: 110, right: 126, top: 184, bottom: 208 })).toBe(true);
    expect(inLandingShock(100, 208, { left: 200, right: 216, top: 184, bottom: 208 })).toBe(false);
    expect(inLandingShock(100, 208, { left: 110, right: 126, top: 100, bottom: 130 })).toBe(false);
  });
});

/** Runs the slam mode against flat ground at y = 0 (up is negative); returns the phases it went through. */
function slamRun(fromGround: boolean): { phases: SlamPhase[]; peak: number; ms: number; vx: number } {
  const s = createMotor();
  s.vx = 90;
  const mode = new SlamMode(fromGround);
  let y = fromGround ? 0 : -60;
  let peak = 0;
  const phases: SlamPhase[] = [mode.phase];
  let steps = 0;
  while (steps < 600 && mode.phase !== 'impact') {
    mode.step(s, NO_INPUT, y >= 0, DT);
    y = Math.min(0, y + s.vy * DT);
    peak = Math.min(peak, y);
    steps++;
    if (phases[phases.length - 1] !== mode.phase) phases.push(mode.phase);
  }
  return { phases, peak: -peak, ms: steps * DT * 1000, vx: s.vx };
}

describe('slam move', () => {
  it('on the ground: a hop, a beat of hang time, a dive, then the impact', () => {
    const r = slamRun(true);
    expect(r.phases).toEqual(['hop', 'hang', 'dive', 'impact']);
    expect(r.peak).toBeGreaterThan(40);
    expect(r.peak).toBeLessThan(64);
    expect(r.ms).toBeLessThan(700);
    expect(r.vx).toBe(0);
  });

  it('in the air: straight into the dive, no hop', () => {
    const r = slamRun(false);
    expect(r.phases).toEqual(['hang', 'dive', 'impact']);
    expect(r.peak).toBe(60); // never rises above where it started
    expect(r.ms).toBeLessThan(400);
  });
});

describe('goal cinematic schedule', () => {
  const beats = finaleSchedule(300);
  const at = (p: string): number => beats.find((b) => b.phase === p)?.at ?? -1;

  it('plays walk, grab, rip, throw, roar, pose then finishes, each phase exactly once and in order', () => {
    expect(beats.map((b) => b.phase)).toEqual(['walk', 'reach', 'grip', 'rip', 'wind', 'release', 'follow', 'roar', 'pose', 'done']);
    expect(beats[0].at).toBe(0);
    for (let i = 1; i < beats.length; i++) expect(beats[i].at).toBeGreaterThan(beats[i - 1].at);
  });

  it('the pole rips before the throw and the whole thing takes about 3 s', () => {
    expect(at('rip')).toBeLessThan(at('release'));
    expect(at('done')).toBeGreaterThan(2400);
    expect(at('done')).toBeLessThan(3400);
    expect(at('done') - at('roar')).toBe(FINALE.roarMs + FINALE.poseMs);
  });
});

describe('rage hero movement', () => {
  /** Full jump from flat ground at full speed: peak height (px) and horizontal distance (px). */
  function jump(p: MoveParams): { height: number; dx: number } {
    const s = createMotor();
    s.vx = p.runMax;
    let y = 0;
    let x = 0;
    let peak = 0;
    for (let i = 0; i < 400; i++) {
      stepPlatformer(s, { ...NO_INPUT, axis: 1, jumpPressed: i === 0, jumpHeld: true }, i === 0, DT, p);
      x += s.vx * DT;
      y = Math.min(0, y + s.vy * DT);
      peak = Math.min(peak, y);
      if (i > 2 && y >= 0) break;
    }
    return { height: -peak, dx: x };
  }

  it('runs slower, jumps higher and falls harder than Ciccio', () => {
    const ciccio = jump(MOVE);
    const hulk = jump(HULK.move);
    expect(HULK.move.runMax).toBeLessThan(MOVE.runMax);
    expect(hulk.height).toBeGreaterThan(ciccio.height + 15);
    expect(HULK.move.maxFall).toBeGreaterThan(MOVE.maxFall);
    // a full jump lands fast enough to shake the ground (the small shockwave)
    expect(Math.min(HULK.move.maxFall, Math.sqrt(2 * HULK.move.gravity * HULK.move.fallMul * hulk.height))).toBeGreaterThan(HULK.landing.minSpeed);
    // ... a small hop does not
    expect(HULK.slam.hopVy * Math.sqrt(HULK.move.fallMul)).toBeLessThan(HULK.landing.minSpeed);
  });

  it('level 5 leads to level 6 and starts like the others: 4 hearts, score 161', () => {
    expect(nextLevel(5)).toBe(6);
    const run = createRun(5);
    expect(run.hearts).toBe(4);
    expect(run.score).toBe(161);
  });
});

describe('mega burger stun', () => {
  const slam = HULK.slam;
  /** One slam cycle: the hop-and-dive (measured on the real slam mode) plus its cooldown. */
  const cycleMs = slamRun(true).ms + slam.cooldownMs;

  /**
   * A bot that slams as often as it may, from the first hit until the boss dies, in 10 ms steps.
   * `stuns` decides whether a slam staggers it; returns how long the boss was free to act.
   */
  function chainedSlams(stuns: (staggered: boolean, graceMs: number) => boolean): number {
    const grace = ENEMY.megaburger.stunGraceMs;
    let hp: number = ENEMY_HP.megaburger;
    let stagger = 0;
    let graceLeft = 0;
    let freeMs = 0;
    const every = Math.round(cycleMs / 10) * 10;
    for (let t = 0; t < 60000; t += 10) {
      if (t % every === 0) {
        hp = hitResult(hp, slam.enemyDamage).hp;
        if (hp <= 0) return freeMs;
        if (stuns(stagger > 0, graceLeft)) stagger = slam.stunMs;
      }
      if (stagger > 0) {
        stagger = Math.max(0, stagger - 10);
        if (stagger === 0) graceLeft = grace;
      } else {
        freeMs += 10;
        graceLeft = Math.max(0, graceLeft - 10);
      }
    }
    return freeMs;
  }

  it('only a slam-strength stun takes, never on top of a stagger or inside the grace after one', () => {
    expect(bossStuns(slam.stunMs, false, 0)).toBe(true);
    expect(bossStuns(HULK.hit.stunMs, false, 0)).toBe(false); // a punch
    expect(bossStuns(HULK.landing.stunMs, false, 0)).toBe(false); // a heavy landing
    expect(bossStuns(slam.stunMs, true, 0)).toBe(false);
    expect(bossStuns(slam.stunMs, false, 1)).toBe(false);
  });

  it('chained slams used to freeze it until it died; now it is free long enough to leap and smash', () => {
    const leap = ENEMY.megaburger.telegraphMs + (2000 * -ENEMY.megaburger.jumpVy) / MOVE.gravity;
    expect(chainedSlams(() => true)).toBe(0); // the old rule: every slam refreshed the stun
    expect(chainedSlams((staggered, graceMs) => bossStuns(slam.stunMs, staggered, graceMs))).toBeGreaterThan(leap);
  });
});

describe('brick stacks', () => {
  const cells = [{ col: 5, row: 12 }, { col: 5, row: 9 }, { col: 5, row: 8 }, { col: 5, row: 7 }, { col: 6, row: 8 }];

  it('lists what is piled on a cell, bottom to top, and stops at the first gap', () => {
    expect(stackAbove(cells, 5, 10)).toEqual([{ col: 5, row: 9 }, { col: 5, row: 8 }, { col: 5, row: 7 }]);
    expect(stackAbove(cells, 5, 12)).toEqual([]);
    expect(stackAbove(cells, 6, 9)).toEqual([{ col: 6, row: 8 }]);
  });
});
