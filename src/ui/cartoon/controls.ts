/**
 * Level 8 right thumb (ControlsMode 'cartoon'): big SALTA (jump, parry in mid-air), SPARA (always shown: held = fire;
 * its AUTO plate is the auto-fire switch, and with auto-fire on the whole disc toggles it), SCATTO (dash), ARMA (swap;
 * shows the weapon in hand) and EX (a five-segment card ring round the face; one card = EX shot, five = SUPER), drawn
 * as 1930s enamel buttons. Every finger is captured by the button it went down on and tracked by pointerId, so run +
 * jump + dash + shoot work together. The first-fight coach makes each disc glow in turn; its tag is mounted here.
 * Caller: ui/controls.ts (mounts `zone`, forwards every layout).
 */
import type { ButtonState, CartoonWeapon, ControlsLayout } from '../../contracts';
import type { HoldAction, InputState } from '../../input';
import { capture, primary, touchSrc } from '../dpad';
import { el } from '../dom';
import { type Coach, createCoach } from './coach';
import { WEAPON_ICON, WEAPON_NAME, arrowSvg, dashSvg, gloveSvg } from './icons';
import { SUPER_CARDS, superLabel } from './text';

type Key = 'jump' | 'fire' | 'dash' | 'swap' | 'super';

const POP: Keyframe[] = [{ transform: 'scale(0.7)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }];
const ACTION: Readonly<Record<Key, HoldAction>> = { jump: 'jump', fire: 'fire', dash: 'dash', swap: 'swap', super: 'super' };
const ARIA: Readonly<Record<Key, string>> = { jump: 'Salta', fire: 'Spara', dash: 'Scatto', swap: 'Cambia arma', super: 'Colpo EX o super' };
/** The EX ring: SVG units of one segment of the circle's pathLength 100 (gap between segments). */
const RING_GAP = 4;

interface Btn {
  root: HTMLElement;
  key: Key;
  state: ButtonState;
  pointers: Set<number>;
}

export interface CartoonButtons {
  readonly zone: HTMLElement;
  /** The first-fight coach (the aim pad tags itself with it). */
  readonly coach: Coach;
  /** null (or another mode) releases every finger. */
  set(layout: ControlsLayout | null): void;
  /** After an InputState reset: fingers kept, their holds dropped (they press again on their next move). */
  rearm(): void;
}

/** Five arcs of a circle (pathLength 100), ink under, colour on top; `.is-full` lights a card. */
function ringSvg(): string {
  const seg = 100 / SUPER_CARDS;
  const arc = (cls: string, i: number): string =>
    `<circle class="${cls}" cx="50" cy="50" r="43" pathLength="100" stroke-dasharray="${seg - RING_GAP} ${100 - seg + RING_GAP}" stroke-dashoffset="${-(i * seg + RING_GAP / 2)}"/>`;
  const idx = [...Array(SUPER_CARDS).keys()];
  return (
    `<svg class="cc-tbtn__ring" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-90 50 50)">` +
    idx.map((i) => arc('cc-ring__ink', i)).join('') +
    idx.map((i) => arc('cc-ring__seg', i)).join('') +
    `</g></svg>`
  );
}

export function createCartoonButtons(input: InputState, isOff: () => boolean): CartoonButtons {
  const coach = createCoach();
  const zone = el('div', 'cc-tact-zone');
  const weapon = el('span', 'cc-tbtn__weapon');
  const superName = el('b', 'cc-tbtn__name', 'EX');
  const autoPlate = el('span', 'cc-tbtn__auto', '<i class="cc-tbtn__lamp"></i><b>AUTO</b>');
  autoPlate.setAttribute('role', 'switch');
  const buttons: Record<Key, Btn> = {
    swap: make('swap', [weapon, el('b', 'cc-tbtn__name', 'ARMA')]),
    super: make('super', [el('span', 'cc-tbtn__ringbox', ringSvg()), superName]),
    fire: make('fire', [el('span', 'cc-tbtn__icon', gloveSvg()), el('b', 'cc-tbtn__name', 'SPARA')]),
    dash: make('dash', [el('span', 'cc-tbtn__icon', dashSvg()), el('b', 'cc-tbtn__name', 'SCATTO')]),
    jump: make('jump', [el('span', 'cc-tbtn__icon', arrowSvg()), el('b', 'cc-tbtn__name', 'SALTA')]),
  };
  buttons.fire.root.append(autoPlate);
  // the coach's tag lives in the disc zone (it inherits --k); coach.css moves it to the free space beside the controls
  zone.append(...Object.values(buttons).map((b) => b.root), coach.el);
  for (const b of Object.values(buttons)) coach.tag(b.key, b.root);

  let autoFire: boolean | null = null;
  /** With auto-fire on, the SPARA disc is the switch (it turns auto-fire off); off, it fires while held. */
  const actionOf = (key: Key): HoldAction => (key === 'fire' && autoFire === true ? 'autoFire' : ACTION[key]);

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
      input.press(src(e.pointerId), actionOf(key));
      root.classList.add('is-down');
      coach.used(key);
    });
    // a finger kept down through a reset takes its hold back on its next move, without a new edge
    root.addEventListener('pointermove', (e) => {
      if (!btn.pointers.has(e.pointerId) || input.has(src(e.pointerId))) return;
      input.press(src(e.pointerId), actionOf(key), false);
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

  // the AUTO plate: one tap = one toggle edge (the core flips and saves the setting, the next layout shows it)
  autoPlate.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (buttons.fire.state !== 'enabled' || isOff() || !primary(e)) return;
    const src = `${touchSrc(e.pointerId)}:auto`;
    input.press(src, 'autoFire');
    input.release(src);
    autoPlate.animate(POP, { duration: 260 });
    coach.used('fire');
  });

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

  function setAuto(on: boolean): void {
    if (on === autoFire) return;
    autoFire = on;
    // a finger on SPARA keeps what it pressed; its next press follows the new mode
    const fire = buttons.fire.root;
    fire.classList.toggle('is-auto', on);
    fire.setAttribute('aria-label', on ? 'Sparo automatico acceso: tocca per spegnerlo' : 'Spara (tieni premuto)');
    autoPlate.setAttribute('aria-checked', String(on));
    autoPlate.setAttribute('aria-label', on ? 'Sparo automatico acceso' : 'Accendi lo sparo automatico');
    coach.setAuto(on);
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
    const b = buttons.super.root;
    b.querySelectorAll('.cc-ring__seg').forEach((c, i) => c.classList.toggle('is-full', i < cards));
    superName.textContent = superLabel(cards);
    b.setAttribute('aria-label', `${cards >= 1 ? `Colpo ${superLabel(cards)}` : 'Colpo EX'}: ${cards} carte su ${SUPER_CARDS}`);
    b.classList.toggle('is-empty', cards === 0);
    b.classList.toggle('is-charged', cards >= 1);
    b.classList.toggle('is-ready', cards >= SUPER_CARDS);
    if (more) b.animate(POP, { duration: 300, easing: 'cubic-bezier(.3,1.6,.5,1)' });
  }

  return {
    zone,
    coach,
    set(layout) {
      const l = layout?.mode === 'cartoon' ? layout : null;
      const states: Record<Key, ButtonState> = l
        ? { jump: 'enabled', fire: l.fire, dash: 'enabled', swap: 'enabled', super: 'enabled' }
        : { jump: 'hidden', fire: 'hidden', dash: 'hidden', swap: 'hidden', super: 'hidden' };
      for (const b of Object.values(buttons)) setState(b, states[b.key]);
      if (l) {
        setAuto(l.autoFire === true);
        setWeapon(l.weapon ?? 'provola');
        setCards(l.superCards ?? 0);
      }
      // touch mode (ui/layout.ts) = the discs are drawn: the coach only runs where someone can read it
      coach.show(l !== null, zone.closest('.is-touch') !== null);
    },
    rearm() {
      for (const b of Object.values(buttons)) b.root.classList.remove('is-down');
    },
  };
}
