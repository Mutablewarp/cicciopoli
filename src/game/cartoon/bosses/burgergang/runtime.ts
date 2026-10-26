/**
 * BossRuntime of IL BOSS DELLA BURGER GANG: plays the pure rounds of plan.ts (poses, telegraph blinks,
 * sounds, floor marks, hazards and gang minions) and the two transformations: the whistle that calls the
 * gang (phase 2) and the gulp + burp that makes him a giant (phase 3, the arena shakes).
 */
import type Phaser from 'phaser';
import { ARENA, type BossRuntime, type BossWorld, type HazardHandle, type HazardSpec } from '../../api';
import { worldSprite } from '../../draw/canvas';
import { ANIM, TEX } from './art/props';
import { ATK, BG, LINES, MOTION, SFX } from './config';
import { FIRST, type Mark, type Round, type RoundKind, type Shot, pickRound, planRound } from './plan';
import type { RigPose } from './poses';
import { BossRig } from './rig';

const F = ARENA.floorY;

interface Live {
  round: Round;
  t: number;
  /** undefined = not yet, null = skipped (its can was parried) */
  shots: (HazardHandle | null | undefined)[];
  /** a can that burst on time (its burst may spawn) */
  popped: boolean[];
  cues: boolean[];
  marks: (Phaser.GameObjects.Sprite | null | undefined)[];
  checked: boolean[];
}
type Mode = 'fight' | 'whistle' | 'grow' | 'ko';

function look(s: Shot): Pick<HazardSpec, 'texture' | 'frame' | 'anim' | 'spin'> {
  switch (s.kind) {
    case 'bubble': return { texture: TEX.bubble, frame: s.pink ? 2 : 0, anim: s.pink ? ANIM.bubblePink : ANIM.bubble };
    case 'shades': return { texture: TEX.shades, spin: ATK.shades.spin };
    case 'can': return { texture: TEX.can, frame: s.pink ? 1 : 0 };
    case 'fizz': return (s.h ?? 0) >= ATK.geyser.h ? { texture: TEX.geyser, anim: ANIM.geyser } : { texture: TEX.burst, anim: ANIM.burst };
    case 'drop': return { texture: TEX.drop };
    case 'wave': return { texture: TEX.wave, anim: ANIM.wave };
    case 'brick': return { texture: TEX.brick, spin: ATK.stomp.brickSpin };
    case 'burger': return { texture: TEX.burger, anim: ANIM.burger };
    case 'fries': return { texture: TEX.fries, anim: ANIM.fries };
  }
}

function easeOutBack(u: number): number {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (u - 1) ** 3 + c1 * (u - 1) ** 2;
}

