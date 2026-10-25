/**
 * The hero of level 8 (Ciccio, rubber-hose): run, variable jump with coyote time and a jump buffer,
 * SCATTO (dash, short invulnerability, one in the air), aim forward / up / diagonal, hurt with blink,
 * the PARATA window (a mid-air SALTA), poses for EX / super, intro / victory / KO. Position = feet.
 */
import type Phaser from 'phaser';
import { ARENA, HERO_ANIMS, HERO_FRAME, type Box, type Vec } from './api';
import { DEPTH } from './depths';
import { HERO_AIM_ANIMS, HERO_MUZZLE } from './hero';
import { CT_PLAYER as P } from '../../config/cartoon';

export interface PlayerControls {
  axisX: -1 | 0 | 1;
  aimUp: boolean;
  jumpHeld: boolean;
  /** SALTA pressed this frame (jump on the ground, PARATA in the air) */
  jump: boolean;
  dash: boolean;
  fire: boolean;
}

export const NO_CONTROLS: PlayerControls = { axisX: 0, aimUp: false, jumpHeld: false, jump: false, dash: false, fire: false };

export type PlayerEvent = 'jump' | 'land' | 'dash' | 'parryTry';
type Scripted = 'intro' | 'victory' | 'ko' | null;

export class Player {
  x: number;
  y = ARENA.floorY;
  vx = 0;
  vy = 0;
  onGround = true;
  facing: 1 | -1 = 1;
  hp: number = P.hp;
  /** open PARATA window (ms) */
  parryMs = 0;
  readonly sprite: Phaser.GameObjects.Sprite;
  private coyote = 0;
  private buffer = 0;
  private dashMs = 0;
  private dashCd = 0;
  /** SCATTO invulnerability (a little longer than the smear) */
  private dashSafe = 0;
  private airDash = true;
  private cut = false;
  private rise = 0;
  private iframes = 0;
  private shieldMs = 0;
  private stun = 0;
  private lockMs = 0;
  private parryAnimMs = 0;
  private squash = 0;
  private scripted: Scripted = null;
  private firing = false;
  private aimUp = false;
  /** ▲ with a direction: the 45° aim */
  private aimDiag = false;
  private moving = false;

  constructor(
    scene: Phaser.Scene,
    private readonly k: number,
    x: number,
  ) {
    this.x = x;
    this.sprite = scene.add
      .sprite(x, this.y, '__DEFAULT')
      .setOrigin(0.5, HERO_FRAME.footY / HERO_FRAME.h)
      .setDepth(DEPTH.hero);
    this.sprite.play(HERO_ANIMS.idle);
    this.sprite.setScale(1 / k);
  }

  /** Hit box (world units). */
  get box(): Box {
    return { x: this.x - P.hitW / 2, y: this.y - P.hitH, w: P.hitW, h: P.hitH };
  }

  get center(): Vec {
    return { x: this.x, y: this.y - P.hitH / 2 };
  }

  /** Shots and hazards cannot hurt now (dash, hurt blink, parry bounce, super). */
  get invulnerable(): boolean {
    return this.safeMs > 0 || this.scripted !== null;
  }

  /** How long hits are still ignored (hurt blink, shield, SCATTO). */
  get safeMs(): number {
    return Math.max(this.iframes, this.shieldMs, this.dashMs, this.dashSafe);
  }

  /** A SCATTO would start now. */
  get canDash(): boolean {
    return this.dashCd <= 0 && this.dashMs <= 0 && this.lockMs <= 0 && this.stun <= 0 && this.scripted === null && (this.onGround || this.airDash);
  }

  /** Frozen in a pose (EX recoil, super): no shooting, no walking. */
  get locked(): boolean {
    return this.lockMs > 0 || this.stun > 0 || this.scripted !== null;
  }

  get dashing(): boolean {
    return this.dashMs > 0;
  }

  /** Unit aim vector for this frame's controls. */
  aim(c: PlayerControls): Vec {
    if (!c.aimUp) return { x: this.facing, y: 0 };
    if (c.axisX !== 0) return { x: this.facing * Math.SQRT1_2, y: -Math.SQRT1_2 };
    return { x: 0, y: -1 };
  }

  /** Where shots leave the finger-gun for this aim (the air poses fire from the standing muzzles). */
  muzzle(dir: Vec): Vec {
    const m = HERO_MUZZLE;
    const o = dir.y === 0 ? (this.moving && this.onGround ? m.run : m.forward) : dir.x === 0 ? m.up : { x: (m.forward.x + m.up.x) / 2, y: (m.forward.y + m.up.y) / 2 };
    return { x: this.x + this.facing * o.x, y: this.y + o.y };
  }

  update(dtMs: number, c: PlayerControls): PlayerEvent[] {
    const dt = dtMs / 1000;
    const ev: PlayerEvent[] = [];
    for (const t of ['iframes', 'shieldMs', 'dashSafe', 'stun', 'lockMs', 'parryMs', 'parryAnimMs', 'dashCd', 'buffer', 'coyote', 'rise'] as const) this[t] = Math.max(0, this[t] - dtMs);
    const ctl = this.scripted === null && this.stun <= 0 ? c : { ...c, axisX: 0 as const, jump: false, dash: false, fire: false };
    if (ctl.jump) this.buffer = P.jumpBufferMs;
    if (this.lockMs <= 0 && this.dashMs <= 0 && ctl.axisX !== 0) this.facing = ctl.axisX;
    // SCATTO
    if (ctl.dash && this.dashCd <= 0 && this.dashMs <= 0 && this.lockMs <= 0 && (this.onGround || this.airDash)) {
      if (!this.onGround) this.airDash = false;
      this.dashMs = P.dashMs;
      this.dashSafe = P.dashIframesMs;
      this.dashCd = P.dashMs + P.dashCooldownMs;
      this.vx = this.facing * P.dashSpeed;
      this.vy = 0;
      ev.push('dash');
    }
    if (this.dashMs > 0) {
      this.dashMs = Math.max(0, this.dashMs - dtMs);
      this.x += this.vx * dt;
      if (this.dashMs <= 0) this.vx = this.facing * P.runSpeed * 0.6;
    } else {
      this.move(ctl, dt, ev);
    }
    this.x = Math.max(P.minX, Math.min(P.maxX, this.x));
    this.firing = ctl.fire && !this.locked;
    this.aimUp = ctl.aimUp;
    this.aimDiag = ctl.aimUp && ctl.axisX !== 0;
    this.moving = ctl.axisX !== 0 && this.lockMs <= 0;
    this.render(dtMs);
    return ev;
  }

