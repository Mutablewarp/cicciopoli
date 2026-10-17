import type { SongSrc } from '../sequencer';

/**
 * Level 2 "Alette Crunchy": driving D harmonic-minor theme, 150 bpm 4/4,
 * one step = one eighth note, 16 bars (A A' B B'). Harm = arpeggio ostinato, bass = octave chug.
 */
const DM = 'D4 F4 A4 F4 D4 F4 A4 F4';
const BB = 'Bb3 D4 F4 D4 Bb3 D4 F4 D4';
const AM = 'A3 C#4 E4 C#4 A3 C#4 E4 C#4';
const GM = 'G3 Bb3 D4 Bb3 G3 Bb3 D4 Bb3';
const CM = 'C4 E4 G4 E4 C4 E4 G4 E4';

const oct = (lo: string, hi: string): string => `${lo} ${hi} `.repeat(4).trim();
const DRUM_BAR = 'k h s h k k s h';

export const inferno: SongSrc = {
  bpm: 150,
  stepsPerBeat: 2,
  stepsPerBar: 8,
  loop: true,
  lead: { wave: 0.25, vol: 0.22, a: 0.004, d: 0.1, sus: 0.65, r: 0.05, gate: 0.9, vib: { cents: 22, rate: 6.5, delay: 0.16 } },
  harm: { wave: 0.125, vol: 0.075, a: 0.002, d: 0.06, sus: 0.4, r: 0.03, gate: 0.6 },
  bass: { wave: 0.5, vol: 0.16, a: 0.003, d: 0.08, sus: 0.6, r: 0.03, gate: 0.7, cutoff: 900 },
  drums: 0.4,
  echo: { time: 0.3, fb: 0.22, mix: 0.13 },
  patterns: {
    // Dm | Dm | Bb | A
    A: {
      bars: 4,
      lead: 'D5 - A4 - D5 E5 F5 - | E5 D5 C#5 - D5 - A4 - | Bb4 - D5 - F5 - Bb5 - | A5 - G5 F5 E5 - C#5 -',
      harm: `${DM} | ${DM} | ${BB} | ${AM}`,
      bass: `${oct('D2', 'D3')} | ${oct('D2', 'D3')} | ${oct('Bb1', 'Bb2')} | ${oct('A1', 'A2')}`,
      drums: `ko h s h k k s h | ${DRUM_BAR} | ${DRUM_BAR} | ${DRUM_BAR}`,
    },
    // Dm | Gm | A | A
    A2: {
      bars: 4,
      lead: 'D5 - F5 - A5 - D6 - | C6 Bb5 A5 G5 Bb5 - G5 - | A5 - - G5 F5 E5 F5 G5 | A5 - - - C#5 - E5 -',
      harm: `${DM} | ${GM} | ${AM} | ${AM}`,
      bass: `${oct('D2', 'D3')} | ${oct('G1', 'G2')} | ${oct('A1', 'A2')} | A1 A2 A1 A2 A1 A2 C#2 E2`,
      drums: `${DRUM_BAR} | ${DRUM_BAR} | ${DRUM_BAR} | k h s h s s S S`,
    },
    // Bb | C | Dm | A
    B: {
      bars: 4,
      lead: 'F5 - Bb5 - A5 - F5 - | G5 - C6 - Bb5 - G5 - | A5 - D6 - C6 - A5 - | C#6 - - - E6 - - -',
      harm: `${BB} | ${CM} | ${DM} | ${AM}`,
      bass: `${oct('Bb1', 'Bb2')} | ${oct('C2', 'C3')} | ${oct('D2', 'D3')} | ${oct('A1', 'A2')}`,
      drums: `ko h s h k k s h | ${DRUM_BAR} | ${DRUM_BAR} | ${DRUM_BAR}`,
    },
    // Gm | Dm | Bb A | A
    B2: {
      bars: 4,
      lead: 'D6 - Bb5 G5 D6 - Bb5 G5 | F5 - A5 D6 F5 - A5 D6 | E5 F5 G5 A5 Bb5 A5 G5 F5 | E5 - C#5 - A4 - - -',
      harm: `${GM} | ${DM} | Bb3 D4 F4 D4 A3 C#4 E4 C#4 | ${AM}`,
      bass: `${oct('G1', 'G2')} | ${oct('D2', 'D3')} | Bb1 Bb2 Bb1 Bb2 A1 A2 A1 A2 | ${oct('A1', 'A2')}`,
      drums: `${DRUM_BAR} | ${DRUM_BAR} | ${DRUM_BAR} | k k s s k k S S`,
    },
  },
  order: ['A', 'A2', 'B', 'B2'],
};
