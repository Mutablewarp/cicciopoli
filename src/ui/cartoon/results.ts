/**
 * Level 8 results (GameUI.showCartoonResults). Knockout: a 1930s report card — AL TAPPETO!, the boss, time / hearts /
 * parries / super cards used, the GRADE rubber stamp slammed on the sheet, the score counting up, record or NUOVO RECORD!, the
 * tip, then PROSSIMO BOSS (when one is open), RIPROVA, MAPPA, MENU, CONDIVIDI. The golden flag puts the golden ticket
 * banner on top. Defeat: K.O.!, how far the boss was pushed on a bar from Ciccio to the boss, the tip, RIPROVA, MAPPA.
 * `calm` (reduced motion) shows everything at once.
 */
import type { CartoonResultInfo } from '../../contracts';
import { button, el, formatTime, scrollPane } from '../dom';
import type { Menu } from '../menu';
import { COUNT_MS, countUp, share } from '../rush/results';
import { points } from '../rush/text';
import { type Modal, confetti } from '../screens';
import { bossEmblem } from './emblems';
import { cardHeartSvg } from './icons';
import { FACE_HD_URL, ticketArt, ticketDefs } from './thumb';
import { HERO_HEARTS, defeatLine, gradeTone, percent } from './text';

export interface CartoonResultHandlers {
  onRetry(): void;
  onNext?(): void;
  onMap(): void;
  onMenu(): void;
}

const NOTE_MS = 1800;
const label = (text: string): string => `<span class="cc-btn__label">${text}</span>`;
const text = (tag: 'p' | 'span' | 'b' | 'dt' | 'dd', cls: string, value: string): HTMLElement => {
  const n = el(tag, cls);
  n.textContent = value;
  return n;
};
const face = (): string => `<span class="cc-cres__face"><img src="${FACE_HD_URL}" alt="" draggable="false" decoding="async"></span>`;

function goldenBanner(): HTMLElement {
  const b = el('div', 'cc-cres__golden');
  b.innerHTML =
    `<svg viewBox="-110 -60 220 120" aria-hidden="true"><defs>${ticketDefs('cres-')}</defs>${ticketArt('cres-')}</svg>` +
    '<p class="cc-toon-title cc-cres__so"><span>YOU ARE</span> SO GOLDEN</p>';
  return b;
}

function sheet(info: CartoonResultInfo): HTMLElement {
  const dl = el('dl', 'cc-cres__rows');
  const hearts = el('dd', 'cc-cres__hearts');
  hearts.setAttribute('aria-label', `${info.hp} cuori`);
  hearts.innerHTML = Array.from({ length: HERO_HEARTS }, (_, i) => `<span class="cc-cres__heart">${cardHeartSvg(i < info.hp)}</span>`).join('');
  const rows: Array<[string, HTMLElement]> = [
    ['TEMPO', text('dd', '', formatTime(info.timeMs))],
    ['CUORI', hearts],
    ['PARATE', text('dd', '', String(info.parries))],
    // info.supers counts the cards spent (one per EX shot, five per PIOGGIA DI PATATINE), not the supers
    ['CARTE USATE', text('dd', '', String(info.supers))],
  ];
  for (const [k, v] of rows) {
    const d = el('div');
    d.append(text('dt', '', k), v);
    dl.append(d);
  }
  const wrap = el('div', 'cc-cres__sheet');
  const stamp = el('div', `cc-cres__grade is-${gradeTone(info.grade)}`, '<span>VOTO</span>');
  stamp.append(text('b', '', info.grade ?? '—'));
  wrap.append(dl, stamp);
  return wrap;
}

function defeatBar(info: CartoonResultInfo): HTMLElement {
  const p = Math.max(0, Math.min(1, info.progress));
  const bar = el('div', 'cc-cres__bar');
  bar.style.setProperty('--p', String(p));
  bar.setAttribute('role', 'img');
  bar.setAttribute('aria-label', `Avanzamento contro ${info.bossName}: ${percent(p)}`);
  bar.innerHTML =
    `<span class="cc-cres__track"><i></i></span>${face().replace('cc-cres__face', 'cc-cres__face cc-cres__runner')}` +
    `<span class="cc-cres__goal">${bossEmblem(info.boss)}</span><b class="cc-cres__pct">${percent(p)}</b>`;
  return bar;
}

