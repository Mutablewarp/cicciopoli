/**
 * Level 8 right thumb (ControlsMode 'cartoon'): big SALTA (jump, parry in mid-air), SPARA (held; hidden with auto-fire),
 * SCATTO (dash), ARMA (swap; shows the weapon in hand) and SUPER (shows the five cards, glows when they are all full),
 * drawn as 1930s enamel buttons. Every finger is captured by the button it went down on and tracked by pointerId, so
 * run + jump + dash + shoot work together. Caller: ui/controls.ts (mounts `zone`, forwards every layout).
 */
import type { ButtonState, CartoonWeapon, ControlsLayout } from '../../contracts';
import type { HoldAction, InputState } from '../../input';
import { capture, primary, touchSrc } from '../dpad';
import { el } from '../dom';
import { WEAPON_ICON, WEAPON_NAME, arrowSvg, dashSvg, gloveSvg } from './icons';
import { SUPER_CARDS, superLabel } from './text';

type Key = 'jump' | 'fire' | 'dash' | 'swap' | 'super';

const POP: Keyframe[] = [{ transform: 'scale(0.7)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }];
const ACTION: Readonly<Record<Key, HoldAction>> = { jump: 'jump', fire: 'fire', dash: 'dash', swap: 'swap', super: 'super' };
const ARIA: Readonly<Record<Key, string>> = { jump: 'Salta', fire: 'Spara', dash: 'Scatto', swap: 'Cambia arma', super: 'Colpo EX o super' };

interface Btn {
  root: HTMLElement;
  key: Key;
  state: ButtonState;
  pointers: Set<number>;
}

export interface CartoonButtons {
  readonly zone: HTMLElement;
  /** null (or another mode) releases every finger. */
  set(layout: ControlsLayout | null): void;
  /** After an InputState reset: fingers kept, their holds dropped (they press again on their next move). */
  rearm(): void;
}

export function createCartoonButtons(input: InputState, isOff: () => boolean): CartoonButtons {
  const zone = el('div', 'cc-tact-zone');
  const weapon = el('span', 'cc-tbtn__weapon');
  const minis = el('span', 'cc-tbtn__minis', '<i></i>'.repeat(SUPER_CARDS));
  const superName = el('b', 'cc-tbtn__name', 'EX');
  const buttons: Record<Key, Btn> = {
    swap: make('swap', [weapon, el('b', 'cc-tbtn__name', 'ARMA')]),
    super: make('super', [minis, superName]),
    fire: make('fire', [el('span', 'cc-tbtn__icon', gloveSvg()), el('b', 'cc-tbtn__name', 'SPARA')]),
    dash: make('dash', [el('span', 'cc-tbtn__icon', dashSvg()), el('b', 'cc-tbtn__name', 'SCATTO')]),
    jump: make('jump', [el('span', 'cc-tbtn__icon', arrowSvg()), el('b', 'cc-tbtn__name', 'SALTA')]),
  };
  zone.append(...Object.values(buttons).map((b) => b.root));

  function make(key: Key, inner: HTMLElement[]): Btn {
    const root = el('div', `cc-tbtn cc-tbtn--${key}`);
    root.setAttribute('role', 'button');
    root.setAttribute('aria-label', ARIA[key]);
    const face = el('span', 'cc-tbtn__face');
    face.append(...inner);
    root.append(face);
    root.hidden = true;
    const btn: Btn = { root, key, state: 'hidden', pointers: new Set() };
    const src = (id: number): string => touchSrc(id);
    root.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.state !== 'enabled' || isOff() || !primary(e)) return;
      capture(root, e.pointerId);
      btn.pointers.add(e.pointerId);
      input.press(src(e.pointerId), ACTION[key]);
      root.classList.add('is-down');
    });
    // a finger kept down through a reset takes its hold back on its next move, without a new edge
    root.addEventListener('pointermove', (e) => {
      if (!btn.pointers.has(e.pointerId) || input.has(src(e.pointerId))) return;
      input.press(src(e.pointerId), ACTION[key], false);
      root.classList.add('is-down');
    });
    const end = (e: PointerEvent): void => {
      if (!btn.pointers.delete(e.pointerId)) return;
      input.release(src(e.pointerId));
      root.classList.toggle('is-down', [...btn.pointers].some((id) => input.has(src(id))));
    };
    for (const t of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) root.addEventListener(t, end);
    return btn;
  }

  function release(b: Btn): void {
    for (const id of b.pointers) input.release(touchSrc(id));
    b.pointers.clear();
    b.root.classList.remove('is-down');
  }

  function setState(b: Btn, next: ButtonState): void {
    if (b.state === next) return;
    const was = b.state;
    b.state = next;
    if (next !== 'enabled') release(b);
    b.root.hidden = next === 'hidden';
    b.root.classList.toggle('is-disabled', next === 'disabled');
    b.root.setAttribute('aria-disabled', String(next !== 'enabled'));
    if (next === 'enabled' && was === 'disabled') b.root.animate(POP, { duration: 320, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }

  let shownWeapon: CartoonWeapon | null = null;
  let shownCards = -1;
  function setWeapon(w: CartoonWeapon): void {
    if (w === shownWeapon) return;
    const swap = shownWeapon !== null;
    shownWeapon = w;
    weapon.innerHTML = WEAPON_ICON[w]();
    buttons.swap.root.setAttribute('aria-label', `Cambia arma (ora: ${WEAPON_NAME[w]})`);
    if (swap) weapon.animate([{ transform: 'rotate(-200deg) scale(0.4)' }, { transform: 'none' }], { duration: 300, easing: 'ease-out' });
  }
  function setCards(n: number): void {
    const cards = Math.max(0, Math.min(SUPER_CARDS, Math.floor(n)));
    if (cards === shownCards) return;
    const more = cards > shownCards && shownCards >= 0;
    shownCards = cards;
    [...minis.children].forEach((c, i) => c.classList.toggle('is-full', i < cards));
    superName.textContent = superLabel(cards);
    const b = buttons.super.root;
    b.classList.toggle('is-empty', cards === 0);
    b.classList.toggle('is-ready', cards >= SUPER_CARDS);
    if (more) b.animate(POP, { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }

  return {
    zone,
    set(layout) {
      const l = layout?.mode === 'cartoon' ? layout : null;
      const states: Record<Key, ButtonState> = l
        ? { jump: 'enabled', fire: l.autoFire ? 'hidden' : l.fire, dash: 'enabled', swap: 'enabled', super: 'enabled' }
        : { jump: 'hidden', fire: 'hidden', dash: 'hidden', swap: 'hidden', super: 'hidden' };
      for (const b of Object.values(buttons)) setState(b, states[b.key]);
      zone.classList.toggle('is-auto', l?.autoFire === true);
      if (!l) return;
      setWeapon(l.weapon ?? 'provola');
      setCards(l.superCards ?? 0);
    },
    rearm() {
      for (const b of Object.values(buttons)) b.root.classList.remove('is-down');
    },
  };
}
