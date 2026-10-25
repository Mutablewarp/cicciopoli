import type { SongSrc } from '../sequencer';
import { bars, chart, hit, push, shout, stab, two } from './swing';

/**
 * Level 8 final boss (Il Boss della Burger Gang): the big band turns dark. C minor, 188 bpm swing on a triplet
 * grid, 48 bars (61 s). Lead = growling trumpet (two detuned saws, wide vibrato), harm = low trombones
 * (minor-sixth colour Cm6, flat-nine G7b9), bass = tuba riffing a boogie ostinato, drums = jungle toms almost
 * all the way, crash on every section.
 * Form: A A2 (minor theme and its higher answer, Cm-Fm-Ab7-G7), B (relief on Ab - Fm - Db7 - G7 over ride
 * swing), BRK (stop-time: trombone hits, tom fills, trumpet screams), SHOUT (the whole band, high trumpet
 * wails over brass punches), TURN (the lament: bass falling C-B-Bb-A-Ab-G) and a fill back onto the theme.
 */
const CM = 'Eb3+G3+C4';
const CM6 = 'Eb3+A3+C4';
const FM = 'F3+Ab3+C4';
const FM6 = 'F3+Ab3+D4';
const AB7 = 'Eb3+Gb3+C4';
const AB = 'Eb3+Ab3+C4';
const G7 = 'F3+B3+D4';
const G7B9 = 'F3+Ab3+B3';
const DB7 = 'F3+Ab3+B3+Db4';

type Bar = readonly [string, string];
const A_CH: readonly Bar[] = [[CM, CM6], [CM, CM6], [FM, FM6], [CM, CM6], [AB7, AB7], [G7, G7B9], [CM, CM6], [G7, G7B9]];

/** Boogie ostinato per chord: root, third, fifth, sixth, seventh, fifth (the last note leads on). */
const RIFF_C = 'C2 - . Eb2 - . G2 - A2 Bb2 - G2';
const RIFF_F = 'F1 - . Ab1 - . C2 - D2 Eb2 - C2';
const RIFF_AB = 'Ab1 - . C2 - . Eb2 - F2 Gb2 - Eb2';
const RIFF_G = 'G1 - . B1 - . D2 - F2 G2 - B1';
const A_RIFF = bars(RIFF_C, RIFF_C, RIFF_F, RIFF_C, RIFF_AB, RIFF_G, RIFF_C, RIFF_G);

const TOMF = 'kT . t t . t kT . t t . t';
const TOMFC = 'kcT . t t . t kT . t t . t';
const SWF = 'kh . . sh . h kh . . sh . h';
const SWFC = 'kc . . sh . h kh . . sh . h';
const FILLF = 'kT . t T t t S s s S S S';
const BRKF1 = 'kc . . . . . t . t T . t';
const BRKF2 = 'T t t T . t T t t S s S';
const SHF = 'kc . . kS . h kTh . . kS . t';
const SHF2 = 'kh . . kS . h kTh . . kS . t';
const groove = (open: string, body: string, end = FILLF): string => bars(open, body, body, body, body, body, body, end);

