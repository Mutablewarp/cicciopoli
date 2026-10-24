/**
 * Level 6 results card (GameUI.showRushResults): CONSEGNA COMPLETATA! / CORSA TERMINATA!, the score counting
 * up, stars landing one by one, record, breakdown, run stats, new achievements and an unlocked driver as
 * toasts, the tip, then RIPROVA, CONDIVIDI RISULTATO, SCOPRI IL MENU CICCIO'S (new tab) and MENU. The details
 * scroll on short screens while the buttons stay put; a fade and a ▼ say when more is below. `calm` (reduced motion) shows everything at once.
 */
import type { RushResultInfo } from '../../contracts';
import { button, el, scrollPane } from '../dom';
import { ARROW_DOWN, headSvg } from '../icons';
import { type Modal, confetti } from '../screens';
import { trophySvg } from './icons';
import { starsHtml } from './stage';
import { ORDERS_PER_RUN, decimal, points } from './text';

export const MENU_URL = 'https://cicciosburger.it/';
/** Score count-up; stars, record and toasts follow it (CSS delays from --reveal). */
const COUNT_MS = 1100;
const TOAST_MS = 1800;

const label = (text: string): string => `<span class="cc-btn__label">${text}</span>`;
const text = (tag: 'p' | 'span' | 'dt' | 'dd' | 'strong' | 'b', cls: string, value: string): HTMLElement => {
  const n = el(tag, cls);
  n.textContent = value;
  return n;
};

