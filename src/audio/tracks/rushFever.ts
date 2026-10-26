import type { PatternSrc, SongSrc } from '../sequencer';
import { noteToMidi } from '../theory';
import { rush } from './rush';

/**
 * Level 6 v9 CICCIO FEVER arrangement of the rush tarantella (GameAudio.intensity(1) swaps it in on the
 * next eighth): the same 32 bars on the same grid, played by the street band going flat out. A second
 * accordion sings the tune in close harmony (under each note the chord tone a third or a fourth below,
 * the chord read from the mandolin bar), the engine pumps octaves, the tamburello jingles on every eighth
 * with accents on both dotted beats and the castanets clack into each beat; reeds and strings brighter.
 */
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const noteName = (midi: number): string => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
const split = (text: string): string[][] => text.split('|').map((b) => b.trim().split(/\s+/));
const join = (bars: string[][]): string => bars.map((b) => b.join(' ')).join(' | ');

/** Second accordion: each tune note gets the highest chord tone 3-5 semitones below it (or stays single). */
function harmonise(lead: string, harm: string): string {
  const chords = split(harm).map((b) => new Set(b.map((tok) => (noteToMidi(tok) ?? -1) % 12)));
  return join(
    split(lead).map((bar, i) =>
      bar.map((tok) => {
        const m = noteToMidi(tok);
        const d = m === null ? undefined : [3, 4, 5].find((gap) => chords[i].has((m - gap) % 12));
        return m === null || d === undefined ? tok : `${tok}+${noteName(m - d)}`;
      }),
    ),
  );
}

/** The engine revs: in every chugging bar the eighth after each dotted beat jumps an octave. */
function pump(bass: string): string {
  return join(
    split(bass).map((bar) => {
      const root = noteToMidi(bar[0]);
      if (root === null || !bar.slice(0, 5).every((tok) => tok === bar[0])) return bar;
      return bar.map((tok, i) => (i === 1 || i === 4 ? noteName(root + 12) : tok));
    }),
  );
}

/** Tamburello on every eighth (accented on the dotted beats), castanets into each beat; snare rolls keep their steps. */
function jingle(drums: string): string {
  return join(
    split(drums).map((bar) =>
      bar.map((tok, i) => {
        const hits = tok.replace(/[.oO]/g, '') + (i % 3 === 0 ? 'O' : 'o');
        return i % 3 === 2 && !/s/i.test(hits) ? `${hits}w` : hits;
      }),
    ),
  );
}

function fever(p: PatternSrc): PatternSrc {
  return {
    bars: p.bars,
    lead: p.lead && p.harm ? harmonise(p.lead, p.harm) : p.lead,
    harm: p.harm,
    bass: p.bass && pump(p.bass),
    drums: p.drums && jingle(p.drums),
  };
}

export const rushFever: SongSrc = {
  ...rush,
  // two reeds per note: a little less each, brighter
  lead: { ...rush.lead, vol: 0.15, cutoff: 3800 },
  harm: { ...rush.harm, vol: 0.085, cutoff: 4800 },
  drums: 0.36,
  patterns: Object.fromEntries(Object.entries(rush.patterns).map(([name, p]) => [name, fever(p)])),
};
