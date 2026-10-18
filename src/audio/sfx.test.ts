import { describe, expect, it } from 'vitest';
import type { SfxName } from '../contracts';
import { SFX } from './sfx';

/** Minimal WebAudio stand-in that records when every source starts and stops (no audio is rendered). */
function record(name: SfxName, t: number): { starts: number[]; stops: number[] } {
  const starts: number[] = [];
  const stops: number[] = [];
  const param = { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined, setTargetAtTime: () => undefined, setValueCurveAtTime: () => undefined };
  const node = (): object => ({
    frequency: param,
    detune: param,
    gain: param,
    Q: param,
    connect: <T>(dest: T): T => dest,
    disconnect: () => undefined,
    setPeriodicWave: () => undefined,
    start: (at: number) => starts.push(at),
    stop: (at: number) => stops.push(at),
  });
  const ctx = {
    sampleRate: 8000,
    createOscillator: node,
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createPeriodicWave: () => ({}),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
  } as unknown as BaseAudioContext;
  SFX[name]({ ctx, out: {} as AudioNode }, t, 1);
  return { starts, stops };
}

/** Level 5 sounds with their nominal length range in seconds (stops include a 20 ms safety tail). */
const RAMPAGE: Readonly<Record<string, readonly [number, number]>> = {
  punch: [0.15, 0.25],
  smash: [0.2, 0.27],
  slam: [0.4, 0.47],
  rubble: [0.25, 0.32],
  roar: [0.55, 0.63],
  rip: [0.4, 0.46],
};

describe('sfx recipes', () => {
  const names = Object.keys(SFX) as SfxName[];

  it.each(names)('%s schedules finite voices inside one second', (n) => {
    const { starts, stops } = record(n, 10);
    expect(starts.length).toBeGreaterThan(0);
    expect(stops).toHaveLength(starts.length);
    for (const s of starts) expect(s).toBeGreaterThanOrEqual(10);
    stops.forEach((s, i) => {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(starts[i]);
      expect(s - 10).toBeLessThanOrEqual(1);
    });
  });

  it('has a recipe for every level 5 sound, layered and bounded in time', () => {
    for (const [name, [min, max]] of Object.entries(RAMPAGE)) {
      expect(typeof SFX[name as SfxName], name).toBe('function');
      const { starts, stops } = record(name as SfxName, 5);
      expect(starts.length, name).toBeGreaterThanOrEqual(3);
      const len = Math.max(...stops) - 5;
      expect(len, name).toBeGreaterThanOrEqual(min);
      expect(len, name).toBeLessThanOrEqual(max);
    }
  });
});
