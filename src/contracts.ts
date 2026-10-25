/**
 * Shared contracts between modules. OWNER: integrator (do not edit from module agents).
 *
 * Module map:
 *   src/art/*      -> pure canvas art packs (no Phaser import), see src/art/keys.ts
 *   src/ui/*       -> DOM HUD, screens, touch controls     (implements GameUI)
 *   src/input/*    -> keyboard + touch merged input        (implements GameInput)
 *   src/audio/*    -> WebAudio synth sfx + music           (implements GameAudio)
 *   src/game/*     -> Phaser scenes, player, enemies, levels
 *   src/main.ts    -> boot, viewport/DPR sizing, app lifecycle
 */

/**
 * 1 Le Colline · 2 Alette Crunchy (platform) · 3 Ciccio's Invaders (shooter) · 4 Ciccio-Man (maze) ·
 * 5 Spacca Tutto (platform brawler) · 6 Ciccio's Rush (burger-truck delivery driving) ·
 * 7 Ciccio's Kitchen (cook and serve the real menu) · 8 Ciccio's Golden Ticket (1930s cartoon boss rush)
 */
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const LEVEL_IDS: readonly LevelId[] = [1, 2, 3, 4, 5, 6, 7, 8];

/** Phaser scene key that runs each level (main.ts starts it with data { level }). */
export const LEVEL_SCENE: Readonly<Record<LevelId, 'game' | 'invaders' | 'maze' | 'rush' | 'kitchen' | 'cartoon'>> = {
  1: 'game',
  2: 'game',
  3: 'invaders',
  4: 'maze',
  5: 'game',
  6: 'rush',
  7: 'kitchen',
  8: 'cartoon',
};

export type Dir4 = 'up' | 'down' | 'left' | 'right';

/* ------------------------------------------------------------------ ART */

export interface SheetDef {
  key: string;
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
}

export interface ImageDef {
  key: string;
  canvas: HTMLCanvasElement;
}

/** Tileset: a plain grid of `tileSize` tiles (no margin/spacing). Registration extrudes it. */
export interface TilesetDef {
  key: string;
  canvas: HTMLCanvasElement;
  tileSize: number;
}

export interface AnimDef {
  key: string;
  sheet: string;
  frames: number[];
  frameRate: number;
  /** -1 = loop forever, 0 = play once */
  repeat: number;
  yoyo?: boolean;
}

export interface ArtPack {
  name: string;
  sheets: SheetDef[];
  images: ImageDef[];
  tilesets: TilesetDef[];
  anims: AnimDef[];
}

/** Point inside a ciccio frame (frame-local pixels, character facing RIGHT). */
export interface FrameAnchor {
  x: number;
  y: number;
  /** radians, for the held club; 0 = club pointing up-right default pose */
  angle?: number;
}

export interface CiccioFrameAnchors {
  /** hand that holds the club / throws cheese */
  hand: FrameAnchor;
  /** centre of the chest where the Provola badge is pinned */
  chest: FrameAnchor;
  /** shoulder-blade point where the crunchy wings attach (drawn behind body) */
  back: FrameAnchor;
  /** centre of the face (glasses bridge) */
  head: FrameAnchor;
}

export interface CiccioArtPack extends ArtPack {
  /** anchors[i] belongs to frame i of the `ciccio` sheet */
  anchors: CiccioFrameAnchors[];
}

/* ---------------------------------------------------------------- INPUT */

/** dash / swap / super: level 8 (SCATTO, ARMA, SUPER buttons; keyboard per src/input). */
export type EdgeAction = 'jump' | 'fire' | 'club' | 'pause' | 'dash' | 'swap' | 'super';

export interface GameInput {
  /** -1 left, 0 none, +1 right. When both directions are held the LAST pressed wins. */
  readonly axisX: -1 | 0 | 1;
  /** -1 up, 0 none, +1 down (keyboard ↑/W ↓/S, maze cross-pad). Last pressed wins. */
  readonly axisY: -1 | 0 | 1;
  /**
   * Most recent direction PRESS (keys, d-pad, cross-pad or a swipe on the game area in
   * maze mode) since the previous call, else null. Latched like consume().
   */
  consumeDir(): Dir4 | null;
  readonly upHeld: boolean;
  readonly downHeld: boolean;
  readonly jumpHeld: boolean;
  readonly fireHeld: boolean;
  readonly clubHeld: boolean;
  /**
   * Returns true once per press since the previous call for that action.
   * Latched: a tap that starts and ends between two frames still returns true.
   */
  consume(action: EdgeAction): boolean;
  /** Drop every held state and latch (blur, overlay open, level start). */
  reset(): void;
  /** When false all gameplay actions read as released (pause still latches). */
  enabled: boolean;
}

