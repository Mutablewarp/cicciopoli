/**
 * Level 8 "CICCIO'S GOLDEN TICKET" sound effects with a vintage cartoon character: slide whistles, struck
 * bells, woodblock ticks, cymbals and a brass section. Same recipe contract as sfx.ts, which spreads this
 * table into SFX. cheese (every 115 ms on auto-fire), nugget (125 ms) and bossHit (up to every 90 ms) fire
 * over the big band all fight long, so they stay under 0.1 s, mid-band and soft; ticket is the ~3 s finale.
 */
import { hiss, tone, type Voice } from './synth';
import { hz } from './theory';
import type { Recipe } from './sfx';

export type CartoonSfx =
  | 'cheese' | 'lob' | 'blast' | 'nugget' | 'friesRain' | 'ex' | 'parry' | 'dash' | 'bossHit'
  | 'knockout' | 'roundBell' | 'cardFull' | 'ticket' | 'oof' | 'phase';

/** Slide whistle: a pure gliding tone with the breath noise following it. Lasts `dur` + 0.02 s. */
function whistle(v: Voice, t: number, f: number, to: number, dur: number, peak: number): void {
  const hold = Math.max(0, dur - 0.1);
  tone(v, { wave: 'sine', t, f, to, slide: dur, a: 0.02, hold, d: 0.1, peak, vib: [15, 6] });
  hiss(v, { t, a: 0.02, hold, d: 0.1, peak: peak * 1.4, type: 'bandpass', f, to, slide: dur, q: 9 });
}

/** Struck bell: inharmonic partials, the higher ones dying sooner, a slow beat for the shimmer. */
function bell(v: Voice, t: number, f: number, d: number, peak: number): void {
  tone(v, { wave: 'sine', t, f, a: 0.001, d, peak });
  tone(v, { wave: 'sine', t, f: f * 1.004, a: 0.001, d: d * 0.8, peak: peak * 0.5 });
  tone(v, { wave: 'sine', t, f: f * 2.76, a: 0.001, d: d * 0.4, peak: peak * 0.35 });
  tone(v, { wave: 'sine', t, f: f * 5.4, a: 0.001, d: d * 0.2, peak: peak * 0.12 });
}

/** One brass-section voice: two detuned saws, the lowpass opening over the note; `fall` < 1 sags the pitch. */
function horn(v: Voice, t: number, f: number, hold: number, d: number, peak: number, fall = 1): void {
  const o = { wave: 'sawtooth', t, hold, d, lp: 1100, lpTo: 3400 } as const;
  tone(v, { ...o, f, to: f * fall, a: 0.02, peak });
  tone(v, { ...o, f: f * 1.006, to: f * 1.006 * fall, a: 0.028, peak: peak * 0.7 });
}

const chord = (v: Voice, t: number, names: readonly string[], p: number, hold: number, d: number, peak: number, fall = 1): void =>
  names.forEach((n) => horn(v, t, hz(n) * p, hold, d, peak, fall));

/** Kick-drum thump under a hit. */
const thump = (v: Voice, t: number, peak: number, d = 0.28): void =>
  tone(v, { wave: 'sine', t, f: 140, to: 45, slide: 0.18, a: 0.001, d, peak });

const crash = (v: Voice, t: number, d: number, peak: number): void => {
  hiss(v, { t, a: 0.002, d, peak, type: 'highpass', f: 4200 });
  hiss(v, { t, d: d * 0.35, peak: peak * 0.6, type: 'bandpass', f: 3000, q: 0.6 });
};

