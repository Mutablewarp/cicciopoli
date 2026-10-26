import { describe, expect, it } from 'vitest';
import { playDrum, playNote, type Drum } from './instruments';
import { compileSong, type Song, type SongEvent } from './sequencer';
import { SFX } from './sfx';
import { hz, noteToMidi } from './theory';
import { SONGS } from './tracks';
import { HOOK, minor } from './tracks/swing';

type Melodic = 'lead' | 'harm' | 'bass';
const at = (song: Song, step: number, ch: SongEvent['ch']): SongEvent[] => song.steps[step].filter((e) => e.ch === ch);
const drums = (song: Song, step: number): string => song.steps[step].flatMap((e) => (e.ch === 'drums' ? [e.drum] : [])).join('');
const midis = (song: Song, ch: Melodic): number[] => song.steps.flatMap((s) => s.flatMap((e) => (e.ch === ch ? [e.midi] : [])));
const pitchClasses = (song: Song): Set<number> => new Set((['lead', 'harm', 'bass'] as const).flatMap((ch) => midis(song, ch)).map((m) => m % 12));
const opening = (lead: string | undefined): string | undefined => lead?.split('|').slice(0, 4).map((b) => b.trim()).join('|');

describe('level 8 tracks: shared form', () => {
  it.each(['cartoon', 'cartoonBoss', 'cartoonFinal'] as const)('%s swings on a triplet grid, loops, and every section has its own tune', (n) => {
    const src = SONGS[n];
    expect(src.loop).toBe(true);
    expect(src.stepsPerBeat).toBe(3);
    expect(src.stepsPerBar).toBe(12);
    const leads = [...new Set(src.order)].map((p) => src.patterns[p].lead);
    expect(new Set(leads).size).toBe(leads.length);
    const song = compileSong(src);
    // the loop seam: the downbeat of bar 1 has the bass under it
    expect(at(song, 0, 'bass').length).toBeGreaterThan(0);
  });
});

describe('level 8 tracks: one singable hook for the whole level', () => {
  const HOOK_STEPS = 4 * 12;
  /** [step, midi] of every lead note in the 4 bars from `from`. */
  const notes = (song: Song, from: number): (readonly [number, number])[] =>
    song.steps.slice(from, from + HOOK_STEPS).flatMap((s, i) => s.flatMap((e) => (e.ch === 'lead' ? [[i, e.midi] as const] : [])));
  const hook = notes(compileSong(SONGS.cartoon), 0);

  it.each([
    ['cartoon', ['A', 'A2', 'A3'], HOOK],
    ['cartoonBoss', ['A', 'A2', 'A3', 'SHOUT'], HOOK],
    ['cartoonFinal', ['A', 'A2', 'SHOUT'], minor(HOOK)],
  ] as const)('%s sings the hook at the top of %j', (name, sections, text) => {
    const src = SONGS[name];
    for (const p of sections) expect(opening(src.patterns[p].lead), p).toBe(opening(text));
    const song = compileSong(src);
    const bar = (p: string): number => src.order.indexOf(p) * 8 * src.stepsPerBar;
    for (const p of sections) expect(notes(song, bar(p)).map(([i]) => i), p).toEqual(hook.map(([i]) => i));
  });

  it('is easy to sing: a ninth wide, no leap over a fourth, its first bar said twice, ending on the tonic', () => {
    const m = hook.map(([, n]) => n);
    expect(Math.max(...m) - Math.min(...m)).toBeLessThanOrEqual(14);
    for (let i = 1; i < m.length; i++) expect(Math.abs(m[i] - m[i - 1]), `note ${i}`).toBeLessThanOrEqual(5);
    const bar = (b: number): string => HOOK.split('|')[b].trim();
    expect(bar(2)).toBe(bar(0));
    expect(m.at(-1)).toBe(noteToMidi('C5'));
  });

  it('the final boss sings the same rhythm in C minor: only E and A drop a semitone', () => {
    const dark = notes(compileSong(SONGS.cartoonFinal), 0);
    expect(dark.map(([i]) => i)).toEqual(hook.map(([i]) => i));
    dark.forEach(([, n], i) => expect(hook[i][1] - n, `note ${i}`).toBe([4, 9].includes(hook[i][1] % 12) ? 1 : 0));
  });

  it('the fight tracks swing at 160-180 bpm, the map at 120', () => {
    expect(SONGS.cartoon.bpm).toBe(120);
    for (const n of ['cartoonBoss', 'cartoonFinal'] as const) {
      expect(SONGS[n].bpm, n).toBeGreaterThanOrEqual(160);
      expect(SONGS[n].bpm, n).toBeLessThanOrEqual(180);
    }
  });

  it('the golden-ticket fanfare shouts the first bar of the hook on the brass (a step = 0.1 s) before its last chord', () => {
    const saws: { t: number; f: number }[] = [];
    const param = { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined, setTargetAtTime: () => undefined, setValueCurveAtTime: () => undefined };
    const node = (): object => ({ frequency: param, detune: param, gain: param, Q: param, connect: <T>(d: T): T => d, disconnect: () => undefined, setPeriodicWave: () => undefined, start: () => undefined, stop: () => undefined });
    const osc = (): object => {
      const o = { ...node(), type: '', frequency: { ...param, setValueAtTime: (f: number, t: number) => (o.type === 'sawtooth' ? saws.push({ t, f }) : 0) } };
      return o;
    };
    const ctx = { sampleRate: 8000, createOscillator: osc, createGain: node, createBiquadFilter: node, createBufferSource: node, createPeriodicWave: () => ({}), createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }) } as unknown as BaseAudioContext;
    SFX.ticket({ ctx, out: {} as AudioNode }, 0, 1);
    const tune = new Map<number, number>();
    for (const { t, f } of saws) if (t > 0.35 && t < 1.55 && f >= hz('C5') * 0.999) tune.set(Math.round(t * 10), tune.get(Math.round(t * 10)) ?? f);
    const heard = [...tune].map(([t, f]) => [t - 4, Math.round(69 + 12 * Math.log2(f / 440))]);
    expect(heard).toEqual(hook.filter(([i]) => i < 12));
  });
});

