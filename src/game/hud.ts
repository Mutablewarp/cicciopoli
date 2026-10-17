/**
 * HUD + touch-control sync: pushes only the fields that changed (time every 250 ms)
 * and re-lays the touch buttons when the weapon powers change.
 */
import { FLOW } from '../config/tuning';
import type { ControlsLayout, GameUI, HudState, LevelId, PowerState } from '../contracts';
import type { RunState } from './rules';

function samePowers(a: PowerState, b: PowerState): boolean {
  return a.brie === b.brie && a.goat === b.goat && a.thai === b.thai && a.wings === b.wings;
}

/** Touch layout per level: GOAT / THAI on level 1, SCENDI + SALTA→VOLA on level 2. */
export function defaultControls(level: LevelId, p: PowerState): ControlsLayout {
  if (level === 2) {
    return { level, fire: 'hidden', club: 'hidden', down: 'enabled', jumpLabel: p.wings ? 'VOLA' : 'SALTA' };
  }
  return { level, fire: p.goat ? 'enabled' : 'disabled', club: p.thai ? 'enabled' : 'disabled', down: 'hidden', jumpLabel: 'SALTA' };
}

function layoutKey(l: ControlsLayout): string {
  return `${l.level}|${l.fire}|${l.club}|${l.down}|${l.jumpLabel}`;
}

export class HudSync {
  private last: HudState | null = null;
  private lastControls = '';
  private timeAcc = 0;

  constructor(
    private readonly ui: GameUI,
    private readonly controls: (powers: PowerState) => ControlsLayout,
  ) {}

  /** Full refresh (level start / restart). */
  reset(run: RunState, timeMs: number, progress: number): void {
    this.last = null;
    this.lastControls = '';
    this.timeAcc = 0;
    this.push(run, timeMs, progress, 0);
  }

  push(run: RunState, timeMs: number, progress: number, dtMs: number): void {
    this.timeAcc += dtMs;
    const next: HudState = {
      level: run.level,
      hearts: run.hearts,
      maxHearts: run.maxHearts,
      score: run.score,
      timeMs,
      progress: Math.round(Math.max(0, Math.min(1, progress)) * 100) / 100,
      powers: { ...run.powers },
    };
    const prev = this.last;
    if (!prev) {
      this.ui.updateHud(next);
    } else {
      const diff: Partial<HudState> = {};
      if (next.hearts !== prev.hearts || next.maxHearts !== prev.maxHearts) {
        diff.hearts = next.hearts;
        diff.maxHearts = next.maxHearts;
      }
      if (next.score !== prev.score) diff.score = next.score;
      if (next.progress !== prev.progress) diff.progress = next.progress;
      if (!samePowers(next.powers, prev.powers)) diff.powers = next.powers;
      if (this.timeAcc >= FLOW.hudTimeMs) {
        this.timeAcc = 0;
        diff.timeMs = next.timeMs;
      } else next.timeMs = prev.timeMs;
      if (Object.keys(diff).length > 0) this.ui.updateHud(diff);
    }
    this.last = next;
    const layout = this.controls(next.powers);
    const key = layoutKey(layout);
    if (key !== this.lastControls) {
      this.lastControls = key;
      this.ui.setControls(layout);
    }
  }
}