/* ------------------------------------------------------------------- UI */

export interface PowerState {
  brie: boolean;
  goat: boolean;
  thai: boolean;
  wings: boolean;
  /** level 3: FULMINE charges available */
  bolt?: boolean;
  /** level 4: provola power-stick active (ghosts can be eaten) */
  pellet?: boolean;
  /** level 6: Scudo Nuggets, Waffle Radar, Popcorn Sprint, Cheddar Grip, Propulsore (flying truck) */
  shield?: boolean;
  radar?: boolean;
  sprint?: boolean;
  grip?: boolean;
  jet?: boolean;
}

export interface HudState {
  level: LevelId;
  hearts: number;
  maxHearts: number;
  score: number;
  timeMs: number;
  /** 0..1 progress from start to goal */
  progress: number;
  powers: PowerState;
  /** level 3: FULMINE charges, shown as a digit on the bolt chip (desktop has no touch badge) */
  boltCount?: number;
  /** level 6: timeMs is the time LEFT, shown as a countdown */
  countdown?: boolean;
  /** level 6: freshness of the order on board, 0..100; null hides the meter */
  fresh?: number | null;
  /** level 6: deliveries done / total, drawn as pins on the progress bar */
  deliveries?: { done: number; total: number };
  /** level 6: 0..1 time left of the active timed power (expiry cue on its chip) */
  powerLeft?: number;
  /** level 6: clean-driving combo multiplier; 1 or less hides it */
  combo?: number;
  /** level 7: order ticket, customer bubble, patience, served pins, hint line */
  kitchen?: KitchenHud;
  /** level 8: super cards, weapon, boss name, boss pins */
  cartoon?: CartoonHud;
}

export type ButtonState = 'hidden' | 'disabled' | 'enabled';

/**
 * platform (L1-2): ◀▶ pad + SALTA/VOLA + GOAT/THAI or SCENDI.
 * shooter  (L3):   ◀▶ pad + big FUOCO (fire action) + FULMINE (club action, shows `clubCount`).
 * maze     (L4):   4-way cross pad + swipes on the game area; no action buttons.
 * driver   (L6):   ◀ ▶ lane buttons (each tap = one consumeDir press) + big FRENA held = downHeld;
 *                  swipes on the game area also change lane when `swipe` is not false.
 * kitchen  (L7):   no pads (everything is tapped on the canvas); one big action button labelled
 *                  `actionLabel` (PRENDI L'ORDINE / SERVI …) whose state is `fire`; a press = 'fire'.
 * cartoon  (L8):   ◀▶ pad + ▲ (aim up, held = upHeld) on the left; big SALTA (jump, parry in mid-air), SPARA
 *                  (fire held; hidden when `autoFire`), SCATTO (dash edge), ARMA (swap edge, shows `weapon`)
 *                  and SUPER (super edge, shows `superCards` 0..5) on the right.
 */
export type ControlsMode = 'platform' | 'shooter' | 'maze' | 'driver' | 'kitchen' | 'cartoon';

/** Swipe sensitivity on the game area (maze / driver); false = swipes off, buttons only. */
export type SwipeSetting = false | 'low' | 'mid' | 'high';

export interface ControlsLayout {
  level: LevelId;
  mode: ControlsMode;
  /** Provola Goat cheese shot (level 1) · FUOCO (level 3) */
  fire: ButtonState;
  /** Thai wing club (level 1) · FULMINE lightning (level 3) */
  club: ButtonState;
  /** SCENDI / dive (level 2) */
  down: ButtonState;
  jumpLabel: 'SALTA' | 'VOLA';
  /** small counter badge on the club/FULMINE button (lightning charges), omitted = none */
  clubCount?: number;
  /** maze / driver: swipe sensitivity, omitted = 'mid' */
  swipe?: SwipeSetting;
  /** kitchen: text of the action button ("PRENDI L'ORDINE", "SERVI") */
  actionLabel?: string;
  /** cartoon: shooting is automatic, hide SPARA */
  autoFire?: boolean;
  /** cartoon: current weapon on the ARMA button */
  weapon?: CartoonWeapon;
  /** cartoon: super cards 0..5 on the SUPER button (1 = EX shot ready, 5 = PIOGGIA DI PATATINE) */
  superCards?: number;
}

export interface TitleInfo {
  best: Partial<Record<LevelId, number>>;
  muted: boolean;
}

export interface VictoryInfo {
  level: LevelId;
  score: number;
  timeMs: number;
  best: number;
  newBest: boolean;
  hasNext: boolean;
}

export interface GameOverInfo {
  level: LevelId;
  score: number;
}

export type BannerTone = 'info' | 'power' | 'danger' | 'goal';

