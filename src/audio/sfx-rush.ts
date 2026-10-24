/**
 * Level 6 "CICCIO'S RUSH" sound effects: lane whoosh, brake squeal, cartoon crash, delivery
 * cha-ching, combo blip, power expiring, Fiat horn, rocket booster, new record fanfare.
 * Same recipe contract as sfx.ts, which spreads this table into SFX. Played over the busiest
 * track, so they stay short, mid-band (phone speakers) and soft on the ones repeated every second.
 */
import { hiss, tone } from './synth';
import { hz } from './theory';
import type { Recipe } from './sfx';

export type RushSfx = 'lane' | 'brake' | 'crash' | 'deliver' | 'combo' | 'expire' | 'horn' | 'jet' | 'record';

export const RUSH_SFX: Readonly<Record<RushSfx, Recipe>> = {
  lane: (v, t, p) => {
    // tyre whoosh: band-passed noise sweeping up as the van swerves, over a soft engine "vrm"
    hiss(v, { t, a: 0.05, d: 0.12, peak: 0.7, type: 'bandpass', f: 450 * p, to: 1900 * p, slide: 0.08, q: 1.3 });
    tone(v, { wave: 'triangle', t, f: 110 * p, to: 150 * p, slide: 0.08, a: 0.02, d: 0.1, peak: 0.12 });
    // soft bump of the tyres rolling over the lane line
    hiss(v, { t: t + 0.07, d: 0.03, peak: 0.25, type: 'lowpass', f: 700 });
  },

  brake: (v, t, p) => {
    // cartoon squeal: two detuned triangles beating with a fast wobble and sagging in pitch, over rubber scrub
    const squeal = { t, slide: 0.3, a: 0.02, hold: 0.12, d: 0.2, vib: [35, 19] } as const;
    tone(v, { ...squeal, wave: 'triangle', f: 1480 * p, to: 1180 * p, peak: 0.11 });
    tone(v, { ...squeal, wave: 'triangle', f: 1532 * p, to: 1215 * p, peak: 0.09 });
    hiss(v, { t, a: 0.02, hold: 0.1, d: 0.18, peak: 0.35, type: 'bandpass', f: 2200 * p, to: 1500 * p, q: 2 });
  },

  crash: (v, t, p) => {
    // cartoon "bonk": hollow falling knock over a soft thud (no glass, nothing above the mid band)...
    tone(v, { wave: 'triangle', t, f: 620 * p, to: 210 * p, slide: 0.09, a: 0.001, d: 0.14, peak: 0.34 });
    tone(v, { wave: 'sine', t, f: 190 * p, to: 70 * p, slide: 0.12, a: 0.002, d: 0.2, peak: 0.3 });
    hiss(v, { t, d: 0.08, peak: 0.6, type: 'lowpass', f: 1400 });
    // ...then a hubcap wobbling to rest: tinny clanks coming faster and quieter
    [0.12, 0.22, 0.3, 0.365, 0.42, 0.465, 0.5].forEach((dt, i) => {
      tone(v, { wave: 'triangle', t: t + dt, f: (880 + (i % 2) * 120) * p, a: 0.001, d: 0.05, peak: 0.13 - i * 0.012 });
      hiss(v, { t: t + dt, d: 0.025, peak: 0.4 - i * 0.04, type: 'bandpass', f: 1700 * p, q: 3 });
    });
  },

  deliver: (v, t, p) => {
    // cash register "cha-ching": drawer rattle, a bell, then the customer's two-note "gra-zie" ding-dong
    hiss(v, { t, d: 0.05, peak: 0.5, type: 'bandpass', f: 3200 * p, q: 1.5 });
    hiss(v, { t: t + 0.04, d: 0.04, peak: 0.4, type: 'bandpass', f: 2400 * p, q: 2 });
    const ching = t + 0.08;
    tone(v, { wave: 'sine', t: ching, f: hz('C7') * p, a: 0.001, d: 0.32, peak: 0.12 });
    tone(v, { wave: 'sine', t: ching, f: hz('E7') * p, a: 0.001, d: 0.26, peak: 0.08 });
    tone(v, { wave: 'triangle', t: ching, f: hz('G6') * p, a: 0.001, d: 0.2, peak: 0.1 });
    [hz('E6'), hz('C6')].forEach((f, i) => {
      const at = t + 0.36 + i * 0.16;
      tone(v, { wave: 'triangle', t: at, f: f * p, a: 0.002, d: i ? 0.35 : 0.16, peak: 0.28 });
      tone(v, { wave: 'sine', t: at, f: (f / 2) * p, a: 0.002, d: i ? 0.3 : 0.14, peak: 0.1 });
      tone(v, { wave: 'sine', t: at, f: f * 2 * p, a: 0.002, d: 0.12, peak: 0.06 });
    });
  },

  combo: (v, t, p) => {
    // rising blip with a sparkle on top
    tone(v, { wave: 0.25, t, f: 660 * p, to: 1320 * p, slide: 0.06, a: 0.002, hold: 0.02, d: 0.07, peak: 0.16 });
    tone(v, { wave: 'triangle', t, f: 330 * p, to: 660 * p, slide: 0.06, a: 0.002, hold: 0.02, d: 0.06, peak: 0.12 });
    tone(v, { wave: 'triangle', t: t + 0.055, f: 1980 * p, a: 0.002, d: 0.08, peak: 0.1 });
  },

  expire: (v, t, p) => {
    // power running out: three bubbles popping upwards, each one lower than the last
    [880, 660, 494].forEach((f, i) => {
      const at = t + i * 0.1;
      tone(v, { wave: 'sine', t: at, f: f * p, to: f * 1.7 * p, slide: 0.05, a: 0.003, d: 0.08, peak: 0.26 - i * 0.03 });
      tone(v, { wave: 'triangle', t: at, f: (f / 2) * p, to: (f / 1.2) * p, slide: 0.05, a: 0.003, d: 0.05, peak: 0.08 });
    });
  },

  horn: (v, t, p) => {
    // little Fiat "beep-beep": two short nasal honks, two reeds a major third apart like a real horn
    for (const dt of [0, 0.16]) {
      const honk = { t: t + dt, a: 0.006, hold: 0.08, d: 0.05, lp: 2400 } as const;
      tone(v, { ...honk, wave: 0.3, f: 415 * p, peak: 0.13 });
      tone(v, { ...honk, wave: 0.3, f: 523 * p, peak: 0.11 });
    }
  },

  jet: (v, t, p) => {
    // rocket booster: ignition spark, a whoosh opening up, the turbine spooling up and a rumble under it all
    hiss(v, { t, d: 0.03, peak: 0.5, type: 'highpass', f: 3000 });
    hiss(v, { t: t + 0.02, a: 0.12, hold: 0.2, d: 0.5, peak: 0.5, type: 'lowpass', f: 300 * p, to: 4200 * p, slide: 0.3, q: 1.5 });
    hiss(v, { t: t + 0.05, a: 0.1, hold: 0.35, d: 0.4, peak: 0.45, type: 'lowpass', f: 180, q: 1 });
    tone(v, { wave: 'sawtooth', t: t + 0.05, f: 70 * p, to: 190 * p, slide: 0.5, a: 0.08, hold: 0.3, d: 0.4, peak: 0.12, lp: 600, lpTo: 1500, vib: [40, 13] });
    tone(v, { wave: 'sine', t: t + 0.05, f: 55 * p, to: 48 * p, a: 0.05, hold: 0.35, d: 0.4, peak: 0.17, vib: [60, 9] });
  },

  record: (v, t, p) => {
    // "ta-ta-ta-taaa!": three quick pulses and a held top note in thirds, a bass root and a sparkle
    [['G5', 'E5'], ['G5', 'E5'], ['G5', 'E5'], ['E6', 'C6']].forEach(([top, low], i) => {
      const last = i === 3;
      const o = { t: t + i * 0.1, a: 0.003, hold: last ? 0.15 : 0.04, d: last ? 0.4 : 0.03 } as const;
      tone(v, { ...o, wave: 0.25, f: hz(top) * p, peak: 0.2, vib: last ? [18, 7] : undefined });
      tone(v, { ...o, wave: 'triangle', f: hz(low) * p, peak: 0.12 });
    });
    tone(v, { wave: 'triangle', t: t + 0.3, f: hz('C4') * p, a: 0.004, hold: 0.1, d: 0.35, peak: 0.22 });
    [2637, 3136, 4186].forEach((f, i) => tone(v, { wave: 'triangle', t: t + 0.32 + i * 0.05, f: f * p, a: 0.002, d: 0.15, peak: 0.06 }));
  },
};
