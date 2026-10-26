import type { SongSrc } from '../sequencer';
import { A_CH, bars, CH, chart, CLIMB, HEAD, HOOK, hit, pah, push, shout, stab, TUNE_A, TUNE_A3, two, walk, type Bar } from './swing';

/**
 * Level 8 boss fights: hot-jazz big band in C major, 168 bpm swing on a triplet grid, 48 bars (68.6 s). The
 * clarinet (lead, vibrato on held notes) sings the map's tune and its hook (swing.ts HOOK) hot; the brass
 * section (harm, two detuned saws) stays out of its way: long "doo-wah" pads under the first chorus, then
 * "pah"s, pushes, and shout punches only in the out chorus. Tuba in two under the head, walking after;
 * brushes and a ride, jungle toms on the bridge and the break, crashes on the section downbeats.
 * Form: A A2 B A3 (the map's AABA), BRK (stop-time on the bridge changes, the clarinet answering the brass
 * hits with the hook's cell) and SHOUT (the whole band on the hook), then a snare fill back onto the top.
 */
const A2_CH: readonly Bar[] = [...HEAD, [CH.C, CH.G7], [CH.C, CH.C]];
/** The bridge, rhythm-changes style: III7 VI7 II7 V7, two bars each. */
const B_CH: readonly Bar[] = [[CH.E7, CH.E7], [CH.E7, CH.E7], [CH.A7, CH.A7], [CH.A7, CH.A7], [CH.D7, CH.D7], [CH.D7, CH.D7], [CH.G7, CH.G7], [CH.G7, CH.G7]];

const HEAD_TWO: readonly Bar[] = [['C2', 'G1'], ['G1', 'D2'], ['C2', 'G1'], ['C2', 'E2'], ['F1', 'C2'], ['F1', 'Ab1']];
const A_TWO = chart([...HEAD_TWO, ['C2', 'A1'], ['D2', 'G1']], two);
const A2_TWO = chart([...HEAD_TWO, ['C2', 'G1'], ['C2', 'B1']], two);
const A_WALK = bars(
  walk('C2', 'E2', 'G2', 'F#2'), walk('G2', 'F2', 'D2', 'B1'),
  walk('C2', 'G1', 'A1', 'B1'), walk('C2', 'G1', 'Bb1', 'E2'),
  walk('F2', 'A2', 'C3', 'A2'), walk('Ab2', 'F2', 'C2', 'D2'),
  walk('C2', 'E2', 'A1', 'C#2'), walk('D2', 'F#2', 'G1', 'B1'),
);
const B_WALK = bars(
  walk('E2', 'G#2', 'B2', 'D3'), walk('E3', 'D3', 'B2', 'G#2'),
  walk('A2', 'C#3', 'E3', 'C#3'), walk('A2', 'G2', 'E2', 'C#2'),
  walk('D2', 'F#2', 'A2', 'C3'), walk('D3', 'C3', 'A2', 'F#2'),
  walk('G2', 'B2', 'D3', 'B2'), walk('G2', 'F2', 'D2', 'B1'),
);

const SW = 'kh . . sh . h kh . . sh . h';
const SWC = 'kc . . sh . h kh . . sh . h';
const TOM = 'kT . t t . t kT . t t . t';
const TOMC = 'kcT . t t . t kT . t t . t';
const FILL = 'kh . . sh . h s s s S s S';
const BRK1 = 'kc . . t . t T . t t . t';
const BRK2 = 'T . t t . t T . t T t t';
const PUNCH = 'kc . . kS . h kh . . kS . h';
const PUNCH2 = 'kh . . kS . h kh . . kS . h';
const groove = (open: string, body: string): string => bars(open, body, body, body, body, body, body, FILL);

export const cartoonBoss: SongSrc = {
  bpm: 168,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 0.5, vol: 0.11, a: 0.012, d: 0.1, sus: 0.85, r: 0.06, gate: 0.9, cutoff: 2600, vib: { cents: 14, rate: 5.8, delay: 0.18 } },
  harm: { wave: 'sawtooth', vol: 0.05, a: 0.014, d: 0.12, sus: 0.6, r: 0.07, gate: 0.8, cutoff: 1700, unison: 9 },
  bass: { wave: 'sawtooth', vol: 0.18, a: 0.012, d: 0.12, sus: 0.6, r: 0.05, gate: 0.72, cutoff: 700 },
  drums: 0.19,
  // a beat behind, quiet: a little hall around the clarinet
  echo: { time: 0.36, fb: 0.14, mix: 0.09 },
  patterns: {
    A: { bars: 8, lead: TUNE_A, harm: chart(A_CH, two), bass: A_TWO, drums: groove(SWC, SW) },
    A2: {
      bars: 8,
      lead: bars(HOOK, CLIMB, 'E5 - - C5 - - D5 - - B4 - -', 'C5 - - - - . . . . . D5 D#5'),
      harm: chart(A2_CH, pah),
      bass: A2_TWO,
      drums: groove(SWC, SW),
    },
    // the bridge on jungle toms: the hook's cell on each dominant, every call answered a bar later
    B: {
      bars: 8,
      lead: bars(
        'E5 - G#5 B5 - - C#6 - - B5 - -',
        'G#5 - - E5 - - D5 - - . . .',
        'A4 - C#5 E5 - - F#5 - - E5 - -',
        'C#5 - - A4 - - G4 - - . . .',
        'D5 - F#5 A5 - - B5 - - A5 - -',
        'F#5 - - D5 - - C5 - - . . .',
        'G4 - B4 D5 - - E5 - - D5 - -',
        'B4 - - G4 - - F4 - - . . B4',
      ),
      harm: chart(B_CH, stab),
      bass: B_WALK,
      drums: groove(TOMC, TOM),
    },
    A3: { bars: 8, lead: TUNE_A3, harm: chart(A_CH, push), bass: A_WALK, drums: groove(SWC, SW) },
    // stop-time on the bridge changes: the brass hits, the clarinet answers with the hook's cell, then climbs
    BRK: {
      bars: 8,
      lead: bars(
        '. . . . . . . . . . . .',
        '. . . . . . E5 - G#5 B5 - -',
        '. . . . . . . . . . . .',
        '. . . . . . A5 - C#6 E6 - -',
        'F#5 - - - - - - - - - - -',
        'A5 - - - - - - - - - - -',
        'B5 - - - - - - - - - - -',
        'D6 - - - - - . . . . . B4',
      ),
      harm: bars(hit(CH.E7), hit(CH.E7), hit(CH.A7), hit(CH.A7), push(CH.D7), push(CH.D7), push(CH.G7), stab(CH.G7)),
      bass: bars(hit('E2'), hit('E2'), hit('A1'), hit('A1'), two('D2', 'A1'), two('D2', 'F#2'), two('G1', 'D2'), walk('G2', 'F2', 'D2', 'B1')),
      drums: bars(BRK1, BRK2, BRK1, BRK2, BRK1, BRK2, BRK1, FILL),
    },
    // out chorus: the hook over brass punches, the clarinet up to F6, then a fill back onto the top
    SHOUT: {
      bars: 8,
      lead: bars(HOOK, 'F5 - A5 C6 - - F6 - - D6 - -', 'C6 - - Ab5 - - F5 - - Ab5 - -', 'G5 - C6 E6 - - C#6 - - A5 - -', 'D6 - - A5 - - G5 - - D5 - B4'),
      harm: chart(A_CH, shout),
      bass: A_WALK,
      drums: groove(PUNCH, PUNCH2),
    },
  },
  order: ['A', 'A2', 'B', 'A3', 'BRK', 'SHOUT'],
};
