/** Pure note / timing helpers shared by the sequencer and the sfx recipes (unit-tested). */

const SEMITONE: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])([#b]?)(-?\d)$/;

/** "A4" -> 69, "C#4" -> 61, "Bb3" -> 58; null when the token is not a note name. */
export function noteToMidi(token: string): number | null {
  const m = NOTE_RE.exec(token);
  if (!m) return null;
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + acc;
}

/** Equal temperament, A4 = 440 Hz. */
export function midiToFreq(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Frequency of a note name; throws on a typo so broken recipes fail loudly in tests. */
export function hz(note: string): number {
  const m = noteToMidi(note);
  if (m === null) throw new Error(`audio: bad note "${note}"`);
  return midiToFreq(m);
}

/** Seconds per grid step. */
export function stepDuration(bpm: number, stepsPerBeat: number): number {
  return 60 / bpm / stepsPerBeat;
}

/** How many grid steps, the first at `next`, start strictly before `horizon`. */
export function stepsDue(next: number, horizon: number, stepDur: number): number {
  if (next >= horizon) return 0;
  return Math.ceil((horizon - next) / stepDur - 1e-9);
}

/** Next step index: wraps to 0 for loops, -1 when a one-shot song is over. */
export function advanceStep(step: number, total: number, loop: boolean): number {
  const n = step + 1;
  if (n < total) return n;
  return loop ? 0 : -1;
}

/**
 * After a stall (tab throttled, unmute after a long pause) the cursor lags behind the clock:
 * jump forward instead of firing a burst of late notes.
 */
export function catchUp(next: number, now: number): number {
  return next < now - 0.05 ? now + 0.02 : next;
}
