/**
 * Tracker-style song format, compiler and lookahead scheduler.
 *
 * Song data (src/audio/tracks/*.ts) is written as text grids, one token per step:
 *   note "C#5" | "-" hold previous note | "." rest; bars separated by "|".
 *   Drums: letters k(ick) s(nare) h(at) o(pen/tambourine), combinable ("ko"), UPPERCASE = accent.
 * A channel string shorter than its pattern is repeated (e.g. a 1-bar drum loop).
 */
import { playDrum, playNote, type Drum, type Patch } from './instruments';
import type { Voice } from './synth';
import { advanceStep, catchUp, noteToMidi, stepDuration, stepsDue } from './theory';

export type MelodicChannel = 'lead' | 'harm' | 'bass';
type Channel = MelodicChannel | 'drums';
const CHANNELS: readonly Channel[] = ['lead', 'harm', 'bass', 'drums'];

export interface PatternSrc {
  bars: number;
  lead?: string;
  harm?: string;
  bass?: string;
  drums?: string;
}

export interface SongSrc {
  bpm: number;
  stepsPerBeat: number;
  stepsPerBar: number;
  loop: boolean;
  lead: Patch;
  harm: Patch;
  bass: Patch;
  /** drum channel level */
  drums: number;
  /** feedback echo on the lead channel only (keeps bass and drums tight) */
  echo?: { time: number; fb: number; mix: number };
  patterns: Readonly<Record<string, PatternSrc>>;
  order: readonly string[];
}

export type SongEvent =
  | { ch: MelodicChannel; midi: number; len: number }
  | { ch: 'drums'; drum: Drum; accent: boolean };

export interface Song {
  src: SongSrc;
  stepDur: number;
  total: number;
  /** events starting at each step */
  steps: SongEvent[][];
}

const DRUMS = new Set<string>(['k', 's', 'h', 'o']);

/** Expands one channel of the whole song into a flat token list (validates bar lengths). */
function channelTokens(src: SongSrc, ch: Channel): string[] {
  const out: string[] = [];
  for (const name of src.order) {
    const pat = src.patterns[name];
    if (!pat) throw new Error(`audio: unknown pattern "${name}"`);
    const n = pat.bars * src.stepsPerBar;
    const text = pat[ch];
    if (!text) {
      for (let i = 0; i < n; i++) out.push('.');
      continue;
    }
    const bars = text.split('|').map((b) => b.trim().split(/\s+/));
    bars.forEach((b, i) => {
      if (b.length !== src.stepsPerBar) throw new Error(`audio: ${name}.${ch} bar ${i + 1} has ${b.length} steps`);
    });
    const flat = bars.flat();
    if (n % flat.length !== 0) throw new Error(`audio: ${name}.${ch} does not tile ${pat.bars} bars`);
    for (let i = 0; i < n; i++) out.push(flat[i % flat.length]);
  }
  return out;
}

/** Parses song text into per-step events. Throws on any authoring error. */
export function compileSong(src: SongSrc): Song {
  const tokensByCh = CHANNELS.map((ch) => channelTokens(src, ch));
  const total = tokensByCh[0].length;
  const steps: SongEvent[][] = Array.from({ length: total }, () => []);
  CHANNELS.forEach((ch, ci) => {
    let open: { len: number } | null = null;
    tokensByCh[ci].forEach((tok, i) => {
      if (tok === '-') {
        if (open) open.len++;
        return;
      }
      open = null;
      if (tok === '.') return;
      if (ch === 'drums') {
        for (const c of tok) {
          const d = c.toLowerCase();
          if (!DRUMS.has(d)) throw new Error(`audio: bad drum "${tok}"`);
          steps[i].push({ ch, drum: d as Drum, accent: c !== d });
        }
        return;
      }
      const midi = noteToMidi(tok);
      if (midi === null) throw new Error(`audio: bad note "${tok}" in ${ch}`);
      const ev = { ch, midi, len: 1 };
      steps[i].push(ev);
      open = ev;
    });
  });
  return { src, stepDur: stepDuration(src.bpm, src.stepsPerBeat), total, steps };
}

