import type { SongSrc } from '../sequencer';
import { bars, chart, hit, push, REST, shout, stab, two, walk } from './swing';

/**
 * Level 8 boss fights: hot-jazz big band in Bb major, 200 bpm swing on a triplet grid, 64 bars (76.8 s) so a
 * 60-90 s fight never hears the same chorus twice. Lead = clarinet (square reed, vibrato on held notes),
 * harm = the brass section (two detuned saws per note: stabs, pushes, shout punches), bass = tuba, in two
 * under the head and walking everywhere else, drums = brushes and a ride, jungle toms on the bridge and the
 * drum break, crashes on the section downbeats.
 * Form: A A2 B A3 (a 32-bar chorus on rhythm changes: Bb-G7-Cm7-F7, bridge D7-G7-C7-F7), SOLO SOLO2 (clarinet
 * triplet runs and blue-note riffs over A changes), DRUMS (stop-time tom break with brass hits, the clarinet
 * climbing over it), SHOUT (the whole band on the hook, brass punching every chord) and a snare roll that
 * falls back onto the hook.
 */
const BB = 'D4+F4+Bb4';
const G7 = 'D4+F4+B4';
const CM7 = 'Eb4+G4+Bb4';
const F7 = 'Eb4+A4+C5';
const BB7 = 'D4+F4+Ab4';
const EB6 = 'Eb4+G4+C5';
const EDIM = 'E4+G4+Db5';
const D7 = 'D4+F#4+C5';
const C7 = 'E4+G4+Bb4';

type Bar = readonly [string, string];
/** Rhythm changes, A section: two chords a bar. */
const A_CH: readonly Bar[] = [[BB, G7], [CM7, F7], [BB, G7], [CM7, F7], [BB, BB7], [EB6, EDIM], [BB, F7], [BB, F7]];
/** The bridge: each dominant for two bars. */
const B_CH: readonly Bar[] = [[D7, D7], [D7, D7], [G7, G7], [G7, G7], [C7, C7], [C7, C7], [F7, F7], [F7, F7]];

const A_TWO = bars(
  two('Bb1', 'G1'), two('C2', 'F1'), two('Bb1', 'G1'), two('C2', 'F2'),
  two('Bb1', 'Ab1'), two('Eb2', 'E2'), two('F1', 'C2'), two('Bb1', 'F1'),
);
const A_WALK = bars(
  walk('Bb1', 'D2', 'G1', 'B1'), walk('C2', 'Eb2', 'F2', 'A1'),
  walk('Bb1', 'A1', 'G1', 'B1'), walk('C2', 'G1', 'F1', 'A1'),
  walk('Bb1', 'F1', 'Ab1', 'D2'), walk('Eb2', 'G1', 'E2', 'C2'),
  walk('D2', 'Bb1', 'C2', 'A1'), walk('Bb1', 'D2', 'F2', 'A1'),
);
const B_WALK = bars(
  walk('D2', 'F#2', 'A2', 'C3'), walk('D3', 'A2', 'F#2', 'Ab2'),
  walk('G2', 'F2', 'D2', 'B1'), walk('G1', 'A1', 'B1', 'Db2'),
  walk('C2', 'E2', 'G2', 'Bb2'), walk('C3', 'Bb2', 'G2', 'F#2'),
  walk('F2', 'A2', 'C3', 'A2'), walk('F2', 'Eb2', 'C2', 'A1'),
);

/** The hook (first four bars of A, A2, A3 and SHOUT). */
const HOOK = bars(
  'D5 . F5 G5 - Bb5 B5 - - D6 - .',
  'C6 - . Bb5 - G5 A5 - - F5 - Eb5',
  'D5 . F5 G5 - Bb5 B5 - - G5 - B5',
  'C6 - - Eb6 - C6 A5 - - F5 - .',
);

const SW = 'kh . . sh . h kh . . sh . h';
const SWC = 'kc . . sh . h kh . . sh . h';
const TOM = 'kT . t t . t kT . t t . t';
const TOMC = 'kcT . t t . t kT . t t . t';
const FILL = 'kh . . sh . h s s s S s S';
const BRK1 = 'kc . . t . t T . t t . t';
const BRK2 = 'T . t t . t T . t T t t';
const ROLL = 'S s s S s s S s s S S S';
const PUNCH = 'kc . . kS . h kh . . kS . h';
const PUNCH2 = 'kh . . kS . h kh . . kS . h';
const groove = (open: string, body: string, end = FILL): string => bars(open, body, body, body, body, body, body, end);

