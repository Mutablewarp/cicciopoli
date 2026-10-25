import type { SongSrc } from '../sequencer';

/**
 * Level 7 "Ciccio's Kitchen": warm Palermo-bistro swing in F major, 112 bpm 4/4 on a triplet grid
 * (one step = one eighth-note triplet, swung eighths fall on steps 0 and 2 of each beat), 32 bars
 * (A A2 B BRK, 68.6 s). Lead = mandolin (single plucks on short notes, tremolo on held ones, triplet
 * runs as flourishes), harm = Rhodes-like chords comping in a Charleston / push rhythm, bass = a
 * walking upright line whose fourth beat always leads into the next root, drums = brushes on 2 and 4
 * with a shaker on every swung eighth. A: I-VI7-ii-V twice; A2 turns to F7 - Bb and a ii-V to D minor;
 * B sings long tremolo notes over held chords with a tambourine lift; BRK drops to bass riff and
 * shaker on a Dm7-G7 vamp, then builds back up Bb - Am - Gm - C7 under a brush roll into the hook.
 */
const bars = (...b: string[]): string => b.join(' | ');
/** Walking bass: four quarter notes, the last one leading into the next bar's root. */
const walk = (a: string, b: string, c: string, d: string): string => `${a} - - ${b} - - ${c} - - ${d} - -`;
/** Charleston comp: on beat 1, then pushed on the swung "and" of 2. */
const comp = (c: string): string => `${c} - . . . ${c} - . . . . .`;
/** Anticipations on the swung "and" of 1 and of 3 (one chord, or two chords half a bar each). */
const push = (a: string, b = a): string => `. . ${a} - . . . . ${b} - . .`;
/** Two chords, two beats each. */
const split = (a: string, b: string): string => `${a} - . . . ${a} ${b} - . . . .`;
/** Long held chord with a push on beat 4 (the singing B section). */
const pad = (c: string): string => `${c} - - - - - - - . ${c} - .`;

// rootless Rhodes voicings around middle C (the walking bass carries the roots)
const FM7 = 'A3+C4+E4';
const D7 = 'F#3+C4+E4';
const GM7 = 'F3+Bb3+D4';
const C7 = 'E3+Bb3+D4';
const AM7 = 'G3+C4+E4';
const F7 = 'A3+Eb4+G4';
const BBM7 = 'A3+D4+F4';
const EM7B5 = 'G3+Bb3+D4';
const A7 = 'G3+C#4+F4';
const DM = 'F3+A3+D4';
const DM7 = 'F3+A3+C4';
const G7 = 'F3+B3+E4';

const SWING = 'kh . h sh . h kh . h sh . h';
const LIFT = 'kh . h sh . h kh . h so . h';
const FILL = 'kh . h sh . h kh . s s s S';
const SHAKE = 'k . h h . h . . h h . h';
const BRUSH = 'k . h sh . h . . h sh . h';

const HOOK = bars(
  '. . C5 F5 - G5 A5 - - C6 - A5',
  'F#5 - - - - . . . A5 C6 - Eb6',
  'D6 - - Bb5 - G5 F5 - - D5 - .',
  'E5 - - - - - . . G5 Bb5 - C6',
);
const HOOK_BASS = bars(walk('F2', 'A2', 'C3', 'C#3'), walk('D3', 'C3', 'A2', 'F#2'), walk('G2', 'Bb2', 'D3', 'Db3'));
/** Bass riff of the breakdown vamp: Dm7 for half a bar, G7 for the other half. */
const RIFF = 'D2 - . D3 . C3 G2 - . B2 . A2';

