/**
 * Grid helpers and the shared tune of the level 8 cartoon tracks (cartoon, cartoonBoss, cartoonFinal): 4/4 swing
 * on a triplet grid, 12 steps a bar (beats on steps 0 3 6 9, the swung "and" on 2 5 8 11). `a` is the chord or
 * note of the first half of the bar, `b` of the second half.
 */
export const bars = (...b: string[]): string => b.join(' | ');
export const REST = '. . . . . . . . . . . .';

/** Walking bass: four quarter notes, the last one leading into the next bar. */
export const walk = (a: string, b: string, c: string, d: string): string => `${a} - - ${b} - - ${c} - - ${d} - -`;
/** Half notes on 1 and 3 (tuba in two, long brass backgrounds). */
export const two = (a: string, b = a): string => `${a} - - - - . ${b} - - - - .`;
/** Short hits on 1 and 3 (brass stabs, the stride piano's low "oom"). */
export const stab = (a: string, b = a): string => `${a} - . . . . ${b} - . . . .`;
/** The stride piano's "pah": chords on 2 and 4. */
export const pah = (a: string, b = a): string => `. . . ${a} - . . . . ${b} - .`;
/** Pushed on the swung "and" of 1 and of 3. */
export const push = (a: string, b = a): string => `. . ${a} - . . . . ${b} - . .`;
/** Shout-chorus punches: 1, the "and" of 2, 3 and the "and" of 4 (anticipating the next bar). */
export const shout = (a: string, b = a): string => `${a} - . . . ${a} ${b} - . . . ${b}`;
/** Stop-time: one hit on the downbeat, then silence. */
export const hit = (a: string): string => `${a} - . . . . . . . . . .`;

/** One bar per [first half, second half] of a chord chart, rendered with `fn`. */
export const chart = (rows: readonly (readonly [string, string])[], fn: (a: string, b: string) => string): string =>
  bars(...rows.map(([a, b]) => fn(a, b)));

/** C major to C harmonic minor: E and A flattened, the leading tone B kept. */
export const minor = (text: string): string => text.replace(/([EA])(\d)/g, '$1b$2');

/**
 * THE level 8 hook, sung by the map, every fight, the final boss (in minor) and the golden-ticket fanfare:
 * "do-mi SOL LA SOL | fa re ti . (sol) | do-mi SOL LA SOL | mi-re DO" over C | G7 | C | C-C7. A ninth wide
 * (G4-A5), one swung cell said twice, a question on the dominant and its answer on the tonic.
 */
export const HOOK = bars(
  'C5 - E5 G5 - - A5 - - G5 - -',
  'F5 - - D5 - - B4 - - . . G4',
  'C5 - E5 G5 - - A5 - - G5 - -',
  'E5 - D5 C5 - - - - - . . .',
);
/** Bars 5-6 of every A section: the hook's cell climbs onto F, then sighs on Fm. */
export const CLIMB = bars('F5 - A5 C6 - - D6 - - C6 - -', 'Ab5 - - F5 - - C5 - - . . .');

/** C-major voicings in the tenor range: the stride piano's left hand and the big band's trombones. */
export const CH = {
  C: 'E3+G3+C4',
  C7: 'E3+G3+Bb3',
  F: 'F3+A3+C4',
  FM: 'F3+Ab3+C4',
  G7: 'F3+G3+B3',
  A7: 'E3+G3+C#4',
  D7: 'F#3+A3+C4',
  E7: 'E3+G#3+D4',
  FSDIM: 'F#3+A3+Eb4',
} as const;

export type Bar = readonly [string, string];
/** Bars 1-6 of an A section: C | G7 | C | C-C7 under the hook, F | Fm under the climb. */
export const HEAD: readonly Bar[] = [[CH.C, CH.C], [CH.G7, CH.G7], [CH.C, CH.C], [CH.C, CH.C7], [CH.F, CH.F], [CH.FM, CH.FM]];
/** A and A3 end on the ragtime turnaround C-A7 | D7-G7. */
export const A_CH: readonly Bar[] = [...HEAD, [CH.C, CH.A7], [CH.D7, CH.G7]];

/** The A tune (hook, climb, a chromatic rise and a walk down onto the next hook). */
export const TUNE_A = bars(HOOK, CLIMB, 'E5 - G5 C6 - - C#6 - - A5 - -', 'D6 - C6 A5 - - G5 - F5 D5 - B4');
/** The last A: the same hook and climb, a lower turnaround that lands on the hook again. */
export const TUNE_A3 = bars(HOOK, CLIMB, 'G5 - E5 C5 - - A5 - - E5 - -', 'F#5 - - A5 - - G5 - - D5 - B4');
