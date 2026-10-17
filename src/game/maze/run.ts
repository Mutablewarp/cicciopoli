/**
 * One CICCIO-MAN game: phases (ready → play → eat / dying / cleared → hole → won | over),
 * scoring, ghost release, fright, bonus food, hearts, HUD sync and the end screens.
 */
import type Phaser from 'phaser';
import type { Dir4, GameInput, HudState, Services } from '../../contracts';
import { rng } from '../../art/pixel';
import { CICCIO_FRAMES } from '../../art/maze/keys';
import { FRIGHT_MS, GHOST_NAMES, ModeTimer, ghostEatPoints, targetFor, type GhostName } from './ai';
import { Ciccio, Ghost, SPEED, type GhostWorld } from './actors';
import { BONUS_POINTS, BoardView } from './boardView';
import { poof, popup } from './fx';
import { CENTRE_SPOT, DIRV, HOLE_SPOT, MAZE } from './layout';
import { heldDir, type Axis } from './movement';

export type Phase = 'ready' | 'play' | 'eat' | 'dying' | 'cleared' | 'hole' | 'won' | 'over';

export const RULES = {
  startScore: 161,
  hearts: 4,
  dot: 10,
  stick: 50,
  clearBonus: 500,
  readyMs: 2200,
  readyAgainMs: 1600,
  eatPauseMs: 550,
  clearFlashMs: 1400,
  deathMs: 2100,
  bonusAt: [70, 170],
  bonusMs: 9500,
  idleReleaseMs: 4000,
  chompGapMs: 110,
} as const;

/** Dots to eat (since the previous release) before the next ghost leaves the house. */
const RELEASE_START: Readonly<Record<GhostName, number>> = { pickle: 0, chili: 0, demon: 30, burger: 60 };
const RELEASE_AFTER_DEATH: Readonly<Record<GhostName, number>> = { pickle: 0, chili: 7, demon: 10, burger: 15 };
const HIT_PX = 6;

export interface MazeHooks {
  restart(): void;
  toMenu(): void;
}

function pressedDir(input: GameInput): Dir4 | null {
  // tolerate an input module that predates the maze contract
  return typeof input.consumeDir === 'function' ? input.consumeDir() : null;
}

function axisY(input: GameInput): number {
  return typeof input.axisY === 'number' ? input.axisY : input.upHeld ? -1 : input.downHeld ? 1 : 0;
}

