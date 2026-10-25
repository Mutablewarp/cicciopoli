/** Level 7 (CICCIO'S KITCHEN) labels, formatting and layout maths shared by the HUD, the setup panel and the results. Pure. */
import type { KitchenSettings, KitchenTicketLine } from '../../contracts';
import { INGREDIENT_NAME, MENU_RULE, SIDE_NAME, euro } from '../../config/kitchenMenu';

/** "COCA COLA 33CL" -> "COCA COLA": the ticket is narrow and no two drinks differ only by size. */
export const ticketLabel = (label: string): string => label.replace(/\s+\d+\s?CL$/i, '');

/**
 * The tightest ticket (narrow phones, the longest orders) uses the short names printed on the bins
 * (game/kitchen/labels.ts SHORT), only where the bin abbreviates: the player reads the same words on ticket and bin
 * (a bin that hyphenates the full name, POLLO PA-STELLATO, keeps the full name on the ticket).
 */
const SHORT_LABEL: Readonly<Record<string, string>> = {
  [INGREDIENT_NAME.cipollaCaramellata.short]: 'CIPOLLA CARAMELL.',
  [SIDE_NAME.greenNuggets]: 'GREEN NUGGETS',
};
export const shortLabel = (label: string): string => SHORT_LABEL[label] ?? label;

/** Lower-case words, split at spaces, apostrophes and punctuation: "l'acqua frizzante!" -> l, acqua, frizzante. */
const words = (s: string): string[] => s.toLowerCase().split(/[^\p{L}\d]+/u).filter(Boolean);
/**
 * True when the tutorial line names this ticket line (every word of its label is in it): "Bibita: prendi il Fuze Tea
 * limone!" names FUZE TEA LIMONE, so a scrolling ticket shows the line the step is about.
 */
export function namedBy(label: string, hint: string): boolean {
  const said = new Set(words(hint));
  const need = words(ticketLabel(label));
  return need.length > 0 && need.every((w) => said.has(w));
}

/** todo = nothing on yet, part = some of a "x3", done = exactly right, over = too many. */
export type LineState = 'todo' | 'part' | 'done' | 'over';

export interface LineView {
  label: string;
  /** "x3" when the order wants more than one, else '' */
  qty: string;
  state: LineState;
  /** "1/3" while partial or over, else '' (the box shows the tick) */
  status: string;
}

export function lineView(l: KitchenTicketLine): LineView {
  const state: LineState = l.done <= 0 ? 'todo' : l.done < l.count ? 'part' : l.done === l.count ? 'done' : 'over';
  return {
    label: ticketLabel(l.label),
    qty: l.count > 1 ? `x${l.count}` : '',
    state,
    status: state === 'part' || state === 'over' ? `${l.done}/${l.count}` : '',
  };
}

/** In-game takings in euro, Italian format with the thousands dot: 12340 -> "123,40 €", 123456 -> "1.234,56 €". */
export const takings = (cents: number): string => euro(Math.max(0, Math.round(cents))).replace(/\B(?=(\d{3})+(?!\d),)/g, '.');

/** Average customer rating with one decimal and the Italian comma: 4.25 -> "4,3", 4 -> "4,0". */
export const avgStars = (n: number): string => (Math.round(Math.max(0, Math.min(5, n)) * 10) / 10).toFixed(1).replace('.', ',');

/** The real menù rule, as printed on the board: "MENÙ = BURGER + PATATINE + STARTER + BIBITA, +5,00 €". */
export const MENU_RULE_TEXT = `MENÙ = ${MENU_RULE.text}, +${euro(MENU_RULE.extraCents)}`;

export type PatienceMood = 'happy' | 'worried' | 'angry';
/** Patience face: happy above 0.6, worried above 0.3, then angry; the bar pulses red below LOW. */
export const PATIENCE = { worried: 0.6, angry: 0.3, low: 0.25 } as const;
export const patienceMood = (p: number): PatienceMood => (p > PATIENCE.worried ? 'happy' : p > PATIENCE.angry ? 'worried' : 'angry');

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type BubbleSide = 'above' | 'right' | 'left';
export interface BubblePlace {
  x: number;
  y: number;
  side: BubbleSide;
  /** where the tail leaves the bubble: x offset on the bottom edge (above), y offset on the side edge (right / left) */
  tail: number;
  /** the most width the bubble was given (Infinity = its own CSS width) */
  room: number;
}
/** The bubble's size when it may be up to `room` px wide (Infinity = its own CSS width); a word wider than that included. */
export type MeasureBubble = (room: number) => { w: number; h: number };

