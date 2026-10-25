/**
 * Level 7 pre-shift card (GameUI.showKitchenSetup): CICCIO'S KITCHEN / IL TURNO DA CICCIO'S, the big burger on
 * the steel counter (stage.ts), record and best stars (a gold SO GOLDEN! badge once the finale was won),
 * GIOCA ORA (selected first: Enter / Space start the shift), then COME SI GIOCA / IMPOSTAZIONI / TRAGUARDI
 * (panels.ts) and MENU. Laid out like the level 6 card (rush/setup.css): one phone screen in portrait, two
 * columns in landscape.
 */
import type { KitchenSettings, KitchenSetupInfo } from '../../contracts';
import { button, el } from '../dom';
import { gearSvg, helpSvg, trophySvg } from '../rush/icons';
import { starsHtml } from '../rush/stage';
import { points } from '../rush/text';
import { type Modal, keyLegend } from '../screens';
import { type KitchenPanel, openKitchenPanel } from './panels';
import { createKitchenStage } from './stage';

export interface KitchenSetupHandlers {
  onPlay(): void;
  onSettings(s: KitchenSettings): void;
  onMenu(): void;
}

const label = (text: string): string => `<span class="cc-btn__label">${text}</span>`;

export function showKitchenSetup(modal: Modal, info: KitchenSetupInfo, h: KitchenSetupHandlers): void {
  const { menu } = modal;
  let settings: KitchenSettings = { ...info.settings };

  const card = el('div', `cc-card cc-rush-card cc-kitchen-card${settings.reducedMotion ? ' is-calm' : ''}`);
  const body = el('div', 'cc-card__body cc-rush cc-ksetup');
  body.dataset.scrollable = ''; // main.ts blocks touch scrolling everywhere else
  card.append(body);

  const show = el(
    'div',
    'cc-rush__show',
    `<h2 class="cc-bigtitle cc-bigtitle--kitchen">CICCIO'S KITCHEN</h2><p class="cc-levelname">IL TURNO DA CICCIO'S</p>`,
  );
  const record = el('p', 'cc-rush__record', '<span>RECORD</span>');
  const best = el('b');
  best.textContent = info.best > 0 ? points(info.best) : '—';
  record.append(best);
  record.insertAdjacentHTML('beforeend', starsHtml(info.bestStars));
  const stage = createKitchenStage();
  if (info.golden) stage.append(el('span', 'cc-kgold', 'SO GOLDEN!'));
  show.append(stage, record);

  const play = button('cc-btn--primary cc-btn--go', label('GIOCA ORA'), menu.guard(h.onPlay));
  const more = el('div', 'cc-rush__more');
  let from = 0;
  const panelBtn = (kind: KitchenPanel, icon: string, text: string, i: number): HTMLButtonElement =>
    button(
      'cc-btn--more',
      `${icon}${label(text)}`,
      menu.guard(() => {
        from = i;
        openKitchenPanel(kind, host);
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
  act.append(play, more);
  act.insertAdjacentHTML('beforeend', keyLegend(7));
  body.append(show, act);

  const items: HTMLElement[] = [play, ...moreBtns];
  const host = {
    body: card,
    menu,
    achievements: info.achievements,
    settings: () => settings,
    setSettings(s: KitchenSettings): void {
      settings = s;
      card.classList.toggle('is-calm', s.reducedMotion);
      h.onSettings(s);
    },
    back: () => menu.open(items, { onBack: h.onMenu, initial: items.indexOf(moreBtns[from]) }),
  };

  modal.present('kitchen', card, items, 250, h.onMenu);
}
