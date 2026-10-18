/**
 * The running level: input, shooting, FULMINE chains, the formation's beat and bombs,
 * every collision, scoring and hearts. Scripted moments (intro, wave breaks, black hole,
 * game over) live in story.ts.
 */
import Phaser from 'phaser';
import type { Services } from '../../contracts';
import { Backdrop } from './backdrop';
import { pickChain, type ChainTarget } from './chain';
import { CHAIN, FOOD_POINTS, FORM, JET, POINTS, RULES, SHAKE, SHOT, UFO, UFO_POINTS } from './config';
import { SpaceFx } from './fx';
import { Jet } from './jet';
import { Lightning } from './lightning';
import { Pickups } from './pickups';
import { bombRect, Projectiles, shotRect } from './projectiles';
import { Shields, type Rect } from './shields';
import { Swarm, type Invader } from './swarm';
import { Ufo } from './ufo';

export type Phase = 'intro' | 'play' | 'waveBreak' | 'ending' | 'dying' | 'over' | 'won';

const UFO_ID = -1;

function hits(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Battle {
  phase: Phase = 'intro';
  wave = 0;
  hearts: number = RULES.hearts;
  score: number = RULES.startScore;
  charges: number = RULES.startCharges;
  timeMs = 0;
  warp = 1;
  /** hooks set by story.ts */
  onWaveCleared: () => void = () => undefined;
  onDead: () => void = () => undefined;

  readonly fx: SpaceFx;
  readonly backdrop: Backdrop;
  readonly jet: Jet;
  readonly swarm: Swarm;
  readonly shots: Projectiles;
  readonly shields: Shields;
  readonly ufo: Ufo;
  readonly pickups: Pickups;
  readonly bolt: Lightning;
  private fireCd = 0;
  private bombMs = 1200;
  private chainBusy = false;
  private capsuleHint = false;
  private stepSfxMs = 0;

  constructor(readonly scene: Phaser.Scene, readonly svc: Services) {
    this.fx = new SpaceFx(scene);
    this.backdrop = new Backdrop(scene);
    this.shields = new Shields(scene);
    this.shields.reset();
    this.swarm = new Swarm(scene);
    this.shots = new Projectiles(scene);
    this.pickups = new Pickups(scene);
    // a UFO still crossing after Ciccio's death flies off silently (no warble over the card)
    this.ufo = new Ufo(scene, () => {
      if (this.phase !== 'dying' && this.phase !== 'over') svc.audio.sfx('ufo');
    });
    this.bolt = new Lightning(scene);
    this.jet = new Jet(scene);
  }

  get playing(): boolean {
    return this.phase === 'play';
  }

  /** 0..1 over the three waves. */
  progress(): number {
    if (this.phase === 'ending' || this.phase === 'won') return 1;
    const total = this.swarm.invaders.length || 1;
    const done = this.swarm.invaders.filter((i) => !i.alive).length / total;
    return Math.min(1, (this.wave + (this.phase === 'waveBreak' ? 1 : done)) / 3);
  }

  update(dt: number): void {
    const inp = this.svc.input;
    this.backdrop.update(dt, this.warp);
    this.bolt.update(dt);
    const live = this.phase === 'play' || this.phase === 'waveBreak';
    if (live) this.timeMs += dt;
    this.jet.update(dt, live ? inp.axisX : 0);
    // presses made while not playing must not fire later
    const fire = inp.consume('fire') || inp.consume('jump');
    const club = inp.consume('club');
    if (this.playing) {
      this.fireCd -= dt;
      const held = inp.fireHeld || inp.jumpHeld;
      if ((fire && this.fireCd <= 0) || (held && this.fireCd <= -(SHOT.autoMs - SHOT.cooldownMs))) this.fire();
      if (club) this.fulmine();
    }
    this.shots.update(dt);
    this.stepSfxMs -= dt;
    if (this.playing) {
      const beat = this.swarm.update(dt);
      // the march speeds up to ~20 beats/s at the end: cap the heartbeat sound
      if (beat && this.stepSfxMs <= 0) {
        this.svc.audio.sfx('invaderStep');
        this.stepSfxMs = 140;
      }
      this.dropBombs(dt);
    } else if (this.phase === 'waveBreak' || this.phase === 'intro') {
      this.swarm.update(dt); // the next formation drops in before play starts
    }
    this.ufo.update(dt, this.playing && this.swarm.alive().length >= UFO.minAlive);
    this.pickups.update(
      dt,
      this.jet.steer && this.jet.sprite.visible ? this.jet.catchRect() : null,
      (x, y) => this.gotCapsule(x, y),
      (x, y) => this.gotFood(x, y),
    );
    this.collide();
    if (this.playing && !this.swarm.entering && this.swarm.alive().length === 0 && !this.chainBusy) this.onWaveCleared();
  }

  addScore(points: number, x: number, y: number): void {
    this.score += points;
    this.fx.popup(x, y - 8, points);
  }

  /* -------------------------------------------------------------- weapons */

  private fire(): void {
    if (this.shots.fire(this.jet.x, JET.y + JET.noseY)) {
      this.fireCd = SHOT.cooldownMs;
      this.svc.audio.sfx('laser');
    }
  }

  /** FULMINE: bolt from the nose to the best target, chaining to its neighbours. */
  fulmine(): boolean {
    if (!this.playing || this.charges <= 0 || this.chainBusy) return false;
    const targets: ChainTarget[] = this.swarm.alive().map((i) => ({ id: i.id, ...this.swarm.pos(i) }));
    const u = this.ufo.sprite;
    if (u) targets.push({ id: UFO_ID, x: u.x, y: u.y });
    const ox = this.jet.x;
    const oy = JET.y + JET.noseY;
    const order = pickChain(ox, oy, targets, CHAIN.hops, CHAIN.radius);
    if (order.length === 0) return false;
    this.charges--;
    this.chainBusy = true;
    this.svc.audio.sfx('bolt');
    this.scene.cameras.main.flash(90, 120, 170, 255);
    let prev = { x: ox, y: oy };
    order.forEach((id, k) => {
      this.scene.time.delayedCall(k * CHAIN.hopMs, () => {
        const at = this.transform(id);
        if (at) {
          this.bolt.add(prev.x, prev.y, at.x, at.y);
          this.fx.spark(at.x, at.y);
          prev = at;
        }
        if (k === order.length - 1) this.chainBusy = false;
      });
    });
    return true;
  }

  /** Lightning hit: the target turns into food in a puff of smoke. */
  private transform(id: number): { x: number; y: number } | null {
    if (!this.playing) return null; // hops still pending when the jet blows up score nothing
    if (id === UFO_ID) {
      const u = this.ufo.sprite;
      if (!u) return null;
      const at = { x: u.x, y: u.y };
      this.ufo.remove();
      this.addScore(Phaser.Utils.Array.GetRandom([...UFO_POINTS]), at.x, at.y);
      this.pickups.dropCapsule(at.x, at.y + 6);
      this.puffToFood(at.x, at.y);
      return at;
    }
    const inv = this.swarm.invaders.find((i) => i.id === id && i.alive);
    if (!inv) return null;
    const at = this.swarm.pos(inv);
    this.killInvader(inv, true);
    return at;
  }

  private puffToFood(x: number, y: number): void {
    this.fx.smoke(x, y);
    this.pickups.spawnFood(x, y);
    this.svc.audio.sfx('transform');
  }

  killInvader(inv: Invader, byBolt: boolean): void {
    const { x, y } = this.swarm.pos(inv);
    this.swarm.kill(inv);
    this.addScore(POINTS[inv.kind], x, y);
    if (byBolt) this.puffToFood(x, y);
    else {
      this.fx.boom(x, y);
      this.svc.audio.sfx('explode');
    }
    if (inv.carrier) this.pickups.dropCapsule(x, y + 4);
  }

  private dropBombs(dt: number): void {
    if (this.swarm.entering) return;
    const w = this.swarm.wave;
    this.bombMs -= dt;
    if (this.bombMs > 0) return;
    this.bombMs = w.bombMs * (0.6 + Math.random() * 0.8);
    if (this.shots.bombs.length >= w.maxBombs) return;
    const inv = this.swarm.bomber(this.jet.x, Math.random() < 0.5);
    if (!inv) return;
    const { x, y } = this.swarm.pos(inv);
    this.shots.bomb(x, y + 8, inv.kind === 'alienA' || inv.kind === 'alienB', w.bombSpeed);
  }

  /* ------------------------------------------------------------- pickups */

  private gotCapsule(x: number, y: number): void {
    this.charges = Math.min(RULES.maxCharges, this.charges + 1);
    this.svc.audio.sfx('powerup');
    this.fx.spark(x, y);
    if (!this.capsuleHint) {
      this.capsuleHint = true;
      this.svc.ui.banner('FULMINE +1', { tone: 'power', sub: 'Premi FULMINE: i nemici diventano cibo!', ms: 1600 });
    }
  }

  private gotFood(x: number, y: number): void {
    this.addScore(FOOD_POINTS, x, y);
    this.svc.audio.sfx('coin');
  }

  /* ----------------------------------------------------------- collisions */

  damage(force = false): void {
    if (!force && !this.jet.vulnerable) return;
    if (this.phase !== 'play' && this.phase !== 'waveBreak') return;
    this.hearts = Math.max(0, this.hearts - 1);
    this.svc.audio.sfx('hurt');
    this.fx.boom(this.jet.x, JET.y + 2, 1.4);
    this.shake();
    if (this.hearts <= 0) this.onDead();
    else this.jet.hurt();
  }

  /** Phaser scales the offset by camSize * zoom and applies it after the zoom: undo both. */
  private shake(): void {
    const cam = this.scene.cameras.main;
    const k = SHAKE.px / cam.zoom;
    cam.shake(SHAKE.ms, new Phaser.Math.Vector2(k / cam.width, k / cam.height));
  }

  private collide(): void {
    const sw = this.swarm;
    const alive = sw.alive();
    for (const s of [...this.shots.shots]) {
      const r = shotRect(s);
      const bomb = this.shots.bombs.find((b) => hits(r, bombRect(b)));
      if (bomb) {
        this.fx.spark(bomb.sprite.x, bomb.sprite.y);
        this.shots.removeBomb(bomb);
        this.shots.removeShot(s);
        continue;
      }
      const ur = this.ufo.rect();
      if (ur && hits(r, ur)) {
        const u = this.ufo.sprite as Phaser.GameObjects.Sprite;
        this.fx.boom(u.x, u.y, 1.5);
        this.svc.audio.sfx('explode');
        this.addScore(Phaser.Utils.Array.GetRandom([...UFO_POINTS]), u.x, u.y);
        this.pickups.dropCapsule(u.x, u.y + 6);
        this.ufo.remove();
        this.shots.removeShot(s);
        continue;
      }
      // Ciccio's provola sticks fly over the burgers: only enemy bombs bite the shields
      const inv = sw.entering ? undefined : alive.find((i) => i.alive && hits(r, sw.rect(i)));
      if (inv) {
        this.killInvader(inv, false);
        this.shots.removeShot(s);
      }
    }
    for (const b of [...this.shots.bombs]) {
      const r = bombRect(b);
      if (this.shields.impact(r, true, 2.6)) {
        this.shots.removeBomb(b);
      } else if (this.jet.vulnerable && hits(r, this.jet.rect())) {
        this.shots.removeBomb(b);
        this.damage();
      }
    }
    if (sw.entering) return;
    for (const i of alive) if (i.alive) this.shields.plough(sw.rect(i));
    if (this.playing && sw.lowest() >= FORM.invadeY) {
      // the formation reached Ciccio's row: it costs a heart and they are pushed back up
      this.damage(true);
      sw.pushUp(FORM.dy * 2);
    }
  }
}
