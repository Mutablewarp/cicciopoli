/**
 * Driver controls (level 6): the ◀ ▶ lane buttons, drawn as the halves of the ◀▶ pill of levels 1–5 (pads.css).
 * Every finger that lands on a half is ONE lane press (InputState.pushDir, read by consumeDir), never a held
 * axis: a resting thumb does not repeat, and other fingers stay independent (FRENA held while tapping lanes).
 * Side view (v9, `side(true)`): the same halves stand as ▲ over ▼ on the left edge (driver.css); ▲ is the lane
 * drawn above = world lane - 1 = the ◀ press, so only the glyphs and names change.
 * FRENA itself is an action button (controls.ts).
 */
import type { InputState } from '../../input';
import { el } from '../dom';
import { type Pad, capture, primary } from '../dpad';
import { ARROW_LEFT, ARROW_RIGHT } from '../icons';
import { triDownSvg, triUpSvg } from './icons';

type Fingers = Map<number, HTMLElement>;

/** One lane button: a finger landing on it pushes `dir` once; `fingers` is shared by both buttons. */
export function bindLane(b: HTMLElement, dir: 'left' | 'right', input: InputState, isOff: () => boolean, fingers: Fingers): void {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (isOff() || !primary(e) || fingers.has(e.pointerId)) return;
    capture(b, e.pointerId);
    fingers.set(e.pointerId, b);
    input.pushDir(dir);
    b.classList.add('is-down');
  });
  const end = (e: PointerEvent): void => {
    if (fingers.get(e.pointerId) !== b) return;
    fingers.delete(e.pointerId);
    b.classList.toggle('is-down', [...fingers.values()].includes(b));
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, end);
}

export interface LanePad extends Pad {
  /** Upright ◀ ▶ (false) or the side view's ▲ ▼ (true). */
  side(on: boolean): void;
}

const LOOK = {
  upright: { left: [ARROW_LEFT, 'Corsia a sinistra'], right: [ARROW_RIGHT, 'Corsia a destra'] },
  side: { left: [triUpSvg(), 'Corsia di sopra'], right: [triDownSvg(), 'Corsia di sotto'] },
} as const;

export function createLanePad(input: InputState, isOff: () => boolean): LanePad {
  // a pad zone like the slide pad's, so it sits where levels 1–5 put theirs
  const zone = el('div', 'cc-pad-zone cc-lane-zone');
  const pill = el('div', 'cc-dpad');
  pill.setAttribute('aria-label', 'Cambia corsia');
  const fingers: Fingers = new Map();
  const lane = (dir: 'left' | 'right'): HTMLElement => {
    const b = el('span', `cc-dpad__half cc-lane ${dir === 'left' ? 'is-l' : 'is-r'}`);
    b.setAttribute('role', 'button');
    bindLane(b, dir, input, isOff, fingers);
    return b;
  };
  const left = lane('left');
  const right = lane('right');
  pill.append(left, right);
  zone.append(pill);
  let shown: boolean | null = null;
  const side = (on: boolean): void => {
    if (on === shown) return;
    shown = on;
    const look = LOOK[on ? 'side' : 'upright'];
    for (const [b, [glyph, label]] of [[left, look.left], [right, look.right]] as const) {
      b.innerHTML = glyph;
      b.setAttribute('aria-label', label);
    }
  };
  side(false);
  return {
    zone,
    side,
    release() {
      fingers.clear();
      left.classList.remove('is-down');
      right.classList.remove('is-down');
    },
    // taps hold nothing, so a reset has nothing to drop
    rearm() {},
  };
}
