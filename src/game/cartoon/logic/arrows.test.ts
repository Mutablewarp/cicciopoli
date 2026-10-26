import { describe, expect, it } from 'vitest';
import { edgeArrows, type RadarThing } from './arrows';

const view = { x: 100, y: 0, w: 300, h: 360 };
const thing = (x: number, y: number, vx: number, vy: number, kind: RadarThing['kind'] = 'hazard'): RadarThing => ({ box: { x: x - 5, y: y - 5, w: 10, h: 10 }, vx, vy, kind });

describe('edge arrows', () => {
  it('a hazard coming from the right: an arrow on the right edge at its height, pointing right', () => {
    const [a, ...rest] = edgeArrows(view, [thing(470, 200, -200, 0)], 10, 260, 5);
    expect(rest).toHaveLength(0);
    expect(a.x).toBeCloseTo(390);
    expect(a.y).toBeCloseTo(200);
    expect(a.angle).toBeCloseTo(0);
    expect(a.near).toBeGreaterThan(0.6);
  });

  it('nothing for things in view, flying away or too far; the boss always', () => {
    const things = [thing(200, 200, 300, 0), thing(30, 100, -300, 0), thing(900, 200, -100, 0), thing(560, 250, 0, 0, 'boss')];
    const arrows = edgeArrows(view, things, 10, 260, 5);
    expect(arrows.map((a) => a.kind)).toEqual(['boss']);
    expect(arrows[0].x).toBeCloseTo(390);
  });

  it('a sky drop above the view points up; the nearest first, at most max', () => {
    const things = [thing(250, -60, 0, 300, 'pink'), thing(60, 300, 120, 0), thing(480, 300, -10, 0), thing(250, -20, 0, 100)];
    const arrows = edgeArrows(view, things, 10, 260, 2);
    expect(arrows).toHaveLength(2);
    expect(arrows[0].y).toBeCloseTo(10);
    expect(arrows[0].angle).toBeCloseTo(-Math.PI / 2);
    expect(arrows[1].kind).toBe('hazard');
    expect(edgeArrows(view, things, 10, 260, 5).some((a) => a.kind === 'pink')).toBe(true);
  });
});
