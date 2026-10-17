/**
 * Moment-to-moment rules that are not contacts (weapons, checkpoints, goal, pits) and the
 * end-of-life flows: pit respawn, game over, the drop into the hole + victory.
 */
import Phaser from 'phaser';
import { CICCIO } from '../art/keys';
import { CAMERA, FLOW, HERO } from '../config/tuning';
import { shakeWorld } from './camera';
import { Enemy } from './enemies/Enemy';
import type { Rect } from './combat/club';
import type { Interactions } from './interactions';
import type { LevelRun } from './run';
import { clearBonus, nextLevel, pitFall } from './rules';

type ClubTarget = Enemy | Phaser.Physics.Arcade.Sprite;

export interface FlowHooks {
  restart(): void;
  toMenu(): void;
  next(): void;
}

function bodyRect(b: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody): Rect {
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
}

export class Flow {
  private prevX = Number.NaN;

  constructor(
    private readonly r: LevelRun,
    private readonly ix: Interactions,
    private readonly hooks: FlowHooks,
  ) {}

  update(dtMs: number): void {
    const { svc, run, player } = this.r;
    const fire = svc.input.consume('fire');
    const swing = svc.input.consume('club');
    this.updateClub(dtMs);
    if (this.r.phase !== 'play') return;
    const free = !player.hurtLock.active;
    if (fire && run.powers.goat && free) this.shoot();
    if (swing && run.powers.thai && free) this.swing();
    const cp = this.r.checkpoints.update(player.x);
    if (cp) {
      svc.audio.sfx('checkpoint');
      this.r.banner('CHECKPOINT!', { tone: 'info', ms: 1400 });
      this.r.fx.sparkleBurst(cp.x, cp.feetY - 26, 6, 12);
    }
    if (this.r.goal.shouldAnnounce(player.x)) this.r.banner('VAI IN BUCA!', { tone: 'goal', ms: 2400 });
    const prevX = this.prevX;
    this.prevX = player.x;
    if (this.r.goal.swallows(prevX, player.x, player.bottom, player.onGround)) this.win();
    else if (this.r.fellInPit()) this.pit();
  }

  private shoot(): void {
    const { player, view, cheese, svc } = this.r;
    const hand = view.attachments.anchorWorld(view.pose(player), 'hand');
    if (!cheese.fire(hand.x, hand.y, player.facing)) return;
    view.onShoot();
    svc.audio.sfx('shoot');
  }

  private swing(): void {
    const { view, club, svc } = this.r;
    if (!club.swing()) return;
    view.onClub();
    svc.audio.sfx('club');
  }

  private updateClub(dtMs: number): void {
    const { club, player, enemies, blocks } = this.r;
    const src = { left: player.body.left, right: player.body.right, centerY: player.centerY, facing: player.facing };
    const targets: ClubTarget[] = club.swinging ? [...enemies.alive().filter((e) => e.awake), ...blocks.liveCrates()] : [];
    club.update(
      dtMs,
      src,
      this.r.view.attachments.tip('club'),
      targets,
      (t) => (t instanceof Enemy ? bodyRect(t.body) : bodyRect(t.body as Phaser.Physics.Arcade.StaticBody)),
      (t) => {
        if (!(t instanceof Enemy)) this.ix.breakCrate(t);
        else if (t.vulnerable) this.ix.kill(t, 'club');
      },
    );
  }

  /* ---------------------------------------------------------------- pits */