export class MazeRun {
  phase: Phase = 'ready';
  hearts: number = RULES.hearts;
  score: number = RULES.startScore;
  timeMs = 0;
  frightMs = 0;
  readonly board: BoardView;
  readonly ciccio: Ciccio;
  readonly ghosts: Ghost[];
  private phaseMs = 0;
  private readyMs: number = RULES.readyMs;
  private want: Dir4 | null = null;
  /** axis of the newest direction press: it wins while both axes are held */
  private lastAxis: Axis | null = null;
  private readonly modes = new ModeTimer();
  private readonly totalDots = MAZE.dots.length + MAZE.powers.length;
  private dotsEaten = 0;
  private dotsSinceRelease = 0;
  private idleMs = 0;
  private afterDeath = false;
  private combo = 0;
  private cleared = false;
  private lastChomp = -1000;
  private eatenGhost: Ghost | null = null;
  private poofed = false;
  private readonly world: GhostWorld;
  private hudLast: Partial<HudState> = {};
  private hudTimeAcc = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly svc: Services,
    private readonly hooks: MazeHooks,
  ) {
    this.board = new BoardView(scene);
    this.ghosts = GHOST_NAMES.map((n) => new Ghost(scene, n));
    this.ciccio = new Ciccio(scene);
    const rand = rng(1604);
    const pickle = this.ghosts[0];
    this.world = {
      target: (g) =>
        targetFor(g.name, this.cleared ? 'scatter' : this.modes.mode, g.tile, { ciccio: this.ciccio.tile, ciccioDir: this.ciccio.m.dir, pickle: pickle.tile }),
      rand,
      elroy: false,
      onHome: () => this.svc.audio.sfx('ghostHome'),
    };
    this.board.showReady(true);
    this.pushHud(0, true);
  }

  get playing(): boolean {
    return this.phase === 'play' || this.phase === 'hole';
  }

  update(dtMs: number, timeMs: number): void {
    this.phaseMs += dtMs;
    const input = this.svc.input;
    const pressed = pressedDir(input);
    if (pressed) {
      this.want = pressed;
      this.lastAxis = DIRV[pressed].x !== 0 ? 'h' : 'v';
    }
    const held = heldDir(input.axisX, axisY(input), this.lastAxis, this.ciccio.m, MAZE.open);
    if (held) this.want = held;
    switch (this.phase) {
      case 'ready':
        if (this.phaseMs >= this.readyMs) {
          this.board.showReady(false);
          this.setPhase(this.cleared ? 'hole' : 'play');
        }
        break;
      case 'play':
      case 'hole':
        this.timeMs += dtMs;
        this.tickPlay(dtMs);
        break;
      case 'eat':
        this.timeMs += dtMs;
        if (this.phaseMs >= RULES.eatPauseMs) {
          this.eatenGhost?.sprite.setVisible(true);
          this.eatenGhost = null;
          this.setPhase(this.cleared ? 'hole' : 'play');
        }
        break;
      case 'dying':
        this.tickDeath();
        break;
      case 'cleared':
        this.board.flash(this.phaseMs);
        if (this.phaseMs >= RULES.clearFlashMs) this.openHole();
        break;
      default:
        break;
    }
    this.board.update(timeMs, this.phase === 'eat' ? 0 : dtMs, this.playing || this.phase === 'eat');
    if (this.phase !== 'dying' && this.phase !== 'won') this.ciccio.draw();
    for (const g of this.ghosts) g.draw(timeMs, this.frightMs);
    this.pushHud(dtMs);
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseMs = 0;
  }

  private tickPlay(dtMs: number): void {
    if (this.frightMs > 0) {
      this.frightMs = Math.max(0, this.frightMs - dtMs);
      if (this.frightMs === 0) for (const g of this.ghosts) g.frightened = false;
    } else if (!this.cleared && this.modes.tick(dtMs)) {
      for (const g of this.ghosts) g.reverse();
    }
    this.idleMs += dtMs;
    this.releaseGhosts();
    this.ciccio.move(this.want, this.frightMs > 0 ? SPEED.ciccioPower : SPEED.ciccio, dtMs);
    if (this.eatTile()) return;
    this.eatBonus();
    this.world.elroy = this.board.remaining <= 20;
    for (const g of this.ghosts) g.update(dtMs, this.world);
    if (this.collide()) return;
    const m = this.ciccio.m;
    if (this.phase === 'hole' && Math.abs(m.x - HOLE_SPOT.x) <= 3 && Math.abs(m.y - HOLE_SPOT.y) <= 3) this.win();
  }

  /** Returns true when the board was just cleared. */
  private eatTile(): boolean {
    const t = this.ciccio.tile;
    const what = this.board.eat(t.c, t.r);
    if (!what) return false;
    this.dotsEaten++;
    this.dotsSinceRelease++;
    this.idleMs = 0;
    if (what === 'dot') {
      this.score += RULES.dot;
      if (this.timeMs - this.lastChomp >= RULES.chompGapMs) {
        this.lastChomp = this.timeMs;
        this.svc.audio.sfx('chomp');
      }
    } else {
      this.score += RULES.stick;
      this.svc.audio.sfx('pellet');
      this.startFright();
    }
    if ((RULES.bonusAt as readonly number[]).includes(this.dotsEaten)) this.board.showBonus(RULES.bonusMs);
    if (this.board.remaining === 0) {
      this.clearBoard();
      return true;
    }
    return false;
  }

  private eatBonus(): void {
    const m = this.ciccio.m;
    if (!this.board.bonusActive || Math.abs(m.x - CENTRE_SPOT.x) > 6 || Math.abs(m.y - CENTRE_SPOT.y) > 6) return;
    const pts = BONUS_POINTS[this.board.bonusKind];
    this.score += pts;
    this.board.hideBonus();
    this.svc.audio.sfx('burger');
    popup(this.scene, CENTRE_SPOT.x, CENTRE_SPOT.y - 6, pts);
  }

  startFright(): void {
    this.frightMs = FRIGHT_MS;
    this.combo = 0;
    for (const g of this.ghosts) {
      if (g.state === 'eyes' || g.state === 'entering') continue;
      g.reverse();
      g.frightened = true;
    }
  }

  private releaseGhosts(): void {
    const next = this.ghosts.find((g) => g.state === 'house');
    if (!next) return;
    const limit = (this.afterDeath ? RELEASE_AFTER_DEATH : RELEASE_START)[next.name];
    if (this.dotsSinceRelease < limit && this.idleMs < RULES.idleReleaseMs) return;
    next.release();
    this.dotsSinceRelease = 0;
    this.idleMs = 0;
  }

  /** Returns true when the touch changed the phase. */
  private collide(): boolean {
    const m = this.ciccio.m;
    for (const g of this.ghosts) {
      if (!g.solid || Math.abs(g.m.x - m.x) >= HIT_PX || Math.abs(g.m.y - m.y) >= HIT_PX) continue;
      if (g.frightened) this.eatGhost(g);
      else this.die();
      return true;
    }
    return false;
  }

  private eatGhost(g: Ghost): void {
    const pts = ghostEatPoints(this.combo++);
    this.score += pts;
    g.eaten();
    g.sprite.setVisible(false);
    this.eatenGhost = g;
    this.svc.audio.sfx('ghostEat');
    popup(this.scene, g.m.x, g.m.y, pts);
    this.setPhase('eat');
  }

  /* ---------------------------------------------------------------- death */

  die(): void {
    if (!this.playing) return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.svc.audio.sfx('hurt');
    this.board.hideBonus();
    this.poofed = false;
    this.setPhase('dying');
  }

  private tickDeath(): void {
    const t = this.phaseMs;
    const c = this.ciccio;
    if (t >= 500) for (const g of this.ghosts) g.sprite.setVisible(false);
    if (t >= 500 && t < 1200) {
      const spin: Dir4[] = ['right', 'down', 'left', 'up'];
      c.face(spin[Math.floor((t - 500) / 70) % 4], 0);
    } else if (t >= 1200 && t < 1560) {
      c.sprite.setFlipX(false).setFrame(CICCIO_FRAMES.deflate[Math.min(3, Math.floor((t - 1200) / 90))]);
    } else if (t >= 1560 && !this.poofed) {
      this.poofed = true;
      c.sprite.setVisible(false);
      poof(this.scene, c.m.x, c.m.y);
    }
    if (t < RULES.deathMs) return;
    if (this.hearts <= 0) this.gameOver();
    else this.newLife();
  }

  private newLife(): void {
    this.ciccio.reset();
    for (const g of this.ghosts) g.reset();
    this.modes.reset();
    this.frightMs = 0;
    this.afterDeath = true;
    this.dotsSinceRelease = 0;
    this.idleMs = 0;
    this.want = null;
    this.readyMs = RULES.readyAgainMs;
    this.board.showReady(true);
    this.setPhase('ready');
  }

  /* ---------------------------------------------------------------- endings */

  private clearBoard(): void {
    this.cleared = true;
    this.frightMs = 0;
    for (const g of this.ghosts) g.frightened = false;
    this.svc.audio.sfx('checkpoint');
    // announce during the freeze so the banner is gone by the time the dash starts
    this.svc.ui.banner('VAI IN BUCA!', { tone: 'goal', ms: 1700 });
    this.setPhase('cleared');
  }

  /** Debug / cleared flash done: the hole opens under the house. */
  openHole(): void {
    this.board.stopFlash();
    this.board.openHole();
    this.svc.audio.sfx('powerup');
    this.setPhase('hole');
  }

  win(): void {
    if (this.phase === 'won' || this.phase === 'over') return;
    this.setPhase('won');
    const s = this.ciccio.sprite;
    this.board.hideGoText();
    this.svc.audio.sfx('goal');
    this.scene.tweens.add({
      targets: s,
      x: HOLE_SPOT.x,
      y: HOLE_SPOT.y,
      scale: 0,
      angle: 540,
      duration: 650,
      ease: 'Quad.easeIn',
      onComplete: () => {
        s.setVisible(false);
        this.score += RULES.clearBonus;
        popup(this.scene, HOLE_SPOT.x, HOLE_SPOT.y - 8, RULES.clearBonus);
        const newBest = this.svc.save.recordWin(4, this.score);
        this.pushHud(0, true);
        this.svc.audio.jingle('win');
        this.scene.time.delayedCall(900, () =>
          this.svc.ui.showVictory(
            { level: 4, score: this.score, timeMs: this.timeMs, best: this.svc.save.data.best[4] ?? this.score, newBest, hasNext: false },
            { onReplay: () => this.hooks.restart(), onMenu: () => this.hooks.toMenu() },
          ),
        );
      },
    });
  }

  private gameOver(): void {
    this.setPhase('over');
    this.svc.audio.jingle('gameover');
    this.scene.time.delayedCall(900, () =>
      this.svc.ui.showGameOver({ level: 4, score: this.score }, { onRetry: () => this.hooks.restart(), onMenu: () => this.hooks.toMenu() }),
    );
  }

  /* ---------------------------------------------------------------- HUD */

  private pushHud(dtMs: number, full = false): void {
    this.hudTimeAcc += dtMs;
    const next: Partial<HudState> = {
      level: 4,
      hearts: this.hearts,
      maxHearts: RULES.hearts,
      score: this.score,
      progress: Math.round((this.dotsEaten / this.totalDots) * 100) / 100,
    };
    const pellet = this.frightMs > 0;
    const diff: Partial<HudState> = {};
    for (const k of Object.keys(next) as (keyof HudState)[]) {
      if (full || next[k] !== this.hudLast[k]) Object.assign(diff, { [k]: next[k] });
    }
    if (full || pellet !== this.hudLast.powers?.pellet) diff.powers = { brie: false, goat: false, thai: false, wings: false, pellet };
    if (full || this.hudTimeAcc >= 250) {
      this.hudTimeAcc = 0;
      diff.timeMs = this.timeMs;
    }
    if (Object.keys(diff).length > 0) this.svc.ui.updateHud(diff);
    this.hudLast = { ...this.hudLast, ...diff };
  }

  /* ---------------------------------------------------------------- debug */

  /** Eats every nugget and stick at once (scores them) and clears the board. */
  eatAll(): void {
    if (!this.playing) return;
    for (const t of this.board.remainingTiles()) {
      if (this.board.eat(t.c, t.r) === 'power') this.score += RULES.stick;
      else this.score += RULES.dot;
      this.dotsEaten++;
    }
    this.clearBoard();
  }
}
