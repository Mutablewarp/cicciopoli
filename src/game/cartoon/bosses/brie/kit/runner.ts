/**
 * Phaser side of a BOSS-A boss: plays the pure Brain (timeline.ts) inside a round. It steps the attack
 * timeline, freezes each attack plan when its wind-up starts (floor marks, "!" burst, bright flash, sound),
 * spawns the planned hazards on time (their motion = the same pure paths the fairness tests use), fires
 * the cues, flashes on hits and hands every frame to the boss rig for the drawing.
 */
import type Phaser from 'phaser';
import type { BossRuntime, BossWorld, Vec } from '../../../api';
import type { SfxName } from '../../../../../contracts';
import { worldSprite } from '../../../draw/canvas';
import { enterKo, enterPhase, newTimeline, stepTimeline } from './timeline';
import type { AttackPlan, Brain, HazardPlan, Pose, Stage, StageEvent, Timeline } from './timeline';

export interface RigFrame<A extends string> {
  stage: Stage;
  attack: A | null;
  /** ms spent in the stage */
  t: number;
  phase: number;
  pose: Pose;
  /** ms since the round started (idle cycles) */
  clock: number;
  /** ms since the last player hit landed */
  hit: number;
  plan: AttackPlan | null;
}

export interface Rig<A extends string> {
  /** every sprite of the boss body (brightened on wind-ups and hits) */
  readonly parts: readonly Phaser.GameObjects.Sprite[];
  /** place and pose the boss for this frame */
  draw(f: RigFrame<A>): void;
  /** texture (and optional looping anim) of a hazard role */
  hazard(kind: string): { texture: string; anim?: string };
  destroy(): void;
}

export interface RunnerCfg<A extends string> {
  /** floor target texture and the "!" burst texture */
  mark: string;
  alert: string;
  /** height of the "!" above the feet at scale 1 */
  alertY(phase: number): number;
  telegraphSfx: SfxName;
  /** said when the phase changes (the core plays the phase sound and shake) */
  phaseLine: string;
  /** now and then on a wind-up */
  lines: Partial<Record<A, string>>;
  lineChance: number;
  depthMarks: number;
  depthAlert: number;
  /** bright flash at the start of a wind-up / on a hit, and the minimum gap between hit flashes */
  teleFlashMs: number;
  hitFlashMs: number;
  hitFlashGapMs: number;
  /** colour-matrix brightness of those flashes (1 = none) */
  teleBright: number;
  hitBright: number;
  /** pose easing toward the rest pose (time constant) */
  easeMs: number;
}

