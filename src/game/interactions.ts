/**
 * Every contact rule, wired once per level: terrain colliders, pickups, ? blocks, crates,
 * enemy stomp / damage, cheese shots. Score, sfx, FX and banners for each outcome.
 */
import Phaser from 'phaser';
import type { PowerState } from '../contracts';
import { CAMERA, ENEMY, HERO, KILL_FX, SCORE } from '../config/tuning';
import { shakeWorld } from './camera';
import type { Enemy } from './enemies/Enemy';
import { FlightMode } from './player/flight';
import type { Pickup } from './items';
import type { LevelRun } from './run';
import { addScore, collect, enemyHit, killPoints, type KillMethod, type PickupKind, Timer } from './rules';

type Obj = Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile;

/** The game object behind a collider callback argument (null for tiles). */
function go(o: Obj): Phaser.GameObjects.GameObject | null {
  if (o instanceof Phaser.Tilemaps.Tile) return null;
  if (o instanceof Phaser.Physics.Arcade.Body || o instanceof Phaser.Physics.Arcade.StaticBody) return o.gameObject ?? null;
  return o;
}

/** Power-up banners; the hint names the touch buttons or the keys, whichever is in use. */
const POWER_BANNERS: Partial<Record<keyof PowerState, { text: string; touch: string; keys: string }>> = {
  brie: { text: 'BRIE!', touch: 'Scudo + super salto', keys: 'Scudo + super salto' },
  goat: { text: 'PROVOLA GOAT!', touch: 'Tocca GOAT per sparare', keys: 'Premi J per sparare' },
  thai: { text: 'ALETTE THAI!', touch: 'Tocca THAI per colpire', keys: 'Premi K per colpire' },
  wings: { text: 'ALETTE CRUNCHY!', touch: 'Tieni premuto VOLA · SCENDI per picchiare', keys: 'Tieni premuto Spazio/↑ · ↓ per scendere' },
};

/** The touch layout is on (ui/layout.ts sets .is-touch on the shell). */
function touchLayout(): boolean {
  return document.querySelector('.is-touch') !== null;
}

export class Interactions {
  /** brief grace after a stomp / clang so a bounce never turns into a side hit */
  private readonly grace = new Timer();

  constructor(
    private readonly r: LevelRun,
    private readonly onDeath: () => void,
  ) {
    const { scene, world, player, enemies, blocks, pickups, cheese } = r;
    const add = scene.physics.add;
    add.collider(player.zone, world.layer, undefined, world.tileProcess);
    add.collider(player.zone, blocks.qblocks, (_a, b) => this.onBlock(b));
    add.collider(player.zone, blocks.crates);
    add.overlap(player.zone, pickups.group, (_a, b) => this.onPickup(b));
    add.overlap(player.zone, enemies.group, (_a, b) => this.onEnemy(b));
    // fliers (bats, spirits) ignore terrain and blocks
    const walker = (e: Obj): boolean => enemies.isWalker(go(e));
    add.collider(enemies.group, world.layer, undefined, (e, t) => walker(e) && world.tileProcess(e, t));
    add.collider(enemies.group, blocks.qblocks, undefined, walker);
    add.collider(enemies.group, blocks.crates, undefined, walker);
    add.collider(cheese.group, world.layer, (a) => this.splat(a), world.tileProcess);
    add.collider(cheese.group, blocks.qblocks, (a) => this.splat(a));
    add.overlap(cheese.group, blocks.crates, (a, b) => this.shotCrate(a, b));
    add.overlap(cheese.group, enemies.group, (a, b) => this.shotEnemy(a, b));
  }

  tick(dtMs: number): void {
    this.grace.tick(dtMs);
  }

  private get playing(): boolean {
    return this.r.phase === 'play';
  }

  /* ------------------------------------------------------------- pickups */

  private onPickup(obj: Obj): void {
    const o = go(obj);
    const p: Pickup | undefined = o ? this.r.pickups.get(o) : undefined;
    if (!p || !this.playing) return;
    const { x, y } = p.sprite;
    if (this.r.pickups.take(p)) this.grant(p.kind, x, y);
  }

  /** Applies a pickup (also used by ? block fries and the debug API). */
  grant(kind: PickupKind, x: number, y: number): void {
    const { run, svc, fx, player } = this.r;
    const out = collect(run, kind);
    fx.popup(x, y - 6, out.points);
    if (kind === 'nugget') svc.audio.sfx('coin');
    else if (kind === 'fries') svc.audio.sfx('fries');
    else if (kind === 'burger') svc.audio.sfx(out.healed ? 'heal' : 'burger');
    else svc.audio.sfx(kind === 'brie' ? 'brie' : 'powerup');
    if (run.powers.brie) player.setBrie(true);
    if (out.gained === 'wings') {
      player.mode = new FlightMode();
      fx.sparkleBurst(player.x, player.centerY, 10, 20);
    }
    const banner = out.gained ? POWER_BANNERS[out.gained] : undefined;
    if (banner) this.r.banner(banner.text, { tone: 'power', sub: touchLayout() ? banner.touch : banner.keys, ms: 2200 });
  }

  /* ------------------------------------------------------------ ? blocks */