export const kitchen: SongSrc = {
  bpm: 112,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 0.25, vol: 0.27, a: 0.003, d: 0.07, sus: 0.35, r: 0.12, gate: 0.65, trem: 10, cutoff: 3000 },
  harm: { wave: 'triangle', vol: 0.08, a: 0.005, d: 0.5, sus: 0.35, r: 0.18, gate: 0.85 },
  bass: { wave: 'bass', vol: 0.26, a: 0.004, d: 0.18, sus: 0.45, r: 0.06, gate: 0.8 },
  drums: 0.22,
  // echo two triplets behind (2/3 of a beat): a little room around the mandolin
  echo: { time: 0.357, fb: 0.2, mix: 0.12 },
  patterns: {
    // F D7 Gm7 C7 | Am7 D7 Gm7 C7: the hook
    A: {
      bars: 8,
      lead: bars(
        HOOK,
        'E6 - - C6 - A5 G5 - - E5 - .',
        '. . F#5 A5 - C6 E6 - - D6 - C6',
        'Bb5 - - A5 - G5 F5 - - D5 - E5',
        'G5 - - - - - . . . . . .',
      ),
      harm: bars(comp(FM7), push(D7), comp(GM7), push(C7), comp(AM7), push(D7), comp(GM7), push(C7)),
      bass: bars(
        HOOK_BASS,
        walk('C3', 'E2', 'G2', 'G#2'),
        walk('A2', 'C3', 'E3', 'Eb3'),
        walk('D3', 'C3', 'A2', 'Ab2'),
        walk('G2', 'A2', 'Bb2', 'B2'),
        walk('C3', 'Bb2', 'G2', 'E2'),
      ),
      drums: SWING,
    },
    // F D7 Gm7 C7 | F F7 Bb Em7b5-A7: same hook, then the turn to D minor
    A2: {
      bars: 8,
      lead: bars(
        HOOK,
        'A5 - - - - C6 E6 - - D6 - C6',
        'Eb6 - - - - C6 A5 - - F5 - G5',
        'D6 - - C6 - Bb5 A5 - - F5 - D5',
        'G5 - - Bb5 - D6 C#6 - - E5 - F5',
      ),
      harm: bars(comp(FM7), push(D7), comp(GM7), push(C7), comp(FM7), push(F7), comp(BBM7), split(EM7B5, A7)),
      bass: bars(
        HOOK_BASS,
        walk('C3', 'Bb2', 'G2', 'E2'),
        walk('F2', 'A2', 'C3', 'E3'),
        walk('Eb3', 'D3', 'C3', 'A2'),
        walk('Bb2', 'A2', 'G2', 'F2'),
        walk('E2', 'G2', 'A2', 'C#3'),
      ),
      drums: bars(SWING, SWING, SWING, SWING, SWING, SWING, SWING, FILL),
    },
    // Dm Dm7 Bb A7 | Dm Gm7 Bb A7: long tremolo notes climbing to F6, triplet runs between them
    B: {
      bars: 8,
      lead: bars(
        'A5 - - - - - - - - G5 A5 Bb5',
        'C6 - - - - - - - - A5 Bb5 C6',
        'D6 - - - - - - - - C6 Bb5 A5',
        'C#6 - - - - - E6 - - - - -',
        'D6 - - - - - F6 - - E6 - D6',
        'Bb5 - - - - - G5 - - A5 - Bb5',
        'A5 - - - - - F5 - - D5 - F5',
        'E5 - - - - - C#5 D5 E5 A5 - -',
      ),
      harm: bars(pad(DM), pad(DM7), pad(BBM7), pad(A7), pad(DM), pad(GM7), pad(BBM7), pad(A7)),
      bass: bars(
        walk('D3', 'A2', 'F2', 'A2'),
        walk('D3', 'C3', 'B2', 'A2'),
        walk('Bb2', 'C3', 'D3', 'Bb2'),
        walk('A2', 'C#3', 'E3', 'Eb3'),
        walk('D3', 'A2', 'F2', 'F#2'),
        walk('G2', 'Bb2', 'D3', 'C3'),
        walk('Bb2', 'D3', 'F2', 'G#2'),
        walk('A2', 'G2', 'E2', 'C#2'),
      ),
      drums: bars(LIFT, LIFT, LIFT, LIFT, LIFT, LIFT, LIFT, FILL),
    },
    // Dm7-G7 vamp x4 (riff + shaker, then brushes) | Bb Am7 Gm7 C7: building back into the hook
    BRK: {
      bars: 8,
      lead: bars(
        '. . . . . . . . . . . .',
        '. . . . . . . . . . . .',
        'A5 - - - - - - - - - - -',
        'C6 - - - - - B5 - - - - -',
        'D6 - - C6 - Bb5 A5 - - F5 - .',
        'E5 - - G5 - A5 C6 - - E6 - .',
        'F6 - - E6 - D6 Bb5 - - G5 - .',
        'E5 - - G5 - - Bb5 - - . . .',
      ),
      harm: bars(push(DM7, G7), push(DM7, G7), push(DM7, G7), push(DM7, G7), comp(BBM7), push(AM7), comp(GM7), push(C7)),
      bass: bars(
        RIFF,
        RIFF,
        RIFF,
        'D2 - . D3 . C3 G2 - . A2 . B2',
        walk('Bb2', 'D3', 'F2', 'G#2'),
        walk('A2', 'G2', 'E2', 'F#2'),
        walk('G2', 'Bb2', 'D3', 'Db3'),
        walk('C3', 'Bb2', 'G2', 'E2'),
      ),
      drums: bars(SHAKE, SHAKE, BRUSH, BRUSH, SWING, SWING, SWING, FILL),
    },
  },
  order: ['A', 'A2', 'B', 'BRK'],
};
