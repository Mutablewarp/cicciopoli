/**
 * Level 7 flow: pre-shift panel -> one shift of 8 customers -> YOU ARE SO GOLDEN finale (3 stars)
 * or the TURNO FINITO! / TURNO CHIUSO! beat -> results; RIPROVA starts a new shift at once, without
 * the tutorial. Owns the KitchenShift, progress / settings, taps (game host, CSS px -> the stations),
 * the action button, HUD sync and the event reactor.
 */
import type Phaser from 'phaser';
import type { ButtonState, ControlsLayout, KitchenResultInfo, KitchenSettings, Services } from '../../contracts';
import { KITCHEN_SHIFT } from '../../config/kitchen';
import { mulberry32 } from '../rush/logic/rng';
import { KITCHEN_FX } from './config';
import { GoldenFinale } from './golden';
import { actionTip } from './guide';
import { hitKitchen } from './layout';
import { CAREFUL, KitchenBot } from './logic/bot';
import { KitchenProgress } from './logic/progress';
import { settleShift } from './logic/results';
import { KitchenShift } from './logic/shift';
import { BUTTON } from './logic/strings';
import type { KitchenEvent, KitchenOptions, KitchenSnapshot, KitchenTarget } from './logic/types';
import { listenPointer } from './pointer';
import { Reactor } from './react';
import type { KitchenView } from './view';

export type SessionState = 'setup' | 'play' | 'ending' | 'finale' | 'results';

/** debug fast-forward guard (a stuck shift never hangs the page) */
const FAST_FORWARD_MAX_MS = 30 * 60_000;

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

/** One level-7 progress for the page (settings survive re-entering the level with storage blocked). */
let shared: KitchenProgress | null = null;

