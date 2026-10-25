/**
 * Low-level WebAudio voices shared by sfx and music.
 * Everything takes a Voice so the same code renders into a live AudioContext
 * or an OfflineAudioContext (used to measure levels).
 */
import { rng } from '../art/pixel';

export interface Voice {
  ctx: BaseAudioContext;
  out: AudioNode;
}

/** Native shape, 'bass' (NES-style 4-bit stepped triangle) or a pulse duty cycle in (0, 1). */
export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'bass' | number;

const HARMONICS = 40;
const waveCache = new WeakMap<BaseAudioContext, Map<string, PeriodicWave>>();
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
let noiseCursor = 0;

/** Fourier series of a pulse wave centred on t = 0 (even function: cosine terms only). */
function pulseTable(duty: number): [Float32Array, Float32Array] {
  const re = new Float32Array(HARMONICS);
  for (let n = 1; n < HARMONICS; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  return [re, new Float32Array(HARMONICS)];
}

/** 32-step staircase triangle: the stepped harmonics keep the bass audible on phone speakers. */
function steppedTriangleTable(): [Float32Array, Float32Array] {
  const N = 512;
  const re = new Float32Array(HARMONICS);
  const im = new Float32Array(HARMONICS);
  for (let n = 1; n < HARMONICS; n++) {
    let c = 0;
    let s = 0;
    for (let i = 0; i < N; i++) {
      const step = Math.floor((i * 32) / N);
      const level = (step < 16 ? 15 - step : step - 16) / 7.5 - 1;
      const ph = (2 * Math.PI * n * i) / N;
      c += level * Math.cos(ph);
      s += level * Math.sin(ph);
    }
    re[n] = (2 * c) / N;
    im[n] = (2 * s) / N;
  }
  return [re, im];
}

function periodic(ctx: BaseAudioContext, key: string, build: () => [Float32Array, Float32Array]): PeriodicWave {
  let byKey = waveCache.get(ctx);
  if (!byKey) {
    byKey = new Map();
    waveCache.set(ctx, byKey);
  }
  let w = byKey.get(key);
  if (!w) {
    const [re, im] = build();
    w = ctx.createPeriodicWave(re, im);
    byKey.set(key, w);
  }
  return w;
}

export function makeOsc(ctx: BaseAudioContext, wave: Wave, freq: number, t: number): OscillatorNode {
  const o = ctx.createOscillator();
  if (typeof wave === 'number') o.setPeriodicWave(periodic(ctx, `p${wave}`, () => pulseTable(wave)));
  else if (wave === 'bass') o.setPeriodicWave(periodic(ctx, 'bass', steppedTriangleTable));
  else o.type = wave;
  o.frequency.setValueAtTime(freq, t);
  return o;
}

/** One second of seeded white noise per context (deterministic). */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  let b = noiseCache.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = b.getChannelData(0);
    const r = rng(0xc1cc10);
    for (let i = 0; i < data.length; i++) data[i] = r() * 2 - 1;
    noiseCache.set(ctx, b);
  }
  return b;
}

/** Sine vibrato curve in cents with a short fade-in, for detune.setValueCurveAtTime. */
export function vibratoCurve(cents: number, rate: number, dur: number, fadeIn = 0.06): Float32Array {
  const n = Math.max(2, Math.ceil(dur * 120));
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const tau = (i / (n - 1)) * dur;
    c[i] = cents * Math.min(1, tau / fadeIn) * Math.sin(2 * Math.PI * rate * tau);
  }
  return c;
}

/**
 * Linear attack, optional hold, exponential decay (-35 dB after `d`) and a short linear
 * tail to exactly 0 so stopping the source never clicks.
 */
function shape(p: AudioParam, t: number, a: number, hold: number, d: number, peak: number): number {
  const decayAt = t + a + hold;
  const end = decayAt + d;
  const tc = d / 4;
  const fadeAt = end - Math.min(0.01, d / 4);
  // a new GainNode is 1 until its first event: a source starting a sub-sample earlier leaked one loud sample
  p.value = 0;
  p.setValueAtTime(0, t);
  p.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) p.setValueAtTime(peak, decayAt);
  p.setTargetAtTime(0, decayAt, tc);
  p.setValueAtTime(peak * Math.exp(-(fadeAt - decayAt) / tc), fadeAt);
  p.linearRampToValueAtTime(0, end);
  return end;
}

function filter(ctx: BaseAudioContext, type: BiquadFilterType, f: number, q: number, t: number): BiquadFilterNode {
  const bq = ctx.createBiquadFilter();
  bq.type = type;
  bq.frequency.setValueAtTime(f, t);
  bq.Q.setValueAtTime(q, t);
  return bq;
}

export interface ToneOpts {
  wave: Wave;
  t: number;
  /** start frequency (Hz) */
  f: number;
  /** end frequency of an exponential slide */
  to?: number;
  /** slide duration (s), default: the whole sound */
  slide?: number;
  a?: number;
  hold?: number;
  /** decay to silence (s) */
  d: number;
  peak: number;
  /** optional lowpass (Hz), swept to lpTo over the sound */
  lp?: number;
  lpTo?: number;
  /** vibrato [cents, rate Hz] over the whole sound */
  vib?: readonly [number, number];
}

export function tone(v: Voice, o: ToneOpts): void {
  const { ctx } = v;
  const a = o.a ?? 0.003;
  const hold = o.hold ?? 0;
  const len = a + hold + o.d;
  const osc = makeOsc(ctx, o.wave, o.f, o.t);
  if (o.to !== undefined) osc.frequency.exponentialRampToValueAtTime(o.to, o.t + (o.slide ?? len));
  if (o.vib) osc.detune.setValueCurveAtTime(vibratoCurve(o.vib[0], o.vib[1], len), o.t, len);
  const g = ctx.createGain();
  const end = shape(g.gain, o.t, a, hold, o.d, o.peak);
  let head: AudioNode = osc;
  if (o.lp !== undefined) {
    const lp = filter(ctx, 'lowpass', o.lp, 0.7, o.t);
    if (o.lpTo !== undefined) lp.frequency.exponentialRampToValueAtTime(o.lpTo, end);
    osc.connect(lp);
    head = lp;
  }
  head.connect(g).connect(v.out);
  osc.start(o.t);
  osc.stop(end + 0.02);
  osc.onended = () => g.disconnect();
}

export interface NoiseOpts {
  t: number;
  a?: number;
  hold?: number;
  d: number;
  peak: number;
  type: BiquadFilterType;
  /** filter frequency (Hz), optionally swept to `to` over `slide` seconds */
  f: number;
  to?: number;
  slide?: number;
  q?: number;
}

/** Filtered white-noise burst (hats, whooshes, cracks, sizzles). */
export function hiss(v: Voice, o: NoiseOpts): void {
  const { ctx } = v;
  const a = o.a ?? 0.002;
  const hold = o.hold ?? 0;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const bq = filter(ctx, o.type, o.f, o.q ?? 0.8, o.t);
  if (o.to !== undefined) bq.frequency.exponentialRampToValueAtTime(o.to, o.t + (o.slide ?? a + hold + o.d));
  const g = ctx.createGain();
  const end = shape(g.gain, o.t, a, hold, o.d, o.peak);
  src.connect(bq).connect(g).connect(v.out);
  noiseCursor = (noiseCursor + 0.173) % 0.8; // different slice each hit, still deterministic
  src.start(o.t, noiseCursor);
  src.stop(end + 0.02);
  src.onended = () => g.disconnect();
}
