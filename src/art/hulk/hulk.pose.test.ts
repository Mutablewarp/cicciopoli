import { describe, expect, it } from 'vitest';
import { C } from '../ciccio/palette';
import { HULK } from '../keys';
import { renderPose } from './body';
import { headRows } from './head';
import { headIcon } from './icons';
import { NAIL } from './palette';
import { POSES } from './poses';

const frames = POSES.map(renderPose);
const anchors = (i: number) => frames[i].anchors;

describe('hulk faces', () => {
  it('shouts with a small mouth: 8 px wide at most, dark inside, 6 teeth at most, no streak from the lens to the mouth', () => {
    for (const face of ['roar', 'joy', 'hurt'] as const) {
      const rows = headRows(face);
      for (let y = 13; y <= 15; y++) {
        const width = [...rows[y].slice(6, 18)].filter((ch) => 'mtTu'.includes(ch)).length;
        expect(width, `${face} row ${y}`).toBeLessThanOrEqual(8);
      }
      const mouth = rows.slice(13, 16).join('');
      expect([...mouth].filter((ch) => ch === 'm').length, `${face} dark interior`).toBeGreaterThanOrEqual(8);
      expect([...mouth].filter((ch) => ch === 't' || ch === 'u').length, `${face} teeth`).toBeLessThanOrEqual(6);
      // nothing dark between the right lens (rows 7-11) and the mouth line
      expect(rows[12].includes('m'), `${face} streak under the lens`).toBe(false);
      expect(rows[13][16], `${face} mouth tail`).not.toBe('m');
    }
  });

  it('keeps two separate round lenses in the 16x16 icon, each with a glint, over a small mouth', () => {
    const icon = headIcon();
    const lensRuns = (y: number): number => {
      let runs = 0;
      let prev = false;
      for (let x = 0; x < icon.w; x++) {
        const on = icon.get(x, y) === C.lens || icon.get(x, y) === C.glint;
        if (on && !prev) runs++;
        prev = on;
      }
      return runs;
    };
    for (const y of [7, 8, 9]) expect(lensRuns(y), `icon row ${y}`).toBe(2);
    const glints = icon.px.filter((c) => c === C.glint).length;
    expect(glints).toBe(2);
    const mouth = icon.px.filter((c) => c === '#2a0c10').length;
    expect(mouth).toBeLessThanOrEqual(8);
  });
});

describe('hulk action poses', () => {
  it('raises both fists clearly above the head at the slam apex and plants them on the floor on impact', () => {
    const apex = anchors(HULK.slam[1]);
    expect(apex.hand.y, 'apex fist above the head').toBeLessThanOrEqual(apex.head.y - 6);
    const smash = anchors(HULK.slam[2]);
    const impact = anchors(HULK.slam[3]);
    expect(smash.hand.y, 'smash fist at hip height').toBeGreaterThanOrEqual(42);
    expect(smash.hand.y, 'smash fist at hip height').toBeLessThanOrEqual(54);
    expect(impact.hand.y, 'impact fist on the floor').toBeGreaterThanOrEqual(57);
    expect(impact.hand.x, 'impact fist in front').toBeGreaterThanOrEqual(40);
    expect(impact.hand.x, 'impact fist in front').toBeLessThanOrEqual(56);
    expect(impact.hand.y - smash.hand.y, 'the swing changes between frames').toBeGreaterThanOrEqual(6);
  });

  it('draws comic impact lines in the slam landing, and only there', () => {
    const rays = (i: number): number => frames[i].raster.px.filter((c) => c === NAIL).length;
    expect(rays(HULK.slam[3])).toBeGreaterThanOrEqual(8);
    for (const i of [...HULK.idle, ...HULK.run, ...HULK.slam.slice(0, 3)]) expect(rays(i), `frame ${i}`).toBeLessThan(8);
  });

  it('cocks the throwing fist back past the shoulder, opens a big hand at full reach, then swings the arm down away from the chest', () => {
    const [windup, release, follow] = HULK.throw.map(anchors);
    expect(windup.hand.x, 'windup fist behind the head').toBeLessThanOrEqual(windup.head.x - 10);
    expect(windup.hand.y, 'windup fist at head height').toBeLessThanOrEqual(windup.head.y + 10);
    expect(release.hand.x - release.chest.x, 'release reach').toBeGreaterThanOrEqual(20);
    expect(follow.hand.y - release.hand.y, 'follow-through swings down').toBeGreaterThanOrEqual(12);
  });

  it('leans back on a hit with the arms flung out', () => {
    const hurt = anchors(HULK.hurt);
    expect(hurt.head.x, 'head thrown back').toBeLessThan(anchors(0).head.x - 3);
    expect(hurt.hand.y, 'fist swung out, not flexed').toBeGreaterThanOrEqual(36);
  });

  it('jumps with one fist up and keeps the two-fist cheer for the victory', () => {
    expect(anchors(HULK.jump).hand.y, 'takeoff fist').toBeLessThanOrEqual(20);
    expect(anchors(HULK.apex).hand.y, 'apex fists stay low').toBeGreaterThanOrEqual(24);
  });
});
