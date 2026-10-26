/**
 * Level 6 flow: pre-run panel (attract scroll behind it) -> 90 s run -> finale cinematic (all three
 * delivered) or a short end beat -> results; RIPROVA restarts in place, without the tutorial.
 * Owns the RushRun, progress / settings, input mapping, HUD sync and the event reactor.
 */
import type Phaser from 'phaser';
import type { ControlsLayout, RushDriverId, RushResultInfo, RushSettings, Services } from '../../contracts';
import { FINALE, FLOW, FX } from './config';
import { Finale } from './finale';
import { OracleBot } from './logic/oracleBot';
import { RushProgress } from './logic/progress';
import { settleRun } from './logic/results';
import { RushRun } from './logic/run';
import { RUSH_TEXT } from './logic/strings';
import type { LaneDir, RushOptions } from './logic/types';
import { Reactor, type EndEvent, type FinaleEvent } from './react';
import type { RushView } from './view';

export type SessionState = 'setup' | 'run' | 'ending' | 'finale' | 'results';

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null; // blocked storage: progress lives in memory
  }
}

/** One level-6 progress for the page, like save.ts: with storage writes blocked, choices survive re-entering the level. */
let shared: RushProgress | null = null;

export class RushSession {
  state: SessionState = 'setup';
  run: RushRun | null = null;
  readonly progress = (shared ??= new RushProgress(storage()));
  /** debug: the oracle autopilot drives (never hits) */
  autopilot = false;
  private readonly reactor: Reactor;
  private finale: Finale | null = null;
  private bot: OracleBot | null = null;
  private daily = false;
  private timeMs = 0;
  private attractD = 0;
  private braking = false;
  private lastTick = -1;
  /** v9 SFIORATO! slow-down pulse left (ms of real time) */
  private slowMs = 0;
  /** the side view the controls were last laid out for */
  private sideControls: boolean | null = null;
  private readonly idle: RushRun;
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly svc: Services,
    private readonly view: RushView,
    private readonly toMenu: () => void,
  ) {
    this.reactor = new Reactor({
      ui: svc.ui,
      audio: svc.audio,
      truck: view.truck,
      ents: view.ents,
      fx: view.fx,
      overlay: view.overlay,
      settings: () => this.progress.data.settings,
      later: (ms, fn) => void scene.time.delayedCall(ms, fn),
      pulse: (ms) => {
        if (!view.reducedMotion) this.slowMs = ms;
      },
      side: () => view.framing.side,
    });
    // a parked run that is never stepped: the truck idling on the road behind the setup panel
    this.idle = new RushRun({ seed: 1, driver: 'riflessi', daily: false, hints: false });
    this.apply(this.progress.data.settings);
    const host = svc.ui.gameHost;
    const onTap = (): void => this.tap();
    const onKey = (e: KeyboardEvent): void => {
      // a key held from the run (FRENA on Space, auto-repeat) never skips the finale; a fresh press does
      if (!e.repeat && this.state === 'finale' && (e.code === 'Enter' || e.code === 'Space' || e.code === 'Escape')) this.tap();
    };
    host.addEventListener('pointerdown', onTap);
    window.addEventListener('keydown', onKey);
    this.cleanups.push(
      () => host.removeEventListener('pointerdown', onTap),
      () => window.removeEventListener('keydown', onKey),
    );
  }

  /** The pre-run panel: driver, daily challenge, how to play, settings. */
  setup(): void {
    this.state = 'setup';
    const { ui, save } = this.svc;
    ui.showHud(false);
    ui.setControls(null);
    ui.showRushSetup(this.progress.setupInfo(save.data.best[6] ?? 0, new Date()), {
      onPlay: (driver, daily) => this.play(driver, daily),
      onSettings: (s) => {
        this.progress.setSettings(s);
        this.apply(s);
      },
      onMenu: () => this.toMenu(),
    });
  }

  private apply(s: RushSettings): void {
    this.view.setLook(s);
    // level-6 setting only (persisted in cicciopoli.rush.v1); destroy() gives the music back to the other levels
    this.svc.audio.setMusicMuted(!s.music);
  }

  private play(driver: RushDriverId, daily: boolean): void {
    if (!daily) this.progress.setDriver(driver);
    this.start(this.progress.optionsFor(daily, new Date(), randomSeed()));
  }

  /** A fresh run with these options (RIPROVA, debug seeds). */
  start(options: RushOptions): void {
    const { ui, audio, input } = this.svc;
    this.endFinale();
    this.view.reset();
    this.reactor.reset();
    this.run = new RushRun(options);
    this.bot = new OracleBot(this.run);
    this.daily = options.daily;
    this.state = 'run';
    this.lastTick = -1;
    this.braking = false;
    this.slowMs = 0;
    ui.hideOverlays();
    ui.showHud(true);
    this.controls();
    ui.updateHud(this.run.hud());
    audio.music('rush');
    input.reset();
  }

  /** The driver controls for the current view: ▲ ▼ + FRENA in the side view, ◀ ▶ + FRENA upright. */
  private controls(): void {
    const side = this.view.framing.side;
    this.sideControls = side;
    const layout: ControlsLayout = { level: 6, mode: 'driver', fire: 'hidden', club: 'hidden', down: 'enabled', jumpLabel: 'SALTA', swipe: this.progress.data.settings.swipe, side };
    this.svc.ui.setControls(layout);
  }

  /** RIPROVA: same kind of run (daily or not), new traffic unless daily, no tutorial. */
  retry(): void {
    this.start(this.progress.optionsFor(this.daily, new Date(), randomSeed()));
  }

  /** Tap on the game: skips the finale (after a moment) or dismisses the hint on screen. */
  private tap(): void {
    if (this.state === 'finale') this.finale?.skip();
    else if (this.state === 'run' && this.reactor.hint >= 0) this.reactor.done(this.reactor.hint);
  }

  update(dtMs: number): void {
    this.timeMs += dtMs;
    const run = this.run;
    if (this.state === 'finale') {
      this.finale?.update(dtMs);
      return;
    }
    this.view.tick(dtMs);
    if (this.state === 'setup' || !run) {
      this.attractD += (FLOW.attractSpeed * dtMs) / 1000;
      this.view.attract(this.attractD, this.idle.snapshot, this.timeMs, dtMs);
      return;
    }
    if (this.state === 'run') this.drive(run, this.slow(dtMs));
    else this.view.draw(run.snapshot, this.timeMs, dtMs);
  }

  /** Game time of this frame: a SFIORATO! pulse runs it a little slower for a moment. */
  private slow(dtMs: number): number {
    if (this.slowMs <= 0) return dtMs;
    this.slowMs -= dtMs;
    return dtMs * FX.nearSlowScale;
  }

  private drive(run: RushRun, dtMs: number): void {
    const { input, audio, ui } = this.svc;
    const dir = input.consumeDir();
    const laneDir: LaneDir = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
    const brake = input.downHeld;
    if (brake && !this.braking) {
      audio.sfx('brake');
      this.reactor.done(1);
    }
    this.braking = brake;
    const cmd = this.autopilot && this.bot ? this.bot.decide(dtMs) : { laneDir, brake };
    const events = run.step(dtMs, cmd);
    const { end, finale } = this.reactor.handle(events, this.timeMs);
    const snap = run.snapshot;
    this.view.draw(snap, this.timeMs, dtMs);
    ui.updateHud(run.hud());
    const s = Math.ceil(snap.timeLeftMs / 1000);
    if (snap.phase === 'play' && s <= FX.urgentS && s > 0 && s !== this.lastTick) {
      this.lastTick = s;
      audio.sfx('select');
    }
    if (end) this.finish(run, end, finale);
  }

  /** Fast-forwards the run on the autopilot (debug skipTo / win): events are dropped, the end is kept. */
  fastForward(toMs: number): void {
    const run = this.run;
    if (this.state !== 'run' || !run || !this.bot) return;
    const step = 1000 / 30;
    while (run.snapshot.phase === 'play' && run.snapshot.timeMs < toMs) {
      const events = run.step(step, this.bot.decide(step));
      const end = events.find((e): e is EndEvent => e.type === 'end');
      if (end) {
        this.view.ents.clear();
        this.finish(run, end, events.find((e): e is FinaleEvent => e.type === 'finale') ?? null);
        return;
      }
    }
    this.view.ents.clear();
  }

  private finish(run: RushRun, end: EndEvent, finale: FinaleEvent | null): void {
    const { ui, input } = this.svc;
    const result = settleRun(run.summary(), this.progress, this.svc.save, new Date());
    if (!this.progress.data.firstRunDone) this.progress.markFirstRunDone();
    input.reset();
    this.reactor.reset(); // banners still queued must not cover the end beat or the finale
    this.view.overlay.clear();
    if (finale) {
      this.playFinale(finale.title, finale.lines, result);
      return;
    }
    this.state = 'ending';
    const good = end.reason === 'time' && result.delivered > 0;
    ui.banner(end.title, { tone: good ? 'goal' : 'danger', ms: FLOW.endHoldMs });
    this.svc.audio.jingle(good ? 'win' : 'gameover');
    this.scene.time.delayedCall(FLOW.endHoldMs, () => this.results(result));
  }

  /** The ROADCOASTER finale (its banner over the sea at 0 s), then the results. */
  playFinale(title: string, lines: readonly string[], result: RushResultInfo): void {
    const { ui, audio } = this.svc;
    this.state = 'finale';
    ui.showHud(false);
    ui.setControls(null);
    ui.banner(title, { tone: 'power', sub: RUSH_TEXT.zeroTo, ms: FINALE.climbMs });
    audio.sfx('jet');
    const f = new Finale(this.scene, this.view.overlay, this.view.top, lines, () => audio.jingle('win'), () => {
      this.endFinale();
      this.results(result);
    });
    this.view.stageLayer(f.layer);
    this.view.showWorld(false);
    this.finale = f;
    this.layout();
  }

  private endFinale(): void {
    if (!this.finale) return;
    this.finale.destroy();
    this.finale = null;
    this.view.showWorld(true);
  }

  private results(info: RushResultInfo): void {
    if (this.state === 'results') return;
    const { ui, audio } = this.svc;
    this.state = 'results';
    ui.setControls(null);
    ui.showHud(false);
    if (info.newBest) audio.sfx('record');
    ui.showRushResults(info, { onRetry: () => this.retry(), onMenu: () => this.toMenu() });
  }

  layout(): void {
    this.view.layout();
    // a turn of the phone mid-run flips the view: the controls follow
    if (this.state === 'run' && this.sideControls !== this.view.framing.side) {
      this.controls();
      this.reactor.turned();
    }
    this.finale?.layout(this.scene.scale.width, this.scene.scale.height, this.view.overlay.unit);
  }

  /** Scene shutdown: its cameras are already gone, so the finale is dropped without re-framing the world. */
  destroy(): void {
    this.svc.audio.setMusicMuted(false);
    this.svc.audio.intensity?.(0);
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;
    this.finale?.destroy();
    this.finale = null;
  }
}
