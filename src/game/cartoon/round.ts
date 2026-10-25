/**
 * One boss fight of level 8: title card -> fight -> AL TAPPETO! (knockout) or K.O. (defeat).
 * Runs the player, the shots, the BossWorld hazards and the BossRuntime; resolves every collision
 * (shots vs hurt boxes and minions, hazards / boss body vs the hero, the PARATA on pink things),
 * the boss hp and phases, the super cards and the stats of the report card.
 */
import type Phaser from 'phaser';
import type { CartoonWeapon, SfxName } from '../../contracts';
import { ARENA, type BossDef, type BossRuntime, type Box, type Vec } from './api';
import { RoundFx } from './fx';
import { addCards, boxesOverlap, cardsForDamage, centerOf, nextWeapon, parryHits, shapeHitsBox, superAction, type RoundStats } from './logic/rules';
import { NO_CONTROLS, Player, type PlayerControls } from './player';
import { Shots, type ShotHit, type Target } from './shots';
import { TitleCard } from './titleCard';
import { ArenaWorld, type Hazard } from './world';
import { mulberry32 } from '../rush/logic/rng';
import { CT_CARDS, CT_FLOW, CT_PLAYER, CT_VIEW, CT_WEAPONS } from '../../config/cartoon';

export type RoundState = 'intro' | 'fight' | 'knockout' | 'defeat' | 'over';

export interface RoundControls extends PlayerControls {
  swap: boolean;
  super: boolean;
}

export interface RoundHooks {
  controls(): RoundControls;
  autoFire(): boolean;
  sfx(n: SfxName): void;
  vibrate(p: number | readonly number[]): void;
  calm(): boolean;
  /** device px per world unit (crisp balloon text) */
  textRes(): number;
  end(won: boolean, stats: RoundStats): void;
}

const START_X = 96;
const HIT_SFX_GAP_MS = 90;
/** a boss whose knockout animation never reports done still ends the round */
const DONE_GRACE_MS = 6000;

export class Round {
  state: RoundState = 'intro';
  readonly player: Player;
  readonly world: ArenaWorld;
  readonly shots: Shots;
  readonly fx: RoundFx;
  readonly boss: BossRuntime;
  bossHp: number;
  phase = 0;
  cards = 0;
  parries = 0;
  supers = 0;
  damage = 0;
  /** fight time (the intro does not count) */
  timeMs = 0;
  god = false;
  /** what landed each hit on the hero (hazard texture or 'body'): QA / debug */
  readonly hurtBy: string[] = [];
  private readonly card: TitleCard;
  private readonly arena: Phaser.GameObjects.GameObject[];
  private stateMs = 0;
  private cooldown = 0;
  private hitStop = 0;
  private slowMs = 0;
  private lastHitSfx = -1e9;
  private lastFlash = -1e9;
  private bossAt: Vec = { x: ARENA.w * 0.75, y: ARENA.h * 0.5 };

  constructor(
    scene: Phaser.Scene,
    readonly def: BossDef,
    k: number,
    heroK: number,
    public weapon: CartoonWeapon,
    private readonly hooks: RoundHooks,
    seed: number,
  ) {
    this.bossHp = def.hp;
    this.fx = new RoundFx(scene, () => k, hooks.textRes, hooks.calm);
    this.card = new TitleCard(scene, k, hooks.calm);
    this.arena = def.buildArena(scene, k);
    this.world = new ArenaWorld(scene, k, mulberry32(seed), hooks.calm, {
      shake: (i, ms) => this.fx.shake(i, ms),
      sfx: (n) => hooks.sfx(n),
      say: (text, ms) => this.fx.say(text, ms, this.bossTop()),
      pop: (at) => this.fx.pop(at),
    });
    this.boss = def.create(this.world);
    this.shots = new Shots(scene, heroK, this.fx, hooks.sfx, mulberry32(seed ^ 0x9e3779b9));
    this.player = new Player(scene, heroK, START_X);
    this.player.script('intro');
    this.card.show('start', 'PRONTI? AMUNÌ!', def.intro, CT_FLOW.introMs);
    hooks.sfx('roundBell');
  }

  get progress(): number {
    return Math.max(0, Math.min(1, 1 - this.bossHp / this.def.hp));
  }

  stats(): RoundStats {
    return { timeMs: this.timeMs, hp: this.player.hp, maxHp: CT_PLAYER.hp, parries: this.parries, supers: this.supers, damage: this.damage, bossHp: this.def.hp };
  }

