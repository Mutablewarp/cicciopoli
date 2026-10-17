/** Music voices: melodic channels (pulse leads, mandolin, bass) and noise/tone drum kit. */
import { hiss, makeOsc, tone, vibratoCurve, type Voice, type Wave } from './synth';
import { midiToFreq } from './theory';

/** Instrument settings of one melodic channel. Times in seconds, levels 0..1. */
export interface Patch {
  wave: Wave;
  vol: number;
  a: number;
  /** decay time from peak towards the sustain level */
  d: number;
  /** sustain level as a fraction of vol */
  sus: number;
  /** release after note-off */
  r: number;
  /** fraction of the written length that sounds (default 0.9) */
  gate?: number;
  /** mandolin tremolo: re-pluck rate in Hz while the note is held */
  trem?: number;
  /** fixed lowpass cutoff (Hz) */
  cutoff?: number;
  vib?: { cents: number; rate: number; delay: number };
}

export type Drum = 'k' | 's' | 'h' | 'o';

/**
 * Pluck-style envelope: attack to vol, decay towards sustain. With `trem` the note is
 * re-plucked at a fixed rate (levels between plucks are computed analytically so every
 * automation event starts from the real current value: no clicks).
 */
function pluckEnvelope(gain: AudioParam, t: number, tOff: number, vol: number, p: Patch): void {
  const sus = vol * p.sus;
  const tc = Math.max(0.005, p.d / 3);
  const period = p.trem ? 1 / p.trem : Infinity;
  let level = vol;
  let last = t;
  gain.setValueAtTime(0, t);
  for (let tk = t; tk < tOff - 0.02; tk += period) {
    if (tk > t) {
      level = sus + (level - sus) * Math.exp(-(tk - last) / tc);
      gain.setValueAtTime(level, tk);
    }
    const peakAt = tk + p.a;
    gain.linearRampToValueAtTime(vol, peakAt);
    gain.setTargetAtTime(sus, peakAt, tc);
    level = vol;
    last = peakAt;
  }
}

/** One note on a melodic channel. `len` is the written length in seconds. */
export function playNote(v: Voice, p: Patch, midi: number, t: number, len: number): void {
  const { ctx } = v;
  const f = midiToFreq(midi);
  const tOff = t + Math.max(p.a + 0.03, len * (p.gate ?? 0.9));
  const end = tOff + p.r;
  const g = ctx.createGain();
  pluckEnvelope(g.gain, t, tOff, p.vol, p);
  g.gain.setTargetAtTime(0, tOff, p.r / 5);
  g.connect(v.out);
  let input: AudioNode = g;
  if (p.cutoff) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = p.cutoff;
    lp.connect(g);
    input = lp;
  }
  const o = makeOsc(ctx, p.wave, f, t);
  const vib = p.vib;
  const vibDur = end - t - (vib?.delay ?? 0);
  if (vib && vibDur > 0.12) o.detune.setValueCurveAtTime(vibratoCurve(vib.cents, vib.rate, vibDur, 0.12), t + vib.delay, vibDur);
  o.connect(input);
  o.start(t);
  o.stop(end + 0.01);
  o.onended = () => g.disconnect();
}

/** Drum hit; `vol` is the channel level, accents are 25% louder. */
export function playDrum(v: Voice, d: Drum, accent: boolean, vol: number, t: number): void {
  const g = vol * (accent ? 1.25 : 1);
  switch (d) {
    case 'k':
      tone(v, { wave: 'sine', t, f: 150, to: 46, slide: 0.09, a: 0.001, d: 0.22, peak: g * 0.9 });
      // short upper click so the kick still reads on phone speakers
      tone(v, { wave: 'triangle', t, f: 330, to: 90, slide: 0.03, a: 0.001, d: 0.04, peak: g * 0.35 });
      break;
    case 's':
      hiss(v, { t, d: 0.13, peak: g * 0.55, type: 'bandpass', f: 1900, q: 0.7 });
      tone(v, { wave: 'triangle', t, f: 230, to: 160, a: 0.001, d: 0.07, peak: g * 0.4 });
      break;
    case 'h':
      hiss(v, { t, d: 0.035, peak: g * 0.3, type: 'highpass', f: 7500 });
      break;
    case 'o':
      // tambourine-ish jingle: bright wash plus a resonant shimmer
      hiss(v, { t, a: 0.003, d: 0.15, peak: g * 0.24, type: 'highpass', f: 6000 });
      hiss(v, { t, d: 0.09, peak: g * 0.12, type: 'bandpass', f: 9500, q: 3 });
      break;
  }
}
