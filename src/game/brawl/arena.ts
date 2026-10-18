/**
 * The mini-boss arena just before the goal. When the hero steps in, the camera is clamped to
 * the arena, an invisible wall closes behind him and the mega burger wakes up. Its landing
 * smashes send low shockwaves along the floor (jump over them). The brick gate ahead has an
 * invisible full-height wall in it for as long as the boss lives. Beating it launches a big
 * starburst, blows the gate open and frees the camera; "VAI IN BUCA!" is held back until then
 * (Goal.gated) and waits for "VIA LIBERA!" to finish.
 */
import type Phaser from 'phaser';
import { RAMPAGE, TILE } from '../../art/keys';
import { ARENA, ENEMY, ENEMY_HP, HULK } from '../../config/tuning';
import { shakeWorld } from '../camera';
import { DEPTH } from '../depths';
import { MegaBurger } from '../enemies/rampageEnemies';
import { FX_ART } from '../fxArt';
import { touchLayout } from '../hud';
import type { LevelRun } from '../run';
import { BossBar } from './bossBar';
import { hitStop } from './juice';
import type { Smashables } from './smashables';

/** The hero must be this far inside the arena before it shuts. */
const ENTER_PX = TILE * 2;
/** the boss life bar floats this far above the boss's feet */
const BAR_LIFT = 72;
/** how long "VIA LIBERA!" owns the banner lane before "VAI IN BUCA!" may follow */
const GATE_BANNER_MS = 1800;
/** the camera looks at the gate this far in front of it, for this long, when it blows open */
const GATE_GLANCE_PX = 70;
const GATE_GLANCE_MS = 1400;
/** the shockwave sprite is drawn this much bigger than its 26x14 art so it reads from afar */
const WAVE_SCALE = 1.3;

interface Wave {
  sprite: Phaser.GameObjects.Sprite;
  dir: -1 | 1;
  feetY: number;
  travelled: number;
  hit: boolean;
}

export class Arena {
  private state: 'open' | 'fight' | 'won' = 'open';
  private readonly waves: Wave[] = [];
  private bar: BossBar | null = null;
  /** invisible full-height wall inside the gate while the boss lives */
  private lock: { zone: Phaser.GameObjects.Zone; collider: Phaser.Physics.Arcade.Collider } | null = null;

  constructor(
    private readonly r: LevelRun,
    private readonly boss: MegaBurger,
    private readonly smash: Smashables,
    /** world x of the arena's left edge, of its gate and of the gate's far side */
    private readonly left: number,
    private readonly right: number,
    gateRight: number,
  ) {
    r.goal.gated = true;
    boss.onSmash = (x, feetY) => this.spawnWaves(x, feetY);
    boss.onDefeated = () => this.defeated();
    this.lockGate(gateRight);
  }

  /** The arena marker + gate + boss of a level, or null when it has none. */
  static find(r: LevelRun, smash: Smashables): Arena | null {
    const marker = r.level.entities.find((e) => e.spec.type === 'arena');
    const boss = r.enemies.alive().find((e): e is MegaBurger => e instanceof MegaBurger);
    const gate = smash.gate();
    if (!marker || !boss || gate.length === 0) return null;
    const xs = gate.map((s) => s.sprite.x);
    return new Arena(r, boss, smash, marker.col * TILE, Math.min(...xs) - TILE / 2, Math.max(...xs) + TILE / 2);
  }

  /**
   * The gate is only 8 tiles high: stomp-bouncing off the boss (or a ledge snap on the bricks)
   * could lift the hero over it. An invisible wall as tall as the world closes that for good.
   */
  private lockGate(gateRight: number): void {
    const { scene, world, player } = this.r;
    const zone = scene.add.zone((this.right + gateRight) / 2, world.height / 2, gateRight - this.right, world.height * 2);
    scene.physics.add.existing(zone, true);
    this.lock = { zone, collider: scene.physics.add.collider(player.zone, zone) };
  }

  private unlockGate(): void {
    this.lock?.collider.destroy();
    this.lock?.zone.destroy();
    this.lock = null;
  }

