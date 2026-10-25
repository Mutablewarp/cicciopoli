/**
 * Level 8 boss map (GameUI.showCartoonMap): a 1930s theatre playbill — CICCIO'S GOLDEN TICKET in display lettering,
 * the seven acts (the shirt mascots: portrait, name, tagline, CHIUSO / TOCCA A TE! / STESO! with the best grade), the
 * golden ticket as the grand finale, the record, then GIOCA (the next boss), COME SI GIOCA, IMPOSTAZIONI and MENU.
 * A tap on an open or beaten act plays that boss; a locked one shakes. One column in portrait, two in landscape.
 */
import type { CartoonBossCard, CartoonBossId, CartoonMapInfo, CartoonSettings } from '../../contracts';
import { button, el, onActivate, scrollPane } from '../dom';
import { points } from '../rush/text';
import { type Modal, keyLegend } from '../screens';
import { bossEmblem } from './emblems';
import { lockSvg, starSvg, ticketSvg } from './icons';
import { type CartoonPanelHost, openCartoonPanel } from './panels';
import { CARD_STATE, cardAria } from './text';

export interface CartoonMapHandlers {
  onPlay(boss: CartoonBossId): void;
  onSettings(s: CartoonSettings): void;
  onMenu(): void;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const label = (text: string): string => `<span class="cc-btn__label">${text}</span>`;
const SHAKE: Keyframe[] = [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px) rotate(-1deg)' }, { transform: 'translateX(6px) rotate(1deg)' }, { transform: 'translateX(0)' }];

function bossCard(c: CartoonBossCard, i: number, next: CartoonBossId, play: (id: CartoonBossId) => void, calm: () => boolean): HTMLButtonElement {
  const b = el('button', `cc-bcard is-${c.state}${c.id === next ? ' is-next' : ''}`);
  b.type = 'button';
  b.style.setProperty('--i', String(i));
  b.setAttribute('aria-label', cardAria(c, i));
  if (c.state === 'locked') b.setAttribute('aria-disabled', 'true');
  const art = el('span', 'cc-bcard__art', bossEmblem(c.id));
  if (c.state === 'locked') art.insertAdjacentHTML('beforeend', `<span class="cc-bcard__lock">${lockSvg()}</span>`);
  const text = el('span', 'cc-bcard__text');
  const act = el('span', 'cc-bcard__act', `ATTO ${ROMAN[i] ?? i + 1}`);
  const name = el('b', 'cc-bcard__name');
  name.textContent = c.name;
  const tag = el('span', 'cc-bcard__tag');
  tag.textContent = c.tagline;
  text.append(act, name, tag);
  const stamp = el('span', 'cc-bcard__stamp');
  stamp.textContent = CARD_STATE[c.state];
  b.append(art, text, stamp);
  if (c.state === 'beaten' && c.grade) b.append(el('span', 'cc-bcard__grade', c.grade));
  onActivate(b, () => {
    if (c.state !== 'locked') play(c.id);
    else if (!calm()) b.animate(SHAKE, { duration: 320 });
  });
  return b;
}

function finale(golden: boolean): HTMLElement {
  const li = el('div', `cc-bcard cc-bcard--ticket${golden ? ' is-won' : ''}`);
  li.append(el('span', 'cc-bcard__art', ticketSvg()));
  const text = el('span', 'cc-bcard__text');
  text.append(el('span', 'cc-bcard__act', 'GRAN FINALE'), el('b', 'cc-bcard__name', "IL BIGLIETTO D'ORO"));
  const tag = el('span', 'cc-bcard__tag');
  tag.textContent = golden ? 'Vinto! Sei tu il re delle mascotte.' : 'Batti tutte e sette le mascotte per vederlo.';
  text.append(tag);
  li.append(text);
  if (golden) li.append(el('span', 'cc-bcard__star', starSvg()));
  return li;
}

export function showCartoonMap(modal: Modal, info: CartoonMapInfo, h: CartoonMapHandlers, calm: () => boolean): void {
  const { menu } = modal;
  let settings: CartoonSettings = { ...info.settings };
  const card = el('div', `cc-card cc-toon cc-cmap${settings.reducedMotion ? ' is-calm' : ''}`);

  const head = el(
    'header',
    'cc-cmap__head',
    `<p class="cc-cmap__kicker">Un cartone animato in sette atti</p>` +
      `<h2 class="cc-toon-title cc-cmap__title"><span>CICCIO'S</span> GOLDEN TICKET</h2>` +
      `<p class="cc-toon-ribbon">LA SFIDA DELLE MASCOTTE</p>`,
  );
  const record = el('p', 'cc-cmap__record');
  record.innerHTML = info.best > 0 ? `RECORD <b>${points(info.best)}</b>` : 'Sette mascotte ti aspettano';
  if (info.golden) record.insertAdjacentHTML('afterbegin', `<span class="cc-cmap__won">${ticketSvg()} BIGLIETTO D'ORO VINTO!</span>`);

  const play = (id: CartoonBossId): void => menu.guard(() => h.onPlay(id))();
  const cards = info.bosses.map((c, i) => bossCard(c, i, info.next, play, () => calm() || settings.reducedMotion));
  const list = el('div', 'cc-cmap__list');
  list.append(...cards, finale(info.golden));
  const scroll = el('div', 'cc-cmap__scroll');
  scroll.append(list);

  const nextIdx = Math.max(0, info.bosses.findIndex((b) => b.id === info.next));
  const nextName = info.bosses[nextIdx]?.name ?? '';
  const go = button(
    'cc-btn--primary cc-btn--go cc-cmap__go',
    `${label('GIOCA ▶')}<span class="cc-cmap__gonext">ATTO ${ROMAN[nextIdx] ?? ''} · ${nextName}</span>`,
    menu.guard(() => h.onPlay(info.next)),
  );
  let from = 0;
  const panel = (kind: 'help' | 'settings', text: string, i: number): HTMLButtonElement =>
    button(
      'cc-btn--more',
      label(text),
      menu.guard(() => {
        from = i;
        openCartoonPanel(kind, host);
      }, false),
    );
  const more = [panel('help', 'COME SI GIOCA', 0), panel('settings', 'IMPOSTAZIONI', 1), button('cc-btn--menu', label('MENU'), menu.guard(h.onMenu))];
  const row = el('div', 'cc-cmap__more');
  row.append(...more);
  const act = el('div', 'cc-cmap__act');
  act.append(go, row);
  act.insertAdjacentHTML('beforeend', keyLegend(8));

  const side = el('div', 'cc-cmap__side');
  side.append(head, record, act);
  card.append(side, scroll);
  scrollPane(scroll, card);

  const items: HTMLElement[] = [...cards, go, ...more];
  const host: CartoonPanelHost = {
    body: card,
    menu,
    achievements: [],
    settings: () => settings,
    setSettings(s) {
      settings = s;
      card.classList.toggle('is-calm', s.reducedMotion);
      h.onSettings(s);
    },
    back: () => menu.open(items, { onBack: h.onMenu, initial: items.indexOf(more[from]) }),
  };
  modal.present('cartoon-map', card, items, 250, h.onMenu);
  menu.select(items.indexOf(go), false);
  // the open act is centred in the list when the list scrolls (small screens); scrollIntoView would also scroll the modal
  requestAnimationFrame(() => {
    const c = cards[nextIdx];
    if (c) scroll.scrollTop = Math.max(0, c.offsetTop - (scroll.clientHeight - c.offsetHeight) / 2);
  });
}