/**
 * Bubble geometry, CSS px: tail length, clearance beside the head (a waist-up customer at 2-3x), tail inset from the
 * corners, narrowest bubble worth putting beside the head (ten pixel-font letters a line), and how many times taller
 * than the widest bubble above it may get there (a narrow column would hide the room and the till).
 */
export const BUBBLE = { tail: 14, side: 46, corner: 16, minSide: 150, sideTall: 2 } as const;

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/**
 * Places the speech bubble inside `free` (the game host minus the ticket and button areas): right above the head, tail
 * pointing down at `anchor` (top of the head), while it keeps to the lower half of the room above the head: the
 * CICCIO'S neon hangs over the customer in the upper half (centred over the room, game/kitchen/counterView.ts). A
 * long line first gets the whole free width (fewer lines, so it stays low), then goes beside the head when a side has
 * room for it (right first, like the Good Pizza counter; narrower and taller to fit, never a tall column), tail
 * pointing at the head; else it stays above at its widest, clamped to the free area.
 */
export function placeBubble(free: Box, anchor: { x: number; y: number }, measure: MeasureBubble): BubblePlace {
  const right = free.x + free.w;
  const bottom = free.y + free.h;
  const above = (room: number): BubblePlace => {
    const s = measure(room);
    const x = clamp(anchor.x - s.w / 2, free.x, right - s.w);
    const tail = clamp(anchor.x - x, BUBBLE.corner, s.w - BUBBLE.corner);
    return { x, y: anchor.y - BUBBLE.tail - s.h, side: 'above', tail, room };
  };
  const beside = (side: 'right' | 'left', room: number, maxH: number): BubblePlace | null => {
    if (room < BUBBLE.minSide) return null;
    const b = measure(room);
    if (b.w > room || b.h > Math.min(free.h, maxH)) return null;
    // the top a little above the head, so the tail meets the hair and the bubble never hides the face
    const y = clamp(anchor.y - BUBBLE.corner, free.y, bottom - b.h);
    const tail = clamp(anchor.y + BUBBLE.corner - y, BUBBLE.corner, b.h - BUBBLE.corner);
    return { x: side === 'right' ? anchor.x + BUBBLE.side : anchor.x - BUBBLE.side - b.w, y, side, tail, room };
  };
  const underNeon = (free.y + anchor.y) / 2;
  const own = above(Infinity);
  if (own.y >= underNeon) return own;
  const wide = above(free.w);
  if (wide.y >= underNeon) return wide;
  const maxH = BUBBLE.sideTall * (anchor.y - BUBBLE.tail - wide.y);
  const side = beside('right', right - anchor.x - BUBBLE.side, maxH) ?? beside('left', anchor.x - BUBBLE.side - free.x, maxH);
  return side ?? { ...wide, y: Math.max(free.y, wide.y) };
}

/** COME SI GIOCA: the four illustrated steps of a customer. */
export type StepIcon = 'order' | 'griddle' | 'stack' | 'serve';
export const STEPS: ReadonlyArray<{ icon: StepIcon; title: string; text: string }> = [
  { icon: 'order', title: 'ORDINE', text: "Ascolta il cliente e premi PRENDI L'ORDINE: lo scontrino dice cosa preparare." },
  { icon: 'griddle', title: 'PIASTRA', text: 'Tocca la carne: va sulla piastra. Girala quando è dorata, poi toglila: PERFETTO!' },
  { icon: 'stack', title: 'MONTA', text: 'Tocca gli ingredienti dello scontrino: salgono sul panino. Chiudi con il pane.' },
  { icon: 'serve', title: 'SERVI', text: 'Premi SERVI: giusto e veloce vuol dire più stelle e la mancia!' },
];
/** Where the menù parts come from, under the rule. */
export const MENU_NOTE = 'Patatine e starter si friggono, la bibita è in frigo.';

export type KitchenToggle = keyof KitchenSettings;
export const TOGGLES: ReadonlyArray<{ key: KitchenToggle; label: string }> = [
  { key: 'hints', label: 'AIUTI' },
  { key: 'vibration', label: 'VIBRAZIONE' },
  { key: 'reducedMotion', label: 'MOVIMENTO RIDOTTO' },
  { key: 'music', label: 'MUSICA' },
];
