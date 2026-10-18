/**
 * Everything that only exists on the level 5 brawler, built by LevelRun when the hero is the
 * rage form: the smashable props, the fist actions, the mini-boss arena and the one-time
 * controls hints. LevelRun / Interactions / Flow just ask `run.rampage?`.
 */
import { TILE } from '../../art/keys';
import { touchLayout } from '../hud';
import type { LevelHint } from '../levels/types';
import type { LevelRun } from '../run';
import { Arena } from './arena';
import { Brawl } from './brawl';
import { Smashables } from './smashables';

export class Rampage {
  readonly smash: Smashables;
  readonly brawl: Brawl;
  private readonly arena: Arena | null;
  private readonly pending: LevelHint[];

  constructor(
    private readonly r: LevelRun,
    hints: readonly LevelHint[],
  ) {
    // Zero gravity makes Arcade separate Y first. Pushing into a stacked brick wall then leaves a
    // ~0.3 px X overlap per step that reads as a ceiling / floor: jumps die and the hero hovers.
    r.scene.physics.world.forceX = true;
    this.smash = new Smashables(r, r.level.entities);
    this.brawl = new Brawl(r, this.smash);
    this.arena = Arena.find(r, this.smash);
    this.pending = [...hints];
  }

  update(dtMs: number): void {
    this.brawl.update(dtMs);
    this.arena?.update(dtMs);
    const next = this.pending[0];
    if (next && this.r.phase === 'play' && this.r.player.x > next.col * TILE) {
      this.pending.shift();
      this.r.banner(next.text, { tone: 'power', ms: 2400, sub: touchLayout() ? next.touch : next.keys });
    }
  }
}
