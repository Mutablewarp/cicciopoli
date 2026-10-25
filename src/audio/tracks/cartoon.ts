import type { SongSrc } from '../sequencer';
import { bars, chart, pah, stab } from './swing';

/**
 * Level 8 map "La sfida delle mascotte": a jaunty 1930s stride / ragtime piano in C major, 120 bpm swing on a
 * triplet grid, 32 bars AABA (A A2 B A3, 64 s). Honky-tonk piano (two detuned voices): the left hand strides,
 * low octaves on 1 and 3 (bass) and chords on 2 and 4 (harm); the right hand sings the tune (lead) over the
 * ragtime circle of dominants C-A7-D7-G7. A2 turns through C7 - F - Fm; the bridge B sits on F with a
 * woodblock clip-clop, then climbs back through A7 - D7 - G7. Brushes on 2 and 4 keep it light.
 */
const C = 'E3+G3+C4';
const A7 = 'E3+G3+C#4';
const D7 = 'F#3+A3+C4';
const G7 = 'F3+G3+B3';
const C7 = 'E3+G3+Bb3';
const F = 'F3+A3+C4';
const FM = 'F3+Ab3+C4';
const FSDIM = 'F#3+A3+Eb4';

/** [left-hand chord on 2, on 4] and [low octave on 1, on 3] per bar. */
type Bar = readonly [string, string];
const A_HARM: readonly Bar[] = [[C, C], [A7, A7], [D7, D7], [G7, G7], [C, C], [A7, A7], [D7, G7], [C, G7]];
const A_LOW: readonly Bar[] = [
  ['C2+C3', 'G1+G2'], ['A1+A2', 'E2+E3'], ['D2+D3', 'A1+A2'], ['G1+G2', 'D2+D3'],
  ['C2+C3', 'E2+E3'], ['A1+A2', 'C#2+C#3'], ['D2+D3', 'G1+G2'], ['C2+C3', 'G1+G2'],
];
const A2_HARM: readonly Bar[] = [...A_HARM.slice(0, 4), [C, C], [C7, C7], [F, FM], [C, C7]];
const A2_LOW: readonly Bar[] = [...A_LOW.slice(0, 4), ['C2+C3', 'G1+G2'], ['C2+C3', 'Bb1+Bb2'], ['F1+F2', 'Ab1+Ab2'], ['C2+C3', 'G1+G2']];
const B_HARM: readonly Bar[] = [[F, F], [FSDIM, FSDIM], [C, C], [A7, A7], [D7, D7], [D7, D7], [G7, G7], [G7, G7]];
const B_LOW: readonly Bar[] = [
  ['F1+F2', 'C2+C3'], ['F#1+F#2', 'A1+A2'], ['G1+G2', 'C2+C3'], ['A1+A2', 'E2+E3'],
  ['D2+D3', 'A1+A2'], ['D2+D3', 'F#1+F#2'], ['G1+G2', 'D2+D3'], ['G1+G2', 'B1+B2'],
];

/** The tune's first four bars, shared by A, A2 and A3. */
const HOOK = bars(
  'G4 . C5 E5 - . G5 - . E5 . C5',
  'C#5 - . E5 - G5 A5 - - G5 . E5',
  'F#5 - - A5 - . D6 - . C6 . A5',
  'B5 - . G5 . F5 D5 - . B4 . D5',
);

const BRUSH = '. . . sh . h . . . sh . h';
const CLOP = 'w . . sh . w w . . sh . w';
const TADA = '. . . sh . h s . s s s S';

export const cartoon: SongSrc = {
  bpm: 120,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 0.3, vol: 0.15, a: 0.002, d: 0.32, sus: 0.22, r: 0.14, gate: 0.85, cutoff: 3200, unison: 14 },
  harm: { wave: 0.3, vol: 0.06, a: 0.002, d: 0.16, sus: 0.25, r: 0.07, gate: 0.7, cutoff: 2200, unison: 14 },
  bass: { wave: 0.3, vol: 0.11, a: 0.002, d: 0.3, sus: 0.3, r: 0.09, gate: 0.8, cutoff: 1500, unison: 10 },
  drums: 0.26,
  patterns: {
    // C A7 D7 G7 | C A7 D7-G7 C-G7: the hook and its answer
    A: {
      bars: 8,
      lead: bars(
        HOOK,
        'E5 . G5 C6 - . E6 - . D6 . C6',
        'C#6 - . A5 - . E5 - . G5 . A5',
        'F#5 - . A5 . F#5 G5 - . B5 . D6',
        'C6 - - G5 - . F5 - . D5 . B4',
      ),
      harm: chart(A_HARM, pah),
      bass: chart(A_LOW, stab),
      drums: BRUSH,
    },
    // same hook, then C7 - F - Fm and a run up into the bridge
    A2: {
      bars: 8,
      lead: bars(
        HOOK,
        'E5 . G5 C6 - . E6 - . C6 . Bb5',
        'Bb5 - . G5 - E5 C5 - . E5 . G5',
        'A5 - . C6 - A5 Ab5 - . F5 . D5',
        'C5 - - G4 - . C5 - . C5 D5 E5',
      ),
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
    // the hook a last time, a higher answer and a stepwise walk down onto the downbeat of the loop
    A3: {
      bars: 8,
      lead: bars(
        HOOK,
        'E6 - . C6 - . G5 - . A5 . C6',
        'C#6 - . E6 - . C#6 - . A5 . G5',
        'F#5 - . A5 . C6 B5 - . G5 . F5',
        'E5 - . C5 - . D5 - . B4 . A4',
      ),
      harm: chart(A_HARM, pah),
      bass: chart(A_LOW, stab),
      drums: bars(BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, BRUSH, TADA),
    },
  },
  order: ['A', 'A2', 'B', 'A3'],
};
