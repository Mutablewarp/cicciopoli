/** Level 6 (CICCIO'S RUSH) labels and formatting shared by the HUD, the setup panel and the results. Pure. */
import type { PowerState, RushAchievementCard, RushDriverId, SwipeSetting } from '../../contracts';

/** Countdown "m:ss", rounded up: a 90 s run shows 1:30 at the start and 0:00 only when it is over. */
export function countdownLabel(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The countdown pulses red below this. */
export const LOW_TIME_MS = 10_000;

/** Italian decimal comma, at most two decimals: 1.25 -> "1,25", 2.5 -> "2,5", 3 -> "3". */
export const decimal = (n: number): string => String(Math.round(n * 100) / 100).replace('.', ',');

/** Points with the Italian thousands dot, as the banners and the share text print them: 10759 -> "10.759". */
export const points = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** Combo badge text (x1,25 … x3); null hides the badge. */
export const comboLabel = (combo: number | undefined): string | null =>
  combo === undefined || combo <= 1 ? null : `x${decimal(combo)}`;

export type FreshTone = 'good' | 'warn' | 'bad';
/** Freshness meter colour: green, then yellow, then red. */
export const freshTone = (v: number): FreshTone => (v >= 60 ? 'good' : v >= 30 ? 'warn' : 'bad');

/**
 * Delivery pins along the progress bar (0..1). The HUD only knows done / total, so the pins are spread like
 * the brief's due times (~25 / 53 / 80 s of a 90 s run): 0.3, 0.6, 0.9 for three orders.
 */
export const pinAt = (i: number, total: number): number => (i + 1) / (total + 1 / 3);

export type RushPower = 'shield' | 'radar' | 'sprint' | 'grip' | 'jet';
export const RUSH_POWERS: readonly RushPower[] = ['shield', 'radar', 'sprint', 'grip', 'jet'];
export const POWER_NAMES: Readonly<Record<RushPower, string>> = {
  shield: 'SCUDO NUGGETS',
  radar: 'WAFFLE RADAR',
  sprint: 'POPCORN SPRINT',
  grip: 'CHEDDAR GRIP',
  jet: 'PROPULSORE',
};

/** The power whose time `powerLeft` measures: the timed one, else the shield (which may stack on top of it). */
export function timedPower(p: Partial<PowerState>): RushPower | null {
  for (const k of ['jet', 'sprint', 'grip', 'radar'] as const) if (p[k]) return k;
  return p.shield ? 'shield' : null;
}

/** Orders per run (brief §8: three deliveries, the last one at Terrasini). */
export const ORDERS_PER_RUN = 3;

/** Frame of each driver inside the portraits sheet (RUSH.driverPortraits). */
export const DRIVER_FRAME: Readonly<Record<RushDriverId, number>> = { riflessi: 0, occhio: 1, consegne: 2 };

/** The standard driver (daily challenge). */
export const STANDARD_DRIVER: RushDriverId = 'riflessi';

export const SWIPE_OPTIONS: ReadonlyArray<{ value: SwipeSetting; label: string }> = [
  { value: 'high', label: 'ALTA' },
  { value: 'mid', label: 'MEDIA' },
  { value: 'low', label: 'BASSA' },
  { value: false, label: 'OFF' },
];

/** Names of the secret achievements when the card does not flag them itself (brief §8: IL TRUCK VOLA!). */
const SECRET_NAMES: ReadonlySet<string> = new Set(['IL TRUCK VOLA!']);

/** A locked secret achievement is listed as ??? (a card may carry `secret: true`; the contract has no field yet). */
export function isSecret(a: RushAchievementCard): boolean {
  const flagged = 'secret' in a && a.secret === true;
  return !a.unlocked && (flagged || SECRET_NAMES.has(a.name));
}

/** COME SI GIOCA: the four rules. */
export const RULES: ReadonlyArray<{ title: string; text: string }> = [
  { title: 'CORSIE', text: 'Tocca ◀ ▶ o scorri: una corsia alla volta.' },
  { title: 'FRENA', text: 'Tieni premuto FRENA per rallentare nel traffico.' },
  { title: 'CONSEGNA', text: 'Entra nella corsia verde: il cliente ritira al volo.' },
  { title: 'FRESCHEZZA', text: 'Urti e frenate raffreddano il panino. Tre urti e la corsa finisce.' },
];

export type LegendIcon = RushPower | 'fries' | 'secret';
/** Power-up legend; the booster stays a teaser (it is the easter egg). */
export const LEGEND: ReadonlyArray<{ icon: LegendIcon; name: string; text: string }> = [
  { icon: 'shield', name: POWER_NAMES.shield, text: 'Para un urto.' },
  { icon: 'radar', name: POWER_NAMES.radar, text: 'Ti mostra le corsie sicure.' },
  { icon: 'sprint', name: POWER_NAMES.sprint, text: 'Turbo per 4 secondi.' },
  { icon: 'grip', name: POWER_NAMES.grip, text: 'Sterzate rapide, niente salsa che scivola.' },
  { icon: 'fries', name: 'PATATINE', text: '+25 punti.' },
  { icon: 'secret', name: '???', text: 'Un segreto ti aspetta sul lungomare di Terrasini…' },
];
