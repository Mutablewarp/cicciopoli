/**
 * GameAudio: WebAudio-synthesized chiptune music and sfx (no audio files).
 * Nothing is created before unlock(), which main.ts calls from user gestures.
 * Every entry point swallows errors: audio must never break the game.
 */
import type { GameAudio, MusicName, SfxName } from '../contracts';
import { createMixer, rampMaster, rampMusic, type Mixer } from './mixer';
import { compileSong, Sequencer, type Song, type SongSrc } from './sequencer';
import { SFX } from './sfx';
import { SONGS, type SongName } from './tracks';
import { rushFever } from './tracks/rushFever';

/** Rotating pitch offsets (±3%) so repeated sfx don't sound machine-gunned. */
const VARIATION = [0, 0.021, -0.017, 0.029, -0.026, 0.01, -0.008, 0.016, -0.03];
/** The same sfx retriggered faster than this (s) is dropped: avoids phasing and level spikes. */
const MIN_RETRIGGER = 0.035;
/** intensity(1) arrangements: same length and grid as the base song, swapped in on the next unscheduled step. */
const FEVER: Partial<Record<SongName, SongSrc>> = { rush: rushFever };
/** intensity(1) also opens a treble shelf on the music (dB above LIFT_HZ), eased in fast and out slower (time constants, s). */
const LIFT_DB = 4;
const LIFT_HZ = 2500;
const LIFT_IN = 0.12;
const LIFT_OUT = 0.3;

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

const ignore = (): void => undefined;

function guard(fn: () => void): void {
  try {
    fn();
  } catch {
    // audio is optional: never let a WebAudio failure reach the game loop
  }
}

/** iOS only starts output after a buffer is played inside a gesture. */
function primeOutput(ctx: AudioContext): void {
  const src = ctx.createBufferSource();
  src.buffer = ctx.createBuffer(1, 1, 22050);
  src.connect(ctx.destination);
  src.start(0);
}

export function createAudio(): GameAudio {
  let ctx: AudioContext | null = null;
  let mixer: Mixer | null = null;
  let seq: Sequencer | null = null;
  let muted = false;
  let musicMuted = false;
  let hidden = false;
  /** Track the game wants; remembered before unlock so the title theme starts on the first tap. */
  let wanted: MusicName | null = null;
  let vary = 0;
  const lastHit = new Map<SfxName, number>();
  const compiled = new Map<SongSrc, Song>();
  /** Treble shelf between the sequencer and the music bus (0 dB = transparent): the intensity(1) lift. */
  let shelf: BiquadFilterNode | null = null;
  /** The song object the sequencer is playing; intensity swaps its arrangement in place. */
  let live: { name: SongName; song: Song } | null = null;
  /** No new music notes while muted, music-muted or hidden (the song position is kept). */
  const musicHeld = (): boolean => muted || musicMuted || hidden;

  function song(src: SongSrc): Song {
    let s = compiled.get(src);
    if (!s) {
      s = compileSong(src);
      compiled.set(src, s);
    }
    return s;
  }

  function play(name: SongName): void {
    live = { name, song: { ...song(SONGS[name]) } };
    seq?.play(name, live.song);
  }

  /** The sequencer reads steps and patches per step, so the swap lands on the grid without moving the song position. */
  function lift(level: 0 | 1): void {
    const fever = live && FEVER[live.name];
    if (live && fever) {
      const s = song(level ? fever : SONGS[live.name]);
      live.song.steps = s.steps;
      live.song.src = s.src;
    }
    if (!ctx || !shelf) return;
    const g = shelf.gain;
    const now = ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setTargetAtTime(level ? LIFT_DB : 0, now, level ? LIFT_IN : LIFT_OUT);
  }

  function syncMusic(): void {
    if (!seq) return;
    if (wanted !== null && seq.current !== wanted) play(wanted);
    // music(null) stops the track but lets a running jingle finish
    if (wanted === null && seq.current !== null && !isJingle(seq.current)) seq.stop();
    seq.setPaused(musicHeld());
  }

  return {
    unlock() {
      guard(() => {
        if (!ctx) {
          const Ctor = audioCtor();
          if (!Ctor) return;
          ctx = new Ctor();
          mixer = createMixer(ctx, muted, musicMuted);
          shelf = ctx.createBiquadFilter();
          shelf.type = 'highshelf';
          shelf.frequency.value = LIFT_HZ;
          shelf.gain.value = 0;
          shelf.connect(mixer.music);
          seq = new Sequencer(ctx, shelf);
        }
        // retried on every gesture: older iOS ignores pointerdown and only unlocks on touchend
        if (!hidden && ctx.state !== 'running') {
          primeOutput(ctx);
          ctx.resume().catch(ignore);
        }
        syncMusic();
      });
    },

    sfx(name) {
      guard(() => {
        if (!ctx || !mixer || muted || hidden || ctx.state !== 'running') return;
        const now = ctx.currentTime;
        if (now - (lastHit.get(name) ?? -1) < MIN_RETRIGGER) return;
        lastHit.set(name, now);
        const p = 1 + VARIATION[vary++ % VARIATION.length];
        SFX[name]({ ctx, out: mixer.sfx }, now + 0.002, p);
      });
    },

    music(name) {
      guard(() => {
        lift(0); // every music call (a new run too) starts without the lift
        if (name === wanted) return;
        wanted = name;
        syncMusic();
      });
    },

    intensity(level) {
      guard(() => lift(level));
    },

    jingle(name) {
      guard(() => {
        lift(0);
        wanted = null;
        if (!seq) return;
        if (musicHeld()) seq.stop();
        else play(name);
      });
    },

    get muted() {
      return muted;
    },

    setMuted(m) {
      muted = m;
      guard(() => {
        if (ctx && mixer) rampMaster(ctx, mixer, !m);
        seq?.setPaused(musicHeld());
      });
    },

    get musicMuted() {
      return musicMuted;
    },

    setMusicMuted(m) {
      musicMuted = m;
      guard(() => {
        if (ctx && mixer) rampMusic(ctx, mixer, !m);
        seq?.setPaused(musicHeld());
      });
    },

    suspend() {
      hidden = true;
      guard(() => {
        seq?.setPaused(true);
        ctx?.suspend().catch(ignore);
      });
    },

    resume() {
      hidden = false;
      guard(() => {
        if (ctx && ctx.state !== 'running') ctx.resume().catch(ignore);
        seq?.setPaused(musicHeld());
      });
    },
  };
}

function isJingle(name: string): boolean {
  return name === 'win' || name === 'gameover';
}
