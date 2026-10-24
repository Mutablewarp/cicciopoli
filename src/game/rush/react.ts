/**
 * Turns the run's events into feedback: sfx, DOM banners, vibration, world effects and overlay text.
 * Returns the end-of-run events so the session can move on (finale / results).
 */
import type { BannerTone, GameAudio, GameUI, RushSettings } from '../../contracts';
import { FLOW, FX } from './config';
import type { EntityView } from './entityView';
import type { Fx } from './fx';
import { RUSH_TEXT, formatPoints } from './logic/strings';
import type { PowerId, RushEvent } from './logic/types';
import type { Overlay } from './overlay';
import type { TruckView } from './truckView';

export interface ReactCtx {
  readonly ui: GameUI;
  readonly audio: GameAudio;
  readonly truck: TruckView;
  readonly ents: EntityView;
  readonly fx: Fx;
  readonly overlay: Overlay;
  readonly settings: () => RushSettings;
  /** scene timer (paused with the scene) */
  readonly later: (ms: number, fn: () => void) => void;
}

export type EndEvent = Extract<RushEvent, { type: 'end' }>;
export type FinaleEvent = Extract<RushEvent, { type: 'finale' }>;

interface BannerOpts {
  readonly tone: BannerTone;
  readonly sub?: string;
  readonly ms: number;
}

const LANE_NAMES = ['Corsia di sinistra', 'Corsia centrale', 'Corsia di destra'];
const CONFETTI = [0x3ad06a, 0xffd23a, 0xff5a4a, 0xffffff];
const GOLD = [0xffd040, 0xfff0a0];
const SAUCE = [0xc8501c, 0xf0a040];
const POWER_TINT: Readonly<Record<PowerId, readonly number[]>> = {
  shield: GOLD,
  radar: [0xf0b040, 0x8a5420],
  sprint: [0xfff6dc, 0xf0c060],
  grip: [0xffb020, 0xffe070],
};

export class Reactor {
  /** delivery zone id of each order (the bag flies to its customer) */
  private readonly zoneOf = new Map<number, number>();
  private lastPass = -1e9;
  /** session time until which the banner on screen holds key information (order, zone, result) */
  private keyUntil = 0;
  /** bumps on reset: banners still queued for an old run never show */
  private gen = 0;
  /** index of the hint on screen (-1 = none) */
  hint = -1;

  constructor(private readonly c: ReactCtx) {}

  reset(): void {
    this.zoneOf.clear();
    this.lastPass = -1e9;
    this.keyUntil = 0;
    this.gen++;
    this.hint = -1;
  }

  /** Key banners never cut each other short: a new one waits until the one on screen has been read. */
  private key(now: number, text: string, o: BannerOpts): void {
    const wait = Math.max(0, this.keyUntil - now);
    this.keyUntil = now + wait + o.ms;
    if (wait === 0) {
      this.c.ui.banner(text, o);
      return;
    }
    const gen = this.gen;
    this.c.later(wait, () => {
      if (gen === this.gen) this.c.ui.banner(text, o);
    });
  }

  /** The player did what hint `index` asks: it goes away. */
  done(index: number): void {
    if (this.hint !== index) return;
    this.hint = -1;
    this.c.overlay.hideHint();
  }

  private vibrate(p: number | readonly number[]): void {
    if (!this.c.settings().vibration || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(typeof p === 'number' ? p : [...p]);
    } catch {
      /* not allowed here (no user activation yet): silent */
    }
  }

  handle(events: readonly RushEvent[], timeMs: number): { end: EndEvent | null; finale: FinaleEvent | null } {
    let end: EndEvent | null = null;
    let finale: FinaleEvent | null = null;
    for (const e of events) {
      if (e.type === 'end') end = e;
      else if (e.type === 'finale') finale = e;
      else this.one(e, timeMs);
    }
    return { end, finale };
  }

