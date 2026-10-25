/**
 * Level 7 HUD over the play area (HudState.kitchen): the order ticket in its slot (under the HUD band in portrait,
 * a column on the left in landscape), the patience meter with its face, the hint strip above the action button
 * (index.ts mounts the button in `zone`), the customer's speech bubble, the served pins for the HUD progress rail and
 * the INCASSO € that takes TIME's place in the HUD. The slot and the zone are `[data-inset]` parts: insets.ts publishes
 * what they cover, so the scene keeps its stations, customer and taps clear of them. Nothing here takes pointer events:
 * taps reach the game canvas.
 */
import type { KitchenHud } from '../../contracts';
import { el, pixelHtml, setText } from '../dom';
import { burgerSvg } from '../rush/icons';
import { createBubble } from './bubble';
import { coinSvg, faceSvg } from './icons';
import { type Box, PATIENCE, type PatienceMood, patienceMood, takings } from './text';
import { createTicket } from './ticket';

/** Ticket layouts tried in order until it fits its slot (kitchen/hud.css: list, two columns, packed chips, tighter chips with the bins' short names). */
const MAX_FIT = 3;
/** Room kept between the bubble and the covered strips / host edges. */
const FREE_MARGIN = 8;
/** Patience bar steps (no DOM write for smaller changes). */
const PATIENCE_STEPS = 50;
/** The zig-zag edge hangs under the paper box. */
const TORN_EDGE = 8;
const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }];

export interface KitchenLayer {
  /** overlay over the game host (inside .cc-play) */
  readonly root: HTMLElement;
  /** hint + action button area */
  readonly zone: HTMLElement;
  /** served pins, laid on the HUD progress rail */
  readonly pins: HTMLElement;
  /** INCASSO € (shift takings), shown in the HUD in place of TIME */
  readonly till: HTMLElement;
  /** `on` = level 7 is the HUD's level; `visible` follows showHud */
  show(on: boolean, visible: boolean): void;
  update(k: KitchenHud): void;
  setCalm(calm: boolean): void;
}