export * from './contracts-rush';
import type { RushDriverId, RushResultInfo, RushSettings, RushSetupInfo } from './contracts-rush';
export * from './contracts-kitchen';
import type { KitchenHud, KitchenResultInfo, KitchenSettings, KitchenSetupInfo } from './contracts-kitchen';
export * from './contracts-cartoon';
import type { CartoonBossId, CartoonHud, CartoonMapInfo, CartoonResultInfo, CartoonSettings, CartoonWeapon } from './contracts-cartoon';

export interface GameUI {
  /** Full-screen loading indicator. progress 0..1, null hides it. */
  setLoading(progress: number | null, message?: string): void;
  showTitle(info: TitleInfo, h: { onStart(level: LevelId): void; onToggleMute(): boolean }): void;
  hideTitle(): void;
  showHud(visible: boolean): void;
  /** Cheap; only changed fields need to be passed. */
  updateHud(state: Partial<HudState>): void;
  /** null hides every touch control. */
  setControls(layout: ControlsLayout | null): void;
  /** Short centred announcement ("VAI IN BUCA!", "CHECKPOINT", power-up names). */
  banner(text: string, opts?: { ms?: number; tone?: BannerTone; sub?: string }): void;
  showPause(
    h: { onResume(): void; onRestart(): void; onMenu(): void; onToggleMute(): boolean },
    muted: boolean,
  ): void;
  showVictory(info: VictoryInfo, h: { onNext?(): void; onReplay(): void; onMenu(): void }): void;
  showGameOver(info: GameOverInfo, h: { onRetry(): void; onMenu(): void }): void;
  hideOverlays(): void;
  /** Level 6 pre-run panel. onSettings fires on every change (the game persists it). */
  showRushSetup(
    info: RushSetupInfo,
    h: { onPlay(driver: RushDriverId, daily: boolean): void; onSettings(s: RushSettings): void; onMenu(): void },
  ): void;
  /** Level 6 results: breakdown, stars, tip, RIPROVA, CONDIVIDI RISULTATO, SCOPRI IL MENÙ CICCIO'S, MENU. */
  showRushResults(info: RushResultInfo, h: { onRetry(): void; onMenu(): void }): void;
  /** Level 7 pre-shift panel: record, GIOCA ORA, COME SI GIOCA, IMPOSTAZIONI (onSettings on every change). */
  showKitchenSetup(
    info: KitchenSetupInfo,
    h: { onPlay(): void; onSettings(s: KitchenSettings): void; onMenu(): void },
  ): void;
  /** Level 7 results: breakdown, stars, takings, tip, RIPROVA, CONDIVIDI RISULTATO, SCOPRI IL MENÙ CICCIO'S, MENU. */
  showKitchenResults(info: KitchenResultInfo, h: { onRetry(): void; onMenu(): void }): void;
  /** Level 8 boss map: 7 vintage boss cards, GIOCA, COME SI GIOCA, IMPOSTAZIONI (onSettings on every change). */
  showCartoonMap(
    info: CartoonMapInfo,
    h: { onPlay(boss: CartoonBossId): void; onSettings(s: CartoonSettings): void; onMenu(): void },
  ): void;
  /** Level 8 results: knockout report card (grade) or defeat card (progress), RIPROVA / PROSSIMO BOSS / MAPPA / MENU. */
  showCartoonResults(
    info: CartoonResultInfo,
    h: { onRetry(): void; onNext?(): void; onMap(): void; onMenu(): void },
  ): void;
  /** HUD pause button pressed (touch or click). */
  onPauseButton(cb: () => void): void;
  /** Element the Phaser canvas must exactly fill. */
  readonly gameHost: HTMLElement;
  /** Canvas on the title screen where main.ts animates the pixel Ciccio (may be null). */
  readonly titleRunnerCanvas: HTMLCanvasElement | null;
}

/* ---------------------------------------------------------------- AUDIO */

