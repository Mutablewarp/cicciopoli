/**
 * Turns the shift's events into feedback: sfx, vibration, banners, flights to the burger / tray /
 * trash, drops, flips, sparkles, floating texts and shakes. The views keep following the snapshot;
 * this only adds the motion between two snapshots.
 */
import { DRINKS, KITCHEN, SAUCES, STARTERS } from '../../art/kitchen/keys';
import type { GameAudio, KitchenSettings } from '../../contracts';
import { COUNTER_VIEW, KITCHEN_COLORS, KITCHEN_FX, TOUCH } from './config';
import type { Point } from './framing';
import { haptic } from './haptic';
import { hiRes } from './hiRes';
import { lineWidth } from './labels';
import { BANNER, plusEuro, tipLine } from './logic/strings';
import type { KitchenEvent, KitchenSnapshot, KitchenTarget, TrayPart } from './logic/types';
import type { KitchenView } from './view';

export interface ReactCtx {
  readonly audio: GameAudio;
  readonly view: KitchenView;
  readonly settings: () => KitchenSettings;
  readonly snapshot: () => KitchenSnapshot;
  /** scene timer (paused with the scene) */
  readonly later: (ms: number, fn: () => void) => void;
}

const TEXT = KITCHEN_COLORS.text;
const TIP_DELAY_MS = 450;
const POINTS_DELAY_MS = 250;
/** station texts start under the item: their rise stays clear of the ticket over the top of the plan */
const FLOAT_DY = 8;
/** price, tip and points stand in a right-aligned column over the till, right of the customer, each on its
 * dark plate (11 px tall at 1x), one row over the other: they pop in turn and fade where they are, never
 * over each other, the customer or past the screen's edge (counterView.money) */
const MONEY_ROW = 12;
const MONEY = { plate: true, ms: KITCHEN_FX.moneyFloatMs, right: true, rise: 0 } as const;
/** a plate's width at 1x (labels.ts 'plate': 3 px round the text) */
const plateW = (text: string): number => lineWidth(text.toUpperCase()) + 6;
/** COMBO and the end-of-shift banner: plates drawn at the counter, clear of the neon and the bubble */
const COMBO_MS = 1400;
const END_SCALE = 3;

export class Reactor {
  /** bumps on reset: delayed feedback of an old shift never plays */
  private gen = 0;

  constructor(private readonly c: ReactCtx) {}

  reset(): void {
    this.gen++;
  }

  /** A short vibration when the player wants them (KitchenSettings.vibration): haptic.ts (an iPhone ticks instead). */
  vibrate(ms: number): void {
    if (this.c.settings().vibration) haptic(ms);
  }

  private later(ms: number, fn: () => void): void {
    const gen = this.gen;
    this.c.later(ms, () => {
      if (gen === this.gen) fn();
    });
  }

  private get k(): KitchenView {
    return this.c.view;
  }

  /** the tray's art scale on this plan */
  private get ts(): number {
    return this.k.station.layout?.art.tray ?? 1;
  }

  private stationPoint(e: { station: 'griddle' | 'fryer'; index: number }): Point {
    return e.station === 'griddle' ? this.k.cook.slotPoint(e.index) : this.k.cook.wellPoint(e.index);
  }

  /** A sprite of a tray place (its hi-res paper boat when there is one) flies there and shows when it lands. */
  private toTray(part: TrayPart, pixelKey: string, frame: number, from: Point): void {
    const st = this.k.station;
    const at = st.layout?.trayAt[part];
    if (!at) return;
    st.hold(part, true);
    const { key, k } = hiRes(st.root.scene, pixelKey);
    const ts = this.ts;
    this.k.fx.fly(st.top, key, frame, from, () => ({ x: at.x, y: at.y - 12 * ts }), { scale: k, scaleTo: ts * k }, () => {
      st.hold(part, false);
      this.c.audio.sfx('plop');
      this.vibrate(TOUCH.vibrate.drop);
    });
  }

