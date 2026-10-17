/**
 * Touch controls: one sliding d-pad (left) + action cluster (right).
 * Every pointer is captured by the control it started on and tracked by pointerId,
 * so fingers are fully independent; the InputState arbitrates directions.
 */
import type { ButtonState, ControlsLayout } from '../contracts';
import type { HoldAction, InputState } from '../input';
import { el } from './dom';
import { ARROW_DOWN, ARROW_LEFT, ARROW_RIGHT, ARROW_UP, LOCK_SVG, goatSvg, thaiSvg } from './icons';
import { type DiscColors, pixelDisc } from './pixeldisc';

/** Finger travel around the d-pad centre that keeps the previous direction (no jitter). */
const DEAD_ZONE_PX = 10;
const POP: Keyframe[] = [{ transform: 'scale(0.6)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }];

type ActKey = 'jump' | 'fire' | 'club' | 'down';

const DARK = { base: '#3a3a42', hi: '#5c5c68', lo: '#26262c', side: '#101012', lip: '#08080a' };
const FACES: Record<ActKey | 'fly', DiscColors> = {
  jump: { base: '#fc9000', hi: '#fcc060', lo: '#d86c00', side: '#8a4400', lip: '#5a2a00' },
  fly: { base: '#4cc0ec', hi: '#a8e4f4', lo: '#2a90c8', side: '#14506e', lip: '#0c3448' },
  fire: { ...DARK, ring: '#fcd400' },
  club: { ...DARK, ring: '#f2541c' },
  down: { ...DARK, ring: '#60ccf0' },
};
/** Disc diameter in art pixels (the CSS size sets the on-screen size). */
const DISC_N: Record<ActKey, number> = { jump: 26, fire: 20, club: 20, down: 20 };
const DISC_DEPTH = 3;

function discFaces(n: number, c: DiscColors): string {
  return (
    `<span class="cc-act__disc is-up">${pixelDisc(n, DISC_DEPTH, c)}</span>` +
    `<span class="cc-act__disc is-dn">${pixelDisc(n, DISC_DEPTH, c, true)}</span>`
  );
}

interface ActButton {
  root: HTMLElement;
  action: HoldAction;
  state: ButtonState;
  pointers: Set<number>;
}

export interface Controls {
  readonly root: HTMLElement;
  set(layout: ControlsLayout | null): void;
}

const src = (pointerId: number): string => `t:${pointerId}`;
/** Fingers and pens always count; a mouse only with its main button. */
const primary = (e: PointerEvent): boolean => e.pointerType !== 'mouse' || e.button === 0;

function capture(target: HTMLElement, pointerId: number): void {
  try {
    target.setPointerCapture(pointerId);
  } catch {
    // Pointer already gone (synthetic or cancelled) — nothing to capture.
  }
}

export function createControls(input: InputState): Controls {
  const root = el('div', 'cc-controls is-off');
  root.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ------------------------------------------------------------ d-pad */
  const padZone = el('div', 'cc-pad-zone');
  const dpad = el('div', 'cc-dpad');
  const halfL = el('span', 'cc-dpad__half is-l', ARROW_LEFT);
  const halfR = el('span', 'cc-dpad__half is-r', ARROW_RIGHT);
  dpad.append(halfL, halfR);
  padZone.append(dpad);
  dpad.setAttribute('aria-label', 'Muovi a sinistra o a destra');
  const padPointers = new Map<number, { dir: 'left' | 'right'; cx: number }>();

  function renderPad(): void {
    let l = false;
    let r = false;
    for (const p of padPointers.values()) {
      if (p.dir === 'left') l = true;
      else r = true;
    }
    halfL.classList.toggle('is-down', l);
    halfR.classList.toggle('is-down', r);
  }
  function dirAt(x: number, cx: number, prev: 'left' | 'right' | null): 'left' | 'right' {
    const dx = x - cx;
    if (prev && Math.abs(dx) < DEAD_ZONE_PX) return prev;
    return dx < 0 ? 'left' : 'right';
  }
  padZone.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (root.classList.contains('is-off') || !primary(e)) return;
    capture(padZone, e.pointerId);
    const r = dpad.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const dir = dirAt(e.clientX, cx, null);
    padPointers.set(e.pointerId, { dir, cx });
    input.press(src(e.pointerId), dir);
    renderPad();
  });
  padZone.addEventListener('pointermove', (e) => {
    const p = padPointers.get(e.pointerId);
    if (!p) return;
    const dir = dirAt(e.clientX, p.cx, p.dir);
    if (dir === p.dir) return;
    p.dir = dir;
    input.press(src(e.pointerId), dir);
    renderPad();
  });
  const padEnd = (e: PointerEvent): void => {
    if (!padPointers.delete(e.pointerId)) return;
    input.release(src(e.pointerId));
    renderPad();
  };
  for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) padZone.addEventListener(t, padEnd);

  /* ---------------------------------------------------- action buttons */
  const actZone = el('div', 'cc-act-zone');
  const jumpLabel = el('b', 'cc-act__name', 'SALTA');
  const buttons: Record<ActKey, ActButton> = {
    jump: makeAct('jump', 'jump', ARROW_UP, 'Salta'),
    fire: makeAct('fire', 'fire', goatSvg(), 'GOAT'),
    club: makeAct('club', 'club', thaiSvg(), 'THAI'),
    down: makeAct('down', 'down', ARROW_DOWN, 'SCENDI'),
  };
  buttons.jump.root.querySelector('.cc-act__icon')?.appendChild(jumpLabel);
  actZone.append(buttons.club.root, buttons.fire.root, buttons.down.root, buttons.jump.root);
  root.append(padZone, actZone);

  function makeAct(key: ActKey, action: HoldAction, icon: string, label: string): ActButton {
    const b = el('div', `cc-act cc-act--${key}`);
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', label);
    const face = el('span', 'cc-act__face', discFaces(DISC_N[key], FACES[key]));
    face.append(el('span', 'cc-act__icon', icon));
    b.append(face);
    if (key !== 'jump') b.append(el('span', 'cc-act__label', label));
    b.append(el('span', 'cc-act__lock', LOCK_SVG));
    const btn: ActButton = { root: b, action, state: 'hidden', pointers: new Set() };
    b.hidden = true;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.state !== 'enabled' || root.classList.contains('is-off') || !primary(e)) return;
      capture(b, e.pointerId);
      btn.pointers.add(e.pointerId);
      input.press(src(e.pointerId), action);
      b.classList.add('is-down');
    });
    const end = (e: PointerEvent): void => {
      if (!btn.pointers.delete(e.pointerId)) return;
      input.release(src(e.pointerId));
      b.classList.toggle('is-down', btn.pointers.size > 0);
    };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, end);
    return btn;
  }

  function releaseAct(btn: ActButton): void {
    for (const id of btn.pointers) input.release(src(id));
    btn.pointers.clear();
    btn.root.classList.remove('is-down');
  }
  function releasePad(): void {
    for (const id of padPointers.keys()) input.release(src(id));
    padPointers.clear();
    renderPad();
  }

  function setState(btn: ActButton, next: ButtonState): void {
    const prev = btn.state;
    if (prev === next) return;
    btn.state = next;
    if (next !== 'enabled') releaseAct(btn);
    btn.root.hidden = next === 'hidden';
    btn.root.classList.toggle('is-disabled', next === 'disabled');
    btn.root.setAttribute('aria-disabled', String(next !== 'enabled'));
    if (next === 'enabled' && prev !== 'enabled' && !root.classList.contains('is-off')) {
      btn.root.animate(POP, { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    }
  }

  // A reset (blur, rotation, overlay) forgets every finger: they must lift and press again.
  input.onReset(() => {
    padPointers.clear();
    renderPad();
    for (const b of Object.values(buttons)) {
      b.pointers.clear();
      b.root.classList.remove('is-down');
    }
  });

  return {
    root,
    set(layout) {
      if (!layout) {
        releasePad();
        for (const b of Object.values(buttons)) releaseAct(b);
        root.classList.add('is-off');
        return;
      }
      const wasOff = root.classList.contains('is-off');
      root.classList.remove('is-off');
      root.dataset.level = String(layout.level);
      setState(buttons.jump, 'enabled');
      setState(buttons.fire, layout.fire);
      setState(buttons.club, layout.club);
      setState(buttons.down, layout.down);
      if (jumpLabel.textContent !== layout.jumpLabel) {
        jumpLabel.textContent = layout.jumpLabel;
        const fly = layout.jumpLabel === 'VOLA';
        buttons.jump.root.querySelectorAll('.cc-act__disc').forEach((d) => d.remove());
        buttons.jump.root
          .querySelector('.cc-act__face')
          ?.insertAdjacentHTML('afterbegin', discFaces(DISC_N.jump, fly ? FACES.fly : FACES.jump));
        buttons.jump.root.setAttribute('aria-label', layout.jumpLabel === 'VOLA' ? 'Vola' : 'Salta');
        if (!wasOff) buttons.jump.root.animate(POP, { duration: 360 });
      }
      buttons.jump.root.classList.toggle('is-fly', layout.jumpLabel === 'VOLA');
    },
  };
}
