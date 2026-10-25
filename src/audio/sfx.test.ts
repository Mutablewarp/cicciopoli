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

/** Level 6 sounds: lane and combo fire every few seconds, so they must stay very short. */
const RUSH: Readonly<Record<string, readonly [number, number]>> = {
  lane: [0.15, 0.22],
  brake: [0.3, 0.4],
  crash: [0.5, 0.6],
  deliver: [0.8, 0.95],
  combo: [0.12, 0.2],
  expire: [0.25, 0.35],
  horn: [0.28, 0.36],
  jet: [0.85, 0.98],
  record: [0.8, 0.95],
};

/** Level 7 sounds: plop / sizzle / flip repeat every few seconds; golden is the ~3 s shift-end fanfare. */
const KITCHEN: Readonly<Record<string, readonly [number, number]>> = {
  sizzle: [0.65, 0.75],
  flip: [0.3, 0.38],
  fry: [0.85, 0.95],
  ding: [0.88, 1],
  burn: [0.48, 0.56],
  plop: [0.1, 0.16],
  squeeze: [0.3, 0.36],
  wrap: [0.44, 0.5],
  serve: [0.36, 0.42],
  cash: [0.75, 0.82],
  yum: [0.6, 0.68],
  grumble: [0.64, 0.72],
  doorbell: [0.9, 0.98],
  trash: [0.37, 0.43],
  golden: [2.9, 3.2],
};

/** Every sound ends inside one second, except the fanfares that close a level. */
const MAX_LEN: Partial<Record<SfxName, number>> = { golden: 3.2 };

describe('sfx recipes', () => {
  const names = Object.keys(SFX) as SfxName[];

  it.each(names)('%s schedules finite voices inside its length cap', (n) => {
    const { starts, stops } = record(n, 10);
    expect(starts.length).toBeGreaterThan(0);
    expect(stops).toHaveLength(starts.length);
    for (const s of starts) expect(s).toBeGreaterThanOrEqual(10);
    stops.forEach((s, i) => {
      expect(Number.isFinite(s)).toBe(true);
      expect(s).toBeGreaterThan(starts[i]);
      expect(s - 10).toBeLessThanOrEqual(MAX_LEN[n] ?? 1);
    });
  });

  it.each([
    ['level 5', RAMPAGE],
    ['level 6', RUSH],
    ['level 7', KITCHEN],
  ] as const)('has a recipe for every %s sound, layered and bounded in time', (_level, table) => {
    for (const [name, [min, max]] of Object.entries(table)) {
      expect(typeof SFX[name as SfxName], name).toBe('function');
      const { starts, stops } = record(name as SfxName, 5);
      expect(starts.length, name).toBeGreaterThanOrEqual(3);
      const len = Math.max(...stops) - 5;
      expect(len, name).toBeGreaterThanOrEqual(min);
      expect(len, name).toBeLessThanOrEqual(max);
    }
  });
});
