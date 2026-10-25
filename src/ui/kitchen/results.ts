/**
 * Level 7 results card (GameUI.showKitchenResults), laid out like the level 6 one (rush/results.css): the gold
 * YOU ARE SO GOLDEN! banner after the golden finale, TURNO FINITO! / TURNO CHIUSO!, the score counting up, stars
 * landing one by one, record and the count of new achievements, the day's takings on a scontrino strip, the shift
 * stats, the tip, breakdown, the new achievements, then RIPROVA, CONDIVIDI RISULTATO, SCOPRI IL MENÙ CICCIO'S (new
 * tab) and MENU. `calm` (reduced motion) shows everything at once.
 */
import type { KitchenResultInfo } from '../../contracts';
import { el, pixelHtml, scrollPane } from '../dom';
import { trophySvg } from '../rush/icons';
import { COUNT_MS, breakdown, countUp, resultButtons } from '../rush/results';
import { starsHtml } from '../rush/stage';
import { points } from '../rush/text';
import { type Modal, confetti } from '../screens';
import { faceLogoHtml } from './icons';
import { avgStars, takings } from './text';

const text = (tag: 'p' | 'span' | 'dt' | 'dd' | 'strong' | 'b', cls: string, value: string): HTMLElement => {
  const n = el(tag, cls);
  n.textContent = value;
  return n;
};

function stats(info: KitchenResultInfo): HTMLElement {
  const dl = el('dl', 'cc-stats cc-kres__stats');
  const rows: Array<[string, string]> = [
    ['CLIENTI SERVITI', `${info.served}/${info.total}`],
    ['STELLE MEDIE', info.served > 0 ? avgStars(info.avgStars) : '—'],
    ['PIASTRATE PERFETTE', String(info.perfectCooks)],
    ['SCONTENTI', String(info.angry)],
  ];
  for (const [k, v] of rows) {
    const d = el('div');
    d.append(text('dt', '', k), text('dd', '', v));
    dl.append(d);
  }
  return dl;
}

function toasts(info: KitchenResultInfo): HTMLElement {
  const ul = el('ul', 'cc-rres__toasts');
  info.newAchievements.forEach((a, i) => {
    const li = el('li', 'cc-rtoast-item', trophySvg());
    li.style.setProperty('--i', String(i));
    const body = el('span');
    body.append(text('b', '', 'TRAGUARDO SBLOCCATO'), el('strong', '', pixelHtml(a.name)), text('span', '', a.desc));
    li.append(body);
    ul.append(li);
  });
  return ul;
}

export function showKitchenResults(modal: Modal, info: KitchenResultInfo, h: { onRetry(): void; onMenu(): void }, calm: boolean): void {
  const { menu } = modal;
  const mood = info.golden ? ' is-win is-golden' : info.completed ? ' is-win' : ' is-over';
  const card = el('div', `cc-card cc-rush-card cc-rres-card cc-kres-card${mood}${calm ? ' is-calm' : ''}`);
  card.style.setProperty('--reveal', `${calm ? 0 : COUNT_MS}ms`);
  const body = el('div', 'cc-card__body cc-rres');
  card.append(body);
  if (info.completed && !calm) body.insertAdjacentHTML('afterbegin', confetti());

  const top = el('div', 'cc-rres__top');
  if (info.golden) top.append(el('p', 'cc-kres__golden', '<span>YOU ARE</span><span>SO GOLDEN!</span>'));
  top.insertAdjacentHTML(
    'beforeend',
    info.completed
      ? '<h2 class="cc-bigtitle cc-bigtitle--rwin">TURNO <br>FINITO!</h2>'
      : '<h2 class="cc-bigtitle cc-bigtitle--rover">TURNO <br>CHIUSO!</h2>',
  );
  const num = text('b', 'cc-rres__num', calm ? points(info.score) : '0');
  const score = el('p', 'cc-rres__score');
  score.append(num, text('span', '', 'PUNTI'));
  top.append(score);
  top.insertAdjacentHTML('beforeend', starsHtml(info.stars, !calm));
  if (info.newBest) top.append(text('p', 'cc-record cc-rres__new', 'NUOVO RECORD!'));
  else if (info.best > 0) top.append(text('p', 'cc-rres__best', `RECORD ${points(info.best)}`));
  const list = toasts(info);
  const won = info.newAchievements.length;
  if (won > 0) {
    // in portrait the list sits at the end of the details, often under the fold: the news goes on top, a tap scrolls there
    const teaser = el('p', 'cc-kres__unlocked', `${trophySvg()}<span>${won === 1 ? 'TRAGUARDO SBLOCCATO' : `${won} TRAGUARDI SBLOCCATI`}</span>`);
    teaser.addEventListener('click', () => list.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'nearest' }));
    top.append(teaser);
  }
  const till = el('p', 'cc-kres__till');
  till.append(text('span', '', 'INCASSO'), text('b', '', takings(info.takingsCents)));

  const tip = el('p', 'cc-rres__tip', faceLogoHtml());
  tip.append(text('span', '', info.tip));
  // the shift's figures lead the details column (under the score in portrait, beside it in landscape), the tip right
  // after them: the breakdown may run under the fade at the fold, the tip never does
  const side = el('div', 'cc-rres__side');
  side.append(till, stats(info), tip, breakdown(info.breakdown));

  // the achievements close the column in portrait; in landscape they fill the score column (kitchen/results.css)
  const scroll = el('div', 'cc-rres__scroll');
  scroll.append(top, side, list);
  scrollPane(scroll, body); // fade + ▼ while more details hide under the buttons

  const bar = resultButtons(menu, info.shareText, h, pixelHtml("SCOPRI IL MENÙ CICCIO'S"));
  body.append(scroll, bar.root);

  modal.present('kitchen-results', card, bar.items, 650, h.onMenu);
  if (!calm) countUp(num, info.score);
}