export function runBoss<A extends string>(world: BossWorld, brain: Brain<A>, rig: Rig<A>, cfg: RunnerCfg<A>): BossRuntime {
  const { scene, k } = world;
  let tl: Timeline<A> = newTimeline<A>();
  let clock = 0;
  /** when the current phase (its transformation included) began */
  let phaseAt = 0;
  let plan: AttackPlan | null = null;
  let queue: HazardPlan[] = [];
  let spawned = 0;
  let cued = 0;
  let pose: Pose = brain.rest(0, 0);
  let from: Pose = pose;
  let teleLeft = 0;
  let hitLeft = 0;
  let bright = 1;
  let lastHit = -1e6;
  const marks: Phaser.GameObjects.Sprite[] = [];
  const alert = worldSprite(scene, 0, 0, cfg.alert, k).setVisible(false).setDepth(cfg.depthAlert);

  const clearMarks = (): void => {
    for (const m of marks) m.destroy();
    marks.length = 0;
  };

  // brightness, not a white tint-fill: the ink lines stay dark so the boss keeps reading under steady fire.
  // WebGL only; the FX pass is switched on just while a flash lasts.
  const glow = rig.parts.flatMap((s) => {
    const fx = s.preFX;
    if (!fx) return [];
    const m = fx.addColorMatrix();
    fx.disable();
    return [{ fx, m }];
  });
  const setBright = (v: number): void => {
    if (v === bright) return;
    bright = v;
    for (const g of glow) {
      if (v === 1) {
        g.fx.disable();
      } else {
        g.fx.enable();
        g.m.brightness(v);
      }
    }
  };

  const spawn = (h: HazardPlan, age0: number): void => {
    let age = age0;
    const p = h.path(age);
    const look = rig.hazard(h.kind);
    let prev: Vec = p;
    const hd = world.spawnHazard({
      x: p.x,
      y: p.y,
      r: h.r,
      w: h.w,
      h: h.h,
      texture: look.texture,
      anim: look.anim,
      frame: h.frame,
      pink: h.pink,
      spin: h.spin,
      lifeMs: Math.max(1, h.lifeMs - age0),
      update(handle, dtMs): void {
        age += dtMs;
        const q = h.path(age);
        if (h.aim && Math.hypot(q.x - prev.x, q.y - prev.y) > 0.01) handle.sprite.setRotation(Math.atan2(q.y - prev.y, q.x - prev.x));
        prev = q;
        handle.x = q.x;
        handle.y = q.y;
        handle.vx = 0;
        handle.vy = 0;
      },
    });
    const ahead = h.path(age0 + 30);
    if (!h.aim && ahead.x > p.x + 0.01) hd.sprite.setFlipX(true);
  };

  const begin = (e: StageEvent<A>): void => {
    if (e.stage === 'telegraph' && e.attack) {
      plan = brain.plan(e.attack, { phase: tl.phase, playerX: world.player.x, from: pose, rng: () => world.rng() });
      queue = [...plan.hazards].sort((a, b) => a.atMs - b.atMs);
      spawned = 0;
      cued = 0;
      clearMarks();
      for (const m of plan.marks) marks.push(worldSprite(scene, m.x, m.y, cfg.mark, k).setDepth(cfg.depthMarks));
      world.sfx(plan.sfx ?? cfg.telegraphSfx);
      teleLeft = cfg.teleFlashMs;
      const line = cfg.lines[e.attack];
      if (line && world.rng() < cfg.lineChance) world.say(line, 1500);
    } else if (e.stage === 'recover') {
      clearMarks();
      const at = plan?.move ? brain.resume?.(tl.phase, pose) : null;
      if (at !== null && at !== undefined) phaseAt = clock - at;
    }
  };

  const fire = (): void => {
    if (tl.stage !== 'active' || !plan) return;
    for (; spawned < queue.length; spawned++) {
      const h = queue[spawned];
      if (!h || h.atMs > tl.t) break;
      spawn(h, tl.t - h.atMs);
    }
    for (; cued < plan.cues.length; cued++) {
      const c = plan.cues[cued];
      if (!c || c.atMs > tl.t) break;
      if (c.sfx) world.sfx(c.sfx);
      if (c.shake && !world.reducedMotion) world.shake(c.shake, 260);
    }
  };

  const place = (dt: number): void => {
    if (tl.stage === 'transform') pose = brain.transformPose(tl.t, from);
    else if (tl.stage === 'ko') pose = brain.koPose(tl.t, from);
    else if (tl.stage === 'active' && plan?.move) pose = plan.move(tl.t);
    else {
      const target = tl.stage === 'telegraph' && plan?.move ? plan.move(0) : brain.rest(tl.phase, clock - phaseAt);
      const a = 1 - Math.exp(-dt / cfg.easeMs);
      pose = { x: pose.x + (target.x - pose.x) * a, y: pose.y + (target.y - pose.y) * a, s: pose.s + (target.s - pose.s) * a, f: target.f };
    }
  };

  const showAlert = (): void => {
    if (tl.stage === 'active' && plan?.marksMs !== undefined && tl.t >= plan.marksMs) clearMarks();
    const on = tl.stage === 'telegraph';
    alert.setVisible(on);
    if (!on) return;
    const pop = Math.min(1, tl.t / 140);
    const bob = Math.sin(tl.t / 70) * 0.08;
    alert.setPosition(pose.x, pose.y - cfg.alertY(tl.phase) * pose.s).setScale(((0.6 + 0.4 * pop) * (1 + bob)) / k);
    for (const m of marks) m.setAlpha(0.55 + 0.45 * Math.abs(Math.sin(tl.t / 120)));
  };

  const pose$ = (): void => rig.draw({ stage: tl.stage, attack: tl.attack, t: tl.t, phase: tl.phase, pose, clock, hit: clock - lastHit, plan });
  // the core does not tick the boss under the title card: pose it once now
  pose$();

  return {
    hurtBoxes: () => (tl.stage === 'ko' ? [] : brain.boxes(pose, tl.phase).hurt),
    bodyBoxes: () => (tl.stage === 'ko' ? [] : brain.boxes(pose, tl.phase).body),
    update(dt: number): void {
      clock += dt;
      const stepped = stepTimeline(tl, brain, dt, () => world.rng());
      tl = stepped.tl;
      for (const e of stepped.events) begin(e);
      place(dt);
      fire();
      pose$();
      teleLeft -= dt;
      hitLeft -= dt;
      setBright(teleLeft > 0 ? cfg.teleBright : hitLeft > 0 ? cfg.hitBright : 1);
      showAlert();
    },
    onPhase(phase: number): void {
      if (phase === tl.phase || tl.stage === 'ko') return;
      from = pose;
      phaseAt = clock;
      tl = enterPhase(tl, phase);
      plan = null;
      clearMarks();
      world.say(cfg.phaseLine, 1800);
    },
    onHit(): void {
      if (clock - lastHit < cfg.hitFlashGapMs) return;
      lastHit = clock;
      hitLeft = cfg.hitFlashMs;
    },
    onKnockout(): void {
      if (tl.stage === 'ko') return;
      from = pose;
      tl = enterKo(tl);
      plan = null;
      clearMarks();
      teleLeft = 0;
      hitLeft = 0;
      setBright(1);
      alert.setVisible(false);
    },
    get done(): boolean {
      return tl.stage === 'ko' && tl.t >= brain.koMs;
    },
    destroy(): void {
      clearMarks();
      alert.destroy();
      rig.destroy();
    },
  };
}

/** A k-scaled sprite whose origin is the point (ox, oy) of its w x h frame (world units). */
export function part(scene: Phaser.Scene, key: string, k: number, ox: number, oy: number, w: number, h: number): Phaser.GameObjects.Sprite {
  return scene.add.sprite(0, 0, key, 0).setOrigin(ox / w, oy / h).setScale(1 / k);
}

/** Feet at (x, y), scale (sx, sy), turned by rot around the local pivot (px, py) instead of the feet. */
export function placeAt(
  o: Phaser.GameObjects.Components.Transform,
  x: number,
  y: number,
  sx: number,
  sy: number,
  rot: number,
  px = 0,
  py = 0,
): void {
  const ax = px * sx;
  const ay = py * sy;
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  o.setPosition(x + ax - (ax * c - ay * s), y + ay - (ax * s + ay * c));
  o.setScale(sx, sy);
  o.setRotation(rot);
}
