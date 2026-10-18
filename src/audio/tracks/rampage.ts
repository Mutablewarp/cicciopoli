import type { SongSrc } from '../sequencer';

/**
 * Level 5 "SPACCA TUTTO": heavy C-minor brawler, 150 bpm 4/4, one step = one sixteenth,
 * 16 bars = A + B. A (Cm Cm Ab Bb | Cm Cm Ab G): syncopated power-chord riff under a brassy
 * swagger tune. B (Fm Fm Db Ab | Bb Bb G G): galloping bass under the high hook. Both end on a
 * G turnaround that falls back onto the downbeat crash. Bass = sawtooth through a lowpass,
 * harm = off-beat "chank" stabs on the fifth and third, lead = brass with a slap echo.
 */
const bars = (...b: string[]): string => b.join(' | ');
/** Syncopated chug: root pushes on the "and" of 2, octave (or fifth) on beat 4. */
const riff = (r: string, o: string): string => `${r} - ${r} . ${r} - . ${r} ${r} - ${r} . ${o} - ${r} .`;
/** Sixteenth gallop (x . x x per beat) closing on the octave pickup. */
const gallop = (r: string, o: string): string => `${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${r} ${r} . ${r} ${o}`;
/** Riff whose last beat runs up (octave, octave, leading note x2) into the next section. */
const turn = (r: string, o: string, l: string): string => `${r} - ${r} . ${r} - . ${r} ${r} - ${r} . ${o} ${o} ${l} ${l}`;
const stab = (a: string, b: string): string => `. . ${a} - . . ${a} - . . ${a} - . . ${b} -`;

const CM = stab('G3', 'Eb4');
const AB = stab('Eb4', 'C4');
const BB = stab('F4', 'D4');
const G = stab('D4', 'B3');
const FM = stab('C4', 'Ab3');
const DB = stab('Ab3', 'F4');

const BEAT = 'K . h . S . h k h . k . S . h k';
const DRIVE = 'K . h . S . o k K . h k S . o k';

export const rampage: SongSrc = {
  bpm: 150,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  lead: { wave: 'sawtooth', vol: 0.22, a: 0.01, d: 0.12, sus: 0.7, r: 0.06, gate: 0.88, cutoff: 3200, vib: { cents: 24, rate: 6, delay: 0.18 } },
  harm: { wave: 0.5, vol: 0.11, a: 0.002, d: 0.07, sus: 0.3, r: 0.03, gate: 0.55, cutoff: 2200 },
  bass: { wave: 'sawtooth', vol: 0.23, a: 0.003, d: 0.08, sus: 0.7, r: 0.03, gate: 0.78, cutoff: 650 },
  drums: 0.42,
  echo: { time: 0.2, fb: 0.22, mix: 0.12 },
  patterns: {
    A: {
      bars: 8,
      lead: bars(
        'C5 - . C5 - . Eb5 - . G5 - . F5 Eb5 C5 .',
        'C5 - . C5 - . Eb5 - . G5 - . Bb5 - G5 .',
        'Ab5 - . Ab5 - . G5 - . Eb5 - . F5 - G5 .',
        'Bb5 - . Bb5 - . D6 - . C6 - . Bb5 G5 F5 .',
        'C5 - . C5 - . Eb5 - . G5 - . C6 - G5 .',
        'Eb5 - . Eb5 - . G5 - . Bb5 - . C6 - - -',
        'Ab5 - . Ab5 - . C6 - . Eb6 - . C6 - Ab5 .',
        'G5 - . G5 - . B5 - . D6 - . C6 Bb5 Ab5 .',
      ),
      harm: bars(CM, CM, AB, BB, CM, CM, AB, G),
      bass: bars(riff('C2', 'C3'), riff('C2', 'C3'), riff('Ab2', 'Eb3'), riff('Bb1', 'Bb2'), riff('C2', 'C3'), riff('C2', 'C3'), riff('Ab2', 'Eb3'), turn('G2', 'D3', 'B2')),
      drums: bars('Ko . h . S . h k h . k . S . h k', BEAT, BEAT, BEAT, BEAT, BEAT, BEAT, 'K . h . S . h k h . k . S s S S'),
    },
    B: {
      bars: 8,
      lead: bars(
        'F5 - . F5 - . Ab5 - . C6 - . F6 - C6 .',
        'Ab5 - . Ab5 - . C6 - . Eb6 - . C6 - Ab5 .',
        'Db6 - . Db6 - . C6 - . Ab5 - . F5 - Ab5 .',
        'Eb6 - . Eb6 - . C6 - . Ab5 - . Eb5 - C6 .',
        'Bb5 - . Bb5 - . D6 - . F6 - . D6 - Bb5 .',
        'D6 - . D6 - . F6 - . D6 - . C6 - Bb5 .',
        'G5 - . G5 - . B5 - . D6 - . B5 - G5 .',
        'D6 - . D6 - . B5 - . G5 - . F5 Eb5 D5 .',
      ),
      harm: bars(FM, FM, DB, AB, BB, BB, G, G),
      bass: bars(gallop('F2', 'C3'), gallop('F2', 'C3'), gallop('Db2', 'Ab2'), gallop('Ab2', 'Eb3'), gallop('Bb1', 'Bb2'), gallop('Bb1', 'Bb2'), gallop('G2', 'D3'), turn('G2', 'D3', 'B2')),
      drums: bars('Ko . h . S . o k K . h k S . o k', DRIVE, DRIVE, DRIVE, DRIVE, DRIVE, DRIVE, 'K . h . S . o k K . s s S s S S'),
    },
  },
  order: ['A', 'B'],
};
