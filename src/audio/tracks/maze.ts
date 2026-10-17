import type { SongSrc } from '../sequencer';

/**
 * Level 4 "Ciccio-Man": original bouncy D-minor chiptune, 140 bpm 4/4, one step = one
 * sixteenth, 16 bars (A A' B B'). Sicilian touches: harmonic-minor turns (Bb over A7, the
 * Neapolitan Eb chord), mandolin tremolo on long notes, the harm doubling the tune in thirds
 * in B, tamburello. A = tip-toe staccato with cheeky chromatic grace notes over an oom-pa bass.
 */
const chop = (a: string, b: string): string => `. . ${a} . . . ${b} . . . ${a} . . . ${b} .`;
const oom = (r: string, f: string): string => `${r} - . . ${f} - . . ${r} - . . ${f} - . .`;
const DM = chop('F4', 'A4');
const A7 = chop('C#4', 'G4');
const GM = chop('G4', 'Bb4');

const STEP = 'k . h . s . h . k . h . s . h h';
const TAMB = 'k . o . s . o . k . o . s . o o';
const FILL = 'k . h . s . h . k . s . S . S S';

const GM_TUNE = 'Bb5 - - - A5 . G5 . D5 - - - G5 . Bb5 .';
const GM_THIRDS = 'G5 - - - F5 . D5 . Bb4 - - - D5 . G5 .';

export const maze: SongSrc = {
  bpm: 140,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  lead: { wave: 0.25, vol: 0.26, a: 0.003, d: 0.07, sus: 0.4, r: 0.06, gate: 0.9, trem: 14, cutoff: 4200 },
  harm: { wave: 0.5, vol: 0.1, a: 0.002, d: 0.06, sus: 0.35, r: 0.03, gate: 0.7, trem: 14, cutoff: 2200 },
  bass: { wave: 'bass', vol: 0.34, a: 0.003, d: 0.08, sus: 0.6, r: 0.03, gate: 0.7 },
  drums: 0.36,
  echo: { time: 0.2143, fb: 0.15, mix: 0.1 },
  patterns: {
    // Dm | A7 | Dm | A7
    A: {
      bars: 4,
      lead:
        'D5 . . . C#5 D5 . . F5 . . . E5 F5 . . | A5 . . . G#5 A5 . . C#6 . . . A5 . G5 . | ' +
        'F5 . E5 . D5 . . . A4 . . . D5 . . . | E5 . . . C#5 . E5 . A5 - - - . . A4 .',
      harm: `${DM} | ${A7} | ${DM} | ${A7}`,
      bass: `${oom('D3', 'A2')} | ${oom('A2', 'E3')} | ${oom('D3', 'A2')} | ${oom('A2', 'E3')}`,
      drums: `${STEP} | ${STEP} | ${STEP} | ${FILL}`,
    },
    // Dm | Gm | A7 | Dm
    A2: {
      bars: 4,
      lead:
        'D5 . . . C#5 D5 . . F5 . . . E5 F5 . . | G5 . . . F#5 G5 . . Bb5 . . . A5 . G5 . | ' +
        'A5 . G5 . F5 . E5 . C#5 . E5 . G5 . Bb5 . | A5 - - - F5 . . . D5 - - - . . . .',
      harm: `${DM} | ${GM} | ${A7} | ${DM}`,
      bass: `${oom('D3', 'A2')} | ${oom('G2', 'D3')} | ${oom('A2', 'E3')} | ${oom('D3', 'A2')}`,
      drums: `${STEP} | ${STEP} | ${STEP} | ${FILL}`,
    },
    // Gm | Dm | Eb | A7: the serenade, harm a third below the tune
    B: {
      bars: 4,
      lead:
        `${GM_TUNE} | A5 - - - F5 . D5 . A4 - - - D5 . F5 . | ` +
        'G5 - - - Bb5 . G5 . Eb5 - - - G5 . Bb5 . | C#6 - - - - - . . A5 . . . E5 . G5 .',
      harm:
        `${GM_THIRDS} | F5 - - - D5 . A4 . F4 - - - A4 . D5 . | ` +
        'Eb5 - - - G5 . Eb5 . Bb4 - - - Eb5 . G5 . | A5 - - - - - . . E5 . . . C#5 . E5 .',
      bass: `${oom('G2', 'D3')} | ${oom('D3', 'A2')} | ${oom('Eb3', 'Bb2')} | ${oom('A2', 'E3')}`,
      drums: `${TAMB} | ${TAMB} | ${TAMB} | ${TAMB}`,
    },
    // Gm | Dm | A7 | Dm (walk-up pickup back to the top)
    B2: {
      bars: 4,
      lead:
        `${GM_TUNE} | D6 - - - C6 . A5 . F5 - - - A5 . D6 . | ` +
        'C#6 . A5 . E5 . G5 . F5 . E5 . D5 . C#5 . | D5 . . . A4 . . . D5 . . . A4 . C#5 .',
      harm:
        `${GM_THIRDS} | A5 - - - A5 . F5 . D5 - - - F5 . A5 . | ` +
        'A5 . E5 . C#5 . E5 . D5 . C#5 . Bb4 . A4 . | A4 . . . F4 . . . A4 . . . . . . .',
      bass: `${oom('G2', 'D3')} | ${oom('D3', 'A2')} | ${oom('A2', 'E3')} | D3 - . . A2 - . . D3 - . . A2 . C#3 .`,
      drums: `${TAMB} | ${TAMB} | ${TAMB} | ${FILL}`,
    },
  },
  order: ['A', 'A2', 'B', 'B2'],
};
