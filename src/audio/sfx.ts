/**
 * Sound-effect recipes. Each recipe schedules its voices at time `t`; `p` is a pitch
 * multiplier (≈ ±3%) chosen by the caller so repeated sounds don't fatigue.
 */
import type { SfxName } from '../contracts';
import { hiss, tone, type ToneOpts, type Voice } from './synth';
import { hz } from './theory';

type Recipe = (v: Voice, t: number, p: number) => void;
type ArpOpts = Omit<ToneOpts, 't' | 'f'>;

/** Plays `freqs` one after another, `gap` seconds apart. */
function arp(v: Voice, t: number, freqs: readonly number[], gap: number, o: ArpOpts): void {
  freqs.forEach((f, i) => tone(v, { ...o, t: t + i * gap, f }));
}

const notes = (names: readonly string[], p: number): number[] => names.map((n) => hz(n) * p);

export const SFX: Readonly<Record<SfxName, Recipe>> = {
  jump: (v, t, p) => {
    tone(v, { wave: 0.25, t, f: 250 * p, to: 660 * p, slide: 0.1, a: 0.003, hold: 0.03, d: 0.14, peak: 0.3 });
  },

  land: (v, t, p) => {
    tone(v, { wave: 'triangle', t, f: 160 * p, to: 50 * p, slide: 0.07, a: 0.002, d: 0.1, peak: 0.3 });
    // mid-band click: the low thud alone is inaudible on phone speakers
    tone(v, { wave: 'triangle', t, f: 330 * p, to: 140 * p, slide: 0.04, a: 0.001, d: 0.05, peak: 0.1 });
    hiss(v, { t, d: 0.05, peak: 0.13, type: 'lowpass', f: 1200 });
  },

  fries: (v, t, p) => {
    tone(v, { wave: 0.5, t, f: hz('B5') * p, a: 0.004, hold: 0.045, d: 0.02, peak: 0.16 });
    tone(v, { wave: 0.5, t: t + 0.065, f: hz('E6') * p, a: 0.004, hold: 0.05, d: 0.32, peak: 0.16 });
  },

  burger: (v, t, p) => {
    // "nom nom": buzzy vowel whose lowpass closes like a mouth on the "m", then a happy rise
    for (const dt of [0, 0.12]) {
      tone(v, { wave: 'sawtooth', t: t + dt, f: 210 * p, to: 150 * p, a: 0.008, hold: 0.04, d: 0.06, peak: 0.3, lp: 1800, lpTo: 350 });
    }
    arp(v, t + 0.24, notes(['E5', 'G5', 'C6'], p), 0.055, { wave: 0.25, a: 0.002, hold: 0.03, d: 0.14, peak: 0.15 });
  },

  powerup: (v, t, p) => {
    const run = notes(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], p);
    arp(v, t, run, 0.05, { wave: 0.125, a: 0.002, hold: 0.03, d: 0.08, peak: 0.16 });
    arp(v, t + 0.025, run.map((f) => f / 2), 0.05, { wave: 'triangle', a: 0.002, hold: 0.03, d: 0.08, peak: 0.2 });
    tone(v, { wave: 0.125, t: t + 0.3, f: hz('C7') * p, a: 0.002, hold: 0.1, d: 0.35, peak: 0.13, vib: [30, 9] });
    tone(v, { wave: 'triangle', t: t + 0.3, f: hz('C6') * p, a: 0.002, hold: 0.1, d: 0.35, peak: 0.18 });
  },

  brie: (v, t, p) => {
    const sparkle = [2637, 3136, 3520, 4186, 3951, 4699, 5274, 6272];
    sparkle.forEach((f, i) => tone(v, { wave: 'triangle', t: t + i * 0.045, f: f * p, a: 0.002, d: 0.18, peak: 0.1 }));
    tone(v, { wave: 'sine', t, f: hz('E6') * p, a: 0.05, hold: 0.05, d: 0.4, peak: 0.12 });
    tone(v, { wave: 'sine', t, f: hz('B6') * p, a: 0.05, hold: 0.05, d: 0.4, peak: 0.07 });
    hiss(v, { t, a: 0.08, hold: 0.1, d: 0.3, peak: 0.08, type: 'highpass', f: 6000 });
  },

  shoot: (v, t, p) => {
    tone(v, { wave: 0.25, t, f: 1150 * p, to: 230 * p, slide: 0.11, a: 0.002, d: 0.13, peak: 0.38 });
    hiss(v, { t, d: 0.05, peak: 0.42, type: 'bandpass', f: 3000, q: 1.2 });
  },

  club: (v, t, p) => {
    hiss(v, { t, a: 0.06, d: 0.2, peak: 1, type: 'bandpass', f: 350 * p, to: 2600 * p, slide: 0.14, q: 1.4 });
    tone(v, { wave: 'triangle', t: t + 0.04, f: 110 * p, to: 60 * p, a: 0.02, d: 0.22, peak: 0.2 });
    // flame crackle: tiny bright clicks after the swing
    for (let i = 0; i < 6; i++) {
      const dt = 0.09 + i * 0.032 + (i % 2) * 0.011;
      hiss(v, { t: t + dt, d: 0.014, peak: 0.16 - i * 0.015, type: 'highpass', f: 2500 + ((i * 1300) % 3000) });
    }
  },

  stomp: (v, t, p) => {
    tone(v, { wave: 'triangle', t, f: 150 * p, to: 560 * p, slide: 0.12, a: 0.003, hold: 0.03, d: 0.16, peak: 0.32, vib: [70, 16] });
    tone(v, { wave: 0.25, t, f: 300 * p, to: 1120 * p, slide: 0.12, a: 0.003, d: 0.12, peak: 0.05 });
    tone(v, { wave: 'sine', t, f: 120, to: 50, slide: 0.05, a: 0.001, d: 0.07, peak: 0.25 });
  },

  hurt: (v, t, p) => {
    tone(v, { wave: 'sawtooth', t, f: 520 * p, to: 120 * p, slide: 0.32, a: 0.004, hold: 0.12, d: 0.24, peak: 0.24, lp: 2400, vib: [90, 24] });
    tone(v, { wave: 0.125, t, f: 530 * p, to: 122 * p, slide: 0.32, a: 0.004, hold: 0.12, d: 0.24, peak: 0.12 });
  },

  shieldBreak: (v, t, p) => {
    hiss(v, { t, d: 0.05, peak: 0.6, type: 'bandpass', f: 2200, q: 0.8 });
    hiss(v, { t: t + 0.01, a: 0.005, d: 0.4, peak: 0.2, type: 'highpass', f: 4200 });
    [2093, 2794, 3322, 4435, 5588].forEach((f, i) =>
      tone(v, { wave: 'sine', t: t + i * 0.012, f: f * p, a: 0.001, d: 0.3 + i * 0.05, peak: 0.09 }),
    );
    [0.09, 0.15, 0.22, 0.3].forEach((dt, i) =>
      tone(v, { wave: 'triangle', t: t + dt, f: (3700 + i * 900) * p, a: 0.001, d: 0.07, peak: 0.05 }),
    );
  },

  crate: (v, t, p) => {
    hiss(v, { t, d: 0.045, peak: 1.5, type: 'bandpass', f: 1200 * p, q: 3 });
    hiss(v, { t: t + 0.028, d: 0.07, peak: 1.1, type: 'bandpass', f: 750 * p, q: 3 });
    tone(v, { wave: 'triangle', t, f: 240 * p, to: 110 * p, slide: 0.06, a: 0.001, d: 0.09, peak: 0.4 });
    [0.07, 0.1, 0.14].forEach((dt, i) =>
      hiss(v, { t: t + dt, d: 0.02, peak: 0.6 - i * 0.15, type: 'bandpass', f: 2600 - i * 400, q: 4 }),
    );
  },

  bump: (v, t, p) => {
    tone(v, { wave: 'triangle', t, f: 200 * p, to: 95 * p, slide: 0.05, a: 0.001, d: 0.12, peak: 0.38 });
    tone(v, { wave: 0.5, t, f: 100 * p, a: 0.001, d: 0.06, peak: 0.12, lp: 900 });
    hiss(v, { t, d: 0.04, peak: 0.16, type: 'lowpass', f: 1000 });
  },

  checkpoint: (v, t, p) => {
    notes(['E5', 'G5', 'C6'], p).forEach((f, i) => {
      const last = i === 2;
      const at = t + i * 0.1;
      tone(v, { wave: 0.25, t: at, f, a: 0.003, hold: last ? 0.12 : 0.06, d: last ? 0.4 : 0.05, peak: 0.21, vib: last ? [20, 7] : undefined });
      tone(v, { wave: 0.125, t: at + 0.05, f: f * 2, a: 0.003, hold: 0.02, d: last ? 0.3 : 0.05, peak: 0.04 });
    });
  },

  lava: (v, t, p) => {
    hiss(v, { t, a: 0.02, hold: 0.12, d: 0.35, peak: 0.2, type: 'highpass', f: 2800 });
    for (let i = 0; i < 9; i++) {
      hiss(v, { t: t + 0.02 + ((i * 0.37) % 0.45), d: 0.012, peak: 0.4, type: 'bandpass', f: 3500 + ((i * 1700) % 4000), q: 2 });
    }
    tone(v, { wave: 'sine', t, f: 180 * p, to: 420 * p, slide: 0.07, a: 0.003, d: 0.1, peak: 0.25 });
  },

  fall: (v, t, p) => {
    const o = { t, f: 1500 * p, to: 200 * p, slide: 0.85, a: 0.02, hold: 0.6, d: 0.3 } as const;
    tone(v, { ...o, wave: 'sine', peak: 0.13, vib: [25, 7] });
    tone(v, { ...o, wave: 'triangle', peak: 0.05 });
  },

  flap: (v, t, p) => {
    hiss(v, { t, a: 0.03, d: 0.1, peak: 0.9, type: 'bandpass', f: 500 * p, to: 1200 * p, q: 0.8 });
  },

  select: (v, t, p) => {
    tone(v, { wave: 0.5, t, f: 1320 * p, a: 0.003, hold: 0.02, d: 0.03, peak: 0.1 });
    tone(v, { wave: 0.5, t: t + 0.035, f: 1980 * p, a: 0.003, hold: 0.02, d: 0.06, peak: 0.09 });
  },

  pause: (v, t, p) => {
    tone(v, { wave: 0.5, t, f: hz('E6') * p, a: 0.004, hold: 0.05, d: 0.04, peak: 0.13 });
    tone(v, { wave: 0.5, t: t + 0.09, f: hz('B5') * p, a: 0.004, hold: 0.06, d: 0.12, peak: 0.13 });
  },

  enemyHit: (v, t, p) => {
    hiss(v, { t, d: 0.06, peak: 0.85, type: 'bandpass', f: 1600 * p, q: 1 });
    tone(v, { wave: 0.5, t, f: 380 * p, to: 110 * p, slide: 0.08, a: 0.001, d: 0.09, peak: 0.23 });
  },

  armorClang: (v, t, p) => {
    hiss(v, { t, d: 0.06, peak: 0.22, type: 'highpass', f: 5000 });
    // detuned pair beats against itself = metallic
    tone(v, { wave: 0.5, t, f: 1180 * p, a: 0.001, d: 0.32, peak: 0.1, lp: 6000 });
    tone(v, { wave: 0.5, t, f: 1251 * p, a: 0.001, d: 0.28, peak: 0.1, lp: 6000 });
    tone(v, { wave: 'triangle', t, f: 2360 * p, a: 0.001, d: 0.45, peak: 0.16 });
    tone(v, { wave: 'triangle', t, f: 3170 * p, a: 0.001, d: 0.35, peak: 0.1 });
    tone(v, { wave: 'triangle', t, f: 220 * p, to: 130 * p, slide: 0.06, a: 0.001, d: 0.08, peak: 0.28 });
  },

  heal: (v, t, p) => {
    notes(['C5', 'E5', 'G5', 'C6'], p).forEach((f, i) => {
      const at = t + i * 0.075;
      tone(v, { wave: 'triangle', t: at, f, a: 0.012, hold: 0.04, d: i === 3 ? 0.45 : 0.2, peak: 0.22 });
      tone(v, { wave: 'sine', t: at, f: f * 2, a: 0.012, d: 0.18, peak: 0.06 });
    });
  },

  goal: (v, t, p) => {
    // golf ball rolling to the cup: ticks that slow down and drop in pitch...
    [0, 0.075, 0.14, 0.195, 0.24, 0.275, 0.305].forEach((dt, i) => {
      hiss(v, { t: t + dt, d: 0.02, peak: 0.6 - i * 0.03, type: 'bandpass', f: (3400 - i * 280) * p, q: 5 });
      tone(v, { wave: 'triangle', t: t + dt, f: (1900 - i * 160) * p, a: 0.001, d: 0.03, peak: 0.07 });
    });
    // ...then the hollow "plop" into the hole and the ball settling
    const tp = t + 0.38;
    tone(v, { wave: 'sine', t: tp, f: 560 * p, to: 140 * p, slide: 0.09, a: 0.002, d: 0.16, peak: 0.5 });
    hiss(v, { t: tp, d: 0.05, peak: 0.16, type: 'lowpass', f: 700 });
    [0.12, 0.2].forEach((dt, i) =>
      tone(v, { wave: 'triangle', t: tp + dt, f: 720 * p * (1 - i * 0.08), a: 0.001, d: 0.05, peak: 0.12 - i * 0.05 }),
    );
  },
};
