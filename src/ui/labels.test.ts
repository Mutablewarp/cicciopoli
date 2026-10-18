import { describe, expect, it } from 'vitest';
import { LEVEL_IDS } from '../contracts';
import { LEVEL_HEROES, LEVEL_NAMES, keyLegend } from './screens';
import { actionSkin } from './skins';
import { levelThumb } from './thumbs';

const TRADEMARK = /hulk|pac-?man/i;

describe('weapon button labels', () => {
  it('levels 1-2 keep GOAT / THAI', () => {
    for (const level of [1, 2] as const) {
      expect(actionSkin(level, 'fire').label).toBe('GOAT');
      expect(actionSkin(level, 'club').label).toBe('THAI');
    }
  });

  it('level 5 reads SPACCA on the fire action and PUGNO on the club action', () => {
    expect(actionSkin(5, 'fire').label).toBe('SPACCA');
    expect(actionSkin(5, 'club').label).toBe('PUGNO');
    expect(actionSkin(5, 'fire').ring).not.toBe(actionSkin(1, 'fire').ring);
  });

  it('every skin draws an icon', () => {
    for (const level of LEVEL_IDS) for (const key of ['fire', 'club'] as const) expect(actionSkin(level, key).icon()).toContain('<rect');
  });
});

describe('level names', () => {
  it('level 5 is SPACCA TUTTO, hero CICCIO SPACCA!', () => {
    expect(LEVEL_NAMES[5]).toBe('SPACCA TUTTO');
    expect(LEVEL_HEROES[5]).toBe('CICCIO SPACCA!');
  });

  it('no visible text names a trademark', () => {
    const text = [
      ...Object.values(LEVEL_NAMES),
      ...Object.values(LEVEL_HEROES),
      ...LEVEL_IDS.flatMap((l) => (['fire', 'club'] as const).map((k) => actionSkin(l, k).label)),
      ...LEVEL_IDS.map((l) => keyLegend(l).replace(/<[^>]+>/g, ' ')),
      keyLegend().replace(/<[^>]+>/g, ' '),
    ];
    for (const t of text) expect(t).not.toMatch(TRADEMARK);
  });

  it('the level 5 legend lists PUGNO on K / C and SPACCA on J / X', () => {
    const legend = keyLegend(5).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(legend).toContain('K C pugno');
    expect(legend).toContain('J X spacca');
  });
});

describe('title thumbnails', () => {
  it('every level has one', () => {
    for (const level of LEVEL_IDS) expect(levelThumb(level)).toMatch(/^<svg /);
  });

  it('level 5 keeps a pixel stand-in under the cut-out image', () => {
    const svg = levelThumb(5);
    expect(svg).toContain('cc-thumb__fallback');
    expect(svg).toContain('cc-thumb__cutout');
  });

  it('level 4 shows the official logo, not a pixel face', () => {
    expect(levelThumb(4)).toContain('ciccios-logo.png');
  });
});