export function createKitchenLayer(): KitchenLayer {
  const root = el('div', 'cc-kitchen');
  root.hidden = true;
  const col = el('div', 'cc-kcol');
  const slot = el('div', 'cc-kslot');
  slot.dataset.inset = '';
  slot.dataset.fit = '0';
  const ticket = createTicket();
  ticket.paper.hidden = true;
  const pat = el('div', 'cc-kpat');
  pat.setAttribute('role', 'meter');
  pat.hidden = true;
  const face = el('span', 'cc-kface', faceSvg('happy'));
  const fill = el('i');
  const bar = el('span', 'cc-kpat__bar');
  bar.append(fill);
  pat.append(face, bar);
  slot.append(pat, ticket.paper);
  const zone = el('div', 'cc-kzone');
  zone.dataset.inset = '';
  const hint = el('p', 'cc-khint');
  hint.setAttribute('aria-live', 'polite');
  const hintLine = el('span');
  hint.append(hintLine);
  zone.append(hint);
  col.append(slot, zone);
  const bubble = createBubble();
  root.append(col, bubble.root);
  const pins = el('div', 'cc-kpins');
  const till = el('div', 'cc-ktill', `<span class="cc-time__label">${coinSvg()}INCASSO</span>`);
  const tillNum = el('span', 'cc-time__num', takings(0));
  till.append(tillNum);

  let calm = false;
  let shownCents = 0;
  let shownPatience = -1;
  let mood: PatienceMood = 'happy';
  let pinKey = '';
  let hintText: string | null = null;

  function free(): Box {
    const cs = getComputedStyle(root);
    const px = (name: string): number => parseFloat(cs.getPropertyValue(name)) || 0;
    const t = px('--play-inset-t');
    const l = px('--play-inset-l');
    const b = px('--play-inset-b');
    return { x: l + FREE_MARGIN, y: t + FREE_MARGIN, w: root.clientWidth - l - 2 * FREE_MARGIN, h: root.clientHeight - t - b - 2 * FREE_MARGIN };
  }

  /**
   * The first layout whose paper (and its torn edge) fits the slot with every line inside its column; the last one
   * stays even if it does not. The customer's name is fitted first in each: a name on its own row adds height.
   */
  function fit(): void {
    if (ticket.paper.hidden) return;
    for (let f = 0; f <= MAX_FIT; f++) {
      slot.dataset.fit = String(f);
      ticket.short(f === MAX_FIT);
      ticket.fitName();
      if (ticket.paper.offsetHeight + TORN_EDGE <= slot.clientHeight && !ticket.overflows()) break;
    }
  }

  function renderTicket(k: KitchenHud): void {
    const t = k.ticket;
    if (!t) {
      ticket.paper.hidden = true;
      if (pat.parentElement !== slot) slot.prepend(pat);
      return;
    }
    const wasHidden = ticket.paper.hidden;
    ticket.paper.hidden = false;
    if (pat.parentElement !== ticket.meta) ticket.meta.append(pat);
    if (ticket.render(t) || wasHidden) {
      fit();
      if (wasHidden && !calm) ticket.paper.animate([{ transform: 'translateY(-24px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.3,1.4,.5,1)' });
    }
  }

  function renderPatience(p: number | null): void {
    if (pat.hidden !== (p === null)) {
      pat.hidden = p === null;
      // the meter shares the customer's row on the ticket: the name gets more or less room
      fit();
    }
    if (p === null) return;
    const q = Math.round(Math.max(0, Math.min(1, p)) * PATIENCE_STEPS) / PATIENCE_STEPS;
    if (q === shownPatience) return;
    shownPatience = q;
    fill.style.transform = `scaleX(${q})`;
    const next = patienceMood(q);
    pat.dataset.mood = next;
    pat.classList.toggle('is-low', q < PATIENCE.low);
    pat.setAttribute('aria-label', `Pazienza del cliente ${Math.round(q * 100)}%`);
    if (next !== mood) {
      mood = next;
      face.innerHTML = faceSvg(next);
      if (!calm) face.animate(POP, { duration: 300, easing: 'ease-out' });
    }
  }

  function renderPins(done: number, total: number): void {
    const key = `${done}/${total}`;
    if (key === pinKey) return;
    pinKey = key;
    if (pins.childElementCount !== total) {
      pins.replaceChildren(
        ...Array.from({ length: total }, (_, i) => {
          const p = el('span', 'cc-kpin', burgerSvg());
          p.style.left = `${((i + 0.5) / total) * 100}%`;
          return p;
        }),
      );
    }
    [...pins.children].forEach((p, i) => {
      const nowDone = i < done;
      if (nowDone && !p.classList.contains('is-done') && !calm) p.animate(POP, { duration: 360, easing: 'ease-out' });
      p.classList.toggle('is-done', nowDone);
      p.classList.toggle('is-next', i === done);
    });
  }

  function renderTill(cents: number): void {
    if (cents === shownCents) return;
    const up = cents > shownCents;
    shownCents = cents;
    setText(tillNum, takings(cents));
    if (up && !calm) tillNum.animate(POP, { duration: 320, easing: 'ease-out' });
  }

  function renderHint(text: string | null): void {
    if (text === hintText) return;
    hintText = text;
    hint.classList.toggle('is-on', !!text);
    if (!text) return;
    hintLine.innerHTML = pixelHtml(text);
    // `translate`, not `transform`: CSS centres the line with a transform
    if (!calm) hintLine.animate([{ translate: '0 6px', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: 220, easing: 'ease-out' });
  }

  new ResizeObserver(() => {
    fit();
    bubble.place(free());
  }).observe(slot);
  // the slot keeps its size when a late web font reflows the paper: measure again once the fonts are in
  void document.fonts.ready.then(fit);
  // insets.ts dispatches a resize once the covered strips are measured: the bubble follows them
  window.addEventListener('resize', () => {
    if (!root.hidden) bubble.place(free());
  });

  return {
    root,
    zone,
    pins,
    till,
    show(on, visible) {
      root.hidden = !on;
      root.classList.toggle('is-off', !visible);
    },
    update(k) {
      root.dataset.view = k.view;
      renderTicket(k);
      renderPatience(k.patience);
      renderPins(k.served.done, k.served.total);
      renderHint(k.hint);
      if (k.takingsCents !== undefined) renderTill(k.takingsCents);
      bubble.render(k.say, free);
    },
    setCalm(c) {
      calm = c;
      root.classList.toggle('is-calm', c);
      pins.classList.toggle('is-calm', c);
      bubble.setCalm(c);
    },
  };
}
