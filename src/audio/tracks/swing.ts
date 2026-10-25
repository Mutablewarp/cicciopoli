/**
 * Grid helpers shared by the level 8 cartoon tracks (cartoon, cartoonBoss, cartoonFinal): 4/4 swing on a
 * triplet grid, 12 steps a bar (beats on steps 0 3 6 9, the swung "and" on 2 5 8 11). `a` is the chord or
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
