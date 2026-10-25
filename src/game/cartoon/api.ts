/**
 * Level 8 · CICCIO'S GOLDEN TICKET — contract between the CORE engine (src/game/cartoon/core/**, the
 * scene, the player, the weapons) and the art / boss modules. OWNER: integrator (read-only for lanes).
 *
 * Look: a 1930s rubber-hose cartoon (thick ink outlines, pie-cut eyes, white gloves, film grain, sepia
 * vignette, warm watercolour backgrounds), NOT pixel art: everything is drawn in code with canvas 2D
 * paths at runtime, at TEXTURE SCALE k (canvas px per world unit, k = clamp(zoom * dpr, 1, KMAX)), and
 * the textures use LINEAR filtering (texture.setFilter(Phaser.Textures.FilterMode.LINEAR)).
 * World units: the arena is ARENA.w x ARENA.h (16:9); y grows down; the floor line is ARENA.floorY.
 */
import type Phaser from 'phaser';
import type { CartoonBossId, MusicName, SfxName } from '../../contracts';

export const ARENA = { w: 640, h: 360, floorY: 318 } as const;
/** Highest texture scale (memory cap: an arena layer at k = 3 is 1920x1080). */
export const KMAX = 3;

export interface Vec {
  x: number;
  y: number;
}
/** Axis-aligned box in world units (x, y = top-left). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ hero art (HERO lane) */

/**
 * The hero = Ciccio after the owner's drawing ref/level8_ciccio_hero.png: black slick hair, round black
 * sunglasses, big friendly face, navy three-piece suit, white shirt, navy polka-dot tie, white pocket
 * square, white four-finger gloves, big glossy black shoes, rubber-hose limbs. Body ~44 world units
 * tall (frame HERO_FRAME), feet on the frame's bottom-centre, facing RIGHT (the core flips it).
 * Animation keys the HERO lane registers (frames / fps its own choice, loops unless noted):
 */
export const HERO_FRAME = { w: 64, h: 64, footY: 62 } as const;
export const HERO_ANIMS = {
  intro: 'ct-hero-intro', //   once: tips the hat / finger-guns at the camera (round start)
  idle: 'ct-hero-idle',
  run: 'ct-hero-run',
  jump: 'ct-hero-jump', //     once: up, tuck, fall (ball-like spin is welcome)
  fall: 'ct-hero-fall',
  shoot: 'ct-hero-shoot', //   standing, gloved finger-gun forward
  shootUp: 'ct-hero-shoot-up',
  runShoot: 'ct-hero-run-shoot',
  dash: 'ct-hero-dash', //     once: horizontal smear
  hurt: 'ct-hero-hurt', //     once: cartoon flinch, stars
  parry: 'ct-hero-parry', //   once: mid-air spin with a pink flash
  super: 'ct-hero-super', //   once: points at the sky (PIOGGIA DI PATATINE)
  victory: 'ct-hero-victory', // once: little dance
  ko: 'ct-hero-ko', //         once: dizzy, flattened (defeat)
} as const;

/** Player shots / FX texture keys the HERO lane draws (anims: key + '-anim' when animated). */
export const FX = {
  provola: 'ct-provola', //       PROVOLA GOAT cheese rectangle shot (golden batter, melty), ~14x8
  provolaEx: 'ct-provola-ex', //  EX: a big cheese brick, ~40x24
  meatball: 'ct-meatball', //     lobbed meatball bomb with a lit fuse, ~12x12
  meatballEx: 'ct-meatball-ex', // EX: giant meatball, ~32x32
  blast: 'ct-blast', //           cartoon explosion (anim, once), ~56x56
  nugget: 'ct-nugget', //         homing nugget with a little smile and speed lines, ~12x10
  nuggetEx: 'ct-nugget-ex', //    EX: nugget swarm burst (anim)
  fry: 'ct-fry', //               one falling French fry for the super, ~6x22
  friesCloud: 'ct-fries-cloud', // the cloud / giant fries box the super pours from, ~160x60
  muzzle: 'ct-muzzle', //         anim once: finger-gun spark
  hit: 'ct-hit', //               anim once: shot impact spark
  parryFlash: 'ct-parry-flash', // anim once: pink star
  dust: 'ct-dust', //             anim once: landing / dash dust puff
  card: 'ct-card', //             super meter card (frame 0 empty, 1 full) — the UI may draw its own
} as const;

