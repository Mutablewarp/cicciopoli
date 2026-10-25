/**
 * Level 7 "CICCIO'S KITCHEN" sound effects: griddle sizzle, spatula flip, fryer basket, PERFETTO
 * timer ding, burning warning, topping plop, sauce squeeze, paper wrap, tray served, till, happy and
 * unhappy customer, shop doorbell, bin lid and the YOU ARE SO GOLDEN fanfare.
 * Same recipe contract as sfx.ts, which spreads this table into SFX. Plop, sizzle and flip fire every
 * few seconds over the 'kitchen' track, so they stay short and soft; ding is the reward cue.
 */
import { hiss, tone, type Voice } from './synth';
import { hz } from './theory';
import type { Recipe } from './sfx';

export type KitchenSfx =
  | 'sizzle' | 'flip' | 'fry' | 'ding' | 'burn' | 'plop' | 'squeeze' | 'wrap' | 'serve' | 'cash'
  | 'yum' | 'grumble' | 'doorbell' | 'trash' | 'golden';

/** Each topping lands a little higher than the last (the stack grows), wrapping after six. */
const plop: Recipe = (() => {
  let n = 0;
  return (v, t, p) => {
    const q = p * (1 + (n++ % 6) * 0.06);
    // squishy pop: a sine "bloop" bending up over a soft wet thud
    tone(v, { wave: 'sine', t, f: 300 * q, to: 720 * q, slide: 0.045, a: 0.002, d: 0.09, peak: 0.3 });
    tone(v, { wave: 'triangle', t, f: 600 * q, to: 1300 * q, slide: 0.04, a: 0.002, d: 0.05, peak: 0.07 });
    hiss(v, { t, d: 0.05, peak: 0.25, type: 'lowpass', f: 900 });
  };
})();

/** Two slightly detuned saws whose lowpass opens over the note: a small brass section. */
function brass(v: Voice, t: number, f: number, hold: number, d: number, peak: number, vib?: readonly [number, number]): void {
  const o = { wave: 'sawtooth', t, hold, d, lp: 1300, lpTo: 3400, vib } as const;
  tone(v, { ...o, f, a: 0.025, peak });
  tone(v, { ...o, f: f * 1.005, a: 0.032, peak: peak * 0.7 });
}