export const cartoonBoss: SongSrc = {
  bpm: 200,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 0.5, vol: 0.105, a: 0.012, d: 0.1, sus: 0.85, r: 0.06, gate: 0.92, cutoff: 2600, vib: { cents: 14, rate: 5.8, delay: 0.18 } },
  harm: { wave: 'sawtooth', vol: 0.068, a: 0.012, d: 0.12, sus: 0.6, r: 0.07, gate: 0.8, cutoff: 1900, unison: 9 },
  bass: { wave: 'sawtooth', vol: 0.19, a: 0.012, d: 0.12, sus: 0.6, r: 0.05, gate: 0.72, cutoff: 700 },
  drums: 0.2,
  // a beat behind, quiet: a little hall around the clarinet
  echo: { time: 0.3, fb: 0.15, mix: 0.1 },
  patterns: {
    A: {
      bars: 8,
      lead: bars(
        HOOK,
        '. . Bb5 D6 - Bb5 F5 - . Ab5 - Bb5',
        'G5 - - Eb5 - G5 Bb5 - - Db6 - .',
        'D6 - . C6 - Bb5 A5 - F5 G5 - A5',
        'Bb5 - - - - . . . . . C5 C#5',
      ),
      harm: chart(A_CH, push),
      bass: A_TWO,
      drums: groove(SWC, SW),
    },
    A2: {
      bars: 8,
      lead: bars(
        HOOK,
        'Bb5 - . D6 - F6 - - . D6 - Ab5',
        'G5 - - Bb5 - Eb6 Db6 - - Bb5 - G5',
        'F5 - . D5 - F5 Eb5 - - C5 - A4',
        'Bb4 - - D5 - F5 Bb5 - - . . .',
      ),
      harm: chart(A_CH, push),
      bass: A_TWO,
      drums: groove(SWC, SW),
    },
    // the bridge on jungle toms: long singing notes, the brass stabbing on 1 and 3
    B: {
      bars: 8,
      lead: bars(
        'F#5 - - - - A5 - - . C6 - D6',
        '- - - C6 - A5 F#5 - - D5 - F5',
        '- - . G5 - B5 D6 - - F6 - .',
        'E6 - . D6 - B5 Ab5 - - F5 - D5',
        'E5 - - - - G5 - - . Bb5 - C6',
        '- - - Bb5 - G5 E5 - - C5 - Eb5',
        '- - . F5 - A5 C6 - - Eb6 - .',
        'D6 - . C6 - A5 F5 - - . C5 C#5',
      ),
      harm: chart(B_CH, stab),
      bass: B_WALK,
      drums: groove(TOMC, TOM),
    },
    A3: {
      bars: 8,
      lead: bars(
        HOOK,
        'D6 - . Bb5 - F5 Ab5 - - F5 - D5',
        'Eb5 - - G5 - Bb5 Db6 - - Bb5 - G5',
        'F5 - . D5 - F5 A5 - - C6 - Eb6',
        'D6 - - - - - Bb5 - . . . .',
      ),
      harm: chart(A_CH, push),
      bass: A_WALK,
      drums: groove(SWC, SW),
    },
    // clarinet solo, chorus 1: triplet runs, the brass holding "doo-wah" backgrounds
    SOLO: {
      bars: 8,
      lead: bars(
        'F5 G5 A5 Bb5 - D6 B5 - A5 G5 - F5',
        'Eb5 - G5 Bb5 - C6 A5 - F5 Eb5 D5 C5',
        'D5 F5 Bb5 D6 - Bb5 B5 D6 F6 D6 - B5',
        'C6 - Bb5 G5 - Eb5 A5 - C6 Eb6 - C6',
        'D6 - - Bb5 - - Ab5 - F5 D5 - Bb4',
        'Eb5 F5 G5 Bb5 - G5 E5 G5 Bb5 Db6 - Bb5',
        'D6 - C6 Bb5 - F5 A5 - C6 Eb6 D6 C6',
        'Bb5 - - F5 - D5 Bb4 - - . . .',
      ),
      harm: chart(A_CH, two),
      bass: A_WALK,
      drums: groove(SWC, SW),
    },
    // chorus 2: a blue-note riff repeated, then flurries up to the top of the horn
    SOLO2: {
      bars: 8,
      lead: bars(
        'Db6 D6 - Bb5 - F5 D6 - - B5 - .',
        'C6 - - Eb6 - C6 A5 - - F5 - .',
        'Db6 D6 - Bb5 - F5 D6 - - B5 - .',
        'C6 Eb6 F6 Eb6 - C6 A5 C6 Eb6 F6 - -',
        '- - - D6 - Bb5 Ab5 - - F5 - D5',
        'Eb5 G5 Bb5 Eb6 - Bb5 Db6 - Bb5 G5 - E5',
        'F5 - D5 F5 - Bb5 A5 C6 Eb6 F6 - Eb6',
        'D6 - - - - - . . . . . .',
      ),
      harm: chart(A_CH, stab),
      bass: A_WALK,
      drums: groove(SWC, SW),
    },
    // stop-time tom break on the bridge changes: the clarinet answers the brass hits, then climbs
    DRUMS: {
      bars: 8,
      lead: bars(
        REST,
        '. . . . . . F#5 A5 C6 D6 - .',
        REST,
        '. . . . . . G5 B5 D6 F6 - .',
        'E5 - - - - - - - - - - -',
        'G5 - - - - - - - - - - -',
        'A5 - - - - - - - - - - -',
        'C6 - - - - - . . . . C5 C#5',
      ),
      harm: bars(hit(D7), hit(D7), hit(G7), hit(G7), push(C7), push(C7), push(F7), stab(F7)),
      bass: bars(hit('D2'), hit('D2'), hit('G1'), hit('G1'), hit('C2'), hit('C2'), hit('F1'), walk('F2', 'Eb2', 'C2', 'A1')),
      drums: bars(BRK1, BRK2, BRK1, BRK2, BRK1, BRK2, BRK1, ROLL),
    },
    // out chorus: the hook over brass punches, the clarinet screaming to F6, a roll back onto the top
    SHOUT: {
      bars: 8,
      lead: bars(
        HOOK,
        'F6 - - - - - D6 - - Bb5 - Ab5',
        'G5 - Bb5 Eb6 - G5 Db6 - - Bb5 - G5',
        'F5 - D5 F5 - Bb5 A5 - C6 Eb6 - F6',
        'D6 - - Bb5 - - . . . . C5 C#5',
      ),
      harm: chart(A_CH, shout),
      bass: A_WALK,
      drums: groove(PUNCH, PUNCH2),
    },
  },
  order: ['A', 'A2', 'B', 'A3', 'SOLO', 'SOLO2', 'DRUMS', 'SHOUT'],
};
