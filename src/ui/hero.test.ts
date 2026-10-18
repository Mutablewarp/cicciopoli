import { describe, expect, it, vi } from 'vitest';
import { LEVEL_IDS } from '../contracts';
import { HULK } from '../art/keys';
import { renderPose } from '../art/hulk/body';
import { heroHtml, heroRasters } from './hero';
import heroSource from './hero.ts?raw';
import { HULK_HEAD_ROWS, hulkHeadSvg } from './icons';
import screensSource from './screens.ts?raw';

vi.mock('../art/hulk/body', async (importOriginal) => {
  const body = await importOriginal<typeof import('../art/hulk/body')>();
  return { ...body, renderPose: vi.fn(body.renderPose) };
});

describe('end-screen hero', () => {
  it('level 5 reserves the sprite box and shows the green head until the art is built', () => {
    for (const mood of ['win', 'over'] as const) {
      const html = heroHtml(5, mood);
      expect(html).toContain(`cc-hero--${mood}`);
      expect(html).toContain('cc-hero--sprite');
      expect(html).toContain('<svg');
    }
  });

  it('levels 1-4 keep the small head, no sprite box', () => {
    for (const level of LEVEL_IDS.filter((l) => l !== 5)) expect(heroHtml(level, 'win')).not.toContain('cc-hero--sprite');
  });

  it('the end screens no longer fetch the owner cut-out (it stays on the level 5 title card)', () => {
    expect(screensSource).not.toMatch(/cutout/i);
  });
});

describe('level 5 end-screen sprite art', () => {
  it('renders the three frames it shows (victory x2, hurt) and nothing else', async () => {
    vi.mocked(renderPose).mockClear();
    const art = await heroRasters();
    expect(art.win).toHaveLength(HULK.victory.length);
    expect(art.over).toHaveLength(1);
    expect(renderPose).toHaveBeenCalledTimes(HULK.victory.length + 1);
    for (const r of [...art.win, ...art.over]) {
      expect([r.w, r.h]).toEqual([HULK.frame, HULK.frame]);
      expect(r.px.some((c) => c !== null)).toBe(true);
    }
  });

  it('never rebuilds the whole hulk pack the game already built (83 ms on a desktop, more on a phone)', () => {
    expect(heroSource).not.toMatch(/buildHulkArt/);
  });
});

describe('level 5 head icon', () => {
  it('is a square grid with two separate round lenses and a quiff above them', () => {
    expect(new Set(HULK_HEAD_ROWS.map((r) => r.length))).toEqual(new Set([HULK_HEAD_ROWS.length]));
    const lensRow = HULK_HEAD_ROWS[9].slice(1, -1);
    expect(lensRow.match(/g+/g)).toHaveLength(2);
    expect(lensRow).toMatch(/gss+g/);
    expect(HULK_HEAD_ROWS[0].match(/k/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('draws rects', () => {
    expect(hulkHeadSvg()).toContain('<rect');
  });
});
