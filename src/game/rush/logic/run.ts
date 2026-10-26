/**
 * RushRun: one 90 s run of CICCIO'S RUSH as a pure, deterministic state machine. The scene calls
 * step(dtMs, input) on every frame it is not paused (no step = time frozen), draws `snapshot`
 * and reacts to the returned events (sfx, banners, particles). A new run = a new RushRun.
 */
import { RUSH_ZONES } from '../../../art/rush/keys';
import type { HudState } from '../../../contracts';
import { RUSH_BOOSTER, RUSH_DELIVERY, RUSH_FAIR, RUSH_POWERS, RUSH_ROAD, RUSH_RUN, RUSH_SCORE, RUSH_TRAILS, RUSH_TRUCK } from '../../../config/rush';
import { collide, markNearMisses } from './collide';
import { isTraffic } from './entity';
import { POWER_PICKUP } from './powerups';
import { RunState, zoneIndexAt } from './state';
import { RUSH_TEXT, ZONE_TEXT } from './strings';
import type { TrafficManager } from './traffic';
import type { RadarMark, RushEvent, RushInput, RushOptions, RushRunSummary, RushSnapshot } from './types';
import { CHANGE_CELLS, cellOf } from './validator';

type Emit = (e: RushEvent) => void;

export class RushRun {
  private readonly s: RunState;

  constructor(readonly options: RushOptions) {
    this.s = new RunState(options);
  }

  /** The road and its validator data (debug autopilot / oracle bot). */
  get traffic(): TrafficManager {
    return this.s.traffic;
  }

  /** Advances the run; returns what happened during this step, in order. */
  step(dtMs: number, input: RushInput): RushEvent[] {
    const s = this.s;
    const events: RushEvent[] = [];
    if (s.phase === 'over' || !(dtMs > 0)) return events;
    const emit: Emit = (e) => events.push(e);
    const left = RUSH_RUN.durationMs - s.timeMs;
    const dt = Math.min(dtMs, RUSH_RUN.maxStepMs, left);
    s.timeMs = dt === left ? RUSH_RUN.durationMs : s.timeMs + dt;
    this.zones(emit);
    this.hints(emit);
    if (input.laneDir !== 0) {
      const result = s.lanes.press(input.laneDir);
      if (result !== 'ignored') emit({ type: 'lane', dir: input.laneDir, result });
      if (result === 'start') markNearMisses(s);
    }
    s.braking = input.brake;
    s.updateSpeed(dt);
    s.d += (s.speed * dt) / 1000;
    s.invulnMs = Math.max(0, s.invulnMs - dt);
    s.updateRecovery(dt);
    s.slipMs = Math.max(0, s.slipMs - dt);
    s.cleanMs += dt;
    if (s.lanes.update(dt) && s.lanes.changing) {
      emit({ type: 'lane', dir: s.lanes.lean, result: 'start' });
      markNearMisses(s);
    }
    s.powers.update(dt, emit);
    if (s.booster.update(dt, s.deliveries.zoneOpen)) this.land(emit);
    s.traffic.plan(s.d, { zoneAt: (d) => s.zoneAt(d), sprint: s.powers.sprint });
    s.traffic.update(s.d, s.speed, emit);
    this.pickups();
    s.deliveries.update(dt, {
      timeMs: s.timeMs,
      d: s.d,
      base: s.base,
      truckX: s.lanes.x,
      braking: s.braking,
      flying: s.booster.flying,
      traffic: s.traffic,
      score: s.score,
      emit,
    });
    collide(s, emit);
    s.score.fever.update(dt, s.score.streak, emit);
    if (s.hearts <= 0) this.end('crash', emit);
    else if (s.timeMs >= RUSH_RUN.durationMs) this.end('time', emit);
    return events;
  }

