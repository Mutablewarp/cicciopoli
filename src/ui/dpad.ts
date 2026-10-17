/**
 * Touch direction pads. Every pointer is captured by the pad it started on and tracked by
 * pointerId, so fingers stay independent; the InputState arbitrates directions.
 *   - slide pad ◀▶ (platform, shooter): the finger can slide between the halves.
 *   - cross pad (maze): 4 arms by angle from the centre; sliding to another arm is a new press.
 */
import type { Dir4 } from '../contracts';
import type { InputState } from '../input';
import { crossDir } from '../input/swipe';
import { el } from './dom';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP } from './icons';

/** Finger travel around the pad centre that keeps the previous direction (no jitter). */
const DEAD_ZONE_PX = 10;

export interface Pad {
  readonly zone: HTMLElement;
  /** Drops every finger (layout change, controls hidden). */
  release(): void;
  /** Forget fingers without releasing them (the InputState was already reset). */
  forget(): void;
}

export const touchSrc = (pointerId: number): string => `t:${pointerId}`;
/** Fingers and pens always count; a mouse only with its main button. */
export const primary = (e: PointerEvent): boolean => e.pointerType !== 'mouse' || e.button === 0;

export function capture(target: HTMLElement, pointerId: number): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Pointer already gone (synthetic or cancelled) — nothing to capture.
  }
}

/** Shared pointer bookkeeping: `pick` maps a finger position to a direction (null = none yet). */
function bindPad(
  zone: HTMLElement,
  face: HTMLElement,
  input: InputState,
  isOff: () => boolean,
  pick: (dx: number, dy: number, prev: Dir4 | null) => Dir4 | null,
  render: (held: ReadonlySet<Dir4>) => void,
): Pad {
  const fingers = new Map<number, { dir: Dir4 | null; cx: number; cy: number }>();
  const draw = (): void => {
    const held = new Set<Dir4>();
    for (const f of fingers.values()) if (f.dir) held.add(f.dir);
    render(held);
  };
  const steer = (id: number, x: number, y: number): void => {
    const f = fingers.get(id);
    if (!f) return;
    const dir = pick(x - f.cx, y - f.cy, f.dir);
    if (dir === f.dir) return;
    f.dir = dir;
    if (dir) input.press(touchSrc(id), dir);
    else input.release(touchSrc(id));
    draw();
  };
  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (isOff() || !primary(e)) return;
    capture(zone, e.pointerId);
    const r = face.getBoundingClientRect();
    fingers.set(e.pointerId, { dir: null, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    steer(e.pointerId, e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => steer(e.pointerId, e.clientX, e.clientY));
  const end = (e: PointerEvent): void => {
    if (!fingers.delete(e.pointerId)) return;
    input.release(touchSrc(e.pointerId));
    draw();
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) zone.addEventListener(t, end);
  return {
    zone,
    release() {
      for (const id of fingers.keys()) input.release(touchSrc(id));
      fingers.clear();
      draw();
    },
    forget() {
      fingers.clear();
      draw();
    },
  };
}

export function createSlidePad(input: InputState, isOff: () => boolean): Pad {
  const zone = el('div', 'cc-pad-zone');
  const dpad = el('div', 'cc-dpad');
  const halfL = el('span', 'cc-dpad__half is-l', ARROW_LEFT);
  const halfR = el('span', 'cc-dpad__half is-r', ARROW_RIGHT);
  dpad.append(halfL, halfR);
  dpad.setAttribute('aria-label', 'Muovi a sinistra o a destra');
  zone.append(dpad);
  return bindPad(
    zone,
    dpad,
    input,
    isOff,
    (dx, _dy, prev) => (prev && Math.abs(dx) < DEAD_ZONE_PX ? prev : dx < 0 ? 'left' : 'right'),
    (held) => {
      halfL.classList.toggle('is-down', held.has('left'));
      halfR.classList.toggle('is-down', held.has('right'));
    },
  );
}

export function createCrossPad(input: InputState, isOff: () => boolean): Pad {
  const zone = el('div', 'cc-cross-zone');
  const cross = el('div', 'cc-cross');
  cross.setAttribute('aria-label', 'Muovi: su, giù, sinistra, destra');
  const arms: Record<Dir4, HTMLElement> = {
    up: el('span', 'cc-cross__arm is-up', ARROW_UP),
    down: el('span', 'cc-cross__arm is-down-arm', ARROW_DOWN),
    left: el('span', 'cc-cross__arm is-left', ARROW_LEFT),
    right: el('span', 'cc-cross__arm is-right', ARROW_RIGHT),
  };
  cross.append(arms.up, arms.left, el('span', 'cc-cross__hub'), arms.right, arms.down);
  zone.append(cross);
  return bindPad(zone, cross, input, isOff, crossDir, (held) => {
    for (const [d, arm] of Object.entries(arms) as Array<[Dir4, HTMLElement]>) arm.classList.toggle('is-down', held.has(d));
  });
}