/** Buttons in menu order, with the Copiato! note of CONDIVIDI. */
function buttons(menu: Menu, info: CartoonResultInfo, h: CartoonResultHandlers): { root: HTMLElement; items: HTMLElement[] } {
  const root = el('div', 'cc-cres__btns');
  const note = el('p', 'cc-rres__note');
  note.setAttribute('role', 'status');
  let timer = 0;
  const toast = (msg: string): void => {
    note.textContent = msg;
    note.classList.remove('is-on');
    void note.offsetWidth; // restart the pop animation
    note.classList.add('is-on');
    window.clearTimeout(timer);
    timer = window.setTimeout(() => note.classList.remove('is-on'), NOTE_MS);
  };
  const items: HTMLElement[] = [];
  const onNext = h.onNext;
  if (info.won && info.hasNext && onNext) items.push(button('cc-btn--primary cc-btn--go cc-cres__next', label('PROSSIMO BOSS ▶'), menu.guard(onNext)));
  items.push(button(items.length ? 'cc-cres__retry' : 'cc-btn--primary cc-btn--go cc-cres__retry', label('RIPROVA'), menu.guard(h.onRetry)));
  items.push(button('cc-cres__map', label('MAPPA'), menu.guard(h.onMap)));
  if (info.won) {
    items.push(button('cc-btn--menu', label('MENU'), menu.guard(h.onMenu)));
    items.push(button('cc-btn--share', label('CONDIVIDI'), menu.guard(() => void share(info.shareText, toast), false)));
  }
  root.append(...items, note);
  // the small buttons share a row: 4 -> 2 x 2, 3 -> one row of 3, 1 -> full width
  const small = items.length - (items[0]?.classList.contains('cc-btn--primary') ? 1 : 0);
  root.style.setProperty('--cols', String(small === 4 ? 2 : Math.max(1, small)));
  return { root, items };
}

export function showCartoonResults(modal: Modal, info: CartoonResultInfo, h: CartoonResultHandlers, calm: boolean): void {
  const { menu } = modal;
  const mood = info.won ? `is-win${info.golden ? ' is-golden' : ''}` : 'is-over';
  const card = el('div', `cc-card cc-toon cc-cres ${mood}${calm ? ' is-calm' : ''}`);
  card.style.setProperty('--reveal', `${calm ? 0 : COUNT_MS}ms`);
  if (info.won && !calm) card.insertAdjacentHTML('afterbegin', confetti());

  const scroll = el('div', 'cc-cres__scroll');
  if (info.golden) scroll.append(goldenBanner());
  const head = el('header', 'cc-cres__head');
  head.append(text('p', 'cc-cres__kicker', info.won ? 'LA PAGELLA DI CICCIO' : 'FINE DEL ROUND'));
  head.insertAdjacentHTML('beforeend', `<h2 class="cc-toon-title cc-cres__title">${info.won ? 'AL TAPPETO!' : 'K.O.!'}</h2>`);
  const boss = el('p', 'cc-cres__boss', `<span class="cc-cres__emblem">${bossEmblem(info.boss)}</span>`);
  boss.append(text('span', '', info.bossName));
  head.append(boss);
  scroll.append(head);

  if (info.won) {
    scroll.append(sheet(info));
    const num = text('b', 'cc-cres__num', calm ? points(info.score) : '0');
    const score = el('p', 'cc-cres__score');
    score.append(num, text('span', '', 'PUNTI'));
    scroll.append(score);
    if (info.newBest) scroll.append(text('p', 'cc-record cc-cres__new', 'NUOVO RECORD!'));
    else if (info.best > 0) scroll.append(text('p', 'cc-cres__best', `RECORD ${points(info.best)}`));
    if (!calm) countUp(num, info.score);
  } else {
    scroll.append(defeatBar(info), text('p', 'cc-cres__line', defeatLine(info.bossName, info.progress)));
  }
  const tip = el('p', 'cc-cres__tip', face());
  tip.append(text('span', '', info.tip));
  scroll.append(tip);

  const bar = buttons(menu, info, h);
  card.append(scroll, bar.root);
  scrollPane(scroll, card);
  modal.present(info.won ? 'cartoon-win' : 'cartoon-over', card, bar.items, 650, h.onMap);
}