export const CARTOON_SFX: Readonly<Record<CartoonSfx, Recipe>> = {
  cheese: (v, t, p) => {
    // a provola pinged off a spring: a rubbery "boip" bending up with a quick wobble, over a tight click
    tone(v, { wave: 'sine', t, f: 430 * p, to: 1000 * p, slide: 0.04, a: 0.002, d: 0.07, peak: 0.13, vib: [70, 32] });
    tone(v, { wave: 'triangle', t, f: 860 * p, to: 2000 * p, slide: 0.035, a: 0.002, d: 0.04, peak: 0.04 });
    hiss(v, { t, d: 0.014, peak: 0.15, type: 'bandpass', f: 2600, q: 2 });
  },

  lob: (v, t, p) => {
    // the cork pops out of the cannon (a hollow "thoonk")...
    hiss(v, { t, d: 0.03, peak: 0.6, type: 'bandpass', f: 1100 * p, q: 1.6 });
    tone(v, { wave: 'sine', t, f: 620 * p, to: 240 * p, slide: 0.04, a: 0.001, d: 0.06, peak: 0.26 });
    // ...and the meatball whistles up its arc
    whistle(v, t + 0.04, 760 * p, 1600 * p, 0.24, 0.09);
  },

  blast: (v, t, p) => {
    // cartoon KA-BOOM: a crack, a low noise body rolling off over a sub drop, then a puff of smoke
    hiss(v, { t, d: 0.04, peak: 0.55, type: 'bandpass', f: 1500, q: 0.8 });
    hiss(v, { t, a: 0.004, hold: 0.06, d: 0.55, peak: 0.85, type: 'lowpass', f: 2600 * p, to: 110, slide: 0.5, q: 1 });
    tone(v, { wave: 'sine', t, f: 120 * p, to: 36 * p, slide: 0.35, a: 0.002, d: 0.45, peak: 0.4 });
    tone(v, { wave: 'triangle', t, f: 260 * p, to: 80 * p, slide: 0.12, a: 0.001, d: 0.14, peak: 0.2 });
    hiss(v, { t: t + 0.18, a: 0.06, d: 0.3, peak: 0.16, type: 'bandpass', f: 700, to: 300, q: 1.2 });
  },

  nugget: (v, t, p) => {
    // zip! a nugget flicked off: a resonant noise sweep with a thin chirp going up
    hiss(v, { t, a: 0.006, d: 0.06, peak: 0.36, type: 'bandpass', f: 1300 * p, to: 5200 * p, slide: 0.06, q: 3 });
    tone(v, { wave: 'triangle', t, f: 1000 * p, to: 2800 * p, slide: 0.06, a: 0.003, d: 0.05, peak: 0.06 });
    tone(v, { wave: 'sine', t, f: 500 * p, to: 900 * p, slide: 0.04, a: 0.002, d: 0.035, peak: 0.1 });
  },

  friesRain: (v, t, p) => {
    // PIOGGIA DI PATATINE: the box tips over with a slide whistle falling from the sky...
    whistle(v, t, 1900 * p, 440 * p, 0.6, 0.11);
    // ...then the fries rattle down on the boss: a shaker bed and a shower of tiny wooden ticks
    hiss(v, { t: t + 0.5, a: 0.12, hold: 0.8, d: 0.5, peak: 0.12, type: 'bandpass', f: 5200, q: 1.1 });
    for (let i = 0; i < 28; i++) {
      const dt = 0.52 + i * 0.048 + ((i * 7) % 5) * 0.007;
      const f = (1300 + ((i * 530) % 1700)) * p;
      const fade = i > 20 ? (i - 20) * 0.006 : 0;
      tone(v, { wave: 'triangle', t: t + dt, f, to: f * 0.8, slide: 0.03, a: 0.001, d: 0.035, peak: 0.07 - fade });
      hiss(v, { t: t + dt, d: 0.012, peak: 0.16 - fade, type: 'bandpass', f: f * 2, q: 4 });
    }
  },

  ex: (v, t, p) => {
    // big brassy BWAMP: a low brass chord sagging off, a kick thump, a crack and a cymbal splash
    chord(v, t, ['Bb2', 'F3', 'Bb3', 'D4'], p, 0.08, 0.3, 0.09, 0.93);
    thump(v, t, 0.45);
    tone(v, { wave: 'triangle', t, f: 300 * p, to: 110 * p, slide: 0.06, a: 0.001, d: 0.08, peak: 0.2 });
    hiss(v, { t, d: 0.06, peak: 0.5, type: 'bandpass', f: 1200, q: 0.9 });
    hiss(v, { t, a: 0.002, d: 0.45, peak: 0.12, type: 'highpass', f: 5000 });
  },

  parry: (v, t, p) => {
    // bright "pling!": a grace note flicking up into a high bell, a sparkle on top
    tone(v, { wave: 'triangle', t, f: hz('B6') * p, a: 0.001, d: 0.04, peak: 0.08 });
    bell(v, t + 0.03, hz('E7') * p, 0.45, 0.16);
    hiss(v, { t: t + 0.03, d: 0.02, peak: 0.2, type: 'highpass', f: 7000 });
    ['B7', 'E8'].forEach((n, i) => tone(v, { wave: 'triangle', t: t + 0.06 + i * 0.04, f: hz(n) * p, a: 0.001, d: 0.1, peak: 0.04 }));
  },

  dash: (v, t, p) => {
    // whoosh: air ripping past (a resonant sweep), a breath of hiss and a rubber-hose "fwip"
    hiss(v, { t, a: 0.05, d: 0.18, peak: 0.7, type: 'bandpass', f: 380 * p, to: 2900 * p, slide: 0.1, q: 1.3 });
    hiss(v, { t: t + 0.02, a: 0.04, d: 0.14, peak: 0.12, type: 'highpass', f: 3500 });
    tone(v, { wave: 'sine', t, f: 300 * p, to: 720 * p, slide: 0.08, a: 0.02, d: 0.1, peak: 0.06 });
  },

  bossHit: (v, t, p) => {
    // THWACK: a slap crack over a hollow body thump
    hiss(v, { t, d: 0.03, peak: 0.45, type: 'bandpass', f: 1800 * p, q: 1.1 });
    tone(v, { wave: 'triangle', t, f: 380 * p, to: 150 * p, slide: 0.045, a: 0.001, d: 0.065, peak: 0.2 });
    hiss(v, { t, d: 0.04, peak: 0.16, type: 'lowpass', f: 900 });
  },

  knockout: (v, t, p) => {
    // AL TAPPETO! the ring bell "ding-ding"...
    [0, 0.22].forEach((dt, i) => {
      hiss(v, { t: t + dt, d: 0.012, peak: 0.25, type: 'highpass', f: 5000 });
      bell(v, t + dt, 1020 * p, i ? 0.9 : 0.35, 0.2);
    });
    // ...a cymbal crash on a kick and the brass sting "ta-DAAA"
    crash(v, t + 0.44, 1, 0.3);
    thump(v, t + 0.44, 0.35, 0.3);
    chord(v, t + 0.44, ['F4', 'Bb4', 'D5'], p, 0.06, 0.08, 0.08);
    chord(v, t + 0.62, ['F4', 'Bb4', 'D5', 'F5'], p, 0.4, 0.45, 0.07);
  },

  roundBell: (v, t, p) => {
    // DING: the boxing-ring bell, struck once and left to ring
    hiss(v, { t, d: 0.012, peak: 0.25, type: 'highpass', f: 5000 });
    bell(v, t, 1020 * p, 0.9, 0.2);
  },

  cardFull: (v, t, p) => {
    // a playing card flicked over (a paper "fwip" and two snaps)...
    hiss(v, { t, a: 0.01, d: 0.05, peak: 0.35, type: 'bandpass', f: 2200 * p, to: 4800 * p, slide: 0.05, q: 1.5 });
    [0, 0.055].forEach((dt) => hiss(v, { t: t + dt, d: 0.014, peak: 0.4, type: 'bandpass', f: 3600 * p, q: 3 }));
    // ...and a two-note celesta chime up a fifth
    ['C7', 'G7'].forEach((n, i) => {
      const at = t + 0.08 + i * 0.08;
      const d = i ? 0.4 : 0.15;
      tone(v, { wave: 'sine', t: at, f: hz(n) * p, a: 0.002, d, peak: 0.17 });
      tone(v, { wave: 'sine', t: at, f: hz(n) * 2 * p, a: 0.002, d: d * 0.3, peak: 0.03 });
      tone(v, { wave: 'triangle', t: at, f: (hz(n) / 2) * p, a: 0.002, d: d * 0.6, peak: 0.05 });
    });
  },

  ticket: (v, t, p) => {
    // BIGLIETTO D'ORO: a snare roll swelling into the big band...
    for (let i = 0; i < 12; i++) hiss(v, { t: t + i * 0.04, d: 0.05, peak: 0.1 + i * 0.018, type: 'bandpass', f: 1900, q: 0.7 });
    // ...a swung "ba-da-ba" pickup, two hits (Bb, Eb6) and the long Bb6/9 "DAAAH" with vibrato
    ['F4', 'G4', 'A4'].forEach((n, i) => horn(v, t + 0.5 + i * 0.1, hz(n) * p, 0.03, 0.05, 0.12));
    const hits = [
      [0.8, ['D4', 'F4', 'Bb4'], 'Bb2'],
      [1.0, ['Eb4', 'G4', 'C5'], 'Eb2'],
    ] as const;
    for (const [dt, notes, root] of hits) {
      chord(v, t + dt, notes, p, 0.05, 0.1, 0.08);
      tone(v, { wave: 'triangle', t: t + dt, f: hz(root) * p, a: 0.005, hold: 0.05, d: 0.1, peak: 0.16 });
      thump(v, t + dt, 0.3, 0.18);
    }
    const at = t + 1.25;
    ['D4', 'F4', 'G4', 'Bb4', 'C5', 'D5'].forEach((n) =>
      tone(v, { wave: 'sawtooth', t: at, f: hz(n) * p, a: 0.03, hold: 1, d: 0.7, peak: 0.05, lp: 1500, lpTo: 3600, vib: [14, 5.5] }),
    );
    tone(v, { wave: 'triangle', t: at, f: hz('Bb1') * p, a: 0.01, hold: 1, d: 0.7, peak: 0.18 });
    crash(v, at, 1.6, 0.22);
    thump(v, at, 0.4);
    // a harp glissando of gold up the Bb pentatonic, then twinkles raining over the held chord
    ['Bb5', 'C6', 'D6', 'F6', 'G6', 'Bb6', 'C7', 'D7', 'F7', 'G7', 'Bb7'].forEach((n, i) =>
      tone(v, { wave: 'triangle', t: at + 0.04 + i * 0.045, f: hz(n) * p, a: 0.002, d: 0.25, peak: 0.05 }),
    );
    for (let i = 0; i < 12; i++) {
      const n = ['F7', 'Bb7', 'D7', 'G7', 'Bb7', 'D8'][i % 6];
      tone(v, { wave: 'sine', t: at + 0.65 + i * 0.085, f: hz(n) * p, a: 0.002, d: 0.16, peak: 0.05 - i * 0.003 });
    }
  },

  oof: (v, t, p) => {
    // cartoon "OOF!": a bonk on the head...
    tone(v, { wave: 'triangle', t, f: 720 * p, to: 260 * p, slide: 0.06, a: 0.001, d: 0.08, peak: 0.26 });
    hiss(v, { t, d: 0.03, peak: 0.4, type: 'bandpass', f: 1400, q: 1.5 });
    // ...a winded grunt sagging down (a lowpassed saw closing like a mouth) and a dizzy slide whistle
    const grunt = { wave: 'sawtooth', t: t + 0.05, a: 0.015, hold: 0.06, d: 0.18, slide: 0.24, lp: 1500, lpTo: 450, vib: [30, 9] } as const;
    tone(v, { ...grunt, f: 240 * p, to: 150 * p, peak: 0.2 });
    tone(v, { ...grunt, f: 480 * p, to: 300 * p, peak: 0.05 });
    whistle(v, t + 0.06, 1400 * p, 520 * p, 0.28, 0.05);
  },

  phase: (v, t, p) => {
    // dramatic "dun-DUNNN": timpani under a low diminished brass chord, hit short then held and sagging
    [0, 0.2].forEach((dt, i) => {
      const long = i === 1;
      chord(v, t + dt, ['C3', 'Eb3', 'Gb3', 'A3'], p, long ? 0.25 : 0.04, long ? 0.45 : 0.08, 0.07, long ? 0.94 : 1);
      tone(v, { wave: 'sine', t: t + dt, f: 98 * p, to: 80 * p, slide: 0.3, a: 0.002, d: long ? 0.55 : 0.15, peak: 0.4 });
      tone(v, { wave: 'triangle', t: t + dt, f: 196 * p, to: 160 * p, slide: 0.1, a: 0.002, d: 0.1, peak: 0.15 });
    });
    crash(v, t + 0.2, 0.7, 0.2);
  },
};
