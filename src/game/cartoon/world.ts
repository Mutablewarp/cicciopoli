/**
 * The BossWorld the boss modules talk to (api.ts): hazards and minions (moved, spun, aged and culled
 * here; collisions are the round's job), shake, sound, speech balloons, seeded rng and round time.
 */
import type Phaser from 'phaser';
import type { SfxName } from '../../contracts';
import { ARENA, type BossWorld, type HazardHandle, type HazardSpec, type MinionSpec, type Vec } from './api';
import { DEPTH } from './depths';

/** Hazards die this far outside the arena. */
const CULL = 160;

export class Hazard implements HazardHandle {
  alive = true;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age = 0;
  /** minions only: hit points left (null = a plain hazard) */
  hp: number | null;
  flashMs = 0;
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    k: number,
    readonly spec: HazardSpec,
    minion: MinionSpec | null,
  ) {
    this.x = spec.x;
    this.y = spec.y;
    this.vx = spec.vx ?? 0;
    this.vy = spec.vy ?? 0;
    this.hp = minion ? minion.hp : null;
    this.sprite = scene.add.sprite(spec.x, spec.y, spec.texture, spec.frame).setScale(1 / k).setDepth(minion ? DEPTH.minion : DEPTH.hazard);
    if (spec.anim && scene.anims.exists(spec.anim)) this.sprite.play(spec.anim);
  }

  get pink(): boolean {
    return this.spec.pink === true;
  }

  /** Hit shape for the round (circle r, or a w x h box centred on x, y). */
  get r(): number | undefined {
    return this.spec.w !== undefined && this.spec.h !== undefined ? undefined : (this.spec.r ?? 6);
  }
  get w(): number | undefined {
    return this.spec.w;
  }
  get h(): number | undefined {
    return this.spec.h;
  }

  destroy(): void {
    if (!this.alive) return;
    this.alive = false;
    this.sprite.destroy();
  }
}

export interface WorldHooks {
  shake(intensity: number, ms: number): void;
  sfx(name: SfxName): void;
  say(text: string, ms: number): void;
  /** a minion died (pop FX) */
  pop(at: Vec): void;
}

export class ArenaWorld implements BossWorld {
  readonly hazards: Hazard[] = [];
  readonly player = { x: ARENA.w * 0.2, y: ARENA.floorY - 16, onGround: true };
  timeMs = 0;

  constructor(
    readonly scene: Phaser.Scene,
    readonly k: number,
    private readonly random: () => number,
    private readonly calm: () => boolean,
    private readonly hooks: WorldHooks,
  ) {}

  get reducedMotion(): boolean {
    return this.calm();
  }

  rng(): number {
    return this.random();
  }

  spawnHazard(h: HazardSpec): HazardHandle {
    const hz = new Hazard(this.scene, this.k, h, null);
    this.hazards.push(hz);
    return hz;
  }

  spawnMinion(m: MinionSpec): HazardHandle {
    const hz = new Hazard(this.scene, this.k, m, m);
    this.hazards.push(hz);
    return hz;
  }

  shake(intensity: number, ms: number): void {
    this.hooks.shake(intensity, ms);
  }

  sfx(name: SfxName): void {
    this.hooks.sfx(name);
  }

  say(text: string, ms = 1800): void {
    this.hooks.say(text, ms);
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    for (const h of this.hazards) {
      if (!h.alive) continue;
      const s = h.spec;
      h.age += dtMs;
      h.vx += (s.ax ?? 0) * dt;
      h.vy += (s.ay ?? 0) * dt;
      h.x += h.vx * dt;
      h.y += h.vy * dt;
      s.update?.(h, dtMs);
      if (!h.alive) continue;
      const out = h.x < -CULL || h.x > ARENA.w + CULL || h.y < -CULL * 2 || h.y > ARENA.h + CULL;
      if ((s.lifeMs !== undefined && h.age >= s.lifeMs) || out) {
        h.destroy();
        continue;
      }
      h.sprite.setPosition(h.x, h.y);
      if (s.spin) h.sprite.angle += s.spin * dt;
      if (h.flashMs > 0) {
        h.flashMs -= dtMs;
        h.sprite.setTintFill(0xfff4d8);
        if (h.flashMs <= 0) h.sprite.clearTint();
      }
    }
    if (this.hazards.some((h) => !h.alive)) this.prune();
  }

  private prune(): void {
    for (let i = this.hazards.length - 1; i >= 0; i--) if (!this.hazards[i].alive) this.hazards.splice(i, 1);
  }

  /** Minions shots can hit. */
  minions(): Hazard[] {
    return this.hazards.filter((h) => h.alive && h.hp !== null);
  }

  /** A shot hit a minion: flash, and the pop + onDeath when its hp runs out. */
  damageMinion(h: Hazard, damage: number): void {
    if (!h.alive || h.hp === null) return;
    h.hp -= damage;
    h.flashMs = 60;
    if (h.hp > 0) return;
    this.kill(h);
  }

  /** Removes a hazard with a pop (a parried one, a dead minion); `death` runs a minion's onDeath. */
  kill(h: Hazard, death = true): void {
    if (!h.alive) return;
    this.hooks.pop({ x: h.x, y: h.y });
    if (death) (h.spec as Partial<MinionSpec>).onDeath?.();
    h.destroy();
  }

  /** Knockout sweep: every hazard pops (no onDeath: nothing new may spawn). */
  popAll(): void {
    for (const h of [...this.hazards]) this.kill(h, false);
    this.prune();
  }

  destroy(): void {
    for (const h of this.hazards) h.destroy();
    this.hazards.length = 0;
  }
}
