import type { SongSrc } from '../sequencer';

/**
 * Level 3 "Ciccio's Invaders": spacey A-minor synth chiptune, 128 bpm 4/4, one step = one
 * sixteenth, 16 bars (A A' B B'). Harm = rising 16th arpeggios, bass = deep stepped-triangle
 * octave pump, lead = dotted-eighth echo; B is the heroic hook for Ciccio's jet.
 */
const arp = (a: string, b: string, c: string, d: string): string => `${a} ${b} ${c} ${d} `.repeat(4).trim();
const AM = arp('A4', 'C5', 'E5', 'A5');
const FM = arp('F4', 'A4', 'C5', 'F5');
const CM = arp('G4', 'C5', 'E5', 'G5');
const GM = arp('G4', 'B4', 'D5', 'G5');
const DM = arp('F4', 'A4', 'D5', 'F5');
const EM = arp('E4', 'G#4', 'B4', 'E5');
const EMI = arp('E4', 'G4', 'B4', 'E5');

const pump = (r: string, o: string): string => `${r} - . ${r} ${o} - . ${r} ${r} - . ${r} ${o} - ${r} -`;
const DR = 'k . h . s . h . k . h k s . h .';
const DRIVE = 'K . h . s . h k k . h . s . h h';
const FILL = 'k . h . s . h . k . s . s s S S';

export const invaders: SongSrc = {
  bpm: 128,
  stepsPerBeat: 4,
  stepsPerBar: 16,
  loop: true,
  lead: { wave: 0.25, vol: 0.2, a: 0.004, d: 0.12, sus: 0.65, r: 0.08, gate: 0.92, vib: { cents: 20, rate: 5.5, delay: 0.22 } },
  harm: { wave: 0.125, vol: 0.06, a: 0.002, d: 0.05, sus: 0.3, r: 0.03, gate: 0.6, cutoff: 3400 },
  bass: { wave: 'bass', vol: 0.3, a: 0.004, d: 0.12, sus: 0.75, r: 0.04, gate: 0.85 },
  drums: 0.34,
  // dotted-eighth echo (0.75 beat) = the "space" around the lead
  echo: { time: 0.3516, fb: 0.32, mix: 0.2 },
  patterns: {
    // Am | F | C | G
    A: {
      bars: 4,
      lead:
        'A4 - - - E5 - - - A5 - - - G5 - E5 - | F5 - - - - - E5 - C5 - - - A4 - C5 - | ' +
        'G5 - - - - - E5 - G5 - C6 - B5 - G5 - | D5 - - - - - - - B4 - D5 - G5 - - -',
      harm: `${AM} | ${FM} | ${CM} | ${GM}`,
      bass: `${pump('A1', 'A2')} | ${pump('F1', 'F2')} | ${pump('C2', 'C3')} | ${pump('G1', 'G2')}`,
      drums: `${DR} | ${DR} | ${DR} | ${FILL}`,
    },
    // Am | F | Dm | E
    A2: {
      bars: 4,
      lead:
        'A4 - - - E5 - - - A5 - - - C6 - B5 - | A5 - - - - - G5 - F5 - - - A5 - C6 - | ' +
        'D6 - - - C6 - A5 - F5 - - - D5 - F5 - | E5 - - - - - - - G#5 - - - B5 - - -',
      harm: `${AM} | ${FM} | ${DM} | ${EM}`,
      bass: `${pump('A1', 'A2')} | ${pump('F1', 'F2')} | ${pump('D2', 'D3')} | ${pump('E2', 'E3')}`,
      drums: `${DR} | ${DR} | ${DR} | ${FILL}`,
    },
    // F | G | Em | Am: the hook, a dotted fanfare climbing the triad
    B: {
      bars: 4,
      lead:
        'C5 - - F5 - - A5 - C6 - - - A5 - C6 - | D6 - - - B5 - G5 - D6 - - - E6 - D6 - | ' +
        'E6 - - - B5 - G5 - E5 - G5 - B5 - E6 - | C6 - - - - - - - B5 - A5 - B5 - C6 -',
      harm: `${FM} | ${GM} | ${EMI} | ${AM}`,
      bass: `${pump('F1', 'F2')} | ${pump('G1', 'G2')} | ${pump('E2', 'E3')} | ${pump('A1', 'A2')}`,
      drums: `${DRIVE} | ${DRIVE} | ${DRIVE} | ${DRIVE}`,
    },
    // F | G | E | E (dominant turnaround back to Am)
    B2: {
      bars: 4,
      lead:
        'C5 - - F5 - - A5 - C6 - - - F5 - A5 - | D6 - - - B5 - D6 - E6 - - - D6 - B5 - | ' +
        'B5 - - - G#5 - B5 - E6 - - - D6 - B5 - | G#5 - - - - - - - B5 - - - - - E5 -',
      harm: `${FM} | ${GM} | ${EM} | ${EM}`,
      bass: `${pump('F1', 'F2')} | ${pump('G1', 'G2')} | ${pump('E2', 'E3')} | ${pump('E2', 'E3')}`,
      drums: `${DRIVE} | ${DRIVE} | ${DRIVE} | ${FILL}`,
    },
  },
  order: ['A', 'A2', 'B', 'B2'],
};
