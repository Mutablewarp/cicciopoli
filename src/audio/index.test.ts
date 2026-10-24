import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAudio } from './index';

/** Fake WebAudio clock + node factory: counts every voice (oscillator / noise source) started. */
let clock = 0;
let voices = 0;
const param = (): object => ({
  value: 0,
  setValueAtTime: () => undefined,
  linearRampToValueAtTime: () => undefined,
  exponentialRampToValueAtTime: () => undefined,
  setTargetAtTime: () => undefined,
  setValueCurveAtTime: () => undefined,
  cancelScheduledValues: () => undefined,
});
const node = (): object => ({
  gain: param(),
  frequency: param(),
  detune: param(),
  Q: param(),
  delayTime: param(),
  threshold: param(),
  knee: param(),
  ratio: param(),
  attack: param(),
  release: param(),
  connect: <T>(dest: T): T => dest,
  disconnect: () => undefined,
  setPeriodicWave: () => undefined,
  start: () => undefined,
  stop: () => undefined,
});
const voice = (): object => {
  voices++;
  return node();
};

class FakeContext {
  readonly state = 'running';
  readonly sampleRate = 8000;
  readonly destination = node();
  get currentTime(): number {
    return clock;
  }
  createGain = node;
  createDynamicsCompressor = node;
  createBiquadFilter = node;
  createDelay = node;
  createOscillator = voice;
  createBufferSource = voice;
  createPeriodicWave = (): object => ({});
  createBuffer = (_ch: number, n: number): object => ({ getChannelData: () => new Float32Array(n) });
  resume = (): Promise<void> => Promise.resolve();
  suspend = (): Promise<void> => Promise.resolve();
}

/** Advances the audio clock and the sequencer's interval timer together; returns the voices started. */
function run(sec: number): number {
  const before = voices;
  for (let t = 0; t < sec; t += 0.025) {
    clock += 0.025;
    vi.advanceTimersByTime(25);
  }
  return voices - before;
}

/** Voices started by one sfx call. */
function sfxVoices(play: () => void): number {
  const before = voices;
  play();
  return voices - before;
}

describe('music-only mute', () => {
  beforeEach(() => {
    clock = 1;
    voices = 0;
    vi.useFakeTimers();
    vi.stubGlobal('window', {
      AudioContext: FakeContext,
      setInterval: (fn: () => void, ms: number) => setInterval(fn, ms),
      clearInterval: (id: number) => clearInterval(id),
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('plays the rush track when music is on', () => {
    const a = createAudio();
    a.unlock();
    a.music('rush');
    expect(run(1)).toBeGreaterThan(20);
  });

  it('a music-off setting saved before the first tap keeps the track silent but not the sfx', () => {
    const a = createAudio();
    a.setMusicMuted(true);
    a.unlock();
    a.music('rush');
    expect(a.musicMuted).toBe(true);
    expect(run(1)).toBe(0);
    expect(sfxVoices(() => a.sfx('horn'))).toBeGreaterThan(0);
    a.setMusicMuted(false);
    expect(run(1)).toBeGreaterThan(20);
  });

  it('is independent of the global mute', () => {
    const a = createAudio();
    a.unlock();
    a.music('rush');
    run(0.5);
    a.setMusicMuted(true);
    run(0.2); // notes already queued in the lookahead may still start
    expect(run(1)).toBe(0);
    expect(sfxVoices(() => a.sfx('crash'))).toBeGreaterThan(0);

    a.setMuted(true);
    run(0.1);
    expect(sfxVoices(() => a.sfx('deliver'))).toBe(0);
    a.setMuted(false);
    expect(a.musicMuted).toBe(true);
    expect(run(1)).toBe(0);
    expect(sfxVoices(() => a.sfx('jet'))).toBeGreaterThan(0);

    a.setMusicMuted(false);
    expect(a.muted).toBe(false);
    expect(run(1)).toBeGreaterThan(20);
  });

  it('a jingle stays silent while music is off', () => {
    const a = createAudio();
    a.setMusicMuted(true);
    a.unlock();
    a.jingle('win');
    expect(run(1)).toBe(0);
  });
});