  private toTrash(key: string, frame: number, from: Point, scale = 1, scaleTo = 0.8): void {
    const st = this.k.station;
    this.k.fx.fly(st.top, key, frame, from, () => st.trashMouth, { spin: 1, scale, scaleTo }, () => st.openTrash());
  }

  /** `tapped` = what the player tapped to cause them (null: the shift's clock or the debug autopilot). */
  handle(events: readonly KitchenEvent[], tapped: KitchenTarget | null = null): void {
    for (const e of events) this.one(e, tapped);
  }

  private one(e: KitchenEvent, tapped: KitchenTarget | null): void {
    const { audio } = this.c;
    const k = this.k;
    const st = k.station;
    const top = st.top;
    switch (e.type) {
      case 'customerIn':
        audio.sfx('doorbell');
        break;
      case 'griddlePlaced':
        audio.sfx('sizzleBig');
        st.press({ kind: 'bin', id: e.item }, false);
        k.cook.drop('griddle', e.slot);
        this.vibrate(TOUCH.vibrate.drop);
        break;
      case 'flipped':
        audio.sfx('flip');
        k.cook.flip(e.slot);
        break;
      case 'perfect':
        audio.sfx('ding');
        k.fx.sparkle(top, this.stationPoint(e));
        break;
      case 'burning':
        audio.sfx('burn');
        break;
      case 'burnt':
        audio.sfx('burn');
        k.fx.float(top, e.text, { ...this.stationPoint(e), y: this.stationPoint(e).y + FLOAT_DY }, TEXT.red);
        k.fx.shake();
        this.vibrate(KITCHEN_FX.vibrate.burnt);
        break;
      case 'griddleTaken': {
        const p = k.cook.slotPoint(e.slot);
        k.stack.from = p;
        if (e.text) {
          k.fx.float(top, e.text, { x: p.x, y: p.y + FLOAT_DY });
          k.fx.sparkle(top, p);
        }
        break;
      }
      case 'fryDropped':
        audio.sfx('dunk');
        st.press({ kind: 'bin', id: e.item }, false);
        k.cook.drop('fryer', e.basket);
        this.vibrate(TOUCH.vibrate.drop);
        break;
      case 'fryLifted': {
        const p = k.cook.wellPoint(e.basket);
        audio.sfx('lift');
        k.cook.lift(e.basket);
        if (e.text) {
          k.fx.float(top, e.text, { x: p.x, y: p.y + FLOAT_DY });
          k.fx.sparkle(top, p);
        }
        if (e.to === 'stack') k.stack.from = p;
        else if (e.to === 'cone') this.toTray('cone', KITCHEN.cone, 1, p);
        else if (e.to === 'side' && (STARTERS as readonly string[]).includes(e.item)) this.toTray('side', KITCHEN.starterBox, STARTERS.indexOf(e.item as (typeof STARTERS)[number]), p);
        break;
      }
      case 'stacked':
        audio.sfx((SAUCES as readonly string[]).includes(e.layer.kind) ? 'squeeze' : 'plop');
        if (e.layer.quality === null) st.press({ kind: 'bin', id: e.layer.kind }, false);
        k.stack.from ??= st.centre({ kind: 'bin', id: e.layer.kind });
        this.later(KITCHEN_FX.flightMs, () => this.vibrate(TOUCH.vibrate.drop));
        break;
      case 'wrapped': {
        // the top bun lands, the burger is shown off with its stars, then wrapped and sent to the tray
        audio.sfx('plop');
        if (e.stars === 5) this.later(KITCHEN_FX.reveal.starEveryMs * 5, () => audio.sfx('ding'));
        st.press({ kind: 'bun' }, false);
        st.hold('burger', true);
        const at = (): Point => st.layout?.trayAt.burger ?? { x: 0, y: 0 };
        k.stack.wrap(
          e.stars,
          () => ({ x: at().x, y: at().y - 16 * this.ts }),
          () => audio.sfx('wrap'),
          () => {
            st.hold('burger', false);
            audio.sfx('plop');
          },
        );
        break;
      }
      case 'trayPut': {
        if (e.part !== 'drink') break;
        const id = this.c.snapshot().tray.drink;
        if (!id) break;
        st.press({ kind: 'drink', id }, false);
        const from = st.centre({ kind: 'drink', id });
        if (from) this.toTray('drink', KITCHEN.drink, DRINKS.indexOf(id), from);
        break;
      }
      case 'trashed':
        audio.sfx('trash');
        if (tapped?.kind === 'griddle' || tapped?.kind === 'fryer') {
          const i = tapped.kind === 'griddle' ? tapped.slot : tapped.basket;
          const look = k.cook.look(tapped.kind, i);
          this.toTrash(look.key, look.frame, tapped.kind === 'griddle' ? k.cook.slotPoint(i) : k.cook.wellPoint(i));
        } else if (e.from === 'tray') {
          const part = e.what as TrayPart;
          const s = st.trayItem(part);
          this.toTrash(s.texture.key, Number(s.frame.name), { x: s.x, y: s.y - 10 * this.ts }, s.scaleX, s.scaleX * (0.8 / this.ts));
        } else this.later(KITCHEN_FX.flightMs, () => st.openTrash());
        break;
      case 'nope':
        audio.sfx('bump');
        st.press(e.target, true);
        break;
      case 'served':
        audio.sfx('serve');
        this.vibrate(KITCHEN_FX.vibrate.serve);
        break;
      case 'rated':
        this.rated(e.stars, e.priceCents, e.tipCents, e.points);
        break;
      case 'angryLeave':
        audio.sfx('grumble');
        k.fx.shake(KITCHEN_FX.shakePx + 1);
        this.vibrate(KITCHEN_FX.vibrate.angry);
        break;
      case 'combo': {
        audio.sfx('combo');
        const c = k.counter.combo(plateW(e.text));
        k.fx.float(k.counter.top, e.text, c.at, TEXT.gold, c.scale, 0, { plate: true, ms: COMBO_MS });
        break;
      }
      default:
        break;
    }
  }