  private pit(): void {
    this.r.svc.audio.sfx(this.r.theme.hazard === 'lava' ? 'lava' : 'fall');
    if (this.r.lava) {
      this.r.lava.splash(this.r.player.x);
      shakeWorld(this.r.scene.cameras.main, 160, CAMERA.shakeHurt);
    }
    if (pitFall(this.r.run) === 'dead') {
      this.gameOver(true);
      return;
    }
    const { player, scene, rig, checkpoints } = this.r;
    this.r.phase = 'respawning';
    player.frozen = true;
    player.body.enable = false;
    const cam = scene.cameras.main;
    cam.fadeOut(220, 0, 0, 0);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const p = checkpoints.point;
      player.body.enable = true;
      player.teleport(p.x, p.feetY);
      player.facing = 1;
      player.invuln.start(HERO.respawnInvulnMs);
      this.clearRespawn(p.x);
      // a direction held through the fall must not walk Ciccio straight back into the pit
      this.r.svc.input.reset();
      rig.snapTo(this.r.followTarget());
      this.r.parallax.update(rig.view(), 0);
      player.frozen = false;
      this.r.phase = 'play';
      cam.fadeIn(260, 0, 0, 0);
    });
  }

  /** Enemies loitering at the respawn point go back home (a chili parked on the post). */
  private clearRespawn(x: number): void {
    for (const e of this.r.enemies.alive()) {
      const d = Math.abs(e.sprite.x - x);
      if (d < HERO.respawnClearPx && Math.abs(e.homeX - x) > d) e.sendHome();
    }
  }

  /* ------------------------------------------------------------ game over */

  /** Hearts gone: Ciccio's hurt hop off the screen, jingle, game-over overlay. */
  gameOver(fromPit = false): void {
    const { player, view, scene, svc, run, levelId } = this.r;
    if (this.r.phase === 'over' || this.r.phase === 'won') return;
    this.r.phase = 'over';
    player.frozen = true;
    player.body.stop();
    player.body.enable = false;
    svc.audio.jingle('gameover');
    view.auto = false;
    if (fromPit) {
      // sunk into the lava / fallen: never leave the sprite frozen on the surface
      const s = view.sprite;
      s.anims.stop();
      scene.tweens.add({ targets: s, y: s.y + 14, alpha: 0, duration: 320, ease: 'Quad.easeIn', onComplete: () => s.setVisible(false) });
    } else {
      const s = view.sprite;
      s.anims.stop();
      s.setFrame(CICCIO.hurt).setVisible(true).setDepth(s.depth + 20);
      scene.tweens.add({ targets: s, y: s.y - 30, duration: 260, ease: 'Quad.easeOut' });
      scene.tweens.add({ targets: s, y: s.y + 260, delay: 260, duration: 760, ease: 'Quad.easeIn' });
    }
    scene.time.delayedCall(FLOW.gameOverDelayMs, () => {
      svc.ui.showGameOver({ level: levelId, score: run.score }, { onRetry: () => this.hooks.restart(), onMenu: () => this.hooks.toMenu() });
    });
  }

  /* -------------------------------------------------------------- victory */

  /** Ciccio drops into the hole: bonus, best score, jingle, victory overlay. */
  win(): void {
    const { player, view, goal, svc, run, levelId, scene, fx } = this.r;
    if (this.r.phase !== 'play') return;
    this.r.phase = 'won';
    player.frozen = true;
    player.body.stop();
    player.body.enable = false;
    view.auto = false;
    view.sprite.anims.stop();
    view.sprite.setFrame(CICCIO.fall).setVisible(true);
    svc.audio.sfx('goal');
    goal.playDrop(view.sprite, () => {
      const bonus = clearBonus(run);
      fx.popup(goal.x, goal.surfaceY - 24, bonus);
      const newBest = svc.save.recordWin(levelId, run.score);
      svc.audio.jingle('win');
      scene.time.delayedCall(FLOW.victoryDelayMs, () => {
        const hasNext = nextLevel(levelId) !== null;
        svc.ui.showVictory(
          { level: levelId, score: run.score, timeMs: this.r.timeMs, best: svc.save.data.best[levelId] ?? run.score, newBest, hasNext },
          {
            onNext: hasNext ? () => this.hooks.next() : undefined,
            onReplay: () => this.hooks.restart(),
            onMenu: () => this.hooks.toMenu(),
          },
        );
      });
    });
  }
}
