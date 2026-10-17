/**
 * Display refresh measurement (QA F5): the Arcade world steps at a fixed rate, so on a
 * 90 / 120 Hz screen a 60 Hz step moves Ciccio on only some frames (judder). Movement is
 * time-based, so the scene sets the physics rate to the measured display rate instead.
 */

/** Common panel rates; a measured rate within 6% snaps to one of them. */
const RATES = [60, 72, 75, 90, 100, 120, 144] as const;
const MIN_HZ = 60;
const MAX_HZ = 144;

/** Physics rate for a set of frame deltas (ms): the median frame, snapped and clamped. */
export function physicsHz(deltasMs: readonly number[]): number {
  const valid = deltasMs.filter((d) => d > 2 && d < 100).sort((a, b) => a - b);
  if (valid.length === 0) return MIN_HZ;
  const hz = 1000 / valid[Math.floor(valid.length / 2)];
  const snap = RATES.find((r) => Math.abs(hz - r) / r < 0.06);
  // below 60 (slow phone, low-power mode) keep 60 steps: bigger steps would tunnel through tiles
  return Math.max(MIN_HZ, Math.min(MAX_HZ, snap ?? Math.round(hz)));
}

/** Collects frame deltas and reports a new physics rate every `window` frames when it changed. */
export class RefreshMeter {
  private readonly deltas: number[] = [];
  private skip: number;

  constructor(
    private current: number,
    private readonly window = 45,
    /** first frames after a (re)start are noisy (art upload, GC) */
    warmup = 20,
  ) {
    this.skip = warmup;
  }

  /** Feed one frame; returns the rate to switch to, or null to keep the current one. */
  sample(deltaMs: number): number | null {
    if (this.skip > 0) {
      this.skip--;
      return null;
    }
    this.deltas.push(deltaMs);
    if (this.deltas.length < this.window) return null;
    const hz = physicsHz(this.deltas);
    this.deltas.length = 0;
    if (hz === this.current) return null;
    this.current = hz;
    return hz;
  }
}
