/**
 * Level 8 flow: the boss map (DOM) -> load the boss + hero at scale k -> a Round -> the report card
 * (or the GOLDEN TICKET finale after the seventh knockout, then the golden report card).
 * Owns progress / settings (cicciopoli.cartoon.v1), input -> controls, HUD + touch controls sync,
 * music, vibration, the QA bot and the boss fallback (a boss module that throws = the stand-in).
 */
import type Phaser from 'phaser';
import type { CartoonBossId, CartoonResultInfo, CartoonSettings, ControlsLayout, Services } from '../../contracts';
import type { BossDef } from './api';
import { heroScale, loadHeroArt, loadLogo } from './assets';
import { BOSSES, bossDef } from './bosses';
import { placeholderBoss } from './bosses/placeholder';
import { Bot } from './bot';
import { GoldenFinale } from './golden';
import { gradeOf, livePoints, scoreOf, shareTextFor, tipFor, type RoundStats } from './logic/rules';
import { CartoonProgress } from './logic/store';
import { Round, type RoundControls } from './round';
import type { CartoonView } from './view';
import { CT_FLOW, CT_PLAYER } from '../../config/cartoon';

export type SessionState = 'map' | 'loading' | 'round' | 'finale' | 'results';

const IDS = BOSSES.map((b) => b.id);
/** the final boss: its knockout plays the golden ticket */
export const LAST_BOSS = IDS[IDS.length - 1];

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked storage: progress lives in memory
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

/** One level-8 progress for the page (settings survive re-entering the level with storage blocked). */
let shared: CartoonProgress | null = null;