describe('cartoon (map): stride piano', () => {
  const src = SONGS.cartoon;
  const song = compileSong(src);
  const BAR = src.stepsPerBar;

  it('is a 120 bpm 32-bar AABA ragtime loop of 64 s', () => {
    expect(src.bpm).toBe(120);
    expect(src.order).toEqual(['A', 'A2', 'B', 'A3']);
    expect(song.total / BAR).toBe(32);
    expect(song.total * song.stepDur).toBeCloseTo(64, 6);
    for (const p of ['A2', 'A3']) expect(opening(src.patterns[p].lead)).toBe(opening(src.patterns.A.lead));
  });

  it('the left hand strides: low notes only on 1 and 3, chords only on 2 and 4, in every bar', () => {
    for (let bar = 0; bar < 32; bar++) {
      for (let i = 0; i < BAR; i++) {
        const s = bar * BAR + i;
        expect(at(song, s, 'bass').length > 0, `bass bar ${bar + 1} step ${i}`).toBe(i === 0 || i === 6);
        expect(at(song, s, 'harm').length > 0, `harm bar ${bar + 1} step ${i}`).toBe(i === 3 || i === 9);
      }
      expect(at(song, bar * BAR + 3, 'harm').length).toBeGreaterThanOrEqual(3);
    }
  });

  it('is in C major with the ragtime circle of dominants (C# of A7, F# of D7, Bb of C7, Ab of Fm)', () => {
    const pcs = pitchClasses(song);
    for (const pc of [0, 2, 4, 5, 7, 9, 11, 1, 6, 10, 8]) expect(pcs.has(pc), `pc ${pc}`).toBe(true);
    expect(midis(song, 'bass')[0] % 12).toBe(0);
  });

  it('a woodblock clip-clops through the bridge, brushes elsewhere', () => {
    const bridge = (bar: number): string => Array.from({ length: BAR }, (_, i) => drums(song, bar * BAR + i)).join('');
    for (let bar = 16; bar < 23; bar++) expect(bridge(bar)).toContain('w');
    for (const bar of [0, 8, 24]) expect(bridge(bar)).not.toContain('w');
  });
});

