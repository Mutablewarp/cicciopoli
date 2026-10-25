/**
 * Level 7 v7 "tactile kitchen" sound effects, spread into KITCHEN_SFX: one pick-up sound per
 * ingredient family (raw meat, leaves, cheese, crunchy, bun, drink), the raw patty slapping onto the
 * hot griddle (sizzleBig), the fry basket dunked into the oil and lifted out dripping.
 * The grabs fire on almost every tap (~1 per second), so they stay under 0.4 s and a little softer
 * than plop; every one keeps energy above 300 Hz, the only band a phone speaker plays.
 */
import { hiss, tone } from './synth';
import type { Recipe } from './sfx';

export type TouchSfx = 'grabMeat' | 'grabLeaf' | 'grabCheese' | 'grabCrisp' | 'grabBun' | 'grabCan' | 'sizzleBig' | 'dunk' | 'lift';

/** Deterministic 0..1 scatter (golden-ratio sequence) for crackles and bubbles. */
const scatter = (i: number): number => (i * 0.618034) % 1;

export const TOUCH_SFX: Readonly<Record<TouchSfx, Recipe>> = {
  grabMeat: (v, t, p) => {
    // raw patty peeled off the tray: a wet smack with a low body...
    hiss(v, { t, d: 0.035, peak: 0.62, type: 'bandpass', f: 1300 * p, q: 0.7 });
    tone(v, { wave: 'triangle', t, f: 190 * p, to: 85 * p, slide: 0.05, a: 0.001, d: 0.07, peak: 0.18 });
    tone(v, { wave: 'triangle', t, f: 430 * p, to: 230 * p, slide: 0.04, a: 0.001, d: 0.045, peak: 0.14 });
    // ...then the sticky squelch as it comes away (a resonant sweep, a wet bubble, two clicks)
    hiss(v, { t: t + 0.03, a: 0.01, d: 0.07, peak: 0.46, type: 'bandpass', f: 500 * p, to: 1700 * p, slide: 0.07, q: 5 });
    tone(v, { wave: 'sine', t: t + 0.05, f: 260 * p, to: 560 * p, slide: 0.03, a: 0.002, d: 0.04, peak: 0.09 });
    [0.075, 0.115].forEach((dt, i) => hiss(v, { t: t + dt, d: 0.01, peak: 0.22 - i * 0.07, type: 'bandpass', f: (1900 + i * 700) * p, q: 3 }));
  },

  grabLeaf: (v, t, p) => {
    // crisp lettuce: a watery snap, an airy swish of leaves and a run of bright crinkles
    hiss(v, { t, d: 0.02, peak: 0.48, type: 'bandpass', f: 2600 * p, q: 2 });
    hiss(v, { t, a: 0.02, d: 0.13, peak: 0.22, type: 'highpass', f: 3500 * p, to: 6500 * p, slide: 0.15 });
    hiss(v, { t, a: 0.01, d: 0.06, peak: 0.16, type: 'bandpass', f: 1400 * p, q: 1 });
    for (let i = 0; i < 9; i++) {
      const dt = 0.012 + i * 0.017 + scatter(i) * 0.012;
      hiss(v, { t: t + dt, d: 0.007 + (i % 3) * 0.004, peak: 0.46 - i * 0.034, type: 'bandpass', f: (3000 + scatter(i + 3) * 5000) * p, q: 2.5 });
    }
  },

  grabCheese: (v, t, p) => {
    // a slice peeling off the stack: a rising tacky sweep with little sticky ticks...
    hiss(v, { t, a: 0.03, d: 0.08, peak: 0.38, type: 'bandpass', f: 900 * p, to: 2600 * p, slide: 0.1, q: 4 });
    [0, 0.016, 0.034, 0.055, 0.08].forEach((dt, i) =>
      hiss(v, { t: t + dt, d: 0.006, peak: 0.26 - i * 0.03, type: 'bandpass', f: (2200 + i * 260) * p, q: 3 }),
    );
    // ...then pressed soft between the fingers: a muffled "plap"
    const at = t + 0.12;
    hiss(v, { t: at, a: 0.008, d: 0.06, peak: 0.48, type: 'lowpass', f: 900 });
    tone(v, { wave: 'sine', t: at, f: 340 * p, to: 210 * p, slide: 0.05, a: 0.004, d: 0.07, peak: 0.17 });
  },

  grabCrisp: (v, t, p) => {
    // fried / nuts / crispy onions: a dry granular crunch, denser and lower than the lettuce crinkle
    hiss(v, { t, a: 0.004, d: 0.07, peak: 0.5, type: 'bandpass', f: 1100 * p, q: 1.2 });
    for (let i = 0; i < 11; i++) {
      const dt = i * 0.011 + scatter(i) * 0.01 + (i > 6 ? 0.02 : 0);
      hiss(v, { t: t + dt, d: 0.006 + (i % 2) * 0.006, peak: 0.9 - i * 0.055, type: 'bandpass', f: (1500 + scatter(i + 1) * 3500) * p, q: 2 });
    }
    [0.01, 0.05].forEach((dt) => hiss(v, { t: t + dt, d: 0.02, peak: 0.5, type: 'bandpass', f: 800 * p, q: 2.5 }));
  },

  grabBun: (v, t, p) => {
    // soft brioche squeezed in the hand: air puffing out of the crumb over a gentle squish
    hiss(v, { t, a: 0.03, d: 0.1, peak: 0.42, type: 'lowpass', f: 500 * p, to: 1500 * p, slide: 0.08, q: 1.5 });
    hiss(v, { t: t + 0.01, a: 0.02, d: 0.08, peak: 0.22, type: 'bandpass', f: 1900 * p, q: 0.8 });
    tone(v, { wave: 'sine', t, f: 230 * p, to: 330 * p, slide: 0.06, a: 0.02, d: 0.08, peak: 0.12 });
    tone(v, { wave: 'triangle', t: t + 0.01, f: 460 * p, to: 640 * p, slide: 0.05, a: 0.015, d: 0.06, peak: 0.09 });
  },

  grabCan: (v, t, p) => {
    // cold can / bottle knocked against the next: an inharmonic clink...
    hiss(v, { t, d: 0.01, peak: 0.28, type: 'highpass', f: 5000 });
    tone(v, { wave: 'sine', t, f: 1870 * p, a: 0.001, d: 0.2, peak: 0.15 });
    tone(v, { wave: 'sine', t, f: 1870 * 2.76 * p, a: 0.001, d: 0.08, peak: 0.05 });
    tone(v, { wave: 'triangle', t: t + 0.07, f: 2240 * p, a: 0.001, d: 0.12, peak: 0.08 });
    // ...and a hint of fizz behind it
    hiss(v, { t: t + 0.04, a: 0.04, d: 0.24, peak: 0.08, type: 'highpass', f: 6500 });
    for (let i = 0; i < 6; i++) {
      hiss(v, { t: t + 0.06 + scatter(i) * 0.25, d: 0.006, peak: 0.1, type: 'bandpass', f: (5000 + scatter(i + 2) * 3000) * p, q: 3 });
    }
  },

  sizzleBig: (v, t, p) => {
    // the raw patty slaps onto the hot steel...
    tone(v, { wave: 'triangle', t, f: 200 * p, to: 80 * p, slide: 0.06, a: 0.001, d: 0.09, peak: 0.24 });
    tone(v, { wave: 'triangle', t, f: 460 * p, to: 250 * p, slide: 0.05, a: 0.001, d: 0.05, peak: 0.09 });
    hiss(v, { t, d: 0.06, peak: 0.36, type: 'lowpass', f: 1300 });
    // ...a loud wet "TSSSHH" flash and a fat-frying bed that settles over a second...
    hiss(v, { t: t + 0.005, a: 0.004, hold: 0.06, d: 0.26, peak: 0.42, type: 'bandpass', f: 3000 * p, q: 0.6 });
    hiss(v, { t: t + 0.01, a: 0.006, d: 0.12, peak: 0.16, type: 'bandpass', f: 1100 * p, q: 1.5 });
    hiss(v, { t: t + 0.02, a: 0.03, hold: 0.25, d: 0.72, peak: 0.2, type: 'highpass', f: 2600 * p, to: 5200 * p, slide: 0.9 });
    // ...under a crackle of grease spits that thins out as it calms down
    for (let i = 0; i < 26; i++) {
      const dt = 0.04 + Math.pow(i / 26, 1.5) * 0.92 + scatter(i) * 0.02;
      hiss(v, { t: t + dt, d: 0.006 + (i % 3) * 0.004, peak: 0.36 - dt * 0.28, type: 'bandpass', f: 2200 + scatter(i + 5) * 5200, q: 2.4 });
      if (i % 5 === 2) tone(v, { wave: 'sine', t: t + dt, f: 1200 * p, to: 2300 * p, slide: 0.015, a: 0.001, d: 0.02, peak: 0.05 });
    }
  },

  dunk: (v, t, p) => {
    // the wire basket swings down (whoosh + a metal clink)...
    hiss(v, { t, a: 0.05, d: 0.09, peak: 0.3, type: 'bandpass', f: 500 * p, to: 2200 * p, slide: 0.12, q: 1.1 });
    tone(v, { wave: 'triangle', t: t + 0.09, f: 2350 * p, a: 0.001, d: 0.09, peak: 0.06 });
    tone(v, { wave: 'triangle', t: t + 0.097, f: 3120 * p, a: 0.001, d: 0.07, peak: 0.05 });
    // ...plunges in...
    const at = t + 0.11;
    hiss(v, { t: at, d: 0.07, peak: 0.32, type: 'lowpass', f: 1000 });
    tone(v, { wave: 'sine', t: at, f: 170 * p, to: 70 * p, slide: 0.08, a: 0.002, d: 0.1, peak: 0.2 });
    tone(v, { wave: 'triangle', t: at, f: 380 * p, to: 200 * p, slide: 0.05, a: 0.002, d: 0.05, peak: 0.07 });
    // ...and the oil roars up into a big rolling boil that settles
    hiss(v, { t: at + 0.01, a: 0.06, hold: 0.28, d: 0.6, peak: 0.38, type: 'bandpass', f: 800 * p, to: 2800 * p, slide: 0.2, q: 0.7 });
    hiss(v, { t: at + 0.03, a: 0.08, hold: 0.25, d: 0.55, peak: 0.15, type: 'highpass', f: 4500 });
    for (let i = 0; i < 22; i++) {
      const dt = 0.03 + Math.pow(i / 22, 1.3) * 0.8 + scatter(i) * 0.03;
      const f = (320 + scatter(i + 4) * 620) * p;
      tone(v, { wave: 'sine', t: at + dt, f, to: f * 2.2, slide: 0.025, a: 0.002, d: 0.035, peak: 0.11 - dt * 0.08 });
    }
  },

  lift: (v, t, p) => {
    // the basket rises out of the oil (the boil drops away)...
    hiss(v, { t, a: 0.01, d: 0.16, peak: 0.28, type: 'bandpass', f: 2400 * p, to: 900 * p, slide: 0.15, q: 0.8 });
    // ...is shaken three times over the well (metal rattles, each softer)...
    [0, 0.09, 0.17].forEach((dt, i) => {
      const at = t + 0.06 + dt;
      const k = 1 - i * 0.22;
      hiss(v, { t: at, d: 0.03, peak: 0.6 * k, type: 'bandpass', f: (3000 + i * 300) * p, q: 2 });
      tone(v, { wave: 0.5, t: at, f: 1450 * p, a: 0.001, d: 0.07, peak: 0.1 * k, lp: 4000 });
      tone(v, { wave: 0.5, t: at, f: 1532 * p, a: 0.001, d: 0.06, peak: 0.1 * k, lp: 4000 });
      tone(v, { wave: 'triangle', t: at + 0.012, f: (2900 - i * 120) * p, a: 0.001, d: 0.05, peak: 0.12 * k });
    });
    // ...and the last oil drips back in, each drop hissing on the hot surface
    [0.29, 0.36, 0.44, 0.52].forEach((dt, i) => {
      const at = t + dt;
      tone(v, { wave: 'sine', t: at, f: (900 + i * 130) * p, to: (1900 + i * 200) * p, slide: 0.025, a: 0.001, d: 0.035, peak: 0.2 - i * 0.03 });
      hiss(v, { t: at + 0.01, d: 0.03, peak: 0.14 - i * 0.02, type: 'highpass', f: 5000 });
    });
  },
};