  private zones(emit: Emit): void {
    const s = this.s;
    const z = zoneIndexAt(s.timeMs);
    if (z === s.zoneIndex) return;
    if (s.zoneIndex >= 0) this.cleanBonus(s.zoneIndex, emit);
    s.zoneIndex = z;
    const zone = RUSH_ZONES[z];
    emit({ type: 'zoneChange', zone, index: z, title: ZONE_TEXT[zone].name, sub: ZONE_TEXT[zone].sub });
  }

  private cleanBonus(index: number, emit: Emit): void {
    if (this.s.zoneHit[index]) return;
    this.s.score.add('zones', RUSH_SCORE.cleanZone);
    emit({ type: 'zoneClean', zone: RUSH_ZONES[index], points: RUSH_SCORE.cleanZone, title: RUSH_TEXT.cleanZone });
  }

  private hints(emit: Emit): void {
    const s = this.s;
    const at = RUSH_RUN.hintMs[s.hintIndex];
    if (!s.options.hints || at === undefined || s.timeMs < at) return;
    emit({ type: 'hint', index: s.hintIndex, text: RUSH_TEXT.hints[s.hintIndex] });
    s.hintIndex++;
  }

  /** Power crates, fries trays and trails, the PROPULSORE crate: just above the view on safe ground. */
  private pickups(): void {
    const s = this.s;
    const t = s.timeMs;
    const meetD = s.d + RUSH_ROAD.spawnAheadPx + RUSH_FAIR.cellPx;
    const power = s.schedule.powerDue(t, s.powers);
    if (power) {
      const lane = s.traffic.pickupLane(s.d, meetD, 0, s.pickRng);
      if (lane !== null) s.traffic.addPickup(POWER_PICKUP[power], lane, meetD);
      s.schedule.powerDone(t, lane !== null);
    }
    const quiet = !s.booster.flying && !s.deliveries.zoneSoon(t, RUSH_TRAILS.zoneQuietMs);
    const truck = { lane: s.lanes.target, cell: cellOf(s.d) + (s.lanes.changing ? CHANGE_CELLS : 0) };
    s.trails.update(t, s.d, meetD, truck, s.traffic, quiet);
    if (s.schedule.friesDue(t) && !s.trails.busy(s.d)) {
      const span = (RUSH_POWERS.friesLine - 1) * RUSH_POWERS.friesGapPx;
      const lane = s.traffic.pickupLane(s.d, meetD, span, s.pickRng);
      if (lane !== null) for (let i = 0; i < RUSH_POWERS.friesLine; i++) s.traffic.addPickup('fries', lane, meetD + i * RUSH_POWERS.friesGapPx);
      s.schedule.friesDone(t, lane !== null);
    }
    if (s.zoneIndex === RUSH_ZONES.length - 1 && s.booster.wantsCrate(t, s.cleanMs)) {
      const lane = s.traffic.pickupLane(s.d, meetD, 0, s.pickRng);
      if (lane !== null) {
        s.traffic.addPickup('booster', lane, meetD);
        s.booster.placed = true;
      }
    }
  }

  /** Safe landing: the road ahead is cleared (new traffic comes in from the top), short invulnerability. */
  private land(emit: Emit): void {
    const s = this.s;
    const B = RUSH_BOOSTER;
    const cleared = s.traffic.dropWhere(
      (e) => isTraffic(e.kind) && e.relAt(s.d) >= -B.landClearBehindPx,
      'cleared',
      emit,
    );
    s.traffic.dropWhere((e) => e.kind === 'airNugget', 'cleared', emit);
    s.traffic.reopen(s.d);
    s.invulnMs = Math.max(s.invulnMs, B.landInvulnMs);
    emit({ type: 'flightEnd', cleared });
  }

