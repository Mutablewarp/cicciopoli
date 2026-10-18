/**
 * Level 5 "SPACCA TUTTO" sound effects: fist, smash, ground slam, rubble, roar, flag rip.
 * Same recipe contract as sfx.ts, which spreads this table into SFX.
 */
import { hiss, tone } from './synth';
import type { Recipe } from './sfx';

export type RampageSfx = 'punch' | 'smash' | 'slam' | 'rubble' | 'roar' | 'rip';

export const RAMPAGE_SFX: Readonly<Record<RampageSfx, Recipe>> = {
  punch: (v, t, p) => {
    // fast fist whoosh, then the dull thud of the hit
    hiss(v, { t, a: 0.025, d: 0.09, peak: 1, type: 'bandpass', f: 500 * p, to: 2600 * p, slide: 0.07, q: 1.4 });
    const hit = t + 0.06;
    tone(v, { wave: 'sine', t: hit, f: 180 * p, to: 64 * p, slide: 0.07, a: 0.001, d: 0.13, peak: 0.28 });
    tone(v, { wave: 'triangle', t: hit, f: 330 * p, to: 130 * p, slide: 0.04, a: 0.001, d: 0.06, peak: 0.22 });
    hiss(v, { t: hit, d: 0.07, peak: 0.6, type: 'lowpass', f: 1500 });
  },

  smash: (v, t, p) => {
    // crunchy impact: bright crack, noise body falling through a lowpass over a square sub-drop, debris ticks
    hiss(v, { t, d: 0.05, peak: 0.8, type: 'bandpass', f: 1500 * p, q: 0.8 });
    hiss(v, { t, a: 0.003, hold: 0.03, d: 0.2, peak: 0.5, type: 'lowpass', f: 3200 * p, to: 260, slide: 0.2, q: 1.1 });
    tone(v, { wave: 0.5, t, f: 190 * p, to: 44 * p, slide: 0.2, a: 0.002, d: 0.23, peak: 0.2, lp: 900 });
    tone(v, { wave: 'triangle', t, f: 320 * p, to: 95 * p, slide: 0.05, a: 0.001, d: 0.06, peak: 0.2 });
    [0.09, 0.14, 0.19].forEach((dt, i) =>
      hiss(v, { t: t + dt, d: 0.025, peak: 0.55 - i * 0.12, type: 'bandpass', f: 2400 - i * 500, q: 3 }),
    );
  },

  slam: (v, t, p) => {
    // deep boom: crack, sub sine falling through the floor, mid thump (phone speakers) and a rumble tail
    hiss(v, { t, d: 0.05, peak: 0.55, type: 'bandpass', f: 1300 * p, q: 0.8 });
    tone(v, { wave: 'sine', t, f: 100 * p, to: 30 * p, slide: 0.38, a: 0.003, d: 0.43, peak: 0.28 });
    tone(v, { wave: 'triangle', t, f: 230 * p, to: 70 * p, slide: 0.12, a: 0.002, d: 0.2, peak: 0.24 });
    tone(v, { wave: 0.5, t, f: 150 * p, to: 46 * p, slide: 0.3, a: 0.002, d: 0.3, peak: 0.16, lp: 1100 });
    hiss(v, { t, a: 0.004, hold: 0.05, d: 0.38, peak: 0.5, type: 'lowpass', f: 2600 * p, to: 110, slide: 0.42, q: 1.2 });
    hiss(v, { t: t + 0.06, a: 0.06, hold: 0.06, d: 0.22, peak: 0.34, type: 'lowpass', f: 400 * p, q: 1 });
  },

  rubble: (v, t, p) => {
    // clatter of stones: uneven band-passed ticks dying away, with a few lower clunks for the big chunks
    [0, 0.02, 0.048, 0.07, 0.1, 0.125, 0.158, 0.18, 0.214, 0.245, 0.27].forEach((dt, i) => {
      hiss(v, { t: t + dt, d: 0.018 + (i % 3) * 0.006, peak: 2 - i * 0.12, type: 'bandpass', f: (900 + ((i * 1370) % 2600)) * p, q: 3 + (i % 3) });
    });
    [0.03, 0.115, 0.2].forEach((dt, i) =>
      tone(v, { wave: 'triangle', t: t + dt, f: (210 - i * 25) * p, to: (110 - i * 10) * p, slide: 0.04, a: 0.001, d: 0.05, peak: 0.3 - i * 0.06 }),
    );
  },

  roar: (v, t, p) => {
    // low growl: three detuned saws sliding down through an opening lowpass with a rough wobble, under two noise formants
    const growl = { t, slide: 0.6, a: 0.07, hold: 0.25, d: 0.28, lp: 800, lpTo: 2400, vib: [70, 27] } as const;
    [0.988, 1, 1.013].forEach((k) => tone(v, { ...growl, wave: 'sawtooth', f: 160 * p * k, to: 85 * p * k, peak: 0.06 }));
    hiss(v, { t, a: 0.1, hold: 0.2, d: 0.3, peak: 1, type: 'bandpass', f: 500, to: 900, slide: 0.4, q: 2.5 });
    hiss(v, { t, a: 0.1, hold: 0.2, d: 0.3, peak: 0.6, type: 'bandpass', f: 1300, to: 1900, slide: 0.4, q: 3 });
    tone(v, { wave: 'sine', t, f: 100 * p, to: 60 * p, a: 0.08, hold: 0.2, d: 0.32, peak: 0.11 });
  },

  rip: (v, t, p) => {
    // cloth tearing: a sizzle bed plus noise bursts that come faster and brighter like a zipper, ending on the snap
    hiss(v, { t, a: 0.05, hold: 0.22, d: 0.1, peak: 0.4, type: 'bandpass', f: 2200 * p, q: 0.5 });
    let at = t;
    for (let i = 0; i < 13; i++) {
      hiss(v, { t: at, d: 0.022, peak: 0.55 + i * 0.03, type: 'bandpass', f: (600 + i * 140 + (i % 2) * 300) * p, q: 2.5 });
      at += 0.036 - i * 0.0016;
    }
    hiss(v, { t: at, d: 0.07, peak: 0.8, type: 'bandpass', f: 1800 * p, q: 1 });
    tone(v, { wave: 'triangle', t: at, f: 700 * p, to: 220 * p, slide: 0.05, a: 0.001, d: 0.08, peak: 0.16 });
  },
};
