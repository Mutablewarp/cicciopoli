/**
 * GameAudio: WebAudio-synthesized chiptune music and sfx (no audio files).
 * Nothing is created before unlock(), which main.ts calls from user gestures.
 * Every entry point swallows errors: audio must never break the game.
 */
import type { GameAudio, MusicName, SfxName } from '../contracts';
import { createMixer, rampMaster, rampMusic, type Mixer } from './mixer';
import { compileSong, Sequencer, type Song } from './sequencer';
import { SFX } from './sfx';
import { SONGS, type SongName } from './tracks';

/** Rotating pitch offsets (±3%) so repeated sfx don't sound machine-gunned. */
const VARIATION = [0, 0.021, -0.017, 0.029, -0.026, 0.01, -0.008, 0.016, -0.03];
/** The same sfx retriggered faster than this (s) is dropped: avoids phasing and level spikes. */
const MIN_RETRIGGER = 0.035;

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
  const compiled = new Map<SongName, Song>();
  /** No new music notes while muted, music-muted or hidden (the song position is kept). */
  const musicHeld = (): boolean => muted || musicMuted || hidden;

  function song(name: SongName): Song {
    let s = compiled.get(name);
    if (!s) {
      s = compileSong(SONGS[name]);
      compiled.set(name, s);
    }
    return s;
  }

  function syncMusic(): void {
    if (!seq) return;
    if (wanted !== null && seq.current !== wanted) seq.play(wanted, song(wanted));
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
          seq = new Sequencer(ctx, mixer.music);
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
        if (name === wanted) return;
        wanted = name;
        syncMusic();
      });
    },

    jingle(name) {
      guard(() => {
        wanted = null;
        if (!seq) return;
        if (musicHeld()) seq.stop();
        else seq.play(name, song(name));
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