export type SfxName =
  | 'jump' | 'land' | 'fries' | 'burger' | 'powerup' | 'brie' | 'shoot' | 'club'
  | 'stomp' | 'hurt' | 'shieldBreak' | 'crate' | 'bump' | 'checkpoint' | 'lava'
  | 'fall' | 'flap' | 'select' | 'pause' | 'enemyHit' | 'armorClang' | 'heal' | 'goal'
  // nugget coins, kill effects (cheese engulf / catch fire)
  | 'coin' | 'melt' | 'ignite'
  // level 3 shooter
  | 'laser' | 'bolt' | 'explode' | 'transform' | 'ufo' | 'invaderStep'
  // level 4 maze
  | 'chomp' | 'pellet' | 'ghostEat' | 'ghostHome'
  // level 5 Hulk: punch swing / heavy hit, ground slam, rubble, roar, flag ripped off the pole
  | 'punch' | 'smash' | 'slam' | 'rubble' | 'roar' | 'rip'
  // level 6 truck: lane change whoosh, brake squeal, cartoon crash, delivery cha-ching, combo up,
  // power expiring, traffic horn, rocket booster, new personal record
  | 'lane' | 'brake' | 'crash' | 'deliver' | 'combo' | 'expire' | 'horn' | 'jet' | 'record'
  // level 7 kitchen: meat on the griddle, flip with the spatula, basket into hot oil, PERFETTO ding,
  // burning warning, topping on the stack, sauce squeeze, paper wrap, tray served, till cha-ching,
  // happy customer, unhappy customer, shop doorbell, item into the bin, YOU ARE SO GOLDEN fanfare
  | 'sizzle' | 'flip' | 'fry' | 'ding' | 'burn' | 'plop' | 'squeeze' | 'wrap' | 'serve' | 'cash'
  | 'yum' | 'grumble' | 'doorbell' | 'trash' | 'golden'
  // level 7 v7 (tactile kitchen): picking an ingredient up with the hand, one sound per family (raw meat
  // wet slap, leaves / soft veg rustle, cheese soft press, fried / crunchy / nuts crackle, bun puffy
  // squeeze, drink can / bottle clink), the patty hitting the hot griddle (loud sizzle burst), the basket
  // dunked into the oil (whoosh + bubbling), the basket lifted out (drip, shake)
  | 'grabMeat' | 'grabLeaf' | 'grabCheese' | 'grabCrisp' | 'grabBun' | 'grabCan' | 'sizzleBig' | 'dunk' | 'lift'
  // level 8 cartoon: provola shot, meatball lob, meatball blast, nugget shot, PIOGGIA DI PATATINE super,
  // EX shot, parry, dash, boss hit, knockout bell / announcer sting, round-start bell, a card filled,
  // the golden ticket reveal, player hurt (cartoon), boss phase change
  | 'cheese' | 'lob' | 'blast' | 'nugget' | 'friesRain' | 'ex' | 'parry' | 'dash' | 'bossHit'
  | 'knockout' | 'roundBell' | 'cardFull' | 'ticket' | 'oof' | 'phase';

export type MusicName =
  | 'title' | 'hills' | 'inferno' | 'invaders' | 'maze' | 'rampage' | 'rush' | 'kitchen'
  // level 8: the map / ragtime theme, the boss fights (hot jazz big band), the final boss
  | 'cartoon' | 'cartoonBoss' | 'cartoonFinal';

export interface GameAudio {
  /** Call from inside a user gesture handler; safe to call many times. */
  unlock(): void;
  sfx(name: SfxName): void;
  music(name: MusicName | null): void;
  /** Stops music and plays a one-shot jingle. */
  jingle(name: 'win' | 'gameover'): void;
  readonly muted: boolean;
  setMuted(muted: boolean): void;
  /** Music only (sfx keep playing); independent of the global mute. */
  readonly musicMuted: boolean;
  setMusicMuted(muted: boolean): void;
  /** Page hidden / visible. */
  suspend(): void;
  resume(): void;
}

/* ----------------------------------------------------------------- SAVE */

export interface SaveData {
  best: Partial<Record<LevelId, number>>;
  completed: LevelId[];
  muted: boolean;
}

export interface SaveStore {
  readonly data: SaveData;
  /** Records a finished level; returns true if it is a new best score. */
  recordWin(level: LevelId, score: number): boolean;
  setMuted(muted: boolean): void;
}

/* ------------------------------------------------------------- SERVICES */

export interface ViewportInfo {
  cssW: number;
  cssH: number;
  dpr: number;
  portrait: boolean;
  /**
   * CSS px at the bottom of the game host covered by overlay touch controls (landscape
   * phones). The camera keeps the walking line above it. Read from `--play-inset-b`.
   */
  insetBottom: number;
  /** CSS px at the top covered by the overlaid HUD bar (landscape / desktop). `--play-inset-t`.
   * Level 7 portrait: HUD + order ticket. */
  insetTop: number;
  /** CSS px at the left covered by a docked panel (level 7 landscape: the order ticket column). `--play-inset-l`. */
  insetLeft?: number;
}

export interface AppControl {
  startLevel(level: LevelId): void;
  toMenu(): void;
}

export interface Services {
  ui: GameUI;
  input: GameInput;
  audio: GameAudio;
  save: SaveStore;
  app: AppControl;
  /** Live object, mutated in place on every resize. */
  viewport: ViewportInfo;
}

/** Phaser registry key under which main.ts stores the Services object. */
export const SERVICES_KEY = 'services';