export const KITCHEN_SFX: Readonly<Record<KitchenSfx, Recipe>> = {
  sizzle: (v, t, p) => {
    // patty slapping onto the hot steel...
    tone(v, { wave: 'triangle', t, f: 210 * p, to: 95 * p, slide: 0.05, a: 0.001, d: 0.07, peak: 0.16 });
    hiss(v, { t, d: 0.06, peak: 0.3, type: 'lowpass', f: 1200 });
    // ...the "tsss" flash of steam, then a fat-spitting bed that fades over ~0.7 s
    hiss(v, { t, a: 0.004, d: 0.14, peak: 0.45, type: 'bandpass', f: 2600 * p, q: 0.7 });
    hiss(v, { t: t + 0.02, a: 0.03, hold: 0.18, d: 0.45, peak: 0.22, type: 'highpass', f: 4200 * p, to: 6500 * p, slide: 0.6 });
    for (let i = 0; i < 16; i++) {
      const dt = 0.04 + ((i * 0.293) % 0.62);
      hiss(v, { t: t + dt, d: 0.008 + (i % 3) * 0.004, peak: 0.34 - dt * 0.35, type: 'bandpass', f: 2400 + ((i * 1900) % 5200), q: 2.2 });
    }
  },

  flip: (v, t, p) => {
    // spatula blade scraping under the patty (resonant noise sweeping up, a glint of metal)...
    hiss(v, { t, a: 0.01, d: 0.08, peak: 0.6, type: 'bandpass', f: 1400 * p, to: 3800 * p, slide: 0.08, q: 2.5 });
    tone(v, { wave: 'triangle', t, f: 2900 * p, to: 3400 * p, slide: 0.07, a: 0.003, d: 0.06, peak: 0.07 });
    // ...a soft slap as it lands on the raw side, and the griddle hissing again
    const land = t + 0.13;
    tone(v, { wave: 'triangle', t: land, f: 240 * p, to: 110 * p, slide: 0.05, a: 0.001, d: 0.08, peak: 0.36 });
    tone(v, { wave: 'triangle', t: land, f: 520 * p, to: 300 * p, slide: 0.04, a: 0.001, d: 0.04, peak: 0.1 }); // slap body on phone speakers
    hiss(v, { t: land, d: 0.05, peak: 0.55, type: 'lowpass', f: 1500 });
    hiss(v, { t: land + 0.01, a: 0.02, d: 0.16, peak: 0.2, type: 'highpass', f: 4500 });
  },

  fry: (v, t, p) => {
    // wire basket clinking into the fryer...
    tone(v, { wave: 'triangle', t, f: 2350 * p, a: 0.001, d: 0.09, peak: 0.07 });
    tone(v, { wave: 'triangle', t: t + 0.008, f: 3120 * p, a: 0.001, d: 0.07, peak: 0.05 });
    // ...then the oil erupts: a bubbling noise swell that opens up and settles
    hiss(v, { t: t + 0.03, a: 0.12, hold: 0.22, d: 0.5, peak: 0.42, type: 'bandpass', f: 700 * p, to: 2600 * p, slide: 0.18, q: 0.9 });
    hiss(v, { t: t + 0.05, a: 0.1, hold: 0.2, d: 0.45, peak: 0.16, type: 'highpass', f: 5000 });
    for (let i = 0; i < 12; i++) {
      const dt = 0.08 + ((i * 0.317) % 0.7);
      const f = (420 + ((i * 230) % 520)) * p;
      tone(v, { wave: 'sine', t: t + dt, f, to: f * 2.1, slide: 0.025, a: 0.002, d: 0.035, peak: 0.1 - dt * 0.06 });
    }
  },

  ding: (v, t, p) => {
    // PERFETTO: a quick grace note, then the kitchen-timer bell rings out clean and long
    tone(v, { wave: 'sine', t, f: hz('E6') * p, a: 0.002, d: 0.08, peak: 0.1 });
    const at = t + 0.06;
    const f = hz('A6') * p;
    hiss(v, { t: at, d: 0.018, peak: 0.25, type: 'highpass', f: 6000 });
    tone(v, { wave: 'sine', t: at, f, a: 0.002, d: 0.85, peak: 0.24 });
    tone(v, { wave: 'sine', t: at, f: f * 2, a: 0.002, d: 0.35, peak: 0.07 });
    // the slightly inharmonic partial is what makes it read as a struck bell
    tone(v, { wave: 'sine', t: at, f: f * 2.76, a: 0.001, d: 0.18, peak: 0.05 });
    tone(v, { wave: 'triangle', t: at, f: f / 2, a: 0.003, d: 0.5, peak: 0.06 });
    ['E7', 'A7', 'C#8'].forEach((n, i) => tone(v, { wave: 'triangle', t: at + 0.05 + i * 0.045, f: hz(n) * p, a: 0.002, d: 0.14, peak: 0.04 }));
  },

  burn: (v, t, p) => {
    // dark smoky crackle (lower than the sizzle)...
    hiss(v, { t, a: 0.05, hold: 0.15, d: 0.3, peak: 0.3, type: 'bandpass', f: 900, to: 500, slide: 0.5, q: 1.2 });
    for (let i = 0; i < 8; i++) {
      hiss(v, { t: t + 0.03 + ((i * 0.211) % 0.45), d: 0.012, peak: 0.22, type: 'bandpass', f: 1300 + ((i * 700) % 1600), q: 2 });
    }
    // ...under a gentle "uh-oh" warning: two soft blips falling a fourth
    [hz('E6'), hz('B5')].forEach((f, i) => {
      const at = t + 0.04 + i * 0.16;
      tone(v, { wave: 0.5, t: at, f: f * p, a: 0.004, hold: 0.05, d: 0.06, peak: 0.07, lp: 2400 });
      tone(v, { wave: 'triangle', t: at, f: f * p, a: 0.004, hold: 0.05, d: 0.08, peak: 0.1 });
    });
  },

  plop,

  squeeze: (v, t, p) => {
    // squeezy bottle: air through the nozzle and a rising squelch of sauce...
    hiss(v, { t, a: 0.02, hold: 0.1, d: 0.08, peak: 0.46, type: 'bandpass', f: 900 * p, to: 2200 * p, slide: 0.2, q: 4 });
    tone(v, { wave: 'sawtooth', t, f: 150 * p, to: 230 * p, slide: 0.2, a: 0.015, hold: 0.1, d: 0.08, peak: 0.12, lp: 900, vib: [80, 22] });
    tone(v, { wave: 'sine', t: t + 0.03, f: 500 * p, to: 950 * p, slide: 0.17, a: 0.02, hold: 0.06, d: 0.08, peak: 0.08 });
    // ...then a soft splat on the bun
    const splat = t + 0.22;
    hiss(v, { t: splat, d: 0.07, peak: 0.4, type: 'lowpass', f: 1100 });
    tone(v, { wave: 'sine', t: splat, f: 420 * p, to: 180 * p, slide: 0.05, a: 0.002, d: 0.07, peak: 0.14 });
  },

  wrap: (v, t, p) => {
    // Ciccio's paper folded round the burger: a soft rustle under irregular crinkles...
    hiss(v, { t, a: 0.04, hold: 0.18, d: 0.15, peak: 0.24, type: 'bandpass', f: 3000 * p, q: 0.8 });
    for (let i = 0; i < 14; i++) {
      const dt = i * 0.029 + (i % 3) * 0.011 + ((i * 7) % 5) * 0.004;
      hiss(v, { t: t + dt, d: 0.012 + (i % 4) * 0.006, peak: 0.64 - i * 0.017, type: 'bandpass', f: (2200 + ((i * 1700) % 4200)) * p, q: 1.8 });
    }
    // ...and the last fold pressed flat
    hiss(v, { t: t + 0.4, d: 0.04, peak: 0.42, type: 'bandpass', f: 1500 * p, q: 1 });
  },

  serve: (v, t, p) => {
    // tray sliding over the steel counter (friction rasp) with an air whoosh towards the customer...
    hiss(v, { t, a: 0.03, hold: 0.14, d: 0.1, peak: 0.36, type: 'bandpass', f: 1100 * p, to: 1600 * p, slide: 0.25, q: 2.5 });
    hiss(v, { t, a: 0.08, d: 0.2, peak: 0.85, type: 'bandpass', f: 500 * p, to: 3200 * p, slide: 0.24, q: 1.1 });
    // ...landing with a light clack
    const land = t + 0.3;
    tone(v, { wave: 'triangle', t: land, f: 760 * p, to: 380 * p, slide: 0.04, a: 0.001, d: 0.07, peak: 0.23 });
    tone(v, { wave: 'triangle', t: land, f: 1530 * p, a: 0.001, d: 0.05, peak: 0.07 });
    hiss(v, { t: land, d: 0.03, peak: 0.42, type: 'bandpass', f: 2000, q: 1.5 });
  },

  cash: (v, t, p) => {
    // till: two key clacks, the drawer rolling out, the bell "ching" and coins settling in the tray
    [0, 0.06].forEach((dt) => hiss(v, { t: t + dt, d: 0.025, peak: 0.45, type: 'bandpass', f: 1800 * p, q: 3 }));
    hiss(v, { t: t + 0.1, a: 0.02, d: 0.09, peak: 0.25, type: 'bandpass', f: 700 * p, to: 1300 * p, q: 2 });
    const ching = t + 0.16;
    tone(v, { wave: 'sine', t: ching, f: hz('E7') * p, a: 0.001, d: 0.6, peak: 0.2 });
    tone(v, { wave: 'sine', t: ching, f: hz('E7') * 2.4 * p, a: 0.001, d: 0.2, peak: 0.04 });
    tone(v, { wave: 'triangle', t: ching, f: hz('B6') * p, a: 0.001, d: 0.35, peak: 0.14 });
    [0.2, 0.26, 0.31, 0.37, 0.44].forEach((dt, i) =>
      tone(v, { wave: 'triangle', t: t + dt, f: (3500 + ((i * 1300) % 2400)) * p, a: 0.001, d: 0.05, peak: 0.06 - i * 0.006 }),
    );
  },

  yum: (v, t, p) => {
    // cartoon "mmm-MMH!": a closed-mouth hum (nasal saw behind a low lowpass) rising a fourth...
    const hum = { wave: 'sawtooth', a: 0.03, lp: 1100, vib: [22, 6] } as const;
    tone(v, { ...hum, t, f: hz('G4') * p, hold: 0.12, d: 0.08, peak: 0.16 });
    tone(v, { ...hum, t: t + 0.22, f: hz('C5') * p, to: hz('D5') * p, slide: 0.3, hold: 0.16, d: 0.2, peak: 0.2 });
    tone(v, { wave: 'sine', t, f: hz('G5') * p, a: 0.03, hold: 0.12, d: 0.08, peak: 0.05 });
    tone(v, { wave: 'sine', t: t + 0.22, f: hz('C6') * p, to: hz('D6') * p, slide: 0.3, a: 0.03, hold: 0.16, d: 0.2, peak: 0.06 });
    // ...with a little twinkle of delight
    ['G6', 'C7'].forEach((n, i) => tone(v, { wave: 'triangle', t: t + 0.45 + i * 0.05, f: hz(n) * p, a: 0.002, d: 0.12, peak: 0.05 }));
  },

  grumble: (v, t, p) => {
    // grumpy "mm-mph": two low growled syllables sagging downwards (the fast wobble is the growl)
    const growl = { wave: 'sawtooth', a: 0.03, lp: 800, vib: [55, 13] } as const;
    tone(v, { ...growl, t, f: 196 * p, to: 175 * p, slide: 0.2, hold: 0.1, d: 0.1, peak: 0.2 });
    tone(v, { ...growl, t: t + 0.26, f: 165 * p, to: 117 * p, slide: 0.35, hold: 0.14, d: 0.22, peak: 0.22, lpTo: 400 });
    tone(v, { wave: 'triangle', t: t + 0.26, f: 330 * p, to: 233 * p, slide: 0.35, a: 0.03, hold: 0.14, d: 0.2, peak: 0.07 });
    hiss(v, { t: t + 0.26, a: 0.04, d: 0.15, peak: 0.08, type: 'lowpass', f: 600 }); // breathy huff
  },

  doorbell: (v, t, p) => {
    // shop door chime "din-don": two struck bars a major third apart (lower and slower than the L6 "grazie")
    [hz('B5'), hz('G5')].forEach((f, i) => {
      const at = t + i * 0.3;
      const d = i ? 0.62 : 0.4;
      tone(v, { wave: 'sine', t: at, f: f * p, a: 0.002, d, peak: 0.22 });
      tone(v, { wave: 'sine', t: at, f: f * 2 * p, a: 0.002, d: d * 0.4, peak: 0.05 });
      tone(v, { wave: 'triangle', t: at, f: (f / 2) * p, a: 0.003, d: d * 0.8, peak: 0.08 });
      hiss(v, { t: at, d: 0.012, peak: 0.1, type: 'highpass', f: 5000 });
    });
  },

  trash: (v, t, p) => {
    // the item thuds into the bin...
    tone(v, { wave: 'sine', t, f: 150 * p, to: 70 * p, slide: 0.08, a: 0.002, d: 0.1, peak: 0.3 });
    hiss(v, { t, d: 0.05, peak: 0.5, type: 'lowpass', f: 900 });
    // ...then the pedal lid clanks shut (detuned pair = tin) and rattles to rest
    const lid = t + 0.1;
    hiss(v, { t: lid, d: 0.04, peak: 0.56, type: 'bandpass', f: 2600 * p, q: 1.2 });
    tone(v, { wave: 0.5, t: lid, f: 640 * p, a: 0.001, d: 0.22, peak: 0.11, lp: 3500 });
    tone(v, { wave: 0.5, t: lid, f: 683 * p, a: 0.001, d: 0.2, peak: 0.1, lp: 3500 });
    tone(v, { wave: 'triangle', t: lid, f: 1710 * p, a: 0.001, d: 0.25, peak: 0.11 });
    [0.12, 0.19, 0.24].forEach((dt, i) =>
      tone(v, { wave: 'triangle', t: lid + dt, f: (1180 - i * 60) * p, a: 0.001, d: 0.04, peak: 0.1 - i * 0.02 }),
    );
  },

  golden: (v, t, p) => {
    // YOU ARE SO GOLDEN: "ta-ta-ta TAAA" up the C chord...
    ['G4', 'C5', 'E5'].forEach((n, i) => brass(v, t + i * 0.1, hz(n) * p, 0.03, 0.05, 0.13));
    brass(v, t + 0.3, hz('G5') * p, 0.22, 0.2, 0.15);
    tone(v, { wave: 'triangle', t: t + 0.3, f: hz('C3') * p, a: 0.01, hold: 0.2, d: 0.2, peak: 0.14 });
    // ...then the bVI - bVII - I climb, each step a full chord over its bass, landing on a long C6
    const steps = [
      ['Ab5', ['Ab4', 'C5', 'Eb5'], 'Ab2'],
      ['Bb5', ['Bb4', 'D5', 'F5'], 'Bb2'],
      ['C6', ['C5', 'E5', 'G5'], 'C3'],
    ] as const;
    steps.forEach(([top, chord, root], i) => {
      const at = t + 0.8 + i * 0.25;
      const last = i === 2;
      const hold = last ? 0.95 : 0.12;
      const d = last ? 0.75 : 0.1;
      brass(v, at, hz(top) * p, hold, d, 0.15, last ? [16, 5.5] : undefined);
      chord.forEach((n) => tone(v, { wave: 'sawtooth', t: at, f: hz(n) * p, a: 0.03, hold, d, peak: 0.045, lp: 2000 }));
      tone(v, { wave: 'triangle', t: at, f: hz(root) * p, a: 0.01, hold, d, peak: 0.14 });
    });
    // cymbal swelling into the landing, and golden sparkles raining over the held chord
    hiss(v, { t: t + 0.7, a: 0.6, hold: 0.1, d: 1.2, peak: 0.12, type: 'highpass', f: 5000 });
    hiss(v, { t: t + 1.3, d: 0.9, peak: 0.06, type: 'bandpass', f: 9000, q: 2 });
    for (let i = 0; i < 14; i++) {
      const n = ['C7', 'G7', 'E7', 'C8', 'G7', 'E8', 'C8'][i % 7];
      tone(v, { wave: 'triangle', t: t + 1.32 + i * 0.09, f: hz(n) * p, a: 0.002, d: 0.18, peak: 0.045 - i * 0.002 });
    }
  },
};