  update(dtMs: number): void {
    if (this.state === 'open') {
      const x = this.r.player.x;
      if (this.r.phase === 'play' && x > this.left + ENTER_PX && x < this.right) this.start();
      return;
    }
    this.updateWaves(dtMs);
    this.updateBar();
  }

  private start(): void {
    const { r } = this;
    this.state = 'fight';
    r.rig.setBounds(this.left, this.right);
    const wall = r.scene.add.zone(this.left - ARENA.wall / 2, r.world.height / 2, ARENA.wall, r.world.height * 2);
    r.scene.physics.add.existing(wall, true);
    r.scene.physics.add.collider(r.player.zone, wall);
    r.scene.physics.add.collider(r.enemies.group, wall);
    this.boss.engage();
    r.banner('MEGA BURGER!', { tone: 'danger', ms: 2200, sub: touchLayout() ? 'Salta le onde · SPACCA e PUGNO' : 'Salta le onde d\'urto' });
    this.bar = new BossBar(r.scene, RAMPAGE.megaburger, ENEMY_HP.megaburger);
  }

  /** Two shockwaves leave the landing point along the floor. */
  private spawnWaves(x: number, feetY: number): void {
    for (const dir of [-1, 1] as const) {
      const sprite = this.r.scene.add.sprite(x + dir * 22, feetY, FX_ART.wave, 0).setOrigin(0.5, 1).setScale(WAVE_SCALE).setDepth(DEPTH.enemies + 1);
      sprite.setFlipX(dir < 0);
      if (this.r.scene.anims.exists(FX_ART.waveLoop)) sprite.play(FX_ART.waveLoop);
      this.waves.push({ sprite, dir, feetY, travelled: 0, hit: false });
    }
  }

  private updateWaves(dtMs: number): void {
    const { player, world, phase } = this.r;
    const c = ENEMY.megaburger;
    for (const w of [...this.waves]) {
      const step = (c.waveSpeed * dtMs) / 1000;
      const next = w.sprite.x + w.dir * step;
      w.travelled += step;
      if (w.travelled > c.waveRange || world.isSolidAt(next + w.dir * 6, w.feetY - 4)) {
        this.waves.splice(this.waves.indexOf(w), 1);
        this.r.scene.tweens.add({ targets: w.sprite, alpha: 0, duration: 140, onComplete: () => w.sprite.destroy() });
        continue;
      }
      w.sprite.x = next;
      const overlap = Math.abs(player.x - next) < HULK.bodyW / 2 + 11 && player.bottom > w.feetY - c.waveH;
      if (overlap && !w.hit && phase === 'play') {
        w.hit = true;
        this.r.hurtHero(next);
      }
    }
  }

  private updateBar(): void {
    const s = this.boss.sprite;
    this.bar?.update(s.x, s.y - BAR_LIFT, this.boss.hpLeft);
  }

  /** The boss is down: starburst, the gate blows up, the camera is freed. */
  private defeated(): void {
    const { r } = this;
    this.state = 'won';
    this.bar?.destroy();
    this.bar = null;
    const s = this.boss.sprite;
    r.juice.burst(s.x, s.y - 30, 2.6);
    r.juice.text(s.x, s.y - 64);
    r.svc.audio.sfx('roar');
    shakeWorld(r.scene.cameras.main, 420, 8);
    hitStop(r.scene, 130);
    r.scene.time.delayedCall(450, () => {
      this.unlockGate();
      this.smash.openGate();
      r.rig.setBounds(null, null);
      // "VAI IN BUCA!" waits its turn, so a hero already near the flag still reads "VIA LIBERA!"
      r.goal.ungate(GATE_BANNER_MS);
      r.banner('VIA LIBERA!', { tone: 'goal', ms: GATE_BANNER_MS });
      // the camera glances at the gate blowing up, then comes back to the hero
      r.focus = () => ({ ...r.heroTarget(), x: this.right - GATE_GLANCE_PX });
      r.scene.time.delayedCall(GATE_GLANCE_MS, () => (r.focus = null));
    });
  }
}