export function createRuntime(world: BossWorld, kb: number): BossRuntime {
  const k = world.k;
  const shake = (i: number, ms: number): void => world.shake(world.reducedMotion ? MOTION.calmShake : i, ms);
  const rig = new BossRig(world.scene, k, kb, () => shake(MOTION.koShake, MOTION.koShakeMs));
  let phase = 0;
  let mode: Mode = 'fight';
  let modeMs = 0;
  let grew = false;
  let wait: number = BG.startDelayMs;
  let last: RoundKind | null = null;
  let force: RoundKind | null = FIRST[0] ?? null;
  let live: Live | null = null;
  let greeted = false;

  const abort = (): void => {
    for (const m of live?.marks ?? []) m?.destroy();
    live = null;
  };

  const start = (kind: RoundKind): void => {
    const round = planRound(kind, { bx: rig.baseX, s: rig.s, playerX: world.player.x, rng: () => world.rng() });
    const none = round.shots.map(() => false);
    live = { round, t: 0, shots: round.shots.map(() => undefined), popped: [...none], cues: round.cues.map(() => false), marks: round.marks.map(() => undefined), checked: [...none] };
    last = kind;
  };

  const spawn = (l: Live, i: number, s: Shot): void => {
    if (s.parent !== undefined) {
      const can = l.shots[s.parent];
      if (can?.alive) {
        l.popped[s.parent] = true;
        can.destroy();
      }
      if (!l.popped[s.parent]) {
        l.shots[i] = null;
        return;
      }
    }
    let age = l.t - s.at;
    const p = s.path(age);
    let last = p;
    const spec: HazardSpec = {
      x: p.x,
      y: p.y,
      r: s.r,
      w: s.w,
      h: s.h,
      pink: s.pink,
      lifeMs: s.lifeMs - age,
      ...look(s),
      update: (h, dt) => {
        age += dt;
        const q = s.path(age);
        // the path owns the position; the velocity is reported for whoever reads it (QA bot, FX)
        if (dt > 0) {
          h.vx = ((q.x - last.x) * 1000) / dt;
          h.vy = ((q.y - last.y) * 1000) / dt;
        }
        last = q;
        h.x = q.x;
        h.y = q.y;
        if (s.kind === 'can') h.sprite.setAngle(age < ATK.cans.flightMs ? age * MOTION.canSpinDegMs : Math.sin(age / MOTION.canRattleMs) * MOTION.canRattleDeg);
      },
    };
    l.shots[i] = s.hp !== undefined ? world.spawnMinion({ ...spec, hp: s.hp }) : world.spawnHazard(spec);
    if (s.sfx) world.sfx(s.sfx);
  };

  const mark = (l: Live, i: number, m: Mark): void => {
    const sprite = l.marks[i];
    const on = l.t >= m.at && l.t < m.at + m.ms;
    if (sprite === undefined && on) {
      const sp = worldSprite(world.scene, m.x, F + 1, TEX.mark, k, 2).setDepth(-1);
      if (m.kind === 'puddle') sp.play(ANIM.puddle);
      l.marks[i] = sp;
    } else if (sprite && !on) {
      sprite.destroy();
      l.marks[i] = null;
    } else if (sprite) {
      const u = m.kind === 'shadow' ? (l.t - m.at) / m.ms : Math.min(1, (l.t - m.at) / MOTION.markGrowMs);
      sprite.setScale((0.35 + 0.65 * u) / k, 1 / k);
    }
  };

  const step = (l: Live, dt: number): RigPose => {
    l.t += dt;
    const { cues, shots, marks } = l.round;
    let pose: RigPose = 'idle';
    let poseAt = -1;
    cues.forEach((c, i) => {
      if (l.t < c.at) return;
      if (!l.cues[i]) {
        l.cues[i] = true;
        if (c.sfx) world.sfx(c.sfx);
        if (c.flash) rig.telegraph();
        if (c.shake) shake(ATK.stomp.shake, ATK.stomp.shakeMs);
      }
      if (l.t < c.at + c.ms && c.at >= poseAt) {
        pose = c.pose;
        poseAt = c.at;
      }
    });
    marks.forEach((m, i) => mark(l, i, m));
    shots.forEach((s, i) => {
      if (l.shots[i] === undefined && l.t >= s.at) spawn(l, i, s);
      const h = l.shots[i];
      if (s.kind === 'shades' && h && !l.checked[i] && l.t >= s.at + s.lifeMs * 0.9) {
        l.checked[i] = true;
        if (!h.alive) world.say(LINES.shadesLost);
      }
    });
    if (l.t >= l.round.durationMs) {
      abort();
      wait = BG.restMs[phase] ?? BG.afterPhaseMs;
    }
    return pose;
  };

  const transform = (dt: number): void => {
    modeMs += dt;
    if (mode === 'whistle') {
      rig.setPose('whistle');
      if (modeMs >= BG.whistleMs) mode = 'fight';
      return;
    }
    const burp = BG.gulpMs * BG.burpAt;
    rig.setPose(modeMs < burp ? 'gulp' : 'roar');
    if (modeMs >= burp && !grew) {
      grew = true;
      world.say(LINES.giant);
      world.sfx(SFX.burp);
      world.sfx(SFX.grow);
      shake(MOTION.growShake, BG.growMs);
    }
    if (grew) {
      const u = Math.min(1, (modeMs - burp) / BG.growMs);
      rig.s = 1 + (BG.giant - 1) * easeOutBack(u);
      rig.baseX = BG.bx + (BG.giantBx - BG.bx) * u;
    }
    if (modeMs >= burp + BG.growMs + BG.afterPhaseMs) mode = 'fight';
  };

  return {
    hurtBoxes: () => rig.hurtBoxes(),
    bodyBoxes: () => rig.bodyBoxes(),
    update(dt: number): void {
      if (!greeted) {
        greeted = true;
        world.say(LINES.start);
      }
      if (mode === 'whistle' || mode === 'grow') transform(dt);
      else if (mode === 'fight') {
        if (live) rig.setPose(step(live, dt));
        else {
          rig.setPose('idle');
          wait -= dt;
          if (wait <= 0) {
            start(force ?? pickRound(phase, last, () => world.rng()));
            force = null;
          }
        }
      }
      rig.update(dt);
    },
    onPhase(p: number): void {
      if (mode === 'ko') return;
      phase = Math.min(p, FIRST.length - 1);
      abort();
      force = FIRST[phase] ?? null;
      wait = BG.afterPhaseMs;
      modeMs = 0;
      mode = phase === 1 ? 'whistle' : 'grow';
      if (mode === 'whistle') world.say(LINES.gang);
    },
    onHit(): void {
      rig.hit();
    },
    onKnockout(): void {
      if (mode === 'ko') return;
      mode = 'ko';
      abort();
      rig.startKo();
      world.say(LINES.ko);
    },
    get done(): boolean {
      return rig.koDone;
    },
    destroy(): void {
      abort();
      rig.destroy();
    },
  };
}
