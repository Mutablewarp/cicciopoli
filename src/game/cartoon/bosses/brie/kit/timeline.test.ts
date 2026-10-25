import { describe, expect, it } from 'vitest';
import { enterKo, enterPhase, newTimeline, pickAttack, stepTimeline, type AttackSpec, type StageEvent } from './timeline';
import { rng } from './paths';

type Id = 'a' | 'b' | 'c' | 'd';
const attacks: AttackSpec<Id>[] = [
  { id: 'a', telegraphMs: 600, activeMs: 1000, recoverMs: 500, phases: [0], weight: 1 },
  { id: 'b', telegraphMs: 700, activeMs: 900, recoverMs: 500, phases: [0], weight: 2 },
  { id: 'c', telegraphMs: 800, activeMs: 1200, recoverMs: 500, phases: [1], weight: 1 },
  { id: 'd', telegraphMs: 500, activeMs: 800, recoverMs: 500, phases: [1], weight: 1 },
];
const clock = { attacks, introMs: 1000, transformMs: 1500, openers: { 0: 'a' as Id } };

function run(ms: number, phaseAt?: number): StageEvent<Id>[] {
  let tl = newTimeline<Id>();
  const r = rng(7);
  const out: StageEvent<Id>[] = [];
  for (let t = 0; t < ms; t += 16) {
    if (phaseAt !== undefined && t === phaseAt) tl = enterPhase(tl, 1);
    const s = stepTimeline(tl, clock, 16, r);
    tl = s.tl;
    out.push(...s.events);
  }
  return out;
}

describe('BOSS-A attack timeline', () => {
  it('opens with the phase opener, then cycles telegraph → active → recover', () => {
    const ev = run(20_000);
    expect(ev[0]).toEqual({ stage: 'telegraph', attack: 'a' });
    for (let i = 0; i + 2 < ev.length; i += 3) {
      expect(ev[i]?.stage).toBe('telegraph');
      expect(ev[i + 1]?.stage).toBe('active');
      expect(ev[i + 2]?.stage).toBe('recover');
      expect(ev[i + 1]?.attack).toBe(ev[i]?.attack);
    }
  });

  it('never repeats an attack twice in a row and uses only the phase pool', () => {
    const tele = run(60_000).filter((e) => e.stage === 'telegraph');
    expect(tele.length).toBeGreaterThan(10);
    for (let i = 1; i < tele.length; i++) expect(tele[i]?.attack).not.toBe(tele[i - 1]?.attack);
    expect(new Set(tele.map((e) => e.attack))).toEqual(new Set(['a', 'b']));
  });

  it('a phase change plays the transformation, then picks from the new pool only', () => {
    const ev = run(30_000, 4000);
    const after = ev.slice(ev.findIndex((e) => e.stage === 'telegraph' && (e.attack === 'c' || e.attack === 'd')));
    expect(after.length).toBeGreaterThan(5);
    for (const e of after) expect(['c', 'd']).toContain(e.attack);
  });

  it('the wind-up of the first attack waits for the intro, the transform holds every attack', () => {
    let tl = newTimeline<Id>();
    tl = stepTimeline(tl, clock, 999, rng(1)).tl;
    expect(tl.stage).toBe('intro');
    tl = enterPhase(stepTimeline(tl, clock, 2, rng(1)).tl, 1);
    expect(tl.stage).toBe('transform');
    expect(stepTimeline(tl, clock, 1499, rng(1)).tl.stage).toBe('transform');
    expect(stepTimeline(tl, clock, 1501, rng(1)).tl.stage).toBe('telegraph');
  });

  it('knockout freezes the timeline for good', () => {
    const tl = enterKo(newTimeline<Id>());
    const s = stepTimeline(tl, clock, 100_000, rng(1));
    expect(s.tl.stage).toBe('ko');
    expect(s.events).toEqual([]);
    expect(enterPhase(s.tl, 1).stage).toBe('ko');
  });

  it('weighted pick respects the weights', () => {
    const r = rng(3);
    let b = 0;
    for (let i = 0; i < 3000; i++) if (pickAttack(attacks, 0, null, r()) === 'b') b++;
    expect(b / 3000).toBeGreaterThan(0.6);
    expect(b / 3000).toBeLessThan(0.73);
  });
});