describe('cartoonBoss: hot-jazz big band', () => {
  const src = SONGS.cartoonBoss;
  const song = compileSong(src);
  const BAR = src.stepsPerBar;
  const sectionStart = (name: string): number => src.order.indexOf(name) * 8 * BAR;

  it('is 168 bpm swing, 48 bars of six sections (68.6 s), the map tune hot plus a bridge, a break and a shout', () => {
    expect(src.bpm).toBe(168);
    expect(src.order).toEqual(['A', 'A2', 'B', 'A3', 'BRK', 'SHOUT']);
    expect(song.total / BAR).toBe(48);
    expect(song.total * song.stepDur).toBeCloseTo(68.57, 1);
    for (const p of ['A', 'A3']) expect(src.patterns[p].lead).toBe(SONGS.cartoon.patterns[p].lead);
  });

  it('is in C major with the bridge on E7 A7 D7 G7 (G# C# F#) and the Bb / Ab of C7 and Fm', () => {
    const pcs = pitchClasses(song);
    for (const pc of [0, 2, 4, 5, 7, 9, 11, 8, 1, 6, 10]) expect(pcs.has(pc), `pc ${pc}`).toBe(true);
    expect(midis(song, 'bass')[0] % 12).toBe(0);
  });

  it('the tuba plays in two under the first chorus, then walks a note on every beat', () => {
    for (let s = 0; s < 16 * BAR; s += 3) expect(at(song, s, 'bass').length, `step ${s}`).toBe(s % 6 === 0 ? 1 : 0);
    for (const name of ['B', 'A3', 'SHOUT']) {
      const o = sectionStart(name);
      for (let s = o; s < o + 8 * BAR; s += 3) expect(at(song, s, 'bass').length, `${name} step ${s - o}`).toBe(1);
    }
  });

  it('the brass plays full chords in every bar but stays clear of the clarinet: long pads under the first hook', () => {
    for (let bar = 0; bar < 48; bar++) {
      const widest = Math.max(...Array.from({ length: BAR }, (_, i) => at(song, bar * BAR + i, 'harm').length));
      expect(widest, `bar ${bar + 1}`).toBeGreaterThanOrEqual(3);
    }
    const attacks = (name: string): number => Array.from({ length: 8 * BAR }, (_, i) => (at(song, sectionStart(name) + i, 'harm').length > 0 ? 1 : 0)).reduce<number>((a, b) => a + b, 0);
    expect(attacks('A')).toBe(16);
    expect(attacks('SHOUT')).toBeGreaterThan(attacks('A'));
  });

  it('jungle toms drive the bridge and the break; a crash opens every section', () => {
    const toms = (bar: number): number => Array.from({ length: BAR }, (_, i) => drums(song, bar * BAR + i)).join('').split('t').length - 1;
    for (const name of ['B', 'BRK']) {
      const first = sectionStart(name) / BAR;
      for (let bar = first; bar < first + 7; bar++) expect(toms(bar), `${name} bar ${bar - first + 1}`).toBeGreaterThanOrEqual(5);
    }
    for (const name of src.order) expect(drums(song, sectionStart(name)), name).toContain('c');
  });

  it('the break is stop-time: the brass hits once on bars 1-4, the clarinet answers with the hook cell in the gaps', () => {
    const o = sectionStart('BRK');
    for (let bar = 0; bar < 4; bar++) {
      const hits = Array.from({ length: BAR }, (_, i) => at(song, o + bar * BAR + i, 'harm').length).filter((n) => n > 0);
      expect(hits, `bar ${bar + 1}`).toHaveLength(1);
      const lead = Array.from({ length: BAR }, (_, i) => at(song, o + bar * BAR + i, 'lead').length).reduce((a, b) => a + b);
      expect(lead > 0, `bar ${bar + 1}`).toBe(bar % 2 === 1);
    }
  });

  it('wraps without a gap: a snare fill and semitone lead-ins (B1 -> C2, B4 -> C5) fall onto the hook', () => {
    const roll = [6, 5, 4, 3, 2, 1].filter((i) => drums(song, song.total - i).includes('s'));
    expect(roll).toHaveLength(6);
    expect(midis(song, 'bass')[0] - (midis(song, 'bass').at(-1) ?? 0)).toBe(1);
    expect(midis(song, 'lead').at(-1)).toBe(midis(song, 'lead')[0] - 1);
  });
});

