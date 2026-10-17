/**
 * One playthrough of a level: builds every system from the level + theme data and runs
 * the per-frame / per-physics-step loop. Contacts live in interactions.ts, end-of-life
 * flows (pit, death, victory) in flow.ts.
 */
import type Phaser from 'phaser';
import type { BannerTone, CiccioFrameAnchors, LevelId, PowerState, Services } from '../contracts';
import { TILE } from '../art/keys';
import { HERO } from '../config/tuning';
import { Blocks } from './blocks';
import { CameraRig, type FollowTarget } from './camera';
import { Checkpoints } from './checkpoints';
import { CheeseGun } from './combat/cheese';
import { Club } from './combat/club';
import { Enemies } from './enemies';
import type { EnemyHost } from './enemies/Enemy';
import { Fx } from './fx';
import { ensureFxArt } from './fxArt';
import { Goal } from './goal';
import { defaultControls, HudSync } from './hud';
import { Pickups } from './items';
import { Lava } from './lava';
import { parseLevel } from './levels/parse';
import type { LevelDef, ParsedLevel } from './levels/types';
import { Parallax } from './parallax';
import { FlightFx } from './player/flightFx';
import { NO_INPUT } from './player/motor';
import { Player } from './player/Player';
import { PlayerView } from './player/PlayerView';
import { createRun, type RunState } from './rules';
import type { ThemeConfig } from './themes';
import { World } from './world';

export type Phase = 'play' | 'respawning' | 'won' | 'over';

const NO_POWERS: PowerState = { brie: false, goat: false, thai: false, wings: false };

export class LevelRun {
  readonly level: ParsedLevel;
  readonly world: World;
  readonly fx: Fx;
  readonly rig: CameraRig;
  readonly parallax: Parallax;
  /** level 2 hazard visuals (null on pit levels) */
  readonly lava: Lava | null;
  readonly flightFx: FlightFx;
  readonly player: Player;
  readonly view: PlayerView;
  readonly pickups: Pickups;
  readonly blocks: Blocks;
  readonly enemies: Enemies;
  readonly cheese: CheeseGun;
  readonly club: Club;
  readonly checkpoints: Checkpoints;
  readonly goal: Goal;
  readonly hud: HudSync;
  readonly run: RunState;
  readonly host: EnemyHost;
  readonly spawnX: number;
  phase: Phase = 'play';
  timeMs = 0;

  constructor(
    readonly scene: Phaser.Scene,
    readonly svc: Services,
    readonly levelId: LevelId,
    def: LevelDef,
    readonly theme: ThemeConfig,
    anchors: readonly CiccioFrameAnchors[],
  ) {
    this.level = parseLevel(def);
    ensureFxArt(scene);
    this.run = createRun(levelId);
    this.fx = new Fx(scene);
    this.world = new World(scene, this.level, theme);
    const groundDepth = theme.hazard === 'lava' ? (theme.lavaTop ?? 3 * TILE) : 3 * TILE;
    this.rig = new CameraRig(scene.cameras.main, this.world.width, this.world.height, groundDepth);
    this.rig.preferBottom = theme.hazard === 'lava';
    const groundY = this.world.feetY(this.level.spawn.row);
    // backgrounds stand on the main ground line: 3 rows above the bottom (row 13 of 16)
    this.parallax = new Parallax(scene, theme, this.world.height - 3 * TILE, 0, this.world.width);
    const w = this.world;
    this.lava = theme.hazard === 'lava' ? new Lava(scene, w.width, w.height, w.height - (theme.lavaTop ?? 3 * TILE)) : null;
    this.spawnX = this.world.cellCenterX(this.level.spawn.col);
    this.pickups = new Pickups(scene, this.fx);
    this.blocks = new Blocks(scene, theme, this.fx, this.level.entities);
    for (const e of this.level.entities) {
      if (e.spec.type === 'pickup') this.pickups.spawn(e.spec.kind, this.world.cellCenterX(e.col), e.row * TILE + TILE / 2);
    }
    this.enemies = new Enemies(scene, this.level.entities);
    this.checkpoints = new Checkpoints(scene, theme, this.level.entities, { x: this.spawnX, feetY: groundY });
    this.goal = new Goal(scene, theme, this.level.goal, this.fx);
    this.player = new Player(scene, this.spawnX, groundY);
    this.view = new PlayerView(scene, this.fx, anchors);
    this.cheese = new CheeseGun(scene, this.fx);
    this.club = new Club(scene, this.fx);
    this.flightFx = new FlightFx(scene, svc.audio);
    this.hud = new HudSync(svc.ui, (p) => defaultControls(levelId, p));
    this.host = {
      world: this.world,
      fx: this.fx,
      audio: svc.audio,
      heroX: () => this.player.x,
      heroY: () => this.player.centerY,
      view: () => this.rig.view(),
    };
    this.applyViewport();
    this.view.update(this.player, this.run.powers, 0);
    this.parallax.update(this.rig.view(), 0);
    this.hud.reset(this.run, 0, 0);
  }

