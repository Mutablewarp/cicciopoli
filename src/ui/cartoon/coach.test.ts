import { describe, expect, it } from 'vitest';
import { COACH_TAGS, type CoachKey, CoachPlan } from './coach';

/** Every control the plan names from the start, one step after the other. */
function names(plan: CoachPlan): CoachKey[] {
  const out: CoachKey[] = [];
  for (let k = plan.next(null); k !== null; k = plan.next(k)) out.push(k);
  return out;
}

describe('first-fight coach plan', () => {
  it('names every control once, in reading order, then is done for good', () => {
    const plan = new CoachPlan(false);
    expect(names(plan)).toEqual(['move', 'up', 'jump', 'fire', 'dash', 'swap', 'super']);
    expect(plan.done).toBe(true);
    expect(plan.next(null)).toBeNull();
  });

  it('skips the controls already used', () => {
    const plan = new CoachPlan(false);
    plan.use('jump');
    plan.use('move');
    expect(names(plan)).toEqual(['up', 'fire', 'dash', 'swap', 'super']);
  });

  it('is done as soon as every control has been tried', () => {
    const plan = new CoachPlan(false);
    for (const k of ['move', 'up', 'jump', 'fire', 'dash', 'swap'] as const) plan.use(k);
    expect(plan.done).toBe(false);
    plan.use('super');
    expect(plan.done).toBe(true);
  });

  it('a device that has seen it never shows it again', () => {
    expect(new CoachPlan(true).next(null)).toBeNull();
  });

  it('every tag is a title line and a note line that fit the ~130 px tag beside the pad', () => {
    for (const [title, note] of Object.values(COACH_TAGS)) {
      expect(title.length).toBeGreaterThan(1);
      expect(title.length).toBeLessThanOrEqual(12);
      expect(note.length).toBeLessThanOrEqual(23);
    }
  });
});
