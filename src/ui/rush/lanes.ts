/**
 * Driver controls (level 6): the ◀ ▶ lane buttons, drawn as the halves of the ◀▶ pill of levels 1–5 (pads.css).
 * Every finger that lands on a half is ONE lane press (InputState.pushDir, read by consumeDir), never a held
 * axis: a resting thumb does not repeat, and other fingers stay independent (FRENA held while tapping lanes).
 * FRENA itself is an action button (controls.ts).
 */
import type { InputState } from '../../input';
import { el } from '../dom';
import { type Pad, capture, primary } from '../dpad';
import { ARROW_LEFT, ARROW_RIGHT } from '../icons';

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

export function createLanePad(input: InputState, isOff: () => boolean): Pad {
  // a pad zone like the slide pad's, so it sits where levels 1–5 put theirs
  const zone = el('div', 'cc-pad-zone cc-lane-zone');
  const pill = el('div', 'cc-dpad');
  pill.setAttribute('aria-label', 'Cambia corsia');
  const fingers: Fingers = new Map();
  const lane = (dir: 'left' | 'right', glyph: string, label: string): HTMLElement => {
    const b = el('span', `cc-dpad__half cc-lane ${dir === 'left' ? 'is-l' : 'is-r'}`, glyph);
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', label);
    bindLane(b, dir, input, isOff, fingers);
    return b;
  };
  const left = lane('left', ARROW_LEFT, 'Corsia a sinistra');
  const right = lane('right', ARROW_RIGHT, 'Corsia a destra');
  pill.append(left, right);
  zone.append(pill);
  return {
    zone,
    release() {
      fingers.clear();
      left.classList.remove('is-down');
      right.classList.remove('is-down');
    },
    // taps hold nothing, so a reset has nothing to drop
    rearm() {},
  };
}