  private one(e: Exclude<RushEvent, EndEvent | FinaleEvent>, timeMs: number): void {
    const { ui, audio, truck, ents, fx, overlay } = this.c;
    const t = truck.pos;
    switch (e.type) {
      case 'lane':
        if (e.result === 'start') {
          audio.sfx('lane');
          fx.once(t.x - e.dir * 12, t.y + 30, 'dust');
          this.done(0);
        } else if (e.result === 'blocked') {
          audio.sfx('bump');
          truck.bump(e.dir);
          fx.shake(FX.shakeBumpMs, FX.shakeBumpPx);
          fx.burst(t.x + e.dir * 18, t.y, [0xffb020, 0xffffff], 8);
        }
        break;
      case 'hit':
        if (e.shielded) {
          audio.sfx('shieldBreak');
          fx.burst(t.x, t.y - 20, GOLD, 18);
          overlay.flash(0xffd040, 0.22, 180);
          overlay.label(t.x, t.y - 36, 'SCUDO!', '#ffd23a');
        } else {
          audio.sfx('crash');
          truck.hit();
          fx.shake(FX.shakeHitMs, FX.shakeHitPx);
          overlay.flash(0xff2a2a, 0.34, FX.flashHitMs);
          fx.once(t.x, t.y - 26, 'hitStar', 1.5);
          this.vibrate(FX.vibrateHitMs);
        }
        break;
      case 'despawn': {
        if (e.reason === 'passed') break;
        const s = ents.detach(e.id);
        if (!s) break;
        if (e.reason === 'hit') fx.knockAway(s, Math.sign(s.x - t.x));
        else if (e.reason === 'picked') fx.pop(s);
        else {
          fx.once(s.x, s.y, 'poof', 1.4);
          s.destroy();
        }
        break;
      }
      case 'slip':
        audio.sfx('melt');
        fx.burst(t.x, t.y + 24, SAUCE, 14);
        overlay.label(t.x, t.y - 34, 'SALSA!', '#ffb050', 9);
        break;
      case 'pass': {
        if (timeMs - this.lastPass < FX.passGapMs) break;
        this.lastPass = timeMs;
        const w = ents.where(e.id);
        fx.popup(w ? w.x : t.x, w ? w.y - 16 : t.y + 40, e.points);
        audio.sfx('coin');
        break;
      }
      case 'combo':
        audio.sfx('combo');
        overlay.label(t.x, t.y - 96, e.text, '#ffd23a', 12);
        break;
      case 'pickup':
        if (e.kind === 'fries' || e.kind === 'airNugget') {
          audio.sfx(e.kind === 'fries' ? 'fries' : 'coin');
          fx.popup(t.x, t.y - 34, e.points);
        }
        fx.once(t.x, t.y - 24, 'sparkle', 1.5);
        break;
      case 'powerStart':
        audio.sfx('powerup');
        // the banner only when it is free; else a toast over the truck (the HUD chip names it too)
        if (timeMs >= this.keyUntil) ui.banner(e.title, { tone: 'power', sub: e.sub, ms: 1500 });
        else overlay.label(t.x, t.y - 48, e.title, '#ffd23a', 10);
        fx.burst(t.x, t.y, POWER_TINT[e.power], 22);
        break;
      case 'powerWarn':
        audio.sfx('expire');
        break;
      case 'powerEnd':
        if (e.power === 'shield' && e.reason === 'expired') fx.once(t.x, t.y, 'poof', 2);
        break;
      case 'orderNew':
        audio.sfx('horn');
        this.key(timeMs, e.title, { tone: 'info', sub: e.order.text, ms: 2600 });
        break;
      case 'deliveryZone':
        this.zoneOf.set(e.order, e.id);
        ents.pointAt({ id: e.id, lane: e.lane });
        audio.sfx('checkpoint');
        // the miss that opened a recovery zone comes in the same step: one banner tells both
        if (e.recovery) this.key(timeMs, RUSH_TEXT.missed, { tone: 'danger', sub: `${RUSH_TEXT.lastChance}: ${LANE_NAMES[e.lane]}`, ms: 2200 });
        else this.key(timeMs, e.title, { tone: 'goal', sub: LANE_NAMES[e.lane], ms: 1700 });
        break;
      case 'delivered':
        this.delivered(e, timeMs);
        break;
      case 'missed':
        audio.sfx('hurt');
        if (!e.lost) break;
        this.key(timeMs, e.title, { tone: 'danger', sub: e.sub, ms: 1800 });
        ents.pointAt(null);
        break;
      case 'zoneChange':
        audio.sfx(e.index === 0 ? 'select' : 'checkpoint');
        this.key(timeMs, e.title, { tone: 'info', sub: e.sub, ms: 2200 });
        if (e.index > 0) overlay.flash(0xffffff, 0.18, 260);
        break;
      case 'zoneClean':
        audio.sfx('heal');
        overlay.label(t.x, t.y - 56, `${e.title} +${e.points}`, '#7dff8a', 10);
        break;
      case 'flightStart':
        audio.sfx('jet');
        this.key(timeMs, e.title, { tone: 'power', sub: e.sub, ms: 2400 });
        overlay.flash(0xffffff, 0.45, 300);
        fx.shake(FX.shakeLandMs * 2, FX.shakeLandPx);
        fx.burst(t.x, t.y + 28, [0xffd23a, 0xff8a2a, 0xffffff], 30);
        break;
      case 'flightEnd':
        audio.sfx('land');
        fx.shake(FX.shakeLandMs, FX.shakeLandPx);
        fx.once(t.x - 14, t.y + 28, 'dust', 1.5);
        fx.once(t.x + 14, t.y + 28, 'dust', 1.5);
        break;
      case 'hint':
        this.hint = e.index;
        overlay.hint(e.index === 0 && this.c.settings().swipe === false ? RUSH_TEXT.hintNoSwipe : e.text);
        this.c.later(FLOW.hintMs, () => this.done(e.index));
        break;
      case 'spawn':
        break;
    }
  }

  private delivered(e: Extract<RushEvent, { type: 'delivered' }>, timeMs: number): void {
    const { audio, truck, ents, fx, overlay } = this.c;
    const zoneId = this.zoneOf.get(e.order) ?? -1;
    ents.pointAt(null);
    this.done(2);
    const w = ents.where(zoneId);
    let last = { x: w ? w.cx : truck.pos.x, y: w ? w.cy : truck.pos.y };
    // the customer scrolls down with the sidewalk: aim at where it is now
    const customer = (): { x: number; y: number } => {
      const now = ents.where(zoneId);
      if (now) last = { x: now.cx, y: now.cy };
      return last;
    };
    audio.sfx('deliver');
    this.vibrate(FX.vibrateDeliver);
    this.key(timeMs, e.title, { tone: 'goal', sub: `+${formatPoints(e.points)} PUNTI · FRESCHEZZA ${Math.round(e.fresh)}%`, ms: 2000 });
    // the bubble is the customer's: it goes once the customer has scrolled behind the truck's rear
    const speaker = (): { x: number; y: number } | null => {
      const now = ents.where(zoneId);
      return now && now.cy <= 2 * truck.pos.y - truck.pos.top ? { x: now.cx, y: now.cy } : null;
    };
    overlay.bubble(speaker, e.line, () => truck.pos.top - FX.bubbleTruckGapPx);
    fx.bag({ x: truck.pos.x, y: truck.pos.y - 10 * (1 + truck.pos.lift) }, customer, e.sky, () => {
      const at = customer();
      fx.burst(at.x, at.y - 6, CONFETTI, 28);
      fx.once(at.x, at.y - 8, 'sparkle', 1.5);
    });
  }
}
