/** Output graph: music bus + sfx bus -> master gain -> limiter-style compressor -> speakers. */

export const MASTER_LEVEL = 0.9;
export const MUSIC_LEVEL = 0.35;
export const SFX_LEVEL = 0.8;

export interface Mixer {
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
}

export function createMixer(ctx: BaseAudioContext, muted: boolean, musicMuted: boolean): Mixer {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -8;
  limiter.knee.value = 4;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;
  limiter.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = muted ? 0 : MASTER_LEVEL;
  master.connect(limiter);

  const music = ctx.createGain();
  music.gain.value = musicMuted ? 0 : MUSIC_LEVEL;
  music.connect(master);

  const sfx = ctx.createGain();
  sfx.gain.value = SFX_LEVEL;
  sfx.connect(master);
  return { master, music, sfx };
}

/** Quick click-free fade of a bus gain. */
function fade(ctx: BaseAudioContext, g: AudioParam, to: number): void {
  const now = ctx.currentTime;
  g.cancelScheduledValues(now);
  g.setValueAtTime(g.value, now);
  g.setTargetAtTime(to, now, 0.02);
}

/** Global mute / unmute. */
export function rampMaster(ctx: BaseAudioContext, mixer: Mixer, on: boolean): void {
  fade(ctx, mixer.master.gain, on ? MASTER_LEVEL : 0);
}

/** Music on / off; the sfx bus keeps playing. */
export function rampMusic(ctx: BaseAudioContext, mixer: Mixer, on: boolean): void {
  fade(ctx, mixer.music.gain, on ? MUSIC_LEVEL : 0);
}
