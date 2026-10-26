/**
 * Level 6 "CICCIO'S RUSH" sound effects: lane whoosh, brake squeal, cartoon crash, delivery
 * cha-ching, combo blip, power expiring, Fiat horn, rocket booster, new record fanfare;
 * v9: SFIORATO! whoosh, fries-trail blips climbing a scale, CATENA! arpeggio, CICCIO FEVER riser + hit.
 * Same recipe contract as sfx.ts, which spreads this table into SFX. Played over the busiest
 * track, so they stay short, mid-band (phone speakers) and soft on the ones repeated every second.
 */
import { hiss, tone, type Voice } from './synth';
import { hz } from './theory';
import type { Recipe } from './sfx';

/** Stereo sweep for a sound passing by (plain mono where StereoPanner is missing, e.g. older iOS). */
function panned(v: Voice, t: number, from: number, to: number, dur: number): Voice {
  if (typeof v.ctx.createStereoPanner !== 'function') return v;
  const pan = v.ctx.createStereoPanner();
  pan.pan.setValueAtTime(from, t);
  pan.pan.linearRampToValueAtTime(to, t + dur);
  pan.connect(v.out);
  return { ctx: v.ctx, out: pan };
}

/** One fry of a trail: a bright blip; calls less than TRAIL_GAP s apart climb the G major scale (it sits on the E minor tune). */
const TRAIL_GAP = 1.2;
const TRAIL_SCALE = ['G5', 'A5', 'B5', 'C6', 'D6', 'E6', 'F#6', 'G6', 'A6', 'B6'].map(hz);
const trail: Recipe = (() => {
  let step = 0;
  let last = -Infinity;
  // no pitch variation: a random ±3% between fries would put the scale out of tune
  return (v, t) => {
    step = t > last && t - last < TRAIL_GAP ? Math.min(step + 1, TRAIL_SCALE.length - 1) : 0;
    last = t;
    const f = TRAIL_SCALE[step];
    tone(v, { wave: 0.25, t, f, a: 0.002, hold: 0.025, d: 0.08, peak: 0.18 });
    tone(v, { wave: 'sine', t, f: f * 2, a: 0.002, d: 0.12, peak: 0.08 });
    tone(v, { wave: 'triangle', t, f: f / 2, a: 0.002, hold: 0.02, d: 0.05, peak: 0.08 });
  };
})();

export type RushSfx = 'lane' | 'brake' | 'crash' | 'deliver' | 'combo' | 'expire' | 'horn' | 'jet' | 'record' | 'nearMiss' | 'trail' | 'chain' | 'fever';

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

  nearMiss: (v, t, p) => {
    // SFIORATO!: the car rips past the ear (right to left in the side view) with a Doppler drop...
    const by = panned(v, t, 0.7, -0.7, 0.24);
    hiss(by, { t, a: 0.07, d: 0.17, peak: 1.2, type: 'bandpass', f: 3400 * p, to: 650 * p, slide: 0.2, q: 1.4 });
    tone(by, { wave: 'sawtooth', t, f: 330 * p, to: 230 * p, slide: 0.16, a: 0.07, d: 0.13, peak: 0.11, lp: 1500, lpTo: 600 });
    // ...and the people on the sidewalk go "uuuh!": a few voices sliding down, a breath under them
    [196, 247, 294, 233].forEach((f, i) => {
      const at = t + 0.11 + i * 0.012;
      tone(v, { wave: 'sawtooth', t: at, f: f * p, to: f * 0.88 * p, a: 0.05, hold: 0.07, d: 0.2, peak: 0.045, lp: 820, vib: [22, 5 + i] });
    });
    hiss(v, { t: t + 0.11, a: 0.05, hold: 0.06, d: 0.18, peak: 0.07, type: 'bandpass', f: 520, q: 1.2 });
  },

  trail,

  chain: (v, t, p) => {
    // CATENA!: a bright run up the G major chord landing on a held, singing top with a sparkle
    ['G5', 'B5', 'D6'].forEach((n, i) => {
      const at = t + i * 0.055;
      tone(v, { wave: 0.25, t: at, f: hz(n) * p, a: 0.002, hold: 0.03, d: 0.06, peak: 0.15 });
      tone(v, { wave: 'triangle', t: at, f: (hz(n) / 2) * p, a: 0.002, hold: 0.03, d: 0.06, peak: 0.1 });
    });
    const top = t + 0.165;
    tone(v, { wave: 0.25, t: top, f: hz('G6') * p, a: 0.003, hold: 0.12, d: 0.3, peak: 0.15, vib: [16, 7] });
    tone(v, { wave: 'triangle', t: top, f: hz('B5') * p, a: 0.003, hold: 0.12, d: 0.3, peak: 0.12 });
    tone(v, { wave: 'triangle', t: top, f: hz('G4') * p, a: 0.003, hold: 0.1, d: 0.28, peak: 0.2 });
    [3136, 3951, 4699].forEach((f, i) => tone(v, { wave: 'triangle', t: top + 0.03 + i * 0.04, f: f * p, a: 0.002, d: 0.12, peak: 0.05 }));
  },

  fever: (v, t, p) => {
    // CICCIO FEVER!: a fizzing two-octave riser with a trembling reed on top...
    hiss(v, { t, a: 0.38, d: 0.05, peak: 0.42, type: 'lowpass', f: 500, to: 6500, slide: 0.42, q: 2 });
    tone(v, { wave: 'sawtooth', t, f: hz('E3') * p, to: hz('E5') * p, slide: 0.42, a: 0.36, d: 0.05, peak: 0.1, lp: 900, lpTo: 3500, vib: [30, 14] });
    tone(v, { wave: 0.25, t, f: hz('B3') * p, to: hz('B5') * p, slide: 0.42, a: 0.36, d: 0.05, peak: 0.05 });
    // ...then the hit: a thump, a power-chord stab on the tonic (no third, so it never fights the tune) and a jingle wash
    const hit = t + 0.42;
    tone(v, { wave: 'sine', t: hit, f: 160, to: 45, slide: 0.12, a: 0.001, d: 0.24, peak: 0.36 });
    hiss(v, { t: hit, d: 0.08, peak: 0.5, type: 'lowpass', f: 2200 });
    ['E4', 'B4', 'E5'].forEach((n) => {
      tone(v, { wave: 0.3, t: hit, f: hz(n) * p, a: 0.003, hold: 0.1, d: 0.3, peak: 0.09 });
      tone(v, { wave: 'sawtooth', t: hit, f: hz(n) * 1.004 * p, a: 0.003, hold: 0.1, d: 0.26, peak: 0.05, lp: 3200 });
    });
    hiss(v, { t: hit, a: 0.002, d: 0.42, peak: 0.16, type: 'highpass', f: 5200 });
    hiss(v, { t: hit + 0.02, d: 0.16, peak: 0.12, type: 'bandpass', f: 9000, q: 3 });
  },
};
