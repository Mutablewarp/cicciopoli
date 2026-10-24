/**
 * Level 6 pre-run card (GameUI.showRushSetup): title, the side-view truck on a Palermo street, record and
 * best stars, GIOCA ORA, SFIDA DEL GIORNO, the three drivers and the COME SI GIOCA / IMPOSTAZIONI / TRAGUARDI
 * panels (panels.ts). Enter / Space activate the selection; choosing a driver selects GIOCA ORA.
 * One phone screen in portrait (stacked), two columns in landscape.
 */
import type { RushDriverCard, RushDriverId, RushSettings, RushSetupInfo } from '../../contracts';
import { button, el } from '../dom';
import { LOCK_SVG } from '../icons';
import { type Modal, keyLegend } from '../screens';
import { gearSvg, helpSvg, trophySvg } from './icons';
import { type PanelKind, openPanel } from './panels';
import { createStage, driverFace, starsHtml } from './stage';
import { STANDARD_DRIVER, points } from './text';

export interface SetupHandlers {
  onPlay(driver: RushDriverId, daily: boolean): void;
  onSettings(s: RushSettings): void;
  onMenu(): void;
}

const SHAKE: Keyframe[] = [{ transform: 'none' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'none' }];

const label = (text: string): string => `<span class="cc-btn__label">${text}</span>`;

export function showRushSetup(modal: Modal, info: RushSetupInfo, h: SetupHandlers): void {
  const { menu } = modal;
  let driver = info.drivers.find((d) => d.id === info.selected && !d.locked)?.id ?? STANDARD_DRIVER;
  let settings: RushSettings = { ...info.settings };

  const card = el('div', `cc-card cc-rush-card${settings.reducedMotion ? ' is-calm' : ''}`);
  const body = el('div', 'cc-card__body cc-rush');
  body.dataset.scrollable = ''; // main.ts blocks touch scrolling everywhere else
  card.append(body);

  const show = el(
    'div',
    'cc-rush__show',
    `<h2 class="cc-bigtitle cc-bigtitle--rush">CICCIO'S RUSH</h2><p class="cc-levelname">MISSIONE CONSEGNA A PALERMO</p>`,
  );
  const record = el('p', 'cc-rush__record', '<span>RECORD</span>');
  const best = el('b');
  best.textContent = info.best > 0 ? points(info.best) : '—';
  record.append(best);
  record.insertAdjacentHTML('beforeend', starsHtml(info.bestStars));
  show.append(createStage(), record);

  const play = button('cc-btn--primary cc-btn--go', label('GIOCA ORA'), menu.guard(() => h.onPlay(driver, false)));
  // the button already says SFIDA DEL GIORNO: the subtitle keeps only the date ("21 OTTOBRE") and the status;
  // two spans so narrow landscape buttons can stack them (setup.css)
  const dailySub = el('span', 'cc-btn__sub');
  const dailyBest = info.daily.best ?? 0;
  for (const part of [info.daily.label.replace(/^SFIDA DEL\s+/, ''), dailyBest > 0 ? `RECORD ${points(dailyBest)}` : 'DA GIOCARE']) {
    const span = el('span');
    span.textContent = part;
    dailySub.append(span);
  }
  const daily = button('cc-btn--daily', '', menu.guard(() => h.onPlay(STANDARD_DRIVER, true)));
  const dailyText = el('span', 'cc-btn__stack', label('SFIDA DEL GIORNO'));
  dailyText.append(dailySub);
  daily.append(dailyText);
  const start = el('div', 'cc-rush__start');
  start.append(play, daily);

  const note = el('p', 'cc-drivers__note');
  const cards = info.drivers.map((d) => driverCard(d));
  const drivers = el('div', 'cc-drivers');
  drivers.setAttribute('role', 'radiogroup');
  drivers.setAttribute('aria-label', 'Scegli il pilota');
  drivers.append(...cards.map((c) => c.b));

  const more = el('div', 'cc-rush__more');
  let from = 0;
  const panelBtn = (kind: PanelKind, icon: string, text: string, i: number): HTMLButtonElement =>
    button(
      'cc-btn--more',
      `${icon}${label(text)}`,
      menu.guard(() => {
        from = i;
        openPanel(kind, host);
      }, false),
    );
  const moreBtns = [
    panelBtn('help', helpSvg(), 'COME SI GIOCA', 0),
    panelBtn('settings', gearSvg(), 'IMPOSTAZIONI', 1),
    panelBtn('trophies', trophySvg(), 'TRAGUARDI', 2),
    button('', label('MENU'), menu.guard(h.onMenu)),
  ];
  more.append(...moreBtns);

  const act = el('div', 'cc-rush__act');
  act.append(start, drivers, note, more);
  act.insertAdjacentHTML('beforeend', keyLegend(6));
  body.append(show, act);

  const items: HTMLElement[] = [play, daily, ...cards.map((c) => c.b), ...moreBtns];
  const host = {
    body: card,
    menu,
    achievements: info.achievements,
    settings: () => settings,
    setSettings(s: RushSettings): void {
      settings = s;
      card.classList.toggle('is-calm', s.reducedMotion);
      h.onSettings(s);
    },
    back: () => menu.open(items, { onBack: h.onMenu, initial: items.indexOf(moreBtns[from]) }),
  };

  function driverCard(d: RushDriverCard): { d: RushDriverCard; b: HTMLButtonElement } {
    const b = button(`cc-driver${d.locked ? ' is-locked' : ''}`, '', menu.guard(() => choose(d, b), false));
    const name = el('span', 'cc-driver__name');
    name.textContent = d.name;
    b.append(driverFace(d.id), name);
    if (d.locked) b.append(el('span', 'cc-driver__lock', LOCK_SVG));
    b.setAttribute('role', 'radio');
    b.setAttribute('aria-label', d.locked ? `${d.name}, bloccato` : d.name);
    return { d, b };
  }

  function choose(d: RushDriverCard, b: HTMLElement): void {
    if (d.locked) {
      note.innerHTML = LOCK_SVG;
      note.append(d.unlockHint ?? 'Pilota ancora bloccato.');
      note.classList.add('is-hint');
      b.animate(SHAKE, { duration: 260 });
      return;
    }
    driver = d.id;
    render();
    menu.select(0);
  }

  function render(): void {
    for (const c of cards) {
      const on = c.d.id === driver;
      c.b.classList.toggle('is-chosen', on);
      c.b.setAttribute('aria-checked', String(on));
    }
    const d = info.drivers.find((x) => x.id === driver);
    const name = el('b');
    name.textContent = d?.name ?? '';
    note.replaceChildren(name, d?.ability ?? '');
    note.classList.remove('is-hint');
  }

  render();
  modal.present('rush', card, items, 250, h.onMenu);
}
