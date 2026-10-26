import { describe, expect, it } from 'vitest';
import { keyLegend, LEVEL_NAMES, LEVEL_TAGS } from '../screens';
import { keyGlyphs } from './icons';
import { MENU_URL } from './results';
import { LEGEND, POWER_NAMES, RULES, SWIPE_OPTIONS, comboLabel, countdownLabel, freshTone, isSecret, pinAt, points, timedPower } from './text';

const BANNED = /tesla|elon|spacex|starman|hulk|pac-?man|mondello/i;

describe('countdown', () => {
  it('shows the time left as m:ss, rounded up so 0:00 only at the very end', () => {
    expect(countdownLabel(90_000)).toBe('1:30');
    expect(countdownLabel(89_001)).toBe('1:30');
    expect(countdownLabel(9_200)).toBe('0:10');
    expect(countdownLabel(1)).toBe('0:01');
    expect(countdownLabel(0)).toBe('0:00');
    expect(countdownLabel(-500)).toBe('0:00');
  });
});

describe('combo badge', () => {
  it('hidden at x1 or less, Italian decimal comma above', () => {
    expect(comboLabel(undefined)).toBe(null);
    expect(comboLabel(1)).toBe(null);
    expect(comboLabel(1.25)).toBe('x1,25');
    expect(comboLabel(2.5)).toBe('x2,5');
    expect(comboLabel(3)).toBe('x3');
  });
});

describe('points', () => {
  it('print the Italian thousands dot, like the banners and the share text', () => {
    expect(points(999)).toBe('999');
    expect(points(10759)).toBe('10.759');
    expect(points(1234567)).toBe('1.234.567');
    expect(points(-1500)).toBe('-1.500');
    expect(points(2863.6)).toBe('2.864');
  });
});

describe('freshness meter', () => {
  it('green, then yellow, then red', () => {
    expect([freshTone(100), freshTone(60), freshTone(59), freshTone(30), freshTone(29), freshTone(0)]).toEqual([
      'good', 'good', 'warn', 'warn', 'bad', 'bad',
    ]);
  });
});

describe('delivery pins', () => {
  it('three orders sit near the due times (~25 / 53 / 80 s of 90), inside the bar', () => {
    const at = [0, 1, 2].map((i) => pinAt(i, 3));
    at.forEach((p, i) => expect(p).toBeCloseTo([25, 53, 80][i] / 90, 1));
    expect(Math.max(...at)).toBeLessThan(1);
  });
});

describe('power chips', () => {
  it('the time left belongs to the timed power, the shield only when alone', () => {
    expect(timedPower({ shield: true, radar: true })).toBe('radar');
    expect(timedPower({ shield: true })).toBe('shield');
    expect(timedPower({ jet: true, sprint: false })).toBe('jet');
    expect(timedPower({})).toBe(null);
  });
});

describe('achievements', () => {
  it('a locked secret is ???, unlocked it shows; regular ones always show', () => {
    const fly = { id: 'x', name: 'IL TRUCK VOLA!', desc: '', unlocked: false };
    expect(isSecret(fly)).toBe(true);
    expect(isSecret({ ...fly, unlocked: true })).toBe(false);
    expect(isSecret({ id: 'p', name: 'PRIMA CONSEGNA', desc: '', unlocked: false })).toBe(false);
    expect(isSecret({ ...{ id: 's', name: 'ALTRO', desc: '', unlocked: false }, secret: true } as typeof fly)).toBe(true);
  });
});

describe('level 6 copy', () => {
  it('names, tag, legend, rules and swipe labels never print a brand or Mondello', () => {
    const text = [
      LEVEL_NAMES[6],
      LEVEL_TAGS[6] ?? '',
      keyLegend(6).replace(/<[^>]+>/g, ' '),
      ...Object.values(POWER_NAMES),
      ...LEGEND.flatMap((l) => [l.name, l.text]),
      ...RULES.flatMap((r) => [r.title, r.text, r.side ?? '']),
      ...SWIPE_OPTIONS.map((o) => o.label),
    ];
    for (const t of text) expect(t).not.toMatch(BANNED);
    // the pixel font draws accented capitals as small letters: VELOCITA', not VELOCITÀ
    for (const t of text) expect(t).not.toMatch(/[ÀÈÉÌÒÙ]/);
    expect(LEVEL_NAMES[6]).toBe("CICCIO'S RUSH");
    expect(LEVEL_TAGS[6]).toBe('MISSIONE CONSEGNA A PALERMO');
  });

  it('the rules say that braking cools the order too (freshness drops while FRENA is held)', () => {
    expect(RULES.find((r) => r.title === 'FRESCHEZZA')?.text).toMatch(/frenate/i);
  });

  it('the legend lists the four menu powers and keeps the booster a secret', () => {
    expect(LEGEND.map((l) => l.icon)).toEqual(['shield', 'radar', 'sprint', 'grip', 'fries', 'secret']);
    expect(LEGEND.some((l) => l.name === POWER_NAMES.jet)).toBe(false);
  });

  it('the CORSIE rule draws its ▲ ▼ / ◀ ▶ as pixel glyphs a capital tall, named for screen readers', () => {
    const corsie = RULES.find((r) => r.title === 'CORSIE');
    const up = keyGlyphs(corsie?.text ?? '');
    const side = keyGlyphs(corsie?.side ?? '');
    expect(up).not.toMatch(/[▲▼◀▶]/);
    expect(side).not.toMatch(/[▲▼◀▶]/);
    expect(up.match(/aria-label="(\w+)"/g)).toEqual(['aria-label="sinistra"', 'aria-label="destra"']);
    expect(side).toContain('aria-label="su"');
    expect(side).toContain('aria-label="giù"');
    expect(side).toContain('viewBox="0 0 7 7"');
    expect(keyGlyphs('niente frecce')).toBe('niente frecce');
  });

  it('the swipe setting offers Alta / Media / Bassa / Off', () => {
    expect(SWIPE_OPTIONS.map((o) => [o.value, o.label])).toEqual([['high', 'ALTA'], ['mid', 'MEDIA'], ['low', 'BASSA'], [false, 'OFF']]);
  });

  it('the menu link points to the official site', () => {
    expect(MENU_URL).toBe('https://cicciosburger.it/');
  });
});
