/**
 * Level 6 HUD parts: the FRESCHEZZA meter, the power chips with the time left of the timed power and the
 * combo badge, which turns gold with a flame and a draining meter during CICCIO FEVER (one row: full width under
 * the band in portrait, inline in the landscape bar), plus the delivery pins laid on the progress rail. hud.ts owns the rest (hearts, score, countdown, pause).
 */
import type { HudState, PowerState } from '../../contracts';
import { el, setText } from '../dom';
import { burgerSvg, cheddarSvg, flameSvg, pinSvg, popcornSvg, rocketSvg, shieldSvg, waffleSvg } from './icons';
import { POWER_NAMES, RUSH_POWERS, type RushPower, comboLabel, freshTone, pinAt, timedPower } from './text';

const SEGMENTS = 10;
/** The chip of the timed power blinks below this share of its time. */
const EXPIRING = 0.25;
/** A freshness drop this big (a hit) shakes the meter. */
const HIT_DROP = 10;
const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }];
/** CICCIO FEVER lights up: a bigger pop than a combo step. */
const FEVER_POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.6) rotate(-6deg)' }, { transform: 'scale(1)' }];
const FEVER_LABEL = 'Ciccio Fever: punti doppi';
const IDLE_LABEL = 'Freschezza: nessun ordine a bordo';
const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'none' }];
const ICONS: Readonly<Record<RushPower, () => string>> = {
  shield: shieldSvg,
  radar: waffleSvg,
  sprint: popcornSvg,
  grip: cheddarSvg,
  jet: rocketSvg,
};

export interface RushHud {
  /** FRESCHEZZA + chips + combo */
  readonly row: HTMLElement;
  /** goes inside the progress rail, under the marker */
  readonly pins: HTMLElement;
  update(s: Partial<HudState>): void;
}

export function createRushHud(): RushHud {
  const row = el('div', 'cc-hud__rush');
  const fresh = el('div', 'cc-fresh is-off', `<span class="cc-fresh__label">FRESCHEZZA</span>${burgerSvg()}`);
  fresh.setAttribute('role', 'meter');
  fresh.setAttribute('aria-label', IDLE_LABEL);
  const bar = el('span', 'cc-fresh__bar');
  const segs = Array.from({ length: SEGMENTS }, () => el('i'));
  bar.append(...segs);
  fresh.append(bar);

  const chipRow = el('div', 'cc-rchips');
  const chips = new Map<RushPower, { chip: HTMLElement; left: HTMLElement }>();
  for (const k of RUSH_POWERS) {
    const chip = el('span', 'cc-chip cc-chip--rush is-on', ICONS[k]());
    chip.title = POWER_NAMES[k];
    chip.hidden = true;
    const left = el('span', 'cc-chip__left');
    chip.append(left);
    chips.set(k, { chip, left });
    chipRow.append(chip);
  }
  const combo = el('span', 'cc-combo', flameSvg());
  const comboText = el('b', 'cc-combo__x');
  const feverLeft = el('i', 'cc-combo__fever');
  combo.append(comboText, feverLeft);
  combo.hidden = true;
  row.append(fresh, chipRow, combo);
  const pins = el('div', 'cc-pins');

  let shownFresh: number | null = null;
  let pinKey = '';
  let timed: RushPower | null = null;
  let left = 1;
  let shownLeft = -1;
  let comboValue = 1;
  let fever = 0;

  function renderFresh(v: number | null): void {
    const q = v === null ? null : Math.round(Math.max(0, Math.min(100, v)));
    if (q === shownFresh) return;
    const prev = shownFresh;
    shownFresh = q;
    fresh.classList.toggle('is-off', q === null);
    const on = q === null ? 0 : Math.ceil((q * SEGMENTS) / 100);
    segs.forEach((seg, i) => seg.classList.toggle('is-on', i < on));
    if (q === null) {
      delete fresh.dataset.tone; // the idle meter neither blinks nor keeps the last order's colour
      fresh.setAttribute('aria-label', IDLE_LABEL);
      return;
    }
    fresh.dataset.tone = freshTone(q);
    fresh.setAttribute('aria-label', `Freschezza ${q}%`);
    if (prev !== null && q <= prev - HIT_DROP) bar.animate(SHAKE, { duration: 240 });
  }

  function renderPins(done: number, total: number): void {
    const key = `${done}/${total}`;
    if (key === pinKey) return;
    pinKey = key;
    if (pins.childElementCount !== total) {
      pins.replaceChildren(
        ...Array.from({ length: total }, (_, i) => {
          const p = el('span', 'cc-pin', pinSvg());
          p.style.left = `${pinAt(i, total) * 100}%`;
          return p;
        }),
      );
    }
    [...pins.children].forEach((p, i) => {
      const nowDone = i < done;
      if (nowDone && !p.classList.contains('is-done')) p.animate(POP, { duration: 360, easing: 'ease-out' });
      p.classList.toggle('is-done', nowDone);
      p.classList.toggle('is-next', i === done);
    });
  }

  function renderPowers(p: PowerState): void {
    for (const [k, c] of chips) {
      const on = !!p[k];
      if (c.chip.hidden !== on) continue;
      c.chip.hidden = !on;
      if (on) c.chip.animate(POP, { duration: 320, easing: 'ease-out' });
    }
    const next = timedPower(p);
    if (next !== timed) {
      timed = next;
      shownLeft = -1;
    }
  }

  function renderLeft(): void {
    const q = Math.round(Math.max(0, Math.min(1, left)) * 40) / 40;
    if (q === shownLeft) return;
    shownLeft = q;
    for (const [k, c] of chips) {
      const mine = k === timed;
      c.left.hidden = !mine;
      c.chip.classList.toggle('is-expiring', mine && q < EXPIRING);
      if (mine) c.left.style.transform = `scaleX(${q})`;
    }
  }

  function renderCombo(c: number): void {
    const text = comboLabel(c);
    const up = text !== null && c > comboValue;
    comboValue = c;
    combo.hidden = text === null && fever === 0;
    setText(comboText, text ?? '');
    if (up && fever === 0) combo.animate(POP, { duration: 300, easing: 'ease-out' });
  }

  /** 0..1 FEVER left, in 1/40 steps (the meter is a few px wide). */
  function renderFever(f: number): void {
    const q = Math.round(Math.max(0, Math.min(1, f)) * 40) / 40;
    if (q === fever) return;
    const lit = fever === 0 && q > 0;
    fever = q;
    combo.classList.toggle('is-fever', q > 0);
    feverLeft.style.transform = `scaleX(${q})`;
    combo.hidden = comboLabel(comboValue) === null && q === 0;
    if (q > 0) combo.setAttribute('aria-label', FEVER_LABEL);
    else combo.removeAttribute('aria-label');
    if (lit) combo.animate(FEVER_POP, { duration: 420, easing: 'ease-out' });
  }

  return {
    row,
    pins,
    update(s) {
      if (s.fresh !== undefined) renderFresh(s.fresh);
      if (s.deliveries) renderPins(s.deliveries.done, s.deliveries.total);
      if (s.powers) renderPowers(s.powers);
      if (s.powerLeft !== undefined) left = s.powerLeft;
      if (s.powers || s.powerLeft !== undefined) renderLeft();
      if (s.combo !== undefined && s.combo !== comboValue) renderCombo(s.combo);
      if (s.fever !== undefined) renderFever(s.fever);
    },
  };
}
