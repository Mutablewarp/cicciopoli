// STUB (integrator) — replaced by the AUDIO agent. Silent implementation.
import type { GameAudio } from '../contracts';

export function createAudio(): GameAudio {
  let muted = false;
  return {
    unlock: () => undefined,
    sfx: () => undefined,
    music: () => undefined,
    jingle: () => undefined,
    get muted() {
      return muted;
    },
    setMuted: (m: boolean) => {
      muted = m;
    },
    suspend: () => undefined,
    resume: () => undefined,
  };
}
