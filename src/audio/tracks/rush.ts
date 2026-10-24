import type { SongSrc } from '../sequencer';

/**
 * Level 6 "Ciccio's Rush": Palermo street-food tarantella in E minor, 6/8 at 160 dotted-quarter
 * bpm, one step = one eighth note, 32 bars (A A2 B C, 24 s). Lead = accordion (reedy pulse,
 * musette wobble on held notes), harm = running mandolin arpeggios, bass = the van's engine: a
 * lowpassed square chugging on every eighth with a blip on the fifth. B swings to G major with a
 * singing tune; C idles the engine under tambourine-only repeated-note figures, then revs it up
 * chromatically under a snare roll back onto the hook. Drums: kick on both dotted beats, backbeat
 * on the second, tamburello jingles in between.
 */
const bars = (...b: string[]): string => b.join(' | ');
/** Mandolin broken chord: up to the top note and back down. */
const arp = (a: string, b: string, c: string, d: string): string => `${a} ${b} ${c} ${d} ${c} ${b}`;
/** Engine chug: the root on every eighth, a blip on the fifth before the next bar. */
const chug = (r: string, f: string): string => `${r} ${r} ${r} ${r} ${r} ${f}`;

const EM = arp('E4', 'G4', 'B4', 'E5');
const B7 = arp('D#4', 'F#4', 'A4', 'B4');
const AM = arp('E4', 'A4', 'C5', 'E5');
const C = arp('E4', 'G4', 'C5', 'E5');
const G = arp('D4', 'G4', 'B4', 'D5');
const D = arp('D4', 'F#4', 'A4', 'D5');

const E_ = chug('E2', 'B2');
const B_ = chug('B1', 'F#2');
const A_ = chug('A2', 'E2');
const C_ = chug('C2', 'G2');
const G_ = chug('G2', 'D2');
const D_ = chug('D2', 'A2');

const GROOVE = 'Ko h o kS h o';
const DRIVE = 'Ko o o kS o O';
const HOOK = 'E5 - G5 B5 - G5 | E6 - D6 B5 - G5 | F#5 - A5 B5 - A5 | D#6 - C6 B5 - A5';

export const rush: SongSrc = {
  bpm: 160,
  stepsPerBeat: 3,
  stepsPerBar: 6,
  loop: true,
  lead: { wave: 0.3, vol: 0.18, a: 0.012, d: 0.1, sus: 0.8, r: 0.05, gate: 0.92, cutoff: 2800, vib: { cents: 10, rate: 6.5, delay: 0.06 } },
  harm: { wave: 0.25, vol: 0.075, a: 0.002, d: 0.09, sus: 0.12, r: 0.06, gate: 0.9, cutoff: 3600 },
  bass: { wave: 0.5, vol: 0.24, a: 0.003, d: 0.05, sus: 0.45, r: 0.03, gate: 0.6, cutoff: 480 },
  drums: 0.34,
  echo: { time: 0.25, fb: 0.18, mix: 0.1 },
  patterns: {
    // Em Em B7 B7 | Em Am B7 Em: the hook
    A: {
      bars: 8,
      lead: bars(HOOK, 'G5 - B5 E6 - B5', 'A5 - C6 E6 - C6', 'B5 C6 B5 A5 G5 F#5', 'E5 - - . . D#5'),
      harm: bars(EM, EM, B7, B7, EM, AM, B7, EM),
      bass: bars(E_, E_, B_, B_, E_, A_, B_, E_),
      drums: bars(GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, 'Ko h o kS s s'),
    },
    // Em Em B7 B7 | Em C B7 Em: same hook, new answer, walk-up into G major
    A2: {
      bars: 8,
      lead: bars(HOOK, 'G5 - B5 E6 - D6', 'C6 - B5 A5 - G5', 'F#5 - A5 D#5 - F#5', 'E5 - - B4 C#5 D5'),
      harm: bars(EM, EM, B7, B7, EM, C, B7, EM),
      bass: bars(E_, E_, B_, B_, E_, C_, B_, E_),
      drums: bars(GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, GROOVE, 'Ko h o S s S'),
    },
    // G D Em B7 | C Am B7 B7: the singing tune, falling sequence then a climb to F#6
    B: {
      bars: 8,
      lead: bars(
        'B5 - - - A5 B5',
        'A5 - - F#5 G5 A5',
        'G5 - - E5 F#5 G5',
        'F#5 - - D#5 E5 F#5',
        'G5 - C6 E6 - C6',
        'C6 - A5 E5 - A5',
        'B5 - D#6 F#6 - D#6',
        'B5 A5 G5 F#5 E5 D#5',
      ),
      harm: bars(G, D, EM, B7, C, AM, B7, B7),
      bass: bars(G_, D_, E_, B_, C_, A_, B_, B_),
      drums: bars(DRIVE, DRIVE, DRIVE, DRIVE, DRIVE, DRIVE, DRIVE, 'Ko o s S s S'),
    },
    // Em Em Am Am | C B7 B7 B7: engine idling under tambourine, then the rev-up
    C: {
      bars: 8,
      lead: bars(
        'B5 B5 B5 C6 B5 A5',
        'G5 G5 G5 A5 G5 F#5',
        'C6 C6 C6 D6 C6 B5',
        'A5 A5 A5 B5 A5 G5',
        'E6 - - - - -',
        'D#6 - - - - -',
        'C6 - - B5 - -',
        'A5 . G5 . F#5 D#5',
      ),
      harm: bars(EM, EM, AM, AM, C, B7, B7, B7),
      bass: bars('E2 . . E2 . .', 'E2 . . E2 . .', A_, A_, C_, B_, 'B1 B1 B1 C2 C2 C2', 'C#2 C#2 D2 D2 D#2 D#2'),
      drums: bars('o . o o . o', 'o . o o . O', 'Ko . o ko . o', 'Ko . o ko . o', DRIVE, DRIVE, DRIVE, 's s s S S S'),
    },
  },
  order: ['A', 'A2', 'B', 'C'],
};