  /**
   * The arena part a portrait camera keeps in view: the hero, the boss, the hazards near the hero, the floor.
   * null = the whole arena (the PIOGGIA DI PATATINE cloud sits at the top).
   */
  focusBox(): Box | null {
    if (this.shots.raining) return null;
    const F = CT_VIEW.push;
    const p = this.player;
    const e: Record<'x0' | 'y0' | 'x1' | 'y1', number> = { x0: p.x - F.heroX, y0: p.y - F.heroTop, x1: p.x + F.heroX, y1: F.floorY };
    const add = (b: Box, pad: number): void => {
      e.x0 = Math.min(e.x0, b.x - pad);
      e.y0 = Math.min(e.y0, b.y - pad);
      e.x1 = Math.max(e.x1, b.x + b.w + pad);
      e.y1 = Math.max(e.y1, b.y + b.h + pad);
    };
    for (const b of this.boss.hurtBoxes()) add(b, F.bossPad);
    for (const b of this.boss.bodyBoxes()) add(b, F.bossPad);
    for (const h of this.world.hazards) if (h.alive && Math.abs(h.x - p.x) < F.watch) add(minionBox(h), F.hazardPad);
    const x0 = Math.max(0, e.x0);
    const y0 = Math.max(0, e.y0);
    return { x: x0, y: y0, w: Math.min(ARENA.w, e.x1) - x0, h: Math.min(ARENA.h, e.y1) - y0 };
  }

  private bossTop(): Vec {
    const b = this.boss.hurtBoxes()[0];
    return b ? { x: b.x + b.w / 2, y: b.y } : { x: this.bossAt.x, y: this.bossAt.y - 50 };
  }

  /** Advances the round; returns the screen shake offset (world units). */
  update(dtMs: number): Vec {
    this.fx.update(dtMs);
    this.card.update(dtMs);
    const shake = this.fx.shakeOffset(dtMs);
    if (this.hitStop > 0) {
      this.hitStop -= dtMs;
      return shake;
    }
    let d = dtMs;
    if (this.slowMs > 0) {
      this.slowMs -= dtMs;
      d *= CT_FLOW.knockoutTimeScale;
    }
    this.stateMs += d;
    if (this.state === 'intro') this.intro(d);
    else if (this.state === 'fight') this.fight(d);
    else if (this.state !== 'over') this.after(d);
    return shake;
  }

  private intro(d: number): void {
    this.player.update(d, NO_CONTROLS);
    if (this.stateMs < CT_FLOW.introMs) return;
    this.state = 'fight';
    this.stateMs = 0;
    this.player.script(null);
  }

  private fight(d: number): void {
    const c = this.hooks.controls();
    const fire = c.fire || this.hooks.autoFire();
    if (c.swap) {
      this.weapon = nextWeapon(this.weapon);
      this.hooks.sfx('select');
    }
    if (c.super && !this.player.locked) this.special(c);
    for (const e of this.player.update(d, { ...c, fire })) this.onPlayer(e);
    this.cooldown -= d;
    if (fire && !this.player.locked && !this.player.dashing && this.cooldown <= 0) {
      const dir = this.player.aim(c);
      this.cooldown = this.shots.fire(this.weapon, this.player.muzzle(dir), dir);
    }
    this.timeMs += d;
    this.step(d);
    if (this.state !== 'fight') return;
    this.collide();
    if (this.bossHp <= 0) this.knockout();
  }

  /** World, boss and shots (also after the fight, for the knockout animation). */
  private step(d: number): void {
    const w = this.world;
    const p = this.player;
    w.player.x = p.x;
    w.player.y = p.center.y;
    w.player.onGround = p.onGround;
    w.timeMs += d;
    w.update(d);
    this.boss.update(d);
    const hurt = this.boss.hurtBoxes();
    if (hurt[0]) this.bossAt = centerOf(hurt[0]);
    const minions = w.minions();
    const targets: Target[] = this.state === 'fight' ? [...hurt.map((box) => ({ box, ref: 'boss' as const })), ...minions.map((m, i) => ({ box: minionBox(m), ref: i }))] : [];
    this.applyHits(this.shots.update(d, targets, this.bossAt.x), minions);
  }

  private applyHits(hits: readonly ShotHit[], minions: readonly Hazard[]): void {
    for (const h of hits) {
      if (this.state !== 'fight') return;
      if (h.ref === 'boss') {
        this.bossHp -= h.damage;
        this.damage += h.damage;
        // the boss flash: at most ~3 a second under constant fire (no strobing; the hit sparks show every shot)
        if (this.world.timeMs - this.lastFlash >= CT_FLOW.bossFlashGapMs) {
          this.lastFlash = this.world.timeMs;
          this.boss.onHit(h.damage, h.at);
        }
        if (this.world.timeMs - this.lastHitSfx > HIT_SFX_GAP_MS) {
          this.lastHitSfx = this.world.timeMs;
          this.hooks.sfx('bossHit');
        }
      } else {
        this.world.damageMinion(minions[h.ref], h.damage);
      }
      if (!h.ex) this.gainCards(cardsForDamage(h.damage));
    }
    const phases = this.def.phases;
    while (this.phase < phases.length && this.bossHp / this.def.hp <= phases[this.phase] && this.bossHp > 0) {
      this.phase++;
      this.boss.onPhase(this.phase);
      this.hooks.sfx('phase');
      this.fx.shake(3, 260);
    }
  }

