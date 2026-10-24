import { describe, expect, it } from 'vitest';
import { LaneSwipe, SWIPE_PX, SwipeTracker, crossDir, swipeDir, swipeMin } from './swipe';

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

describe('swipe sensitivity', () => {
  it('high needs less travel than mid, mid less than low; off disables swipes', () => {
    expect(SWIPE_PX.high).toBeLessThan(SWIPE_PX.mid);
    expect(SWIPE_PX.mid).toBeLessThan(SWIPE_PX.low);
    expect(swipeMin('mid')).toBe(24); // the maze keeps its classic threshold
    expect(swipeMin(false)).toBe(null);
  });

  it('the same 20 px flick changes lane on high only', () => {
    for (const [s, lane] of [['high', 'right'], ['mid', null], ['low', null]] as const) {
      const t = new LaneSwipe(SWIPE_PX[s]);
      t.start(0, 0);
      expect(t.move(20, 2)).toBe(lane);
    }
  });
});

describe('LaneSwipe', () => {
  it('one gesture = one lane, however long or zig-zag it gets', () => {
    const t = new LaneSwipe(24);
    t.start(100, 300);
    expect(t.move(80, 300)).toBe(null);
    expect(t.move(70, 302)).toBe('left');
    expect(t.move(-200, 302)).toBe(null);
    expect(t.move(400, 302)).toBe(null);
    t.start(0, 0);
    expect(t.move(30, 0)).toBe('right');
  });

  it('vertical travel never steers, but the gesture can still turn sideways', () => {
    const t = new LaneSwipe(24);
    t.start(0, 0);
    expect(t.move(4, -60)).toBe(null);
    expect(t.move(-70, -60)).toBe('left');
  });
});