export const cartoonFinal: SongSrc = {
  bpm: 188,
  stepsPerBeat: 3,
  stepsPerBar: 12,
  loop: true,
  lead: { wave: 'sawtooth', vol: 0.1, a: 0.015, d: 0.1, sus: 0.8, r: 0.07, gate: 0.92, cutoff: 2300, unison: 7, vib: { cents: 20, rate: 6, delay: 0.15 } },
  harm: { wave: 'sawtooth', vol: 0.055, a: 0.015, d: 0.15, sus: 0.65, r: 0.08, gate: 0.85, cutoff: 1300, unison: 11 },
  bass: { wave: 'sawtooth', vol: 0.2, a: 0.01, d: 0.12, sus: 0.6, r: 0.05, gate: 0.75, cutoff: 650 },
  drums: 0.2,
  // a beat behind: the trumpet rings round the rooftop
  echo: { time: 0.32, fb: 0.2, mix: 0.13 },
  patterns: {
    // Cm Cm Fm Cm | Ab7 G7 Cm G7: the minor theme over the tom groove
    A: {
      bars: 8,
      lead: bars(
        'G4 - . C5 - Eb5 G5 - - - - .',
        'Ab5 - G5 F5 - Eb5 D5 - - C5 - .',
        'F5 - . Ab5 - C6 Eb6 - - C6 - Ab5',
        'G5 - - - - - . . . G4 Bb4 B4',
        'C5 - . Eb5 - Gb5 Ab5 - - Gb5 - Eb5',
        'D5 - . F5 - Ab5 B5 - - Ab5 - F5',
        'Eb5 - - D5 - C5 G4 - - C5 - Eb5',
        'D5 - - - - - B4 - - . . .',
      ),
      harm: chart(A_CH, stab),
      bass: A_RIFF,
      drums: groove(TOMFC, TOMF),
    },
    // the answer, an octave of anger higher
    A2: {
      bars: 8,
      lead: bars(
        'C6 - . Eb6 - C6 G5 - - - - .',
        'Bb5 - Ab5 G5 - F5 Eb5 - - C5 - .',
        'F5 - . Ab5 - C6 F6 - - Eb6 - C6',
        'Eb6 - - D6 - C6 G5 - - - - .',
        'Gb5 - . Ab5 - C6 Eb6 - - C6 - Ab5',
        'F6 - . D6 - B5 Ab5 - - F5 - D5',
        'Eb5 - . G5 - C6 Eb6 - - D6 - C6',
        'B5 - - - - - . . . G4 Ab4 Bb4',
      ),
      harm: chart(A_CH, push),
      bass: A_RIFF,
      drums: groove(TOMFC, TOMF),
    },
    // Ab Ab Fm Fm | Db7 Db7 G7 G7: a breath of major on the ride, then the dark turn back
    B: {
      bars: 8,
      lead: bars(
        'C5 - - - - Eb5 Ab5 - - - - .',
        'G5 - . Ab5 - Bb5 C6 - - Ab5 - Eb5',
        'F5 - - - - Ab5 C6 - - - - .',
        'Bb5 - . C6 - Db6 C6 - - Ab5 - F5',
        'Ab5 - - - - F5 B5 - - Ab5 - F5',
        'Db6 - - - - B5 Ab5 - - F5 - Db5',
        'D5 - . F5 - Ab5 B5 - - D6 - F6',
        '- - - D6 - B5 Ab5 - - G5 - .',
      ),
      harm: bars(two(AB), two(AB), two(FM), two(FM6), two(DB7), two(DB7), stab(G7), stab(G7B9)),
      bass: bars(
        'Ab1 - - C2 - - Eb2 - - C2 - -', 'Ab1 - - Bb1 - - C2 - - Eb2 - -',
        'F1 - - Ab1 - - C2 - - Ab1 - -', 'F1 - - G1 - - Ab1 - - C2 - -',
        'Db2 - - F2 - - Ab2 - - F2 - -', 'Db2 - - Cb2 - - Ab1 - - F1 - -',
        'G1 - - B1 - - D2 - - F2 - -', 'G2 - - F2 - - D2 - - B1 - -',
      ),
      drums: groove(SWFC, SWF),
    },
    // stop-time: trombone hits on 1, the toms answer, the trumpet screams in the gaps
    BRK: {
      bars: 8,
      lead: bars(
        '. . . . . . . . . . . .',
        '. . . . . . G5 - C6 Eb6 - .',
        '. . . . . . . . . . . .',
        '. . . . . . Ab5 - C6 F6 - .',
        '. . . . . . . . . . . .',
        '. . . . . . B5 - D6 F6 - .',
        'G5 - - - - - - - - - - -',
        '- - - - - - . . . G5 Bb5 B5',
      ),
      harm: bars(hit(CM), hit(CM), hit(FM), hit(FM), hit(G7B9), hit(G7B9), stab(CM, CM6), stab(G7, G7B9)),
      bass: bars(hit('C2'), hit('C2'), hit('F1'), hit('F1'), hit('G1'), hit('G1'), RIFF_C, RIFF_G),
      drums: bars(BRKF1, BRKF2, BRKF1, BRKF2, BRKF1, BRKF2, BRKF1, FILLF),
    },
    // the whole band: high trumpet wails over trombone punches
    SHOUT: {
      bars: 8,
      lead: bars(
        'C6 - - - - - - - - Bb5 - C6',
        'Eb6 - - - - - C6 - - G5 - .',
        'F6 - - - - - Eb6 - - C6 - Ab5',
        'G5 - - - - - . . . G5 Bb5 C6',
        'Eb6 - - - - - C6 - - Ab5 - Gb5',
        'F5 - - Ab5 - B5 D6 - - F6 - D6',
        'Eb6 - - D6 - C6 G5 - - Eb5 - C5',
        'D5 - - - - - B4 - - . . .',
      ),
      harm: chart(A_CH, shout),
      bass: A_RIFF,
      drums: groove(SHF, SHF2),
    },
    // the lament: Cm over a bass falling C B Bb A, Ab7, G7, then the fill onto the theme
    TURN: {
      bars: 8,
      lead: bars(
        'Eb5 - - - - - G5 - - C6 - -',
        'B5 - - - - - - - - G5 - .',
        'Bb5 - - - - - G5 - - Eb5 - .',
        'A5 - - - - - C6 - - Eb6 - -',
        '- - - - - - C6 - - Ab5 - Eb5',
        'Gb5 - - - - - Ab5 - - C6 - Eb6',
        'D6 - - - - - B5 - - Ab5 - F5',
        'D5 - - - - - B4 - - . . .',
      ),
      harm: bars(two(CM), two(CM), two(CM), two(CM6), two(AB), two(AB7), two(G7), stab(G7, G7B9)),
      bass: bars(two('C2'), two('B1'), two('Bb1'), two('A1'), two('Ab1'), two('Ab1', 'Gb1'), two('G1'), two('G1', 'B1')),
      drums: groove(TOMFC, TOMF),
    },
  },
  order: ['A', 'A2', 'B', 'BRK', 'SHOUT', 'TURN'],
};