/** Per-song output: a fade gain (for crossfades) and an echo send for the lead. */
export interface SongBus {
  fade: GainNode;
  dry: Voice;
  lead: Voice;
  nodes: AudioNode[];
}

export function createSongBus(ctx: BaseAudioContext, dest: AudioNode, song: Song): SongBus {
  const fade = ctx.createGain();
  const lead = ctx.createGain();
  fade.connect(dest);
  lead.connect(fade);
  const nodes: AudioNode[] = [fade, lead];
  const e = song.src.echo;
  if (e) {
    const delay = ctx.createDelay(1);
    delay.delayTime.value = e.time;
    const fb = ctx.createGain();
    fb.gain.value = e.fb;
    const wet = ctx.createGain();
    wet.gain.value = e.mix;
    lead.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(wet).connect(fade);
    nodes.push(delay, fb, wet);
  }
  return { fade, dry: { ctx, out: fade }, lead: { ctx, out: lead }, nodes };
}

export function scheduleStep(song: Song, step: number, t: number, bus: SongBus): void {
  for (const ev of song.steps[step]) {
    if (ev.ch === 'drums') playDrum(bus.dry, ev.drum, ev.accent, song.src.drums, t);
    else playNote(ev.ch === 'lead' ? bus.lead : bus.dry, song.src[ev.ch], ev.midi, t, ev.len * song.stepDur);
  }
}

const LOOKAHEAD = 0.12;
const TICK_MS = 25;
const START_DELAY = 0.06;

function release(bus: SongBus, afterSec: number): void {
  window.setTimeout(() => bus.nodes.forEach((n) => n.disconnect()), afterSec * 1000);
}

/** Live lookahead scheduler (one song at a time, crossfading on switch). */
export class Sequencer {
  private song: Song | null = null;
  private bus: SongBus | null = null;
  private name: string | null = null;
  private step = 0;
  private next = 0;
  private paused = false;
  private timer: number | null = null;

  constructor(
    private readonly ctx: BaseAudioContext,
    private readonly dest: AudioNode,
  ) {}

  get current(): string | null {
    return this.name;
  }

  play(name: string, song: Song): void {
    this.stop();
    this.name = name;
    this.song = song;
    this.step = 0;
    this.next = this.ctx.currentTime + START_DELAY;
    this.bus = createSongBus(this.ctx, this.dest, song);
    this.syncTimer();
  }

  /** Stops scheduling; notes already queued fade out over `fade` seconds. */
  stop(fade = 0.3): void {
    const bus = this.bus;
    this.song = null;
    this.bus = null;
    this.name = null;
    this.syncTimer();
    if (!bus) return;
    const g = bus.fade.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + fade);
    release(bus, fade + 0.1);
  }

  /** Paused = no new notes are scheduled; the song position is kept. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.syncTimer();
  }

  private syncTimer(): void {
    const run = this.song !== null && !this.paused;
    if (run && this.timer === null) {
      this.timer = window.setInterval(this.tick, TICK_MS);
      this.tick();
    } else if (!run && this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private readonly tick = (): void => {
    const { song, bus } = this;
    if (!song || !bus) return;
    try {
      const now = this.ctx.currentTime;
      this.next = catchUp(this.next, now);
      for (let n = stepsDue(this.next, now + LOOKAHEAD, song.stepDur); n > 0; n--) {
        scheduleStep(song, this.step, this.next, bus);
        this.next += song.stepDur;
        const s = advanceStep(this.step, song.total, song.src.loop);
        if (s < 0) {
          this.finish(this.next - now);
          return;
        }
        this.step = s;
      }
    } catch {
      this.stop(0.05); // a broken song must not keep throwing every tick
    }
  };

  /** One-shot song reached its end: let the tail ring, then free the nodes. */
  private finish(remaining: number): void {
    const bus = this.bus;
    this.song = null;
    this.bus = null;
    this.name = null;
    this.syncTimer();
    if (bus) release(bus, remaining + 1.5);
  }
}
