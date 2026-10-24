/** Truck vs road objects: hits (exactly once each), shield, sauce slip, clean passes, pickups. */
import { RUSH_BOOSTER, RUSH_ITEMS, RUSH_KINDS, RUSH_RUN, RUSH_SCORE, RUSH_TRUCK, type TrafficKind } from '../../../config/rush';
import { isPickup, isTraffic, type RushEntity } from './entity';
import { powerOf } from './powerups';
import { randInt } from './rng';
import type { RunState } from './state';
import { RUSH_TEXT, comboText } from './strings';
import type { PickupKind, RushEvent } from './types';

type Emit = (e: RushEvent) => void;

export function collide(s: RunState, emit: Emit): void {
  const flying = s.booster.flying;
  for (const e of s.traffic.live.slice()) {
    if (isTraffic(e.kind)) traffic(s, e, e.kind, flying, emit);
    else if (isPickup(e.kind)) pickup(s, e, e.kind, flying, emit);
  }
}

function traffic(s: RunState, e: RushEntity, kind: TrafficKind, flying: boolean, emit: Emit): void {
  const spec = RUSH_KINDS[kind];
  if (!e.passed && s.d > e.meetD + e.reach) {
    e.passed = true;
    if (spec.scores && !e.touched) {
      const p = s.score.pass();
      emit({ type: 'pass', id: e.id, points: p.points, combo: s.score.combo });
      if (p.up) emit({ type: 'combo', combo: s.score.combo, text: comboText(s.score.combo) });
    }
  }
  if (e.touched || flying || Math.abs(s.d - e.meetD) >= e.reach) return;
  if (Math.abs(s.lanes.x - e.x) >= (RUSH_TRUCK.hitW + spec.w - 2 * spec.inset) / 2) return;
  e.touched = true;
  if (kind === 'sauce') {
    if (s.powers.grip) return;
    s.slipMs = RUSH_TRUCK.slipMs;
    emit({ type: 'slip', id: e.id });
    return;
  }
  if (s.invulnerable) return;
  hit(s, e, emit);
}

function hit(s: RunState, e: RushEntity, emit: Emit): void {
  s.invulnMs = RUSH_RUN.hitInvulnMs;
  s.recovering = true;
  s.recoverMs = 0;
  const shielded = s.powers.absorb(emit);
  if (!shielded) {
    s.hearts--;
    s.collisions++;
    s.zoneHit[Math.max(0, s.zoneIndex)] = true;
    s.cleanMs = 0;
    s.score.streak = 0;
    s.deliveries.hit();
  }
  emit({ type: 'hit', id: e.id, kind: e.kind, shielded, hearts: s.hearts });
  s.traffic.drop(e, 'hit', emit);
}

function pickup(s: RunState, e: RushEntity, kind: PickupKind, flying: boolean, emit: Emit): void {
  if (kind === 'airNugget' && !flying) return;
  const size = RUSH_ITEMS.pickupSize - 2 * RUSH_ITEMS.pickupInset;
  if (Math.abs(s.d - e.meetD) >= (size + RUSH_TRUCK.hitH) / 2) return;
  if (Math.abs(s.lanes.x - e.x) >= (size + RUSH_TRUCK.hitW) / 2) return;
  s.traffic.drop(e, 'picked', emit);
  const points = kind === 'fries' ? RUSH_SCORE.fries : kind === 'airNugget' ? RUSH_SCORE.airNugget : 0;
  s.score.add('pickups', points);
  emit({ type: 'pickup', id: e.id, kind, points });
  const power = powerOf(kind);
  if (power) s.powers.start(power, emit);
  if (kind === 'booster') takeOff(s, emit);
}

/** PROPULSORE: 5 s flight with lines of nuggets in the air. */
function takeOff(s: RunState, emit: Emit): void {
  const B = RUSH_BOOSTER;
  s.booster.start();
  emit({ type: 'flightStart', title: RUSH_TEXT.roadcoaster, sub: RUSH_TEXT.zeroTo });
  const reach = (B.flightMs / 1000) * s.base - B.nuggetEveryPx / 2;
  for (let off = B.nuggetFromPx; off < reach; off += B.nuggetEveryPx) {
    const lane = randInt(s.pickRng, 3) as 0 | 1 | 2;
    for (let j = 0; j < B.nuggetLine; j++) s.traffic.addPickup('airNugget', lane, s.d + off + j * B.nuggetGapPx);
  }
}
