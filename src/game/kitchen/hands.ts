/**
 * The player's hands in the CUCINA: a press on a pan / bottle / CHIUDI / drink picks a piece up (touch.ts: the
 * lift, the grab sound of its family, a short vibration); dragging it shows where it goes (the griddle, the
 * fryer, the board, the tray) and dropping it there does what a tap does; anywhere else it drops back. Tap-tap
 * stays the main way: a release where it was pressed is a tap (session.ts).
 */
import type { GameAudio } from '../../contracts';
import { TOUCH } from './config';
import { inRect, type Point, type Rect } from './framing';
import { destination, hitKitchen } from './layout';
import type { KitchenShift } from './logic/shift';
import type { KitchenEvent, KitchenTarget } from './logic/types';
import { pageOfX } from './plan';
import { grabSfx, pieceOf, type TouchFx } from './touch';
import type { KitchenView } from './view';

export interface HandsCtx {
  readonly view: KitchenView;
  readonly touch: TouchFx;
  readonly audio: GameAudio;
  readonly vibrate: (ms: number) => void;
  /** the kitchen takes the player's hands now */
  readonly ready: () => boolean;
  /** does what a tap on `t` does; returns the shift's events */
  readonly act: (t: KitchenTarget) => readonly KitchenEvent[];
}

/** What a tap on a kitchen target does to the shift (the DOM action button apart); the events it caused. */
export function actOn(shift: KitchenShift, t: Exclude<KitchenTarget, { kind: 'action' }>): KitchenEvent[] {
  const s = shift.snapshot;
  switch (t.kind) {
    case 'bin':
      return shift.tapBin(t.id);
    case 'bun':
      return shift.closeBurger();
    case 'griddle':
      return s.griddle[t.slot] ? shift.flipOrTake(t.slot) : [];
    case 'fryer':
      return s.fryer[t.basket] ? shift.lift(t.basket) : [];
    case 'drink':
      return shift.pickDrink(t.id);
    case 'tray':
      return s.tray[t.part] !== null ? shift.trashItem({ from: 'tray', part: t.part }) : [];
    case 'stackTop':
      return s.stack.length > 0 ? shift.removeTop() : [];
  }
}

export class Hands {
  private pressed: { t: KitchenTarget; to: Rect | null } | null = null;

  constructor(private readonly c: HandsCtx) {}

  private local(cssX: number, cssY: number): Point {
    return this.c.view.toLocal(cssX, cssY);
  }

  /** A press: a source under the finger is picked up. True = it can be dragged where it goes. */
  press(cssX: number, cssY: number): boolean {
    this.release(true);
    const v = this.c.view;
    const l = v.station.layout;
    if (!l || !this.c.ready()) return false;
    const p = this.local(cssX, cssY);
    if (v.onTab(p)) return false;
    const t = hitKitchen(l, p.x, p.y, v.stack.topY);
    const place = t && v.station.place(t);
    if (!t || !place) return false;
    const id = t.kind === 'bin' || t.kind === 'drink' ? t.id : 'bun';
    this.c.audio.sfx(grabSfx(id));
    this.c.vibrate(TOUCH.vibrate.grab);
    this.c.touch.lift(place, t.kind === 'drink' ? null : pieceOf(t.kind === 'bin' ? t.id : 'bun', place.scale));
    const to = destination(l, t);
    const plan = v.framing.plan;
    // a drag needs its destination on the page it starts from
    const same = to !== null && (!v.paged || pageOfX(plan, to.x + to.w / 2) === pageOfX(plan, p.x));
    this.pressed = { t, to: same ? to : null };
    return same;
  }

  drag(cssX: number, cssY: number): void {
    const pr = this.pressed;
    if (!pr) return;
    const p = this.local(cssX, cssY);
    this.c.touch.drag(p, pr.to, pr.to !== null && inRect(pr.to, p.x, p.y));
  }

  /** A drop: on its destination it does what a tap does, anywhere else the piece drops back. */
  drop(cssX: number, cssY: number): void {
    const pr = this.pressed;
    if (!pr) return;
    const p = this.local(cssX, cssY);
    if (pr.to && inRect(pr.to, p.x, p.y) && this.c.ready()) this.done(this.c.act(pr.t));
    else this.release(true);
  }

  /** After a tap on the pressed source: the piece flies on (the shift took it) or drops back (refused). */
  done(events: readonly KitchenEvent[]): void {
    this.release(events.length === 0 || events.every((e) => e.type === 'nope'));
  }

  release(back: boolean): void {
    this.pressed = null;
    this.c.touch.release(back);
  }
}