  private onBlock(obj: Obj): void {
    const o = go(obj);
    const q = o ? this.r.blocks.qblockOf(o) : undefined;
    const b = this.r.player.body;
    if (!q || !this.playing || !(b.touching.up || b.blocked.up)) return;
    if (Math.abs(b.center.x - q.sprite.x) > 12 || b.top < q.top + 8) return;
    const contents = this.r.blocks.bump(q);
    this.r.svc.audio.sfx('bump');
    if (!contents) return;
    const x = q.sprite.x;
    if (contents === 'fries') this.r.pickups.popFries(x, q.top, () => this.grant('fries', x, q.top - 20));
    else {
      this.r.pickups.rise(contents, x, q.top);
      this.r.svc.audio.sfx('powerup');
    }
  }

  /* -------------------------------------------------------------- enemies */

  private onEnemy(obj: Obj): void {
    const o = go(obj);
    const e = o ? this.r.enemies.of(o) : undefined;
    if (!e || !this.playing || this.grace.active) return;
    const hero = this.r.player.body;
    const eb = e.body;
    const prevBottom = hero.prev.y + hero.height;
    const falling = hero.velocity.y > 0 || this.r.player.motor.vy > 0;
    const fromAbove = falling && (prevBottom <= eb.top + 3 || hero.bottom <= eb.top + eb.height * 0.5);
    if (!fromAbove) return this.damage(eb.center.x);
    const res = e.onStomp(this.r.host);
    if (res === 'hurt') return this.damage(eb.center.x);
    const held = this.r.svc.input.jumpHeld;
    this.r.player.bounce(held);
    this.r.view.onBounce();
    this.grace.start(140);
    if (res === 'clang') {
      this.r.svc.audio.sfx('armorClang');
      shakeWorld(this.r.scene.cameras.main, 90, CAMERA.shakeClang);
      // slide off the dome: a stomp on the armour must never become an endless trampoline
      const off = hero.center.x - eb.center.x;
      this.r.player.kick((Math.abs(off) > 1 ? Math.sign(off) : this.r.player.facing) * ENEMY.armor.clangKick);
      return;
    }
    this.kill(e, 'stomp');
  }

  /** Removes an enemy with score + sfx for the given method; weapon kills get a hit-stop. */
  kill(e: Enemy, method: KillMethod): void {
    if (!e.alive) return;
    const top = e.body.top;
    e.kill(method, this.r.host);
    const pts = killPoints(method);
    addScore(this.r.run, pts);
    this.r.fx.popup(e.sprite.x, top - 4, pts);
    const audio = this.r.svc.audio;
    if (method === 'stomp') {
      audio.sfx('stomp');
      return;
    }
    audio.sfx(method === 'cheese' ? 'melt' : 'ignite');
    this.hitStop(KILL_FX.hitStopMs);
    shakeWorld(this.r.scene.cameras.main, KILL_FX.shakeMs, KILL_FX.shake);
  }

  /** Freezes the physics for a few ms (the scene clock keeps running, so it always resumes). */
  private hitStop(ms: number): void {
    const { scene } = this.r;
    const world = scene.physics.world;
    if (world.isPaused) return;
    world.pause();
    scene.time.delayedCall(ms, () => {
      if (scene.sys.isActive()) world.resume();
    });
  }

  /** Enemy contact: Brie absorbs it, otherwise a heart (or game over). */
  damage(fromX: number): void {
    const { player, run, svc, fx, view } = this.r;
    if (player.invuln.active || !this.playing) return;
    const out = enemyHit(run);
    if (out === 'dead') {
      svc.audio.sfx('hurt');
      this.onDeath();
      return;
    }
    if (out === 'shield') {
      svc.audio.sfx('shieldBreak');
      fx.hitStar(player.x, player.centerY);
      fx.sparkleBurst(player.x, player.centerY, 8, 16);
      player.setBrie(false);
    } else svc.audio.sfx('hurt');
    player.knockback(fromX);
    player.invuln.start(HERO.invulnMs);
    view.onBounce();
    shakeWorld(this.r.scene.cameras.main, 140, CAMERA.shakeHurt);
  }

  /* ---------------------------------------------------------------- shots */

  private splat(obj: Obj): void {
    const o = go(obj);
    if (o) this.r.cheese.splat(o);
  }

  private shotCrate(shot: Obj, crate: Obj): void {
    const s = go(shot);
    const c = go(crate);
    if (!s || !c || !this.r.cheese.isShot(s)) return;
    this.r.cheese.splat(s);
    this.breakCrate(c);
  }

  breakCrate(c: Phaser.GameObjects.GameObject): void {
    const sprite = c as Phaser.Physics.Arcade.Sprite;
    const { x, y } = sprite;
    if (!this.r.blocks.breakCrate(c)) return;
    addScore(this.r.run, SCORE.crate);
    this.r.fx.popup(x, y - 10, SCORE.crate);
    this.r.svc.audio.sfx('crate');
  }

  private shotEnemy(shot: Obj, enemy: Obj): void {
    const s = go(shot);
    const eo = go(enemy);
    const e = eo ? this.r.enemies.of(eo) : undefined;
    if (!s || !e || !this.r.cheese.isShot(s)) return;
    this.r.cheese.splat(s);
    if (e.vulnerable) this.kill(e, 'cheese');
  }
}
