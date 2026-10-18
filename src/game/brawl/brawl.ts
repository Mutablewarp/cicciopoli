/**
 * The level 5 hero's two fist actions.
 *  PUGNO  (club button / K)  quick punch in front: breaks crates and barrels, one stage of a
 *                            brick, hurts enemies; a killed one is launched away spinning.
 *  SPACCA (fire button / J)  ground slam: a hop then a smash on the ground, a straight dive
 *                            in the air. The impact sends a shockwave that breaks the props
 *                            around and hurts + stuns the enemies in range.
 * A heavy landing from a full jump also shakes the ground and dazes the enemies at his feet.
 */
import type Phaser from 'phaser';
import { HULK as HULK_ART, HULK_ANIMS } from '../../art/keys';
import { HULK, KILL_FX, SCORE } from '../../config/tuning';
import { shakeWorld } from '../camera';
import { overlaps, type Rect } from '../combat/club';
import type { Enemy } from '../enemies/Enemy';
import { addScore, killPoints, type KillMethod } from '../rules';
import type { LevelRun } from '../run';
import { hitStop } from './juice';
import { inBlast, inLandingShock, punchBox } from './rules';
import { SlamMode } from './slam';
import type { Smashable, Smashables } from './smashables';

type FistKill = Extract<KillMethod, 'punch' | 'slam'>;

function bodyRect(b: Phaser.Physics.Arcade.Body): Rect {
  return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
}

export class Brawl {
  private punchCd = 0;
  private punchMs = -1;
  private readonly punched = new Set<unknown>();
  private slamCd = 0;
  private slam: SlamMode | null = null;

  constructor(
    private readonly r: LevelRun,
    private readonly smash: Smashables,
  ) {}

  /** Mid-dive: contact with an enemy ends the dive instead of a stomp or a hit. */
  get diving(): boolean {
    return this.slam?.phase === 'dive';
  }

  /** Edge-triggered buttons from Flow (both are consumed every frame there). */
  act(punch: boolean, slam: boolean): void {
    const { player } = this.r;
    if (player.hurtLock.active || player.actionLock.active || player.frozen) return;
    if (slam) this.startSlam();
    else if (punch) this.startPunch();
  }

  update(dtMs: number): void {
    this.punchCd = Math.max(0, this.punchCd - dtMs);
    this.slamCd = Math.max(0, this.slamCd - dtMs);
    if (this.slam) this.updateSlam();
    if (this.punchMs >= 0) this.updatePunch(dtMs);
  }

  /* --------------------------------------------------------------- punch */

  private startPunch(): void {
    if (this.punchCd > 0 || this.slam) return;
    this.punchCd = HULK.punch.cooldownMs;
    this.punchMs = 0;
    this.punched.clear();
    this.r.view.playAction(HULK_ANIMS.punch, HULK.punch.swingMs);
    this.r.svc.audio.sfx('punch');
  }

  private updatePunch(dtMs: number): void {
    const p = HULK.punch;
    this.punchMs += dtMs;
    if (this.punchMs > p.swingMs) {
      this.punchMs = -1;
      return;
    }
    if (this.punchMs < p.activeFromMs || this.punchMs > p.activeToMs) return;
    const { player, enemies } = this.r;
    const box = punchBox({ left: player.body.left, right: player.body.right, centerY: player.centerY, facing: player.facing });
    for (const s of this.smash.inBox(box)) {
      if (this.punched.has(s)) continue;
      this.punched.add(s);
      this.smashed(s);
    }
    for (const e of enemies.alive()) {
      if (!e.awake || this.punched.has(e) || !overlaps(box, bodyRect(e.body))) continue;
      this.punched.add(e);
      this.strike(e, 1, player.facing, 'punch', HULK.hit.stunMs);
    }
  }

  private smashed(s: Smashable): void {
    if (this.smash.hit(s, 1) === 'clang') return;
    hitStop(this.r.scene, 40);
    shakeWorld(this.r.scene.cameras.main, 70, 1.5);
  }

  /* ---------------------------------------------------------------- slam */

  private startSlam(): void {
    const { player, view, svc } = this.r;
    if (this.slamCd > 0 || this.slam) return;
    this.punchMs = -1;
    this.slam = new SlamMode(player.onGround);
    player.mode = this.slam;
    if (player.onGround) {
      view.onJump();
      svc.audio.sfx('jump');
    }
  }

