import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { FLOW } from '../config/tuning';
import { TILE } from '../art/keys';
import type { Fx } from './fx';
import { Goal } from './goal';
import type { ThemeConfig } from './themes';

const clock = { now: 0 };

/** Just enough scene for Goal's constructor: chainable sprites, one texture size, a clock. */
function fakeScene(): Phaser.Scene {
  const sprite = { setOrigin: () => sprite, setDepth: () => sprite };
  return {
    add: { image: () => sprite, sprite: () => sprite },
    textures: { get: () => ({ get: () => ({ width: 32, height: 64 }) }) },
    anims: { exists: () => false },
    time: clock,
  } as unknown as Phaser.Scene;
}

const theme = { hole: 'hole', flag: { key: 'flag', anim: 'wave', baseX: 8, baseY: 63 } } as unknown as ThemeConfig;
const cell = { col: 100, row: 12 };
const goal = (): Goal => new Goal(fakeScene(), theme, cell, {} as Fx);
const near = cell.col * TILE - (FLOW.goalBannerTiles - 2) * TILE;

describe('goal banner', () => {
  it('shows "VAI IN BUCA!" once, when the hero gets close', () => {
    clock.now = 0;
    const g = goal();
    expect(g.shouldAnnounce(near - 1000)).toBe(false);
    expect(g.shouldAnnounce(near)).toBe(true);
    expect(g.shouldAnnounce(near)).toBe(false);
  });

  it('stays quiet while a boss guards the goal', () => {
    clock.now = 0;
    const g = goal();
    g.gated = true;
    expect(g.shouldAnnounce(near)).toBe(false);
  });

  it('waits out the gate banner after the boss falls, then follows it (also for a hero already close)', () => {
    clock.now = 5000;
    const g = goal();
    g.gated = true;
    g.ungate(1800);
    expect(g.gated).toBe(false);
    expect(g.shouldAnnounce(near)).toBe(false);
    clock.now = 5000 + 1799;
    expect(g.shouldAnnounce(near)).toBe(false);
    clock.now = 5000 + 1800;
    expect(g.shouldAnnounce(near)).toBe(true);
    expect(g.shouldAnnounce(near)).toBe(false);
  });
});

describe('goal hole', () => {
  it('swallows a hero standing over it, but not while a boss still guards it', () => {
    const g = goal();
    const x = g.x;
    expect(g.swallows(x - 1, x, g.surfaceY, true)).toBe(true);
    g.gated = true;
    expect(g.swallows(x - 1, x, g.surfaceY, true)).toBe(false);
    expect(g.swallows(x - 30, x + 30, g.surfaceY - 20, false)).toBe(false); // nor a jump across the flag
  });
});