describe('cartoonFinal: the big band turns dark on the same hook', () => {
  const src = SONGS.cartoonFinal;
  const song = compileSong(src);
  const BAR = src.stepsPerBar;

  it('is a 176 bpm 48-bar minor swing (65.5 s) in six sections, faster than the other fights', () => {
    expect(src.bpm).toBe(176);
    expect(src.bpm).toBeGreaterThan(SONGS.cartoonBoss.bpm);
    expect(src.order).toEqual(['A', 'A2', 'B', 'BRK', 'SHOUT', 'TURN']);
    expect(song.total / BAR).toBe(48);
    expect(song.total * song.stepDur).toBeCloseTo(65.45, 1);
  });

  it('is in C minor: Eb, Ab, Bb, the leading tone B and the A of Cm6, never an E natural', () => {
    const pcs = pitchClasses(song);
    for (const pc of [0, 2, 3, 5, 7, 8, 10, 11, 9]) expect(pcs.has(pc), `pc ${pc}`).toBe(true);
    expect(pcs.has(4)).toBe(false);
    expect(midis(song, 'bass')[0] % 12).toBe(0);
  });

  it('jungle toms run under the hook and the lament (ride only in the major relief)', () => {
    const toms = (bar: number): number => Array.from({ length: BAR }, (_, i) => drums(song, bar * BAR + i)).join('').split('t').length - 1;
    for (const first of [0, 8, 40]) for (let bar = first; bar < first + 7; bar++) expect(toms(bar), `bar ${bar + 1}`).toBeGreaterThanOrEqual(5);
    for (let bar = 16; bar < 23; bar++) expect(toms(bar), `bar ${bar + 1}`).toBe(0);
  });

  it('the lament walks the bass down chromatically C B Bb A Ab G', () => {
    const roots = Array.from({ length: 8 }, (_, b) => at(song, (40 + b) * BAR, 'bass')[0]);
    expect(roots.map((e) => (e.ch === 'bass' ? e.midi : 0))).toEqual([36, 35, 34, 33, 32, 32, 31, 31]);
  });

  it('wraps without a gap: a tom-and-snare fill lands on the hook with a crash', () => {
    expect(drums(song, 0)).toContain('c');
    const fill = [6, 5, 4, 3, 2, 1].filter((i) => drums(song, song.total - i).length > 0);
    expect(fill).toHaveLength(6);
  });
});

describe('level 8 instrument additions', () => {
  /** Counts oscillators / noise sources started on a stand-in context. */
  function count(play: (v: { ctx: BaseAudioContext; out: AudioNode }) => void): number {
    let n = 0;
    const param = { value: 0, setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined, exponentialRampToValueAtTime: () => undefined, setTargetAtTime: () => undefined, setValueCurveAtTime: () => undefined };
    const node = (): object => ({ frequency: param, detune: param, gain: param, Q: param, connect: <T>(d: T): T => d, disconnect: () => undefined, setPeriodicWave: () => undefined, start: () => n++, stop: () => undefined });
    const ctx = { sampleRate: 8000, createOscillator: node, createGain: node, createBiquadFilter: node, createBufferSource: node, createPeriodicWave: () => ({}), createBuffer: (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) }) } as unknown as BaseAudioContext;
    play({ ctx, out: {} as AudioNode });
    return n;
  }

  it('a unison patch doubles every note with a detuned second voice', () => {
    const p = { wave: 'sawtooth', vol: 0.1, a: 0.01, d: 0.1, sus: 0.5, r: 0.05 } as const;
    expect(count((v) => playNote(v, p, 60, 1, 0.3))).toBe(1);
    expect(count((v) => playNote(v, { ...p, unison: 9 }, 60, 1, 0.3))).toBe(2);
  });

  it.each(['t', 'c', 'w'] as const)('drum %s sounds', (d: Drum) => {
    expect(count((v) => playDrum(v, d, false, 0.2, 1))).toBeGreaterThanOrEqual(2);
  });
});
