/**
 * Level 7 · CICCIO'S KITCHEN screen + HUD contracts (pre-shift panel, results, the order ticket and
 * the customer's speech bubble). OWNER: integrator. Re-exported by src/contracts.ts.
 */
import type { RushAchievementCard } from './contracts-rush';

export interface KitchenSettings {
  /** AIUTI: the next useful bin / station pulses (default on) */
  hints: boolean;
  vibration: boolean;
  reducedMotion: boolean;
  /** music on / off (sound effects follow the global mute) */
  music: boolean;
}

export interface KitchenSetupInfo {
  best: number;
  bestStars: 0 | 1 | 2 | 3;
  /** the golden award was won at least once */
  golden: boolean;
  settings: KitchenSettings;
  achievements: RushAchievementCard[];
}

export interface KitchenResultInfo {
  /** the shift reached its last customer (false = TURNO CHIUSO: out of hearts) */
  completed: boolean;
  /** 3 stars: the YOU ARE SO GOLDEN finale played */
  golden: boolean;
  score: number;
  best: number;
  newBest: boolean;
  stars: 0 | 1 | 2 | 3;
  /** score breakdown rows, Italian labels */
  breakdown: { label: string; points: number }[];
  served: number;
  total: number;
  /** average customer rating, 0..5 (one decimal shown) */
  avgStars: number;
  /** in-game takings, euro cents (real menu prices + tips) */
  takingsCents: number;
  /** burgers / bacon / fried items taken off in the PERFETTO window */
  perfectCooks: number;
  /** customers who left angry */
  angry: number;
  /** one encouraging improvement tip */
  tip: string;
  newAchievements: { name: string; desc: string }[];
  /** text for the share button (Web Share API, else copied to the clipboard) */
  shareText: string;
}

export interface KitchenTicketLine {
  /** "CHEDDAR", "PATATINE", "COCA COLA 33CL" */
  label: string;
  /** how many the order wants (DOUBLE TRIPLE: cheddar x3) */
  count: number;
  /** how many are on the burger / tray now */
  done: number;
  group: 'burger' | 'menu';
}

/** The order ticket (scontrino) pinned on screen while the order is open. */
export interface KitchenTicket {
  /** "BRIE" */
  title: string;
  form: 'SINGOLO' | 'MENÙ';
  /** "14,90 €" */
  price: string;
  /** "Signora Rosalia" */
  customer: string;
  lines: KitchenTicketLine[];
  /** things on the burger / tray the order does not want ("POMODORO") — shown with a red ✗ */
  wrong: string[];
}

/** Level 7 HUD state (HudState.kitchen); the UI renders the ticket, the bubble and the hint strip. */
export interface KitchenHud {
  view: 'counter' | 'kitchen';
  ticket: KitchenTicket | null;
  /**
   * Speech bubble of the customer at the counter; null hides it. anchor = the point the bubble's tail
   * points at (top of the customer's head), CSS px relative to the game host.
   */
  say: { text: string; mood: 'neutral' | 'happy' | 'angry'; anchor: { x: number; y: number } } | null;
  /** 0..1 patience of the current customer; null hides the bar */
  patience: number | null;
  /** customers done / shift size, drawn as pins */
  served: { done: number; total: number };
  /** one short tutorial / hint line ("Girala quando è dorata!"); null hides it */
  hint: string | null;
  /** shift takings so far, euro cents: the HUD shows INCASSO € in place of the time on level 7 */
  takingsCents?: number;
}
