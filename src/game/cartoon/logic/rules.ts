/**
 * Pure rules of level 8 (no Phaser): hit geometry, the super meter, the report-card grade, the score,
 * the results tip and share line. Used by the round (src/game/cartoon/round.ts) and unit-tested.
 */
import type { Box, Vec } from '../api';
import type { CartoonWeapon } from '../../../contracts';
import { CT_CARDS, CT_GRADE, CT_PLAYER, CT_SCORE, CT_WEAPONS } from '../../../config/cartoon';

/* ------------------------------------------------------------------ geometry */

export function boxesOverlap(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function circleHitsBox(c: Vec, r: number, b: Box): boolean {
  const nx = Math.max(b.x, Math.min(c.x, b.x + b.w));
  const ny = Math.max(b.y, Math.min(c.y, b.y + b.h));
  return (c.x - nx) ** 2 + (c.y - ny) ** 2 <= r * r;
}

export function grow(b: Box, pad: number): Box {
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
}

export function centerOf(b: Box): Vec {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

/** Something round or boxy centred at (x, y): a hazard's or a shot's hit area. */
export interface HitShape {
  x: number;
  y: number;
  r?: number;
  w?: number;
  h?: number;
}

export function shapeHitsBox(s: HitShape, b: Box): boolean {
  if (s.w !== undefined && s.h !== undefined) return boxesOverlap({ x: s.x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h }, b);
  return circleHitsBox(s, s.r ?? 6, b);
}

/** The PARATA: a pink thing inside the hero box grown by the pad while the window is open. */
export function parryHits(windowLeftMs: number, hero: Box, s: HitShape & { pink?: boolean }): boolean {
  return windowLeftMs > 0 && s.pink === true && shapeHitsBox(s, grow(hero, CT_PLAYER.parryPad));
}

/* ------------------------------------------------------------------ cards */

export function addCards(cards: number, n: number): number {
  return Math.max(0, Math.min(CT_CARDS.max, cards + n));
}

/** Cards earned by `damage` hp of normal shots. */
export function cardsForDamage(damage: number): number {
  return damage * CT_CARDS.perDamage;
}

/** What SUPER spends now: the full super with 5 cards, an EX with 1, nothing below. */
export function superAction(cards: number): 'super' | 'ex' | null {
  if (cards >= CT_CARDS.super) return 'super';
  if (cards >= CT_CARDS.ex) return 'ex';
  return null;
}

export function nextWeapon(w: CartoonWeapon): CartoonWeapon {
  const order = CT_WEAPONS.order;
  return order[(order.indexOf(w) + 1) % order.length];
}

/* ------------------------------------------------------------------ grade + score */

export interface RoundStats {
  timeMs: number;
  hp: number;
  maxHp: number;
  parries: number;
  /** cards spent on EX shots and supers */
  supers: number;
  /** damage dealt (boss hp removed) */
  damage: number;
  bossHp: number;
}

export function parMs(bossHp: number): number {
  return Math.max(CT_GRADE.parMinMs, Math.min(CT_GRADE.parMaxMs, (bossHp / CT_GRADE.parDps) * 1000));
}

/** Time share 1 at par or faster, 0 at slowFactor x par. */
export function timeShare(timeMs: number, bossHp: number): number {
  const par = parMs(bossHp);
  const slow = par * CT_GRADE.slowFactor;
  return Math.max(0, Math.min(1, (slow - timeMs) / (slow - par)));
}

/** 0..1 report-card value of a knockout. */
export function gradeValue(s: RoundStats): number {
  const W = CT_GRADE.weights;
  const hp = s.maxHp > 0 ? Math.max(0, s.hp) / s.maxHp : 0;
  return (
    W.time * timeShare(s.timeMs, s.bossHp) +
    W.hp * hp +
    W.parries * Math.min(1, s.parries / CT_GRADE.parriesFull) +
    W.supers * Math.min(1, s.supers / CT_GRADE.supersFull)
  );
}

export function gradeOf(s: RoundStats): string {
  const v = gradeValue(s) + 1e-9;
  for (const [g, min] of CT_GRADE.thresholds) if (v >= min) return g;
  return 'D';
}

/** Points shown during the fight: damage and parries. */
export function livePoints(damage: number, parries: number): number {
  return Math.round(damage * CT_SCORE.perDamage) + parries * CT_SCORE.perParry;
}

/** Final score of a knockout (null grade = a defeat: the live points only). */
export function scoreOf(s: RoundStats, grade: string | null): number {
  const live = livePoints(s.damage, s.parries);
  if (grade === null) return live;
  const time = Math.round(CT_SCORE.timeBonusMax * timeShare(s.timeMs, s.bossHp));
  return live + time + Math.max(0, s.hp) * CT_SCORE.perHeart + (CT_SCORE.grade[grade] ?? 0);
}

/** Best of two grades ("A+" beats "A"); null = none yet. */
export function betterGrade(a: string | null, b: string | null): string | null {
  if (a === null) return b;
  if (b === null) return a;
  const rank = (g: string): number => CT_GRADE.thresholds.findIndex(([x]) => x === g);
  const ra = rank(a);
  const rb = rank(b);
  if (ra < 0) return b;
  if (rb < 0) return a;
  return ra <= rb ? a : b;
}

/* ------------------------------------------------------------------ results text */

export const TIPS = {
  hp: 'Usa lo SCATTO: per un attimo sei intoccabile e passi attraverso i colpi.',
  parries: 'Salta e premi di nuovo SALTA sugli oggetti rosa: è la PARATA e ti regala una carta.',
  supers: 'Con 5 carte premi SUPER: arriva la PIOGGIA DI PATATINE!',
  time: 'Prova le MEATBALL da vicino e le NUGGETS quando il boss si muove: cambia ARMA.',
  lost: 'Ogni attacco si annuncia prima di colpire: guarda il segnale e salta al momento giusto.',
  great: 'Che stile! Riprova per il voto A+ con meno colpi presi.',
} as const;

/** One encouraging tip: the weakest part of the round. */
export function tipFor(s: RoundStats, won: boolean): string {
  if (!won) return TIPS.lost;
  const W = CT_GRADE.weights;
  const parts: Array<[keyof typeof TIPS, number]> = [
    ['hp', W.hp * (1 - s.hp / Math.max(1, s.maxHp))],
    ['parries', W.parries * (1 - Math.min(1, s.parries / CT_GRADE.parriesFull))],
    ['supers', W.supers * (1 - Math.min(1, s.supers / CT_GRADE.supersFull))],
    ['time', W.time * (1 - timeShare(s.timeMs, s.bossHp))],
  ];
  parts.sort((a, b) => b[1] - a[1]);
  return parts[0][1] > 0.02 ? TIPS[parts[0][0]] : TIPS.great;
}

export function shareTextFor(bossName: string, won: boolean, grade: string | null, progress: number): string {
  if (won) return `Ho mandato AL TAPPETO ${bossName} con il voto ${grade ?? 'D'} in Ciccio's Golden Ticket! Sfida le mascotte di Ciccio's.`;
  return `Ho portato ${bossName} al ${Math.round(progress * 100)}% in Ciccio's Golden Ticket. Ci riprovo subito!`;
}
