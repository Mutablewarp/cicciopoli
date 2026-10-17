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

export type LevelId = 1 | 2;

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

export type EdgeAction = 'jump' | 'fire' | 'club' | 'pause';

export interface GameInput {
  /** -1 left, 0 none, +1 right. When both directions are held the LAST pressed wins. */
  readonly axisX: -1 | 0 | 1;
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
}

export type ButtonState = 'hidden' | 'disabled' | 'enabled';

export interface ControlsLayout {
  level: LevelId;
  /** Provola Goat cheese shot (level 1) */
  fire: ButtonState;
  /** Thai wing club (level 1) */
  club: ButtonState;
  /** SCENDI / dive (level 2) */
  down: ButtonState;
  jumpLabel: 'SALTA' | 'VOLA';
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
  | 'fall' | 'flap' | 'select' | 'pause' | 'enemyHit' | 'armorClang' | 'heal' | 'goal';

export type MusicName = 'title' | 'hills' | 'inferno';

export interface GameAudio {
  /** Call from inside a user gesture handler; safe to call many times. */
  unlock(): void;
  sfx(name: SfxName): void;
  music(name: MusicName | null): void;
  /** Stops music and plays a one-shot jingle. */
  jingle(name: 'win' | 'gameover'): void;
  readonly muted: boolean;
  setMuted(muted: boolean): void;
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