  get progress(): number {
    return (this.player.x - this.spawnX) / Math.max(1, this.goal.x - this.spawnX);
  }

  followTarget(): FollowTarget {
    const p = this.player;
    return { x: p.x, bottom: p.bottom, top: p.top, facing: p.facing, onGround: p.onGround, flying: p.mode.id === 'flight' && !p.onGround };
  }

  /** Shows a banner; the camera keeps Ciccio's head clear of it while it is up. */
  banner(text: string, opts: { ms: number; tone: BannerTone; sub?: string }): void {
    this.svc.ui.banner(text, opts);
    this.rig.coverTop(opts.ms);
  }

  /** Zoom / framing after a resize or rotation; renders correctly even while paused. */
  applyViewport(): void {
    const scale = this.scene.scale;
    this.rig.applyViewport(this.svc.viewport, scale.width, scale.height);
    this.parallax.setReferenceTop(this.rig.restTop);
    this.rig.snapTo(this.followTarget()); // re-centre at once: the view size just changed
    this.parallax.update(this.rig.view(), 0);
  }

  /** Fixed physics step (60 Hz): input -> motor -> body velocity. */
  onStep(dt: number): void {
    const input = this.svc.input;
    const jumpPressed = input.consume('jump');
    const inp = this.phase === 'play'
      ? { axis: input.axisX, jumpPressed, jumpHeld: input.jumpHeld, downHeld: input.downHeld }
      : NO_INPUT;
    const r = this.player.step(dt, inp);
    if (r.jumped) {
      this.svc.audio.sfx(this.player.mode.id === 'flight' ? 'flap' : 'jump');
      this.view.onJump();
    }
    if (r.landed) {
      this.view.onLand(this.player, r.landSpeed);
      if (r.landSpeed > 220) this.svc.audio.sfx('land');
    }
  }

  /** Per-frame update of every system (contacts and flows run from the scene). */
  update(dtMs: number, timeMs: number): void {
    const dt = dtMs / 1000;
    if (this.phase === 'play') this.timeMs += dtMs;
    this.player.tick(dtMs);
    this.cheese.update(dtMs);
    this.enemies.update(dtMs, this.host);
    this.pickups.update(timeMs);
    const cutscene = this.phase === 'won' || this.phase === 'over';
    this.view.update(this.player, cutscene ? NO_POWERS : this.run.powers, dtMs);
    if (this.phase !== 'respawning') this.rig.update(this.followTarget(), dt);
    this.parallax.update(this.rig.view(), dt);
    this.lava?.update(this.rig.view(), dtMs);
    this.flightFx.update(this.player, this.view, this.run.powers.wings && !cutscene, dtMs);
    this.hud.push(this.run, this.timeMs, this.progress, dtMs);
  }

  /** Pit / lava test (see ThemeConfig.hazardLine). */
  fellInPit(): boolean {
    if (this.phase !== 'play') return false;
    const line = this.theme.hazardLine;
    if (line !== undefined) return this.player.bottom > this.world.height - line;
    return this.player.top > this.world.height + HERO.pitMargin;
  }
}
