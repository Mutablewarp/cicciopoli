/**
 * Touch controls per mode: platform (◀▶ + SALTA/VOLA, GOAT, THAI, SCENDI), shooter
 * (◀▶ + FUOCO, FULMINE with charges) and maze (4-way cross pad; swipes live in input).
 * Every pointer is captured by the control it started on and tracked by pointerId.
 */
import type { ButtonState, ControlsLayout, ControlsMode } from '../contracts';
import type { HoldAction, InputState } from '../input';
import { el } from './dom';
import { type Pad, capture, createCrossPad, createSlidePad, primary, touchSrc } from './dpad';
import { ARROW_DOWN, ARROW_UP, LOCK_SVG, boltSvg, fuocoSvg, goatSvg, thaiSvg } from './icons';
import { type DiscColors, pixelDisc } from './pixeldisc';

const POP: Keyframe[] = [{ transform: 'scale(0.6)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }];

type ActKey = 'jump' | 'fire' | 'club' | 'down' | 'shoot' | 'bolt';

const DARK = { base: '#3a3a42', hi: '#5c5c68', lo: '#26262c', side: '#101012', lip: '#08080a' };
const FACES: Record<ActKey | 'fly', DiscColors> = {
  jump: { base: '#fc9000', hi: '#fcc060', lo: '#d86c00', side: '#8a4400', lip: '#5a2a00' },
  fly: { base: '#4cc0ec', hi: '#a8e4f4', lo: '#2a90c8', side: '#14506e', lip: '#0c3448' },
  shoot: { base: '#ec2a1c', hi: '#ff8a6a', lo: '#b8140c', side: '#6a0806', lip: '#3a0404' },
  fire: { ...DARK, ring: '#fcd400' },
  club: { ...DARK, ring: '#f2541c' },
  down: { ...DARK, ring: '#60ccf0' },
  bolt: { ...DARK, ring: '#7ad8ff' },
};
/** Disc diameter in art pixels (the CSS size sets the on-screen size). */
const DISC_N: Record<ActKey, number> = { jump: 26, shoot: 26, fire: 20, club: 20, down: 20, bolt: 20 };
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

export function createControls(input: InputState, onMode: (m: ControlsMode) => void): Controls {
  const root = el('div', 'cc-controls is-off');
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  const isOff = (): boolean => root.classList.contains('is-off');
  const slide = createSlidePad(input, isOff);
  const cross = createCrossPad(input, isOff);
  const pads: Pad[] = [slide, cross];

  const actZone = el('div', 'cc-act-zone');
  const jumpLabel = el('b', 'cc-act__name', 'SALTA');
  const badge = el('span', 'cc-act__badge');
  badge.hidden = true;
  const buttons: Record<ActKey, ActButton> = {
    jump: makeAct('jump', 'jump', ARROW_UP, 'Salta'),
    fire: makeAct('fire', 'fire', goatSvg(), 'GOAT'),
    club: makeAct('club', 'club', thaiSvg(), 'THAI'),
    down: makeAct('down', 'down', ARROW_DOWN, 'SCENDI'),
    shoot: makeAct('shoot', 'fire', fuocoSvg(), 'Fuoco'),
    bolt: makeAct('bolt', 'club', boltSvg(), 'FULMINE'),
  };
  buttons.jump.root.querySelector('.cc-act__icon')?.appendChild(jumpLabel);
  buttons.shoot.root.querySelector('.cc-act__icon')?.appendChild(el('b', 'cc-act__name', 'FUOCO'));
  buttons.bolt.root.append(badge);
  actZone.append(...Object.values(buttons).map((b) => b.root));
  root.append(slide.zone, cross.zone, actZone);

  function makeAct(key: ActKey, action: HoldAction, icon: string, label: string): ActButton {
    const b = el('div', `cc-act cc-act--${key}`);
    b.setAttribute('role', 'button');
    b.setAttribute('aria-label', label);
    const face = el('span', 'cc-act__face', discFaces(DISC_N[key], FACES[key]));
    face.append(el('span', 'cc-act__icon', icon));
    b.append(face);
    if (key !== 'jump' && key !== 'shoot') b.append(el('span', 'cc-act__label', label));
    b.append(el('span', 'cc-act__lock', LOCK_SVG));
    const btn: ActButton = { root: b, action, state: 'hidden', pointers: new Set() };
    b.hidden = true;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.state !== 'enabled' || isOff() || !primary(e)) return;
      capture(b, e.pointerId);
      btn.pointers.add(e.pointerId);
      input.press(touchSrc(e.pointerId), action);
      b.classList.add('is-down');
    });
    // A finger kept down through a reset takes its hold back on its next move, without a new
    // edge (no jump / shot on resume), like an auto-repeating key.
    b.addEventListener('pointermove', (e) => {
      if (!btn.pointers.has(e.pointerId) || input.has(touchSrc(e.pointerId))) return;
      input.press(touchSrc(e.pointerId), action, false);
      b.classList.add('is-down');
    });
    const end = (e: PointerEvent): void => {
      if (!btn.pointers.delete(e.pointerId)) return;
      input.release(touchSrc(e.pointerId));
      b.classList.toggle('is-down', [...btn.pointers].some((id) => input.has(touchSrc(id))));
    };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) b.addEventListener(t, end);
    return btn;
  }

  function releaseAct(btn: ActButton): void {
    for (const id of btn.pointers) input.release(touchSrc(id));
    btn.pointers.clear();
    btn.root.classList.remove('is-down');
  }

  function setState(btn: ActButton, next: ButtonState): void {
    const prev = btn.state;
    if (prev === next) return;
    btn.state = next;
    if (next !== 'enabled') releaseAct(btn);
    btn.root.hidden = next === 'hidden';
    btn.root.classList.toggle('is-disabled', next === 'disabled');
    btn.root.setAttribute('aria-disabled', String(next !== 'enabled'));
    if (next === 'enabled' && prev !== 'enabled' && !isOff()) {
      btn.root.animate(POP, { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' });
    }
  }

  function setJumpLabel(label: ControlsLayout['jumpLabel'], animate: boolean): void {
    if (jumpLabel.textContent === label) return;
    jumpLabel.textContent = label;
    const fly = label === 'VOLA';
    const jump = buttons.jump.root;
    jump.querySelectorAll('.cc-act__disc').forEach((d) => d.remove());
    jump.querySelector('.cc-act__face')?.insertAdjacentHTML('afterbegin', discFaces(DISC_N.jump, fly ? FACES.fly : FACES.jump));
    jump.setAttribute('aria-label', fly ? 'Vola' : 'Salta');
    jump.classList.toggle('is-fly', fly);
    if (animate) jump.animate(POP, { duration: 360 });
  }

  function setBadge(count: number | undefined): void {
    const text = count !== undefined && count > 0 ? String(Math.min(count, 99)) : '';
    if (badge.textContent === text) return;
    const more = Number(text) > Number(badge.textContent || '0');
    badge.textContent = text;
    badge.hidden = text === '';
    if (more) badge.animate(POP, { duration: 320 });
  }

  /** States per mode; buttons that do not belong to the mode are hidden. */
  function statesFor(l: ControlsLayout, mode: ControlsMode): Record<ActKey, ButtonState> {
    const none: Record<ActKey, ButtonState> = { jump: 'hidden', fire: 'hidden', club: 'hidden', down: 'hidden', shoot: 'hidden', bolt: 'hidden' };
    if (mode === 'shooter') return { ...none, shoot: l.fire, bolt: l.club };
    if (mode === 'maze') return none;
    return { ...none, jump: 'enabled', fire: l.fire, club: l.club, down: l.down };
  }

  // A reset (blur, rotation, overlay) drops every hold; a finger still down re-presses on its
  // next move, so nothing can stick but a resting thumb is not dead until lifted.
  input.onReset(() => {
    for (const p of pads) p.rearm();
    for (const b of Object.values(buttons)) b.root.classList.remove('is-down');
  });

  return {
    root,
    set(layout) {
      if (!layout) {
        for (const p of pads) p.release();
        for (const b of Object.values(buttons)) releaseAct(b);
        root.classList.add('is-off');
        return;
      }
      // tolerate callers that predate `mode`
      const mode: ControlsMode = layout.mode ?? 'platform';
      const wasOff = isOff();
      if (root.dataset.mode !== mode) {
        for (const p of pads) p.release();
        root.dataset.mode = mode;
        onMode(mode);
      }
      root.classList.remove('is-off');
      root.dataset.level = String(layout.level);
      const states = statesFor(layout, mode);
      for (const k of Object.keys(buttons) as ActKey[]) setState(buttons[k], states[k]);
      setJumpLabel(layout.jumpLabel, !wasOff);
      setBadge(mode === 'shooter' ? layout.clubCount : undefined);
    },
  };
}
