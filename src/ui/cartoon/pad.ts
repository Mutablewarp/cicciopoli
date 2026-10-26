/**
 * Level 8 left thumb: the ◀ ▶ pill with the ▲ cap above it, one control for one finger. Where the finger is, relative
 * to the centre of the pill, gives both the run direction and aim-up, so a thumb can run and slide up to aim
 * diagonally without lifting. Each finger holds two InputState sources: `t:<id>` (left / right) and `t:<id>:up`.
 * Caller: ui/controls.ts (as one of its pads: release / rearm on layout changes and resets). The first-fight coach
 * makes the pill (CORRI) and the cap (MIRA IN ALTO) glow in turn and skips each once it is used.
 */
import type { InputState } from '../../input';
import { type Pad, capture, primary, touchSrc } from '../dpad';
import { el } from '../dom';
import type { Coach } from './coach';
import { arrowSvg } from './icons';

/** CSS px from the pill centre: dead zone around the middle, aim-up line above the pill (with hysteresis), the ▲ cap half-width. */
export const PAD = { dead: 12, up: 46, upHyst: 12, cap: 30 } as const;

export interface PadRead {
  x: -1 | 0 | 1;
  up: boolean;
}

/**
 * Finger offset (dx right, dy down) -> run direction + aim up. On the pill a direction is always held (the middle keeps
 * the previous one); above the pill the finger aims up, straight up over the ▲ cap, diagonally beside it.
 */
export function readPad(dx: number, dy: number, prev: PadRead | null): PadRead {
  const up = dy < -(prev?.up ? PAD.up - PAD.upHyst : PAD.up);
  if (up && Math.abs(dx) < PAD.cap) return { x: 0, up };
  const keep = prev !== null && prev.x !== 0 && Math.abs(dx) < PAD.dead;
  return { x: keep ? prev.x : dx < 0 ? -1 : 1, up };
}

interface Finger {
  read: PadRead | null;
  cx: number;
  cy: number;
}

export function createAimPad(input: InputState, isOff: () => boolean, coach: Coach): Pad {
  const zone = el('div', 'cc-tpad-zone');
  const face = el('div', 'cc-tpad');
  face.setAttribute('aria-label', 'Muovi a sinistra o a destra, scorri in su per mirare in alto');
  const cap = el('span', 'cc-tpad__cap', arrowSvg());
  const halfL = el('span', 'cc-tpad__half is-l', arrowSvg());
  const halfR = el('span', 'cc-tpad__half is-r', arrowSvg());
  const pill = el('span', 'cc-tpad__pill');
  pill.append(halfL, halfR);
  face.append(cap, pill);
  zone.append(face);
  coach.tag('move', pill);
  coach.tag('up', cap);

  const fingers = new Map<number, Finger>();
  const draw = (): void => {
    let l = false;
    let r = false;
    let u = false;
    for (const f of fingers.values()) {
      l ||= f.read?.x === -1;
      r ||= f.read?.x === 1;
      u ||= f.read?.up === true;
    }
    halfL.classList.toggle('is-down', l);
    halfR.classList.toggle('is-down', r);
    cap.classList.toggle('is-down', u);
  };
  const apply = (id: number, next: PadRead, prev: PadRead | null): void => {
    const src = touchSrc(id);
    if (next.x !== 0) coach.used('move');
    if (next.up) coach.used('up');
    if (next.x !== prev?.x) {
      if (next.x === 0) input.release(src);
      else input.press(src, next.x < 0 ? 'left' : 'right');
    }
    if (next.up !== (prev?.up ?? false)) {
      if (next.up) input.press(`${src}:up`, 'up');
      else input.release(`${src}:up`);
    }
  };
  const steer = (id: number, x: number, y: number): void => {
    const f = fingers.get(id);
    if (!f) return;
    const next = readPad(x - f.cx, y - f.cy, f.read);
    if (f.read && next.x === f.read.x && next.up === f.read.up) return;
    apply(id, next, f.read);
    f.read = next;
    draw();
  };
  const drop = (id: number): void => {
    input.release(touchSrc(id));
    input.release(`${touchSrc(id)}:up`);
  };

  zone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (isOff() || !primary(e)) return;
    capture(zone, e.pointerId);
    const r = pill.getBoundingClientRect();
    fingers.set(e.pointerId, { read: null, cx: r.left + r.width / 2, cy: r.top + r.height / 2 });
    steer(e.pointerId, e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => steer(e.pointerId, e.clientX, e.clientY));
  const end = (e: PointerEvent): void => {
    if (!fingers.delete(e.pointerId)) return;
    drop(e.pointerId);
    draw();
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) zone.addEventListener(t, end);

  return {
    zone,
    release() {
      for (const id of fingers.keys()) drop(id);
      fingers.clear();
      draw();
    },
    rearm() {
      // the InputState already dropped the holds: the finger presses again on its next move
      for (const f of fingers.values()) f.read = null;
      draw();
    },
  };
}