  private gainCards(n: number): void {
    const before = Math.floor(this.cards);
    this.cards = addCards(this.cards, n);
    if (Math.floor(this.cards) > before) this.hooks.sfx('cardFull');
  }

  private collide(): void {
    const p = this.player;
    const box = p.box;
    for (const hz of this.world.hazards) {
      if (!hz.alive) continue;
      if (p.parryMs > 0 && parryHits(p.parryMs, box, hz)) {
        this.parry(hz);
        continue;
      }
      if (shapeHitsBox(hz, box)) this.hurt(hz.x, hz.spec.texture);
    }
    for (const b of this.boss.bodyBoxes()) if (boxesOverlap(b, box)) this.hurt(b.x + b.w / 2, 'body');
  }

  private parry(hz: Hazard): void {
    this.world.kill(hz);
    this.fx.parry({ x: hz.x, y: hz.y });
    this.player.parryBounce();
    this.parries++;
    this.gainCards(CT_CARDS.parry);
    this.hitStop = CT_FLOW.parryHitStopMs;
    this.hooks.sfx('parry');
  }

  private hurt(fromX: number, by: string): void {
    if (this.god || this.player.invulnerable || !this.player.hurt(fromX)) return;
    this.hurtBy.push(by);
    this.hooks.sfx('oof');
    this.hooks.vibrate(CT_FLOW.vibrateHurtMs);
    this.fx.shake(3, 220);
    this.fx.hit(this.player.center);
    if (this.player.hp <= 0) this.defeat();
  }

  /** SUPER button: PIOGGIA DI PATATINE with 5 cards, else an EX shot with 1. */
  private special(c: PlayerControls): void {
    const a = superAction(this.cards);
    if (a === 'super') {
      const S = CT_WEAPONS.super;
      this.cards -= CT_CARDS.super;
      this.supers += CT_CARDS.super;
      this.player.lock(S.poseMs);
      this.player.shield(S.poseMs + S.rainMs);
      this.shots.superRain(this.bossAt.x);
      this.fx.shake(2, 300);
    } else if (a === 'ex') {
      this.cards -= CT_CARDS.ex;
      this.supers += CT_CARDS.ex;
      const dir = this.player.aim(c);
      this.shots.ex(this.weapon, this.player.muzzle(dir), dir);
      this.player.lock(CT_WEAPONS.ex.lockMs);
    }
  }

  private onPlayer(e: string): void {
    if (e === 'jump') this.hooks.sfx('jump');
    else if (e === 'dash') {
      this.hooks.sfx('dash');
      this.fx.dust({ x: this.player.x, y: this.player.y });
    } else if (e === 'land') this.fx.dust({ x: this.player.x, y: this.player.y });
  }

  /** hp 0 (or the debug kill): AL TAPPETO! */
  knockout(): void {
    if (this.state !== 'fight' && this.state !== 'intro') return;
    this.state = 'knockout';
    this.stateMs = 0;
    this.bossHp = 0;
    this.player.script('victory');
    // a fight line must not float over AL TAPPETO! (a boss's own knockout line comes next)
    this.fx.hush();
    this.boss.onKnockout();
    this.world.popAll();
    this.card.show('knockout', 'AL TAPPETO!', null, CT_FLOW.knockoutHoldMs - 300);
    this.slowMs = CT_FLOW.knockoutSlowMs;
    this.fx.shake(6, 520);
    this.hooks.sfx('knockout');
    this.hooks.vibrate(CT_FLOW.vibrateKo);
  }

  private defeat(): void {
    this.state = 'defeat';
    this.stateMs = 0;
    this.player.script('ko');
    this.card.show('defeat', 'K.O.!', null, CT_FLOW.defeatHoldMs);
    this.fx.shake(5, 420);
    this.hooks.vibrate(CT_FLOW.vibrateKo);
  }

  /** Knockout / defeat beats: the boss animation and the falling hero play out, then the results. */
  private after(d: number): void {
    this.player.update(d, NO_CONTROLS);
    this.step(d);
    if (this.state === 'knockout') this.world.popAll();
    const won = this.state === 'knockout';
    const hold = won ? CT_FLOW.knockoutHoldMs : CT_FLOW.defeatHoldMs;
    if (this.stateMs < hold || (won && !this.boss.done && this.stateMs < hold + DONE_GRACE_MS)) return;
    this.state = 'over';
    this.hooks.end(won, this.stats());
  }

  destroy(): void {
    this.card.clear();
    this.fx.clear();
    this.shots.clear();
    this.world.destroy();
    this.boss.destroy();
    this.player.destroy();
    for (const o of this.arena) o.destroy();
  }
}

function minionBox(m: Hazard): Box {
  if (m.w !== undefined && m.h !== undefined) return { x: m.x - m.w / 2, y: m.y - m.h / 2, w: m.w, h: m.h };
  const r = m.r ?? 6;
  return { x: m.x - r, y: m.y - r, w: r * 2, h: r * 2 };
}