export class KitchenSession {
  state: SessionState = 'setup';
  shift: KitchenShift | null = null;
  readonly progress = (shared ??= new KitchenProgress(storage()));
  /** debug: the careful bot plays */
  autopilot = false;
  private bot: KitchenBot | null = null;
  private readonly reactor: Reactor;
  private finale: GoldenFinale | null = null;
  private result: KitchenResultInfo | null = null;
  private controlsKey = '';
  private timeMs = 0;
  /** the view of the last frame drawn: entering the kitchen picks its page */
  private shownView: KitchenSnapshot['view'] | null = null;
  private readonly cleanups: Array<() => void> = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly svc: Services,
    private readonly view: KitchenView,
    private readonly paused: () => boolean,
    private readonly toMenu: () => void,
  ) {
    this.reactor = new Reactor({
      audio: svc.audio,
      view,
      settings: () => this.progress.data.settings,
      snapshot: () => this.snapshot,
      later: (ms, fn) => void scene.time.delayedCall(ms, fn),
    });
    this.apply(this.progress.data.settings);
    // a paged kitchen taps on release: a vertical swipe switches the page instead
    this.cleanups.push(
      listenPointer(svc.ui.gameHost, {
        tap: (x, y) => this.tap(x, y),
        swipe: (page) => this.swipe(page),
        swipes: () => this.view.paged && this.inKitchen,
      }),
    );
  }

  /** The shift is on and the kitchen view is the one wanted. */
  private get inKitchen(): boolean {
    return this.state === 'play' && this.shift?.snapshot.view === 'kitchen';
  }

  /** Paged kitchen: a swipe up shows COTTURA (1), down MONTAGGIO (0). */
  private swipe(page: number): void {
    if (!this.paused() && this.inKitchen && this.view.kitchenReady) this.view.showPage(page);
  }

  private get snapshot(): KitchenSnapshot {
    if (!this.shift) throw new Error('kitchen: no shift');
    return this.shift.snapshot;
  }

  /** prefers-reduced-motion or the level setting */
  get calm(): boolean {
    return this.progress.data.settings.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** The pre-shift panel: record, GIOCA ORA, how to play, settings. */
  setup(): void {
    this.state = 'setup';
    const { ui, save } = this.svc;
    ui.showHud(false);
    ui.setControls(null);
    this.view.reset();
    ui.showKitchenSetup(this.progress.setupInfo(save.data.best[7] ?? 0), {
      onPlay: () => this.start(this.progress.optionsFor(randomSeed())),
      onSettings: (s) => {
        this.progress.setSettings(s);
        this.apply(s);
      },
      onMenu: () => this.toMenu(),
    });
  }

  private apply(s: KitchenSettings): void {
    // level-7 setting only (cicciopoli.kitchen.v1); destroy() gives the music back to the other levels
    this.svc.audio.setMusicMuted(!s.music);
  }

  /** A fresh shift with these options (GIOCA ORA, RIPROVA, debug seeds). */
  start(options: KitchenOptions): void {
    const { ui, audio, input } = this.svc;
    this.endFinale();
    this.view.reset();
    this.reactor.reset();
    this.shift = new KitchenShift(options);
    this.bot = new KitchenBot(CAREFUL, mulberry32(options.seed ^ 0x5bd1e995));
    this.state = 'play';
    this.result = null;
    this.controlsKey = '';
    this.shownView = null;
    ui.hideOverlays();
    ui.showHud(true);
    audio.music('kitchen');
    input.reset();
    this.handle(this.shift.step(0));
    this.draw(this.shift.snapshot);
  }

  /** RIPROVA: a new shift right away, never the tutorial again. */
  retry(): void {
    this.start({ ...this.progress.optionsFor(randomSeed()), tutorial: false });
  }

  update(dtMs: number): void {
    this.timeMs += dtMs;
    if (this.state === 'finale') {
      this.finale?.update(dtMs);
      return;
    }
    const shift = this.shift;
    if (!shift || (this.state !== 'play' && this.state !== 'ending')) return;
    if (this.state === 'play') {
      if (this.svc.input.consume('fire')) this.fire();
      const events = shift.step(dtMs);
      if (this.autopilot && this.bot) events.push(...this.bot.update(shift, dtMs));
      this.handle(events);
    }
    this.draw(shift.snapshot);
  }

  private handle(events: readonly KitchenEvent[], tapped: KitchenTarget | null = null): void {
    this.reactor.handle(events, tapped);
    for (const e of events) {
      if (e.type === 'tutorialDone') this.progress.markTutorialDone();
      if (e.type === 'shiftEnd') this.end(e.completed, events.some((x) => x.type === 'golden'));
    }
  }

  /* ----------------------------------------------------------------- input */

  /** The big action button (or Enter / Space): PRENDI L'ORDINE, SERVI. */
  private fire(): void {
    const shift = this.shift;
    if (!shift) return;
    const s = shift.snapshot;
    if (s.phase === 'ordering') this.handle(shift.takeOrder(), { kind: 'action' });
    else if (this.canServe(s)) this.handle(shift.serve(), { kind: 'action' });
  }

  /** A tap on the game (CSS px of the host). */
  private tap(cssX: number, cssY: number): void {
    if (this.paused()) return;
    if (this.state === 'finale') {
      this.finale?.skip();
      return;
    }
    const shift = this.shift;
    if (this.state !== 'play' || !shift) return;
    const s = shift.snapshot;
    if (s.view === 'counter') {
      if (this.view.counterReady && (s.phase === 'walkIn' || s.phase === 'reaction' || s.phase === 'walkOut')) this.handle(shift.skipDialog());
      return;
    }
    if (!this.view.kitchenReady) return;
    const l = this.view.station.layout;
    const p = this.view.toLocal(cssX, cssY);
    if (this.view.onTab(p)) return this.view.showPage(1 - this.view.page);
    const t = l && hitKitchen(l, p.x, p.y, this.view.stack.topY);
    if (t) this.act(shift, s, t);
    else this.view.station.nudge(p);
  }

  private act(shift: KitchenShift, s: KitchenSnapshot, t: KitchenTarget): void {
    let events: KitchenEvent[] = [];
    switch (t.kind) {
      case 'bin':
        events = shift.tapBin(t.id);
        break;
      case 'bun':
        events = shift.closeBurger();
        break;
      case 'griddle':
        if (s.griddle[t.slot]) events = shift.flipOrTake(t.slot);
        break;
      case 'fryer':
        if (s.fryer[t.basket]) events = shift.lift(t.basket);
        break;
      case 'drink':
        events = shift.pickDrink(t.id);
        break;
      case 'tray':
        if (s.tray[t.part] !== null) events = shift.trashItem({ from: 'tray', part: t.part });
        break;
      case 'stackTop':
        if (s.stack.length > 0) events = shift.removeTop();
        break;
      case 'action':
        return this.fire();
    }
    this.handle(events, t);
  }

  /** SERVI: a wrapped burger on the tray, at once (the guide's 'Tutto pronto' and the button agree; the
   * closed burger's show goes on in the kitchen while the camera slides back). */
  private canServe(s: KitchenSnapshot): boolean {
    return s.phase === 'cooking' && s.canServe;
  }

  /* ------------------------------------------------------------------ draw */

  private controlsFor(s: KitchenSnapshot): ControlsLayout {
    const p = s.phase;
    const fire: ButtonState = p === 'ordering' ? 'enabled' : p === 'walkIn' ? 'disabled' : p === 'cooking' ? (this.canServe(s) ? 'enabled' : 'disabled') : 'hidden';
    const actionLabel = p === 'cooking' ? BUTTON.serve : BUTTON.take;
    return { level: 7, mode: 'kitchen', fire, club: 'hidden', down: 'hidden', jumpLabel: 'SALTA', actionLabel };
  }

  private draw(s: KitchenSnapshot): void {
    const { ui } = this.svc;
    const v = this.view;
    if (this.state === 'play') {
      // a paged kitchen opens on the page of the next step (COTTURA: the cooking comes first)
      if (s.view === 'kitchen' && this.shownView !== 'kitchen') v.showPage(s.guide ? v.pageOfTarget(s.guide.target) : 1, true);
      this.shownView = s.view;
      v.show(s.view);
    }
    v.sync(s, this.timeMs);
    const playing = this.state === 'play';
    const c = this.controlsFor(s);
    const key = playing ? `${c.fire}|${c.actionLabel}` : 'none';
    if (key !== this.controlsKey) {
      this.controlsKey = key;
      ui.setControls(playing ? c : null);
    }
    const done = s.index + (s.phase === 'reaction' || s.phase === 'walkOut' || s.phase === 'finished' ? 1 : 0);
    ui.updateHud({
      level: 7,
      hearts: s.hearts,
      maxHearts: KITCHEN_SHIFT.hearts,
      score: s.score,
      timeMs: s.timeMs,
      progress: done / s.total,
      kitchen: {
        view: s.view,
        ticket: s.ticket,
        // the shift's end banner speaks alone
        say: s.say && v.counterReady && playing ? { ...s.say, anchor: v.headCss() } : null,
        patience: s.patience,
        served: { done, total: s.total },
        hint: s.tutorial && s.guide ? s.guide.text : null,
        takingsCents: s.takingsCents,
      },
    });
    this.drawGuide(s);
  }

  private drawGuide(s: KitchenSnapshot): void {
    const g = s.guide;
    const v = this.view;
    const hints = s.tutorial || this.progress.data.settings.hints;
    const action = g?.target.kind === 'action';
    const ready = action ? (s.view === 'counter' ? v.counterReady : v.kitchenReady) : v.kitchenReady;
    // SERVI in the kitchen: the button blinks and the hint says it (a hand over the kitchen would cover a pan or a label)
    if (!g || !hints || !ready || this.state !== 'play' || (action && (!s.tutorial || s.view === 'kitchen'))) {
      v.guide.hide();
      return;
    }
    const tip = action ? actionTip(this.svc.ui.gameHost, this.svc.viewport) : null;
    const rect = v.targetWorld(g.target, tip?.at ?? null);
    // pans and cans have their label under them: the hand points from beside (a target on the other page: at its tab)
    const here = action || v.pageOfTarget(g.target) === v.page;
    const side = here && (g.target.kind === 'bin' || g.target.kind === 'bun' || g.target.kind === 'drink');
    v.guide.update({ rect, hand: s.tutorial, pulse: !action, dir: tip?.dir ?? (side ? 'side' : 'up'), maxX: v.kitchenRight }, this.timeMs, this.calm);
  }

  /* ------------------------------------------------------------------- end */

  private end(completed: boolean, golden: boolean): void {
    const shift = this.shift;
    if (!shift || this.state !== 'play') return;
    const { ui, input, audio } = this.svc;
    this.result = settleShift(shift.summary, this.progress, this.svc.save);
    input.reset();
    this.controlsKey = 'none';
    ui.setControls(null);
    this.view.guide.hide();
    if (golden) {
      this.state = 'finale';
      ui.showHud(false);
      audio.sfx('golden');
      this.finale = new GoldenFinale(this.scene, this.view, this.calm, () => this.results());
      return;
    }
    this.state = 'ending';
    this.reactor.endBanner(completed, KITCHEN_FX.endHoldMs);
    this.scene.time.delayedCall(KITCHEN_FX.endHoldMs, () => this.results());
  }

  /** debug: the careful bot plays (events dropped) until customer `index` walks in or the shift ends (Infinity: to its end). */
  fastForward(index: number): void {
    const { shift, bot } = this;
    if (this.state !== 'play' || !shift || !bot) return;
    const step = KITCHEN_SHIFT.maxStepMs;
    this.view.reset();
    this.reactor.reset();
    for (let t = 0; t < FAST_FORWARD_MAX_MS && this.state === 'play'; t += step) {
      const s = shift.snapshot;
      if (s.phase === 'finished' || (s.index >= index && (s.phase === 'walkIn' || s.phase === 'ordering'))) break;
      const events = [...shift.step(step), ...bot.update(shift, step)];
      this.handle(events.filter((e) => e.type === 'tutorialDone' || e.type === 'golden' || e.type === 'shiftEnd'));
    }
    // the finale draws no shift frames: the counter (till, customer) shows where the shift got to
    this.view.sync(shift.snapshot, this.timeMs);
  }

  /** debug: end the shift now with what was served so far (TURNO CHIUSO). */
  forceEnd(): void {
    this.end(false, false);
  }

  private endFinale(): void {
    this.finale?.destroy();
    this.finale = null;
  }

  private results(): void {
    const info = this.result;
    if (!info || (this.state !== 'ending' && this.state !== 'finale')) return;
    const { ui, audio } = this.svc;
    this.endFinale();
    this.state = 'results';
    ui.setControls(null);
    ui.showHud(false);
    if (info.newBest) audio.sfx('record');
    ui.showKitchenResults(info, { onRetry: () => this.retry(), onMenu: () => this.toMenu() });
  }

  layout(): void {
    this.view.layout();
  }

  destroy(): void {
    this.svc.audio.setMusicMuted(false);
    this.cleanups.forEach((fn) => fn());
    this.cleanups.length = 0;
    this.endFinale();
  }
}
