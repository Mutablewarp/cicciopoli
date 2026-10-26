import { describe, expect, it } from 'vitest';
import { RUSH_SFX, type RushSfx } from './sfx-rush';
import { hz } from './theory';

interface Played {
  starts: number[];
  stops: number[];
  /** start frequency of every oscillator, in creation order */
  freqs: number[];
}

/** Minimal WebAudio stand-in recording source starts / stops and oscillator pitches (no audio is rendered). */
function play(name: RushSfx, t: number): Played {
  const out: Played = { starts: [], stops: [], freqs: [] };
  const param = { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined, setTargetAtTime: () => undefined, setValueCurveAtTime: () => undefined };
  const node = (): object => ({
    frequency: param,
    detune: param,
    gain: param,
    Q: param,
    connect: <T>(dest: T): T => dest,
    disconnect: () => undefined,
    setPeriodicWave: () => undefined,
    start: (at: number) => out.starts.push(at),
    stop: (at: number) => out.stops.push(at),
  });
  const osc = (): object => ({ ...node(), frequency: { ...param, setValueAtTime: (f: number) => out.freqs.push(f) } });
  const ctx = {
    sampleRate: 8000,
    createOscillator: osc,
    createGain: node,
    createBiquadFilter: node,
    createBufferSource: node,
    createPeriodicWave: () => ({}),
    createBuffer: (_c: number, n: number) => ({ getChannelData: () => new Float32Array(n) }),
  } as unknown as BaseAudioContext;
  RUSH_SFX[name]({ ctx, out: {} as AudioNode }, t, 1);
  return out;
}

/** v9 sounds with their length range in seconds (stops include a 20 ms safety tail). */
const V9: Readonly<Record<'nearMiss' | 'trail' | 'chain' | 'fever', readonly [number, number]>> = {
  nearMiss: [0.4, 0.5], // fires on every SFIORATO!: short
  trail: [0.1, 0.16], // one per fry, several a second
  chain: [0.55, 0.65],
  fever: [0.8, 0.92],
};

describe('rush v9 sfx', () => {
  it.each(Object.entries(V9))('%s is layered and bounded in time', (name, [min, max]) => {
    const { starts, stops } = play(name as RushSfx, 50);
    expect(starts.length).toBeGreaterThanOrEqual(3);
    const len = Math.max(...stops) - 50;
    expect(len).toBeGreaterThanOrEqual(min);
    expect(len).toBeLessThanOrEqual(max);
  });

  it('a fries trail climbs the G major scale while the fries keep coming, then starts again from the bottom', () => {
    const blip = (t: number): number => play('trail', t).freqs[0];
    const run = [100, 100.3, 100.7, 101.5, 102.6, 103.1, 103.5, 103.9, 104.2, 104.5, 104.8].map(blip);
    const scale = ['G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6'].map(hz);
    expect(run.slice(0, 10)).toEqual(scale);
    expect(run[10]).toBe(scale[9]); // tops out instead of squeaking higher
    expect(blip(106.5)).toBe(scale[0]); // more than 1.2 s later: a new trail
    expect(blip(106.8)).toBe(scale[1]);
    expect(blip(20)).toBe(scale[0]); // a new audio clock (rewound time) resets it too
  });
});