/* ------------------------------------------------------------------ boss modules (BOSS lanes) */

/** Something that hurts the player (a projectile, a hazard, a minion body). */
export interface HazardSpec {
  x: number;
  y: number;
  /** px / s */
  vx?: number;
  vy?: number;
  /** px / s² (gravity etc.) */
  ax?: number;
  ay?: number;
  /** hit circle radius (world units); or a box via w / h */
  r?: number;
  w?: number;
  h?: number;
  texture: string;
  frame?: number;
  anim?: string;
  /** degrees / s */
  spin?: number;
  /** pink = parryable (the player jumps and presses SALTA again on it: it pops and fills a card) */
  pink?: boolean;
  /** auto-destroy after this long (ms); hazards also die when far outside the arena */
  lifeMs?: number;
  /** extra per-frame behaviour (homing, sine wave, bounce …) */
  update?(h: HazardHandle, dtMs: number): void;
}

export interface HazardHandle {
  readonly alive: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  readonly sprite: Phaser.GameObjects.Sprite;
  destroy(): void;
}

/** A shootable minion (has hp; touching it hurts unless it is a pure obstacle). */
export interface MinionSpec extends HazardSpec {
  hp: number;
  onDeath?(): void;
}

/** What a boss runtime may use (provided by the CORE engine). */
export interface BossWorld {
  readonly scene: Phaser.Scene;
  /** texture scale in use (canvas px per world unit) */
  readonly k: number;
  readonly player: { readonly x: number; readonly y: number; readonly onGround: boolean };
  /** seeded 0..1 */
  rng(): number;
  /** ms since the round started (frozen while paused) */
  readonly timeMs: number;
  /** reduced motion is on: no big shakes, fewer particles */
  readonly reducedMotion: boolean;
  spawnHazard(h: HazardSpec): HazardHandle;
  spawnMinion(m: MinionSpec): HazardHandle;
  shake(intensity: number, ms: number): void;
  sfx(name: SfxName): void;
  /** a short speech balloon line from the boss (Italian), optional flavour */
  say(text: string, ms?: number): void;
}

/** Live boss inside a round. All boxes in world units. */
export interface BossRuntime {
  /** where player shots hurt the boss */
  hurtBoxes(): readonly Box[];
  /** where touching the boss hurts the player */
  bodyBoxes(): readonly Box[];
  /** called every frame while the round runs */
  update(dtMs: number): void;
  /** phase 0 at start; 1, 2 … when hp crosses BossDef.phases */
  onPhase(phase: number): void;
  /** a player hit landed (flash, wobble) */
  onHit(damage: number, at: Vec): void;
  /** hp reached 0: start the knockout animation (attacks stop) */
  onKnockout(): void;
  /** the knockout animation has finished */
  readonly done: boolean;
  destroy(): void;
}

/** One boss of the rush (registered in src/game/cartoon/bosses/index.ts by its lane). */
export interface BossDef {
  id: CartoonBossId;
  /** "MONSIEUR BRIE" */
  name: string;
  /** round title card line: "Monsieur Brie vuole il suo pane!" */
  intro: string;
  /** map card tagline */
  tagline: string;
  music: MusicName;
  /** total hp (provola shot = 4, meatball = 9 splash, nugget = 2.6; tune to ~60-90 s per boss) */
  hp: number;
  /** hp fractions where the next phase starts, descending, e.g. [0.66, 0.33] */
  phases: readonly number[];
  /** draw and register every texture / anim of this boss AND its arena at scale k */
  load(scene: Phaser.Scene, k: number): void;
  /** add the arena (background layers, foreground props) to the scene; depth < 0 behind the action */
  buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[];
  create(world: BossWorld): BossRuntime;
  /** remove its textures again (memory) */
  unload(scene: Phaser.Scene): void;
}
