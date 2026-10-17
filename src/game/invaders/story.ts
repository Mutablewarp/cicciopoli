/**
 * Scripted moments of level 3: title + jet fly-in, wave breaks, the black hole ending
 * ("VAI IN BUCA!") with the victory card, and the game over.
 */
import type Phaser from 'phaser';
import { SPACE, SPACE_ANIMS } from '../../art/space/keys';
import type { Battle } from './battle';
import { CLEAR_BONUS, FIELD, HOLE, JET, RULES, WAVES } from './config';
import { Z } from './fx';

export interface StoryHooks {
  restart(): void;
  toMenu(): void;
  next(): void;
}

const WAVE_SUB = ['FUOCO spara · FULMINE trasforma in cibo', 'Più veloci, più bombe!', 'Ultima ondata!'];

export class Story {
  private readonly scene: Phaser.Scene;

  constructor(private readonly b: Battle, private readonly hooks: StoryHooks) {
    this.scene = b.scene;
    b.onWaveCleared = () => this.waveCleared();
    b.onDead = () => this.gameOver();
  }

  /** Wordmark + Ciccio's jet flying in diagonally (ref/invaders_title.png), then wave 1. */
  intro(): void {
    const { b, scene } = this;
    b.phase = 'intro';
    const title = scene.add.image(FIELD.w / 2, 112, SPACE.title).setDepth(Z.title).setScale(2.6).setAlpha(0);
    scene.tweens.add({ targets: title, alpha: 1, scale: 2, duration: 520, ease: 'Back.easeOut' });
    const jet = b.jet;
    jet.steer = false;
    jet.x = FIELD.w / 2;
    jet.sprite.setPosition(-30, FIELD.h + 30);
    jet.setBank(1);
    scene.tweens.add({
      targets: jet.sprite,
      x: FIELD.w / 2,
      y: JET.y,
      duration: 1300,
      delay: 250,
      ease: 'Cubic.easeOut',
      onComplete: () => jet.setBank(0),
    });
    scene.tweens.add({ targets: title, alpha: 0, y: 92, delay: 1900, duration: 420, ease: 'Quad.easeIn', onComplete: () => title.destroy() });
    scene.time.delayedCall(1850, () => {
      if (b.phase === 'intro') this.startWave(0);
    });
  }

  /** Banner first (the top of the field is empty), the formation drops in as it fades. */
  private startWave(index: number, healed = false): void {
    const { b, scene } = this;
    b.wave = index;
    if (index > 0) b.shields.reset();
    const sub = healed ? `${WAVE_SUB[index]} · +1 CUORE` : WAVE_SUB[index];
    b.svc.ui.banner(`ONDATA ${index + 1}`, { tone: 'info', sub, ms: 1400 });
    scene.time.delayedCall(650, () => {
      if (b.phase !== 'intro' && b.phase !== 'waveBreak') return;
      b.swarm.spawn(index);
      b.svc.audio.sfx('invaderStep');
    });
    scene.time.delayedCall(650 + 900, () => {
      if (b.phase !== 'intro' && b.phase !== 'waveBreak') return;
      b.phase = 'play';
      b.jet.steer = true;
    });
  }

  private waveCleared(): void {
    const { b } = this;
    if (b.phase !== 'play') return;
    b.phase = 'waveBreak';
    for (const p of b.shots.clearBombs()) b.fx.spark(p.x, p.y);
    b.shots.clearShots();
    if (b.wave >= WAVES.length - 1) {
      this.ending();
      return;
    }
    b.svc.audio.sfx('checkpoint');
    // a cleared wave gives one heart back: three waves without healing is too harsh on a phone
    const healed = b.hearts < RULES.hearts;
    if (healed) {
      b.hearts++;
      this.scene.time.delayedCall(350, () => b.svc.audio.sfx('heal'));
    }
    this.scene.time.delayedCall(700, () => {
      if (b.phase === 'waveBreak') this.startWave(b.wave + 1, healed);
    });
  }