export class CartoonSession {
  state: SessionState = 'map';
  round: Round | null = null;
  readonly progress = (shared ??= new CartoonProgress(storage(), IDS, window.matchMedia?.('(pointer: coarse)').matches ?? false));
  /** debug: the QA bot plays */
  autopilot = false;
  private readonly bot = new Bot();
  private finale: GoldenFinale | null = null;
  private loaded: { def: BossDef; k: number } | null = null;
  private gen = 0;
  private dtMs = 16;
  private controlsKey = '';
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly svc: Services,
    private readonly view: CartoonView,
    private readonly toMenu: () => void,
  ) {
    this.apply(this.progress.data.settings);
    const tap = (): void => this.finale?.skip();
    svc.ui.gameHost.addEventListener('pointerdown', tap);
    this.cleanups.push(() => svc.ui.gameHost.removeEventListener('pointerdown', tap));
  }

  /** reduced motion: the level setting or the system preference */
  get calm(): boolean {
    return this.progress.data.settings.reducedMotion || (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  }

  private apply(s: CartoonSettings): void {
    // level-8 setting only; destroy() gives the music back to the other levels
    this.svc.audio.setMusicMuted(!s.music);
  }

  /** The boss map: pick a boss, settings, how to play. */
  showMap(): void {
    this.gen++;
    this.clearStage();
    this.state = 'map';
    const { ui, audio, save } = this.svc;
    ui.showHud(false);
    this.setControls(null);
    audio.music('cartoon');
    ui.showCartoonMap(this.progress.mapInfo(BOSSES, save.data.best[8] ?? 0), {
      onPlay: (id) => void this.play(id),
      onSettings: (s) => {
        this.progress.setSettings(s);
        this.apply(s);
      },
      onMenu: () => this.toMenu(),
    });
  }

  /** Loads the boss (and the hero, once) at the current k and starts its round. */
  async play(id: CartoonBossId): Promise<void> {
    const gen = ++this.gen;
    const { ui } = this.svc;
    this.clearStage();
    this.state = 'loading';
    ui.hideOverlays();
    ui.showHud(false);
    this.setControls(null);
    const def = bossDef(id);
    ui.setLoading(0.4, `Preparo il set di ${def.name}…`);
    await nextFrame();
    if (gen !== this.gen) return;
    const k = this.view.framing.k;
    const heroK = loadHeroArt(this.scene, k);
    const round = this.startRound(def, k, heroK, gen);
    ui.setLoading(null);
    this.round = round;
    this.state = 'round';
    this.svc.input.reset();
    ui.showHud(true);
    this.svc.audio.music(round.def.music);
  }

  private load(def: BossDef, k: number): void {
    const prev = this.loaded;
    if (prev && (prev.def !== def || prev.k !== k)) prev.def.unload(this.scene);
    if (!prev || prev.def !== def || prev.k !== k) def.load(this.scene, k);
    this.loaded = { def, k };
  }

  /** The round on `def`; a boss module that throws while loading / building = the stand-in boss. */
  private startRound(def: BossDef, k: number, heroK: number, gen: number): Round {
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    const make = (d: BossDef): Round => {
      this.load(d, k);
      return new Round(this.scene, d, k, heroK, 'provola', this.hooks(gen), seed);
    };
    try {
      return make(def);
    } catch (err) {
      console.error(`[cicciopoli] cartoon boss ${def.id} failed, stand-in`, err);
      def.unload(this.scene);
      this.loaded = null;
      return make(placeholderBoss(def.id, def.name, def.intro, def.tagline, '#e8b04a', def.music));
    }
  }

  private hooks(gen: number): ConstructorParameters<typeof Round>[5] {
    return {
      controls: () => this.controls(),
      autoFire: () => this.progress.data.settings.autoFire,
      sfx: (n) => this.svc.audio.sfx(n),
      vibrate: (p) => this.vibrate(p),
      calm: () => this.calm,
      textRes: () => this.view.textRes,
      end: (won, stats) => gen === this.gen && this.end(won, stats),
    };
  }

  private vibrate(p: number | readonly number[]): void {
    if (!this.progress.data.settings.vibration || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(typeof p === 'number' ? p : [...p]);
    } catch {
      /* not allowed without a gesture */
    }
  }

  private controls(): RoundControls {
    const r = this.round;
    if (this.autopilot && r) return this.bot.controls(r, this.dtMs);
    const i = this.svc.input;
    return {
      axisX: i.axisX,
      // 'cartoon' controls: ↑ / W / ▲ only aim, SALTA / Space / Z only jump
      aimUp: i.upHeld,
      jumpHeld: i.jumpHeld,
      jump: i.consume('jump'),
      dash: i.consume('dash'),
      fire: i.fireHeld || i.consume('fire'),
      swap: i.consume('swap'),
      super: i.consume('super'),
    };
  }

  update(dtMs: number): void {
    const r = this.round;
    let shake = { x: 0, y: 0 };
    if (this.state === 'finale') this.finale?.update(dtMs);
    if (r) {
      if (r.state !== 'fight') for (const a of ['jump', 'dash', 'swap', 'super', 'fire'] as const) this.svc.input.consume(a);
      // a slow frame runs several short steps: real-time speed, and a hitch never teleports through a hazard
      const steps = Math.min(CT_FLOW.maxSteps, Math.max(1, Math.ceil(dtMs / CT_FLOW.maxStepMs)));
      this.dtMs = Math.min(dtMs / steps, CT_FLOW.maxStepMs);
      for (let i = 0; i < steps && this.round === r; i++) shake = r.update(this.dtMs);
      if (this.state === 'round') this.sync(r);
    }
    this.view.update(dtMs, shake, r?.state === 'fight' && this.state === 'round' ? r.focusBox() : null);
  }

  private sync(r: Round): void {
    const fighting = r.state === 'intro' || r.state === 'fight';
    const s = this.progress.data.settings;
    this.setControls(fighting ? { level: 8, mode: 'cartoon', fire: 'enabled', club: 'hidden', down: 'hidden', jumpLabel: 'SALTA', autoFire: s.autoFire, weapon: r.weapon, superCards: Math.floor(r.cards) } : null);
    this.svc.ui.updateHud({
      level: 8,
      hearts: Math.max(0, r.player.hp),
      maxHearts: CT_PLAYER.hp,
      score: livePoints(r.damage, r.parries),
      timeMs: r.timeMs,
      progress: r.progress,
      cartoon: { cards: r.cards, weapon: r.weapon, bossName: r.def.name, bossIndex: Math.max(0, IDS.indexOf(r.def.id)), bossTotal: IDS.length },
    });
  }

  private setControls(c: ControlsLayout | null): void {
    const key = c ? `${c.autoFire}|${c.weapon}|${c.superCards}` : 'none';
    if (key === this.controlsKey) return;
    this.controlsKey = key;
    this.svc.ui.setControls(c);
  }

  /** The round is over: settle, record, then the finale or the report card. */
  private end(won: boolean, stats: RoundStats): void {
    const r = this.round;
    if (!r || this.state !== 'round') return;
    const def = r.def;
    const { save } = this.svc;
    const grade = won ? gradeOf(stats) : null;
    const score = scoreOf(stats, grade);
    const newBest = won && save.recordWin(8, score);
    if (won && grade) this.progress.recordKnockout(def.id, grade, score);
    const next = won ? this.progress.after(def.id) : null;
    const golden = won && def.id === LAST_BOSS;
    const info: CartoonResultInfo = {
      boss: def.id,
      bossName: def.name,
      won,
      progress: r.progress,
      timeMs: stats.timeMs,
      hp: Math.max(0, stats.hp),
      parries: stats.parries,
      supers: stats.supers,
      grade,
      score,
      best: save.data.best[8] ?? 0,
      newBest,
      golden,
      tip: tipFor(stats, won),
      shareText: shareTextFor(def.name, won, grade, r.progress),
      hasNext: next !== null,
    };
    this.setControls(null);
    if (golden) void this.playFinale(info);
    else this.results(info);
  }

  private async playFinale(info: CartoonResultInfo): Promise<void> {
    const gen = this.gen;
    this.state = 'finale';
    this.svc.ui.showHud(false);
    this.svc.audio.music(null);
    const logo = await loadLogo(this.scene);
    if (gen !== this.gen) return;
    this.finale = new GoldenFinale(this.scene, this.view.framing.k, heroScale(), logo, this.calm, (n) => this.svc.audio.sfx(n), () => this.round?.player.sprite.setVisible(false), () => this.results(info));
  }

  private results(info: CartoonResultInfo): void {
    if (this.state !== 'round' && this.state !== 'finale') return;
    const { ui, audio } = this.svc;
    this.finale?.destroy();
    this.finale = null;
    this.state = 'results';
    ui.showHud(false);
    audio.jingle(info.won ? 'win' : 'gameover');
    if (info.newBest) audio.sfx('record');
    const id = info.boss;
    const next = this.progress.after(id);
    ui.showCartoonResults(info, {
      onRetry: () => void this.play(id),
      onNext: info.hasNext && next ? () => void this.play(next) : undefined,
      onMap: () => this.showMap(),
      onMenu: () => this.toMenu(),
    });
  }

  private clearStage(): void {
    this.finale?.destroy();
    this.finale = null;
    this.round?.destroy();
    this.round = null;
  }

  layout(): void {
    this.view.layout();
  }

  destroy(): void {
    this.gen++;
    this.svc.audio.setMusicMuted(false);
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;
    this.clearStage();
    this.loaded?.def.unload(this.scene);
    this.loaded = null;
  }
}
