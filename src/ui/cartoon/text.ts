/** Level 8 (CICCIO'S GOLDEN TICKET) labels and small maths shared by the HUD, the controls, the map and the report card. Pure. */
import type { CartoonBossCard, CartoonSettings } from '../../contracts';
import { CT_CARDS, CT_PLAYER } from '../../config/cartoon';

/** Super meter size and the hero's hearts (game config: the contract only carries the values). */
export const SUPER_CARDS = CT_CARDS.max;
export const HERO_HEARTS = CT_PLAYER.hp;

/**
 * Fill of each super card, 0..1: 2.4 cards -> [1, 1, 0.4, 0, 0]. Out-of-range and NaN values clamp; a card a hair
 * from full (float drift of the game's meter) counts as full.
 */
export function cardFills(cards: number, max = SUPER_CARDS): number[] {
  const v = Number.isFinite(cards) ? Math.max(0, Math.min(max, cards)) : 0;
  return Array.from({ length: max }, (_, i) => {
    const f = Math.max(0, Math.min(1, v - i));
    return f > 0.995 ? 1 : Math.round(f * 100) / 100;
  });
}

/** SUPER button caption: one card = the EX shot, five = PIOGGIA DI PATATINE. */
export const superLabel = (cards: number): string => (cards >= SUPER_CARDS ? 'SUPER' : 'EX');

/** "64%" of the boss pushed back (defeat card). */
export const percent = (p: number): string => `${Math.round(Math.max(0, Math.min(1, Number.isFinite(p) ? p : 0)) * 100)}%`;

export type GradeTone = 'top' | 'good' | 'ok' | 'low';
/** Stamp colour of a grade: A+ / A gold-red, B, C, D faded. */
export function gradeTone(grade: string | null): GradeTone {
  if (!grade) return 'low';
  if (grade.startsWith('A')) return 'top';
  if (grade.startsWith('B')) return 'good';
  return grade.startsWith('C') ? 'ok' : 'low';
}

/** Stamp on a boss card of the map. */
export const CARD_STATE: Readonly<Record<CartoonBossCard['state'], string>> = {
  locked: 'CHIUSO',
  open: 'TOCCA A TE!',
  beaten: 'STESO!',
};

/** Spoken name of a card (aria-label): "Boss 2, PANCETTA LO SKATER: steso, voto A". */
export function cardAria(c: CartoonBossCard, i: number): string {
  const state = c.state === 'locked' ? 'chiuso' : c.state === 'open' ? 'da sfidare' : `steso${c.grade ? `, voto ${c.grade}` : ''}`;
  return `Boss ${i + 1}, ${c.name}: ${state}`;
}

export const TOGGLES: ReadonlyArray<{ key: keyof CartoonSettings; label: string; note: string }> = [
  { key: 'autoFire', label: 'SPARO AUTOMATICO', note: 'Ciccio spara da solo: tu pensi a saltare e schivare.' },
  { key: 'vibration', label: 'VIBRAZIONE', note: 'Il telefono vibra quando vieni colpito.' },
  { key: 'reducedMotion', label: 'MOVIMENTO RIDOTTO', note: 'Niente scossoni né sfarfallio della pellicola.' },
  { key: 'music', label: 'MUSICA', note: 'Lo swing della big band.' },
];

/** COME SI GIOCA: one row per control (the icon is drawn by panels.ts). */
export type HelpIcon = 'pad' | 'up' | 'jump' | 'parry' | 'shoot' | 'dash' | 'swap' | 'super';
export const HELP_ROWS: ReadonlyArray<{ icon: HelpIcon; title: string; text: string }> = [
  { icon: 'pad', title: 'CORRI', text: 'Tieni ◀ ▶ per correre a destra e a sinistra.' },
  { icon: 'up', title: 'MIRA IN ALTO', text: 'Fai scivolare il pollice sul ▲: spari verso l’alto, anche in diagonale mentre corri.' },
  { icon: 'jump', title: 'SALTA', text: 'Tocco breve, saltello. Tieni premuto, salto alto.' },
  { icon: 'parry', title: 'PARATA', text: 'Gli oggetti ROSA si parano: salta e premi di nuovo SALTA mentre lo tocchi. Rimbalzi e guadagni una carta.' },
  { icon: 'shoot', title: 'SPARA', text: 'Con lo SPARO AUTO acceso Ciccio spara da solo. Tocca AUTO per spegnerlo e tieni premuto SPARA.' },
  { icon: 'dash', title: 'SCATTO', text: 'Uno scatto rapidissimo: per un attimo niente ti può colpire.' },
  { icon: 'swap', title: 'ARMA', text: 'Cambia arma: PROVOLA GOAT, MEATBALL, NUGGETS.' },
  { icon: 'super', title: 'EX', text: 'Le carte si riempiono colpendo il boss e parando. 1 carta: colpo EX. 5 carte: PIOGGIA DI PATATINE!' },
];

export const WEAPON_HELP: ReadonlyArray<{ id: 'provola' | 'meatball' | 'nuggets'; text: string }> = [
  { id: 'provola', text: 'Bastoncini di provola dritti e veloci. L’arma di tutti i giorni.' },
  { id: 'meatball', text: 'Polpette a parabola che esplodono: lente ma fortissime.' },
  { id: 'nuggets', text: 'Nuggets che cercano il boss da soli: più deboli, mai sprecati.' },
];

/** Line under the K.O.! title: how far the boss was pushed, and a word of courage that fits it. */
export function defeatLine(bossName: string, progress: number): string {
  if (progress >= 0.66) return `Mancava solo il ${percent(1 - progress)}: ci sei quasi!`;
  if (progress >= 0.33) return `Hai fatto il ${percent(progress)} del lavoro. Riprova!`;
  return `Prendi le misure a ${bossName} e riprova!`;
}
