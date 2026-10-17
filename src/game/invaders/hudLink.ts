/**
 * Pushes level 3 state to the DOM HUD and the shooter touch layout, only when it changes
 * (time every 250 ms).
 */
import type { GameUI, HudState } from '../../contracts';
import { RULES } from './config';

export interface HudSnapshot {
  hearts: number;
  score: number;
  timeMs: number;
  progress: number;
  charges: number;
}

export class HudLink {
  private last: HudSnapshot | null = null;
  private lastCharges = -1;

  constructor(private readonly ui: GameUI) {}

  reset(): void {
    this.last = null;
    this.lastCharges = -1;
  }

  push(s: HudSnapshot): void {
    const progress = Math.round(Math.max(0, Math.min(1, s.progress)) * 100) / 100;
    const prev = this.last;
    if (!prev) {
      this.ui.updateHud({ level: 3, hearts: s.hearts, maxHearts: RULES.hearts, score: s.score, timeMs: s.timeMs, progress, powers: powers(s.charges), boltCount: s.charges });
    } else {
      const diff: Partial<HudState> = {};
      if (s.hearts !== prev.hearts) {
        diff.hearts = s.hearts;
        diff.maxHearts = RULES.hearts;
      }
      if (s.score !== prev.score) diff.score = s.score;
      if (progress !== prev.progress) diff.progress = progress;
      if (s.charges > 0 !== prev.charges > 0) diff.powers = powers(s.charges);
      if (s.charges !== prev.charges) diff.boltCount = s.charges;
      if (Math.floor(s.timeMs / 250) !== Math.floor(prev.timeMs / 250)) diff.timeMs = s.timeMs;
      if (Object.keys(diff).length > 0) this.ui.updateHud(diff);
    }
    this.last = { ...s, progress };
    if (s.charges !== this.lastCharges) {
      this.lastCharges = s.charges;
      this.ui.setControls({
        level: 3,
        mode: 'shooter',
        fire: 'enabled',
        club: s.charges > 0 ? 'enabled' : 'disabled',
        down: 'hidden',
        jumpLabel: 'SALTA',
        clubCount: s.charges,
      });
    }
  }
}

function powers(charges: number): HudState['powers'] {
  return { brie: false, goat: false, thai: false, wings: false, bolt: charges > 0 };
}