  private move(c: PlayerControls, dt: number, ev: PlayerEvent[]): void {
    const target = this.lockMs > 0 ? 0 : c.axisX * P.runSpeed;
    const a = (this.onGround ? P.accelGround : P.accelAir) * dt;
    this.vx += Math.max(-a, Math.min(a, target - this.vx));
    // jump on the ground (or just after leaving it); a mid-air press is a PARATA try
    if (this.buffer > 0 && (this.onGround || this.coyote > 0) && this.lockMs <= 0) {
      this.buffer = 0;
      this.coyote = 0;
      this.onGround = false;
      this.cut = false;
      this.rise = P.jumpMinMs;
      this.vy = -P.jumpVy;
      ev.push('jump');
    } else if (c.jump && !this.onGround) {
      this.buffer = 0;
      this.parryMs = P.parryWindowMs;
      this.parryAnimMs = P.parryWindowMs + 80;
      ev.push('parryTry');
    }
    if (!c.jumpHeld && !this.cut && this.rise <= 0 && this.vy < 0 && !this.onGround) {
      this.cut = true;
      this.vy *= P.jumpCut;
    }
    this.vy = Math.min(P.maxFall, this.vy + P.gravity * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y >= ARENA.floorY) {
      if (!this.onGround) {
        this.squash = Math.min(1, this.vy / P.maxFall) * P.landSquash;
        this.airDash = true;
        ev.push('land');
      }
      this.y = ARENA.floorY;
      this.vy = 0;
      this.onGround = true;
    } else if (this.onGround) {
      this.onGround = false;
      this.coyote = P.coyoteMs;
    }
  }

  /** A hit: one heart, knock back away from `fromX`, blink. False when invulnerable. */
  hurt(fromX: number): boolean {
    if (this.invulnerable || this.hp <= 0) return false;
    this.hp--;
    this.iframes = P.hurtIframesMs;
    this.stun = P.hurtStunMs;
    this.dashMs = 0;
    this.vx = (this.x >= fromX ? 1 : -1) * P.hurtKnockVx;
    this.vy = -P.hurtKnockVy;
    this.cut = true;
    this.onGround = false;
    return true;
  }

  /** A parry popped something: bounce up, short safety. */
  parryBounce(): void {
    this.parryMs = 0;
    this.vy = -P.parryBounceVy;
    this.cut = true;
    this.airDash = true;
    this.shieldMs = P.parryIframesMs;
  }

  /** EX recoil / super pose. */
  lock(ms: number): void {
    this.lockMs = Math.max(this.lockMs, ms);
  }

  /** Invulnerable without blinking (super rain). */
  shield(ms: number): void {
    this.shieldMs = Math.max(this.shieldMs, ms);
  }

  script(s: Scripted): void {
    this.scripted = s;
    if (s === 'ko' || s === 'victory') {
      this.dashMs = 0;
      this.vx = 0;
    }
  }

  private animKey(): string {
    const A = HERO_ANIMS;
    if (this.scripted === 'ko' && this.onGround) return A.ko;
    if (this.scripted === 'intro') return A.intro;
    if (this.scripted === 'victory' && this.onGround) return A.victory;
    if (this.lockMs > 0 && this.shieldMs > 0) return A.super;
    if (this.stun > 0) return A.hurt;
    if (this.dashMs > 0) return A.dash;
    if (this.parryAnimMs > 0 && !this.onGround) return A.parry;
    const AIM = HERO_AIM_ANIMS;
    if (!this.onGround) {
      if (this.firing || this.lockMs > 0) return !this.aimUp ? AIM.airShoot : this.aimDiag ? AIM.airShootDiag : AIM.airShootUp;
      return this.vy < 0 ? A.jump : A.fall;
    }
    if (this.moving) return !this.firing ? A.run : this.aimUp ? AIM.runShootUp : A.runShoot;
    if (this.firing || this.lockMs > 0) return this.aimUp ? A.shootUp : A.shoot;
    return A.idle;
  }

  private render(dtMs: number): void {
    const s = this.sprite;
    const key = this.animKey();
    if (s.anims.currentAnim?.key !== key && s.scene.anims.exists(key)) s.play(key);
    this.squash -= this.squash * Math.min(1, P.squashDecay * (dtMs / 1000));
    const stretch = this.onGround ? 0 : Math.max(0, Math.min(1, -this.vy / P.jumpVy)) * 0.08;
    const base = 1 / this.k;
    s.setScale(base * (1 + this.squash * 0.7 - stretch * 0.5), base * (1 - this.squash + stretch));
    s.setPosition(this.x, this.y).setFlipX(this.facing < 0);
    const blink = this.iframes > 0 && this.stun <= 0 && Math.floor(this.iframes / P.blinkMs) % 2 === 0;
    s.setAlpha(blink ? 0.35 : 1);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
