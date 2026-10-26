import type { SongSrc } from '../sequencer';
import { A_CH, bars, CH, chart, CLIMB, HEAD, HOOK, pah, stab, TUNE_A, TUNE_A3, type Bar } from './swing';

/**
 * Level 8 map "La sfida delle mascotte": a jaunty 1930s stride / ragtime piano in C major, 120 bpm swing on a
 * triplet grid, 32 bars AABA (A A2 B A3, 64 s). It teaches the player the level 8 hook (swing.ts HOOK) slowly,
 * so the fights and the final boss are recognised at once. Honky-tonk piano (two detuned voices): the left hand
 * strides, low octaves on 1 and 3 (bass) and chords on 2 and 4 (harm); the right hand sings the tune (lead).
 * The bridge B sits on F with a woodblock clip-clop, then climbs back through A7 - D7 - G7. Brushes on 2 and 4.
 */
/** [low octave on 1, on 3] per bar, under HEAD. */
const HEAD_LOW: readonly Bar[] = [
  ['C2+C3', 'G1+G2'], ['G1+G2', 'D2+D3'], ['C2+C3', 'G1+G2'], ['C2+C3', 'E2+E3'], ['F1+F2', 'C2+C3'], ['F1+F2', 'Ab1+Ab2'],
];
const A_LOW: readonly Bar[] = [...HEAD_LOW, ['C2+C3', 'A1+A2'], ['D2+D3', 'G1+G2']];
const A2_HARM: readonly Bar[] = [...HEAD, [CH.C, CH.G7], [CH.C, CH.C7]];
const A2_LOW: readonly Bar[] = [...HEAD_LOW, ['C2+C3', 'G1+G2'], ['C2+C3', 'Bb1+Bb2']];
const B_HARM: readonly Bar[] = [[CH.F, CH.F], [CH.FSDIM, CH.FSDIM], [CH.C, CH.C], [CH.A7, CH.A7], [CH.D7, CH.D7], [CH.D7, CH.D7], [CH.G7, CH.G7], [CH.G7, CH.G7]];
const B_LOW: readonly Bar[] = [
  ['F1+F2', 'C2+C3'], ['F#1+F#2', 'A1+A2'], ['G1+G2', 'C2+C3'], ['A1+A2', 'E2+E3'],
  ['D2+D3', 'A1+A2'], ['D2+D3', 'F#1+F#2'], ['G1+G2', 'D2+D3'], ['G1+G2', 'B1+B2'],
];

const BRUSH = '. . . sh . h . . . sh . h';
const CLOP = 'w . . sh . w w . . sh . w';
const TADA = '. . . sh . h s . s s s S';

export const cartoon: SongSrc = {
  bpm: 120,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 0.3, vol: 0.15, a: 0.002, d: 0.32, sus: 0.22, r: 0.14, gate: 0.85, cutoff: 3200, unison: 14 },
  harm: { wave: 0.3, vol: 0.055, a: 0.002, d: 0.16, sus: 0.25, r: 0.07, gate: 0.7, cutoff: 2200, unison: 14 },
  bass: { wave: 0.3, vol: 0.11, a: 0.002, d: 0.3, sus: 0.3, r: 0.09, gate: 0.8, cutoff: 1500, unison: 10 },
  drums: 0.24,
  patterns: {
    A: { bars: 8, lead: TUNE_A, harm: chart(A_CH, pah), bass: chart(A_LOW, stab), drums: BRUSH },
    // the hook again, then a cadence on C and a run up into the bridge
    A2: {
      bars: 8,
      lead: bars(HOOK, CLIMB, 'E5 - - C5 - - D5 - - B4 - -', 'C5 - - - - . . . . C5 D5 E5'),
      harm: chart(A2_HARM, pah),
      bass: chart(A2_LOW, stab),
      drums: BRUSH,
    },
    // F F#dim7 C/G A7 | D7 D7 G7 G7: long notes over the woodblock, then the climb home
    B: {
      bars: 8,
      lead: bars(
        'F5 - - - - . A5 - . C6 - .',
        'Eb6 - - - - . C6 - . A5 - .',
        'G5 - . E5 - . C5 - . E5 . G5',
        'A5 - - - - . G5 - . E5 - C#5',
        'D5 . F#5 A5 - . D6 - . C6 . A5',
        'F#5 - - - - . . . . A5 B5 C6',
        'D6 - . B5 - . G5 - . F5 . D5',
        'B4 - . D5 . F5 G5 - - . . .',
      ),
      harm: chart(B_HARM, pah),
      bass: chart(B_LOW, stab),
      drums: bars(CLOP, CLOP, CLOP, CLOP, CLOP, CLOP, CLOP, TADA),
    },
    A3: {
      bars: 8,
      lead: TUNE_A3,
      harm: chart(A_CH, pah),
      bass: chart(A_LOW, stab),
      drums: bars(BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, TADA),
    },
  },
  order: ['A', 'A2', 'B', 'A3'],
};