  /** Stars pop one by one (a ding each), the customer's sound, the price at the till, the tip, the points. */
  private rated(stars: number, priceCents: number, tipCents: number, points: number): void {
    const { audio } = this.c;
    const cv = this.k.counter;
    const fx = this.k.fx;
    for (let i = 0; i < stars; i++) this.later(i * COUNTER_VIEW.starEveryMs, () => audio.sfx('coin'));
    const after = 5 * COUNTER_VIEW.starEveryMs;
    const texts = [plusEuro(priceCents), tipLine(tipCents), `+${points}`];
    // one column, right of the customer over the till: row i (0 = the price), centre point
    const col = (): { at: Point; scale: number } => cv.money(Math.max(...texts.map(plateW)));
    const row = (i: number): Point => {
      const { at, scale } = col();
      return { x: at.x, y: at.y - (MONEY_ROW * scale) / 2 - i * MONEY_ROW * scale };
    };
    this.later(after, () => {
      audio.sfx(stars >= 4 ? 'yum' : stars <= 2 ? 'grumble' : 'plop');
      audio.sfx('cash');
      const k = col().scale;
      fx.float(cv.top, texts[0], row(0), TEXT.gold, k, 0, MONEY);
      if (tipCents > 0) fx.float(cv.top, texts[1], row(1), TEXT.green, k, TIP_DELAY_MS, MONEY);
      if (stars === 5) fx.burst(cv.world(cv.trayCentre), KITCHEN_COLORS.confetti, KITCHEN_FX.burst * 2);
    });
    this.later(after + POINTS_DELAY_MS, () => fx.float(cv.top, texts[2], row(tipCents > 0 ? 2 : 1), TEXT.cream, col().scale, 0, MONEY));
  }

  /** End of the shift without the golden finale: TURNO FINITO! / TURNO CHIUSO! */
  endBanner(completed: boolean, ms: number): void {
    const cv = this.k.counter;
    this.k.fx.float(cv.top, completed ? BANNER.finished : BANNER.closed, cv.roomCentre, completed ? TEXT.gold : TEXT.red, END_SCALE, 0, { plate: true, ms });
    this.c.audio.jingle(completed ? 'win' : 'gameover');
  }
}