  /** Black hole opens at the top centre; the jet flies into it on its own. */
  private ending(): void {
    const { b, scene } = this;
    b.phase = 'ending';
    b.svc.ui.banner('VAI IN BUCA!', { tone: 'goal', sub: 'Il buco nero ti porta al livello 4', ms: 2200 });
    if (b.ufo.sprite) {
      b.fx.boom(b.ufo.sprite.x, b.ufo.sprite.y);
      b.ufo.remove();
    }
    const hole = scene.add.sprite(HOLE.x, HOLE.y, SPACE.hole, 0).setDepth(Z.hole).setScale(0);
    hole.play(SPACE_ANIMS.hole);
    scene.tweens.add({ targets: hole, scale: 1, duration: 900, ease: 'Back.easeOut' });
    scene.time.delayedCall(500, () => b.pickups.suckInto(HOLE.x, HOLE.y));
    const jet = b.jet;
    jet.steer = false;
    jet.invulnMs = 0;
    jet.sprite.setAlpha(1);
    scene.tweens.add({
      targets: jet.sprite,
      x: HOLE.x,
      duration: 650,
      delay: 600,
      ease: 'Sine.easeInOut',
      onStart: () => jet.setBank(jet.x > HOLE.x ? -1 : jet.x < HOLE.x ? 1 : 0),
      onComplete: () => {
        jet.setBank(0);
        scene.tweens.add({ targets: b, warp: 9, duration: 1200, ease: 'Quad.easeIn' });
        scene.tweens.add({
          targets: jet.sprite,
          y: HOLE.y,
          scale: 0.15,
          duration: 1300,
          ease: 'Cubic.easeIn',
          onComplete: () => this.swallowed(hole),
        });
      },
    });
  }

  private swallowed(hole: Phaser.GameObjects.Sprite): void {
    const { b, scene } = this;
    b.jet.sprite.setVisible(false);
    b.svc.audio.sfx('goal');
    scene.tweens.add({ targets: hole, scale: 1.25, yoyo: true, duration: 160 });
    scene.tweens.add({ targets: b, warp: 1, duration: 900 });
    b.addScore(CLEAR_BONUS, HOLE.x, HOLE.y - 24);
    scene.time.delayedCall(700, () => this.victory());
  }

  private victory(): void {
    const { b } = this;
    b.phase = 'won';
    const svc = b.svc;
    const newBest = svc.save.recordWin(3, b.score);
    svc.audio.jingle('win');
    svc.ui.showVictory(
      { level: 3, score: b.score, timeMs: Math.round(b.timeMs), best: svc.save.data.best[3] ?? b.score, newBest, hasNext: true },
      { onNext: () => this.hooks.next(), onReplay: () => this.hooks.restart(), onMenu: () => this.hooks.toMenu() },
    );
  }

  private gameOver(): void {
    const { b, scene } = this;
    if (b.phase === 'dying' || b.phase === 'over' || b.phase === 'won') return;
    b.phase = 'dying';
    const { x } = b.jet;
    b.jet.steer = false;
    b.svc.audio.sfx('explode');
    [0, 140, 300].forEach((ms, i) =>
      scene.time.delayedCall(ms, () => b.fx.boom(x + (i - 1) * 6, JET.y - 2 + (i % 2) * 4, 1.1)),
    );
    scene.time.delayedCall(160, () => b.jet.sprite.setVisible(false));
    scene.time.delayedCall(450, () => b.svc.audio.jingle('gameover'));
    scene.time.delayedCall(1400, () => {
      b.phase = 'over';
      b.svc.ui.showGameOver({ level: 3, score: b.score }, { onRetry: () => this.hooks.restart(), onMenu: () => this.hooks.toMenu() });
    });
  }

  /** Debug: wipe the current wave (points included) to reach the next beat quickly. */
  clearWave(): void {
    const { b } = this;
    if (b.phase !== 'play') return;
    for (const inv of b.swarm.alive()) b.killInvader(inv, false);
  }

  /** Debug: jump straight to the black hole. */
  win(): void {
    const { b } = this;
    if (b.phase === 'ending' || b.phase === 'won' || b.phase === 'over' || b.phase === 'dying') return;
    b.swarm.clear();
    b.wave = WAVES.length - 1;
    b.phase = 'play';
    this.waveCleared();
  }
}