  private end(reason: 'time' | 'crash', emit: Emit): void {
    const s = this.s;
    if (reason === 'time') this.cleanBonus(s.zoneIndex, emit);
    s.phase = 'over';
    s.endReason = reason;
    const completed = s.deliveries.delivered === RUSH_DELIVERY.count;
    if (reason === 'time' && completed) emit({ type: 'finale', title: RUSH_TEXT.roadcoaster, lines: RUSH_TEXT.card });
    emit({ type: 'end', reason, completed, title: completed ? RUSH_TEXT.complete : RUSH_TEXT.over });
  }

  /** What the renderer draws now (a fresh read-only view per call). */
  get snapshot(): RushSnapshot {
    const s = this.s;
    const order = s.deliveries.current;
    return {
      phase: s.phase,
      timeMs: s.timeMs,
      timeLeftMs: RUSH_RUN.durationMs - s.timeMs,
      zone: s.zone,
      zoneIndex: zoneIndexAt(s.timeMs),
      distance: s.d,
      speed: s.speed,
      truck: {
        lane: s.lanes.lane,
        target: s.lanes.target,
        x: s.lanes.x,
        lean: s.lanes.lean,
        braking: s.braking,
        invulnMs: s.invulnMs > 0 ? s.invulnMs : s.recovering ? 1 : 0,
        slip: s.slipMs / RUSH_TRUCK.slipMs,
        flying: s.booster.flying,
        flight: s.booster.progress,
      },
      hearts: s.hearts,
      score: s.score.total,
      combo: s.score.combo,
      power: s.powers.timed,
      powerLeft: s.powers.left,
      shield: s.powers.shield,
      radar: s.powers.radar ? this.radar() : null,
      fever: s.score.fever.left,
      order,
      delivered: s.deliveries.delivered,
      shopD: s.deliveries.shopD,
      warnMs: RUSH_FAIR.warnMs + s.driver.warnBonusMs,
      entities: s.traffic.live,
    };
  }

  /** WAFFLE RADAR: red where something blocks the lane soon, green where it is clear. */
  private radar(): RadarMark[] {
    const s = this.s;
    return [0, 1, 2].map((l) => (s.traffic.laneDanger(l, s.d, s.d + RUSH_POWERS.radarAheadPx) ? 'danger' : 'safe'));
  }

  /** HUD fields for GameUI.updateHud (timeMs = time LEFT, countdown). */
  hud(): HudState {
    const s = this.s;
    const cur = s.deliveries.current;
    return {
      level: 6,
      hearts: s.hearts,
      maxHearts: RUSH_RUN.hearts,
      score: s.score.total,
      timeMs: RUSH_RUN.durationMs - s.timeMs,
      countdown: true,
      progress: s.timeMs / RUSH_RUN.durationMs,
      powers: {
        brie: false,
        goat: false,
        thai: false,
        wings: false,
        shield: s.powers.shield,
        radar: s.powers.radar,
        sprint: s.powers.sprint,
        grip: s.powers.grip,
        jet: s.booster.flying,
      },
      fresh: cur ? Math.round(cur.fresh) : null,
      deliveries: { done: s.deliveries.delivered, total: RUSH_DELIVERY.count },
      powerLeft: s.powers.timed || s.powers.shield ? s.powers.left : 0,
      combo: s.score.combo,
      fever: s.score.fever.left,
    };
  }

  /** Results data of the run so far (final once the 'end' event fired). */
  summary(): RushRunSummary {
    const s = this.s;
    const dl = s.deliveries;
    return {
      seed: s.options.seed,
      daily: s.options.daily,
      driver: s.options.driver,
      completed: dl.delivered === RUSH_DELIVERY.count,
      reachedEnd: s.endReason === 'time',
      score: s.score.total,
      points: { ...s.score.points },
      delivered: dl.delivered,
      perfect: dl.perfect,
      fresh: dl.handFresh.slice(),
      collisions: s.collisions,
      bestCombo: s.score.bestCombo,
      flew: s.booster.flew,
      nearMisses: s.score.nearMisses,
      chains: s.trails.chains,
      fevers: s.score.fever.count,
    };
  }
}