  private updateSlam(): void {
    const s = this.slam;
    const { player, view, phase } = this.r;
    if (!s) return;
    if (phase !== 'play' || player.hurtLock.active) return this.endSlam();
    const [crouch, overhead, smash] = HULK_ART.slam;
    if (s.phase === 'hop') view.holdFrame(player.vy < -120 ? crouch : overhead, 90);
    else if (s.phase === 'hang') view.holdFrame(overhead, 90);
    else if (s.phase === 'dive') view.holdFrame(smash, 90);
    else {
      this.impact();
      this.endSlam();
    }
  }

  /** The dive met an enemy's head: the smash lands right there. */
  diveHit(enemyTop: number): void {
    const b = this.r.player.body;
    b.y = enemyTop - b.height;
    b.updateCenter();
    if (this.slam) this.slam.phase = 'impact';
  }

  private endSlam(): void {
    const { player, view } = this.r;
    const landed = this.slam?.phase === 'impact';
    this.slam = null;
    player.mode = player.walking;
    if (!landed) return;
    this.slamCd = HULK.slam.cooldownMs;
    player.actionLock.start(HULK.slam.recoverMs);
    view.holdFrame(HULK_ART.slam[3], HULK.slam.recoverMs);
  }

  private impact(): void {
    const { player, scene, svc, juice, enemies } = this.r;
    const c = HULK.slam;
    const x = player.x;
    const feet = player.bottom;
    juice.shock(x, feet, 1);
    juice.dust(x - 14, feet);
    juice.dust(x + 14, feet);
    svc.audio.sfx('slam');
    shakeWorld(scene.cameras.main, c.shakeMs, c.shake);
    hitStop(scene, c.hitStopMs);
    if (this.smash.blast(x, feet, c.brickDamage) > 0) svc.audio.sfx('rubble');
    for (const e of enemies.alive()) {
      if (!e.awake || !inBlast(x, feet, bodyRect(e.body))) continue;
      this.strike(e, c.enemyDamage, e.sprite.x < x ? -1 : 1, 'slam', c.stunMs);
    }
  }

  /* --------------------------------------------------------- hard landing */

  /** A landing at `speed` px/s: from a full jump it dazes the enemies at his feet. */
  onLand(speed: number): void {
    const L = HULK.landing;
    if (this.slam || speed < L.minSpeed) return;
    const { player, scene, enemies, juice } = this.r;
    juice.dust(player.x - 12, player.bottom, 0.7);
    juice.dust(player.x + 12, player.bottom, 0.7);
    shakeWorld(scene.cameras.main, L.shakeMs, L.shake);
    for (const e of enemies.alive()) {
      if (e.awake && inLandingShock(player.x, player.bottom, bodyRect(e.body))) e.stun(L.stunMs);
    }
  }

  /* -------------------------------------------------------------- enemies */

  /** Fist damage on one enemy: a stagger, or a kill with score and effects. */
  strike(e: Enemy, damage: number, dir: -1 | 1, method: FistKill, stunMs: number): void {
    const { juice, svc } = this.r;
    const { x } = e.sprite;
    const y = e.body.center.y;
    if (e.hurt(damage)) return this.defeat(e, method, dir);
    e.flash();
    e.stun(stunMs);
    if (e.body.allowGravity) e.body.setVelocity(dir * HULK.hit.knockVx, -90);
    juice.burst(x, y, 0.8);
    svc.audio.sfx('smash');
    hitStop(this.r.scene, 40);
    shakeWorld(this.r.scene.cameras.main, KILL_FX.shakeMs, KILL_FX.shake);
  }

  private defeat(e: Enemy, method: FistKill, dir: -1 | 1): void {
    const { run, fx, juice, svc, scene, host } = this.r;
    const top = e.body.top;
    const { x } = e.sprite;
    const y = e.body.center.y;
    e.kill(method, host, dir);
    const pts = e.kind === 'megaburger' ? SCORE.boss : killPoints(method);
    addScore(run, pts);
    fx.popup(x, top - 4, pts);
    if (e.kind !== 'megaburger') juice.burst(x, y, 1.2); // the boss gets its own, bigger finale (arena.ts)
    if (method === 'slam' && e.kind !== 'megaburger') juice.text(x, top - 18);
    svc.audio.sfx(method === 'punch' ? 'smash' : 'slam');
    hitStop(scene, KILL_FX.hitStopMs + 20);
    shakeWorld(scene.cameras.main, KILL_FX.shakeMs, KILL_FX.shake + 1);
  }
}
