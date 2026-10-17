import { describe, expect, it } from 'vitest';
import { SwipeTracker, crossDir, swipeDir } from './swipe';

describe('swipeDir', () => {
  it('ignores travel shorter than 24 px on both axes', () => {
    expect(swipeDir(23, -23)).toBe(null);
    expect(swipeDir(0, 0)).toBe(null);
  });

  it('classifies by the dominant axis', () => {
    expect(swipeDir(24, 3)).toBe('right');
    expect(swipeDir(-30, 10)).toBe('left');
    expect(swipeDir(5, -24)).toBe('up');
    expect(swipeDir(-10, 40)).toBe('down');
    expect(swipeDir(30, 30)).toBe('down'); // exact diagonal: vertical wins
  });
});

describe('SwipeTracker', () => {
  it('emits once per new direction within one gesture and re-arms on a new gesture', () => {
    const t = new SwipeTracker();
    t.start(100, 100);
    expect(t.move(110, 102)).toBe(null);
    expect(t.move(126, 104)).toBe('right');
    expect(t.move(160, 104)).toBe(null); // still right: nothing new
    expect(t.move(162, 70)).toBe('up'); // the same finger turns
    t.start(0, 0);
    expect(t.move(0, -30)).toBe('up');
  });
});

describe('crossDir', () => {
  it('picks no arm on the hub, then the arm by dominant axis; sticks near the hub', () => {
    expect(crossDir(5, -6, null)).toBe(null);
    expect(crossDir(0, -40, null)).toBe('up');
    expect(crossDir(-40, 10, null)).toBe('left');
    expect(crossDir(3, 4, 'left')).toBe('left');
    expect(crossDir(30, 2, 'up')).toBe('right');
  });
});