/** Eases the number from 0 to `to` (ease-out cubic); stops if the card is closed. */
function countUp(node: HTMLElement, to: number): void {
  const t0 = performance.now();
  const step = (now: number): void => {
    const k = Math.min(1, (now - t0) / COUNT_MS);
    node.textContent = points(to * (1 - (1 - k) ** 3));
    if (k < 1 && node.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/** Copy through a hidden textarea: the clipboard API is missing outside https (e.g. a phone testing over the LAN). */
function legacyCopy(value: string): boolean {
  const ta = el('textarea');
  ta.value = value;
  ta.readOnly = true;
  ta.style.cssText = 'position:fixed;left:0;top:0;opacity:0';
  document.body.append(ta);
  ta.select();
  const ok = document.execCommand('copy');
  ta.remove();
  return ok;
}

/**
 * Web Share sheet when the browser has one, else the clipboard; a cancelled share is not an error. The challenge
 * carries the game's address (no ?level / ?debug) so whoever receives it can play.
 */
async function share(shareText: string, toast: (msg: string) => void): Promise<void> {
  const url = location.origin + location.pathname;
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ text: shareText, url });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  const copy = `${shareText} ${url}`;
  try {
    await navigator.clipboard.writeText(copy);
    toast('Copiato!');
  } catch {
    toast(legacyCopy(copy) ? 'Copiato!' : 'Copia non riuscita');
  }
}

function stats(info: RushResultInfo): HTMLElement {
  const dl = el('dl', 'cc-stats cc-rres__stats');
  const rows: Array<[string, string]> = [
    ['CONSEGNE', `${info.delivered}/${ORDERS_PER_RUN}`],
    ['FRESCHEZZA', info.delivered > 0 ? `${Math.round(info.avgFresh)}%` : '—'],
    ['URTI', String(info.collisions)],
    ['COMBO MAX', `x${decimal(info.bestCombo)}`],
  ];
  for (const [k, v] of rows) {
    const d = el('div');
    d.append(text('dt', '', k), text('dd', '', v));
    dl.append(d);
  }
  return dl;
}

function breakdown(info: RushResultInfo): HTMLElement {
  const dl = el('dl', 'cc-rres__rows');
  for (const r of info.breakdown) {
    const d = el('div');
    d.append(text('dt', '', r.label), text('dd', '', `${r.points >= 0 ? '+' : ''}${points(r.points)}`));
    dl.append(d);
  }
  return dl;
}

/** The new drivers lead (one toast each): they change the next run, the achievements only celebrate this one. */
function toasts(info: RushResultInfo): HTMLElement {
  const ul = el('ul', 'cc-rres__toasts');
  const items = info.newAchievements.map((a) => ({ head: 'TRAGUARDO SBLOCCATO', name: a.name, desc: a.desc }));
  // shortcut: the contract joins two drivers unlocked by one run with ' + '; split here until it is a string[]
  const drivers = info.unlockedDriver?.split(' + ') ?? [];
  const desc = 'Sceglilo nella schermata del livello, prima di GIOCA ORA.';
  items.unshift(...drivers.map((name) => ({ head: 'NUOVO PILOTA', name, desc })));
  items.forEach((t, i) => {
    const li = el('li', 'cc-rtoast-item', trophySvg());
    li.style.setProperty('--i', String(i));
    const body = el('span');
    body.append(text('b', '', t.head), text('strong', '', t.name), text('span', '', t.desc));
    li.append(body);
    ul.append(li);
  });
  return ul;
}

export function showRushResults(modal: Modal, info: RushResultInfo, h: { onRetry(): void; onMenu(): void }, calm: boolean): void {
  const { menu } = modal;
  const card = el('div', `cc-card cc-rush-card cc-rres-card${info.completed ? ' is-win' : ' is-over'}${calm ? ' is-calm' : ''}`);
  card.style.setProperty('--reveal', `${calm ? 0 : COUNT_MS}ms`);
  const body = el('div', 'cc-card__body cc-rres');
  card.append(body);
  if (info.completed && !calm) body.insertAdjacentHTML('afterbegin', confetti());

  const top = el('div', 'cc-rres__top');
  if (info.daily) top.append(text('p', 'cc-rres__daily', 'SFIDA DEL GIORNO'));
  top.insertAdjacentHTML(
    'beforeend',
    info.completed
      ? '<h2 class="cc-bigtitle cc-bigtitle--rwin">CONSEGNA<br>COMPLETATA!</h2>'
      : '<h2 class="cc-bigtitle cc-bigtitle--rover">CORSA<br>TERMINATA!</h2>',
  );
  const num = text('b', 'cc-rres__num', calm ? points(info.score) : '0');
  const score = el('p', 'cc-rres__score');
  score.append(num, text('span', '', 'PUNTI'));
  top.append(score);
  top.insertAdjacentHTML('beforeend', starsHtml(info.stars, !calm));
  if (info.newBest) top.append(text('p', 'cc-record cc-rres__new', 'NUOVO RECORD!'));
  else if (info.best > 0) top.append(text('p', 'cc-rres__best', `RECORD ${points(info.best)}`)); // no record yet: no line
  top.append(stats(info));

  const tip = el('p', 'cc-rres__tip', headSvg());
  tip.append(text('span', '', info.tip));
  const side = el('div', 'cc-rres__side');
  side.append(breakdown(info), tip, toasts(info));

  const scroll = el('div', 'cc-rres__scroll');
  scroll.append(top, side);
  scrollPane(scroll, body); // fade + ▼ while more details hide under the buttons

  const note = el('p', 'cc-rres__note');
  note.setAttribute('role', 'status');
  let noteTimer = 0;
  const toast = (msg: string): void => {
    note.textContent = msg;
    note.classList.remove('is-on');
    void note.offsetWidth; // restart the pop animation
    note.classList.add('is-on');
    window.clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => note.classList.remove('is-on'), TOAST_MS);
  };

  const retry = button('cc-btn--primary cc-btn--go', label('RIPROVA'), menu.guard(h.onRetry));
  const shareBtn = button('cc-btn--share', label('CONDIVIDI RISULTATO'), menu.guard(() => void share(info.shareText, toast), false));
  const back = button('cc-btn--menu', label('MENU'), menu.guard(h.onMenu));
  const link = el('a', 'cc-btn cc-btn--link', label("SCOPRI IL MENU CICCIO'S"));
  link.href = MENU_URL;
  link.target = '_blank';
  link.rel = 'noopener';
  const btns = el('div', 'cc-rres__btns');
  btns.append(retry, shareBtn, link, back, note, el('span', 'cc-rres__more', ARROW_DOWN));
  body.append(scroll, btns);

  modal.present('rush-results', card, [retry, shareBtn, link, back], 650, h.onMenu);
  if (!calm) countUp(num, info.score);
}
