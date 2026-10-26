/** Modal end/pause screens: PAUSA, IN BUCA! (victory), GAME OVER; levels 6 and 7 bring their own cards (rush/*, kitchen/*). */
import type { GameOverInfo, LevelId, VictoryInfo } from '../contracts';
import { button, el, formatTime, seeded } from './dom';
import { heroHtml, mountHero } from './hero';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';
import { Menu } from './menu';

export const LEVEL_NAMES: Record<LevelId, string> = {
  1: 'LE COLLINE',
  2: 'ALETTE CRUNCHY',
  3: "CICCIO'S INVADERS",
  4: 'CICCIO-MAN',
  5: 'SPACCA TUTTO',
  6: "CICCIO'S RUSH",
  7: "CICCIO'S KITCHEN",
  8: "CICCIO'S GOLDEN TICKET",
};
/** Tagline under a level name on its title card. */
export const LEVEL_TAGS: Partial<Record<LevelId, string>> = {
  6: 'MISSIONE CONSEGNA A PALERMO',
  7: "IL TURNO DA CICCIO'S",
  8: 'LA SFIDA DELLE MASCOTTE',
};
/** Name of the hero of a level, shown under its title on the end screens. */
export const LEVEL_HEROES: Partial<Record<LevelId, string>> = { 5: 'CICCIO SPACCA!' };
export const levelTitle = (l: LevelId): string => `0${l} · ${LEVEL_NAMES[l]}`;
const levelHero = (l: LevelId): string => (LEVEL_HEROES[l] ? `<p class="cc-levelhero">${LEVEL_HEROES[l]}</p>` : '');

/**
 * Card text. Level 5 groups it in one column next to the hero, so a landscape phone can put the big
 * sprite beside the text instead of dropping it (levels 1-4 hide their small head there).
 */
const cardInner = (l: LevelId, mood: 'win' | 'over', extra: string, text: string): string =>
  `${extra}${heroHtml(l, mood)}${l === 5 ? `<div class="cc-card__main">${text}</div>` : text}`;
const cardClass = (l: LevelId, cls: string): string => (l === 5 ? `${cls} cc-card--hero` : cls);
const buttonsHost = (c: HTMLElement): Element | null => c.querySelector('.cc-card__main') ?? c.firstElementChild;

const CONFETTI = ['#fc9000', '#fcd400', '#fc0c24', '#60ccf0', '#a8cc00', '#fce4c0'];

const keys = (...items: Array<[string[], string]>): string =>
  `<p class="cc-keys">${items.map(([k, what]) => `<span>${k.map((x) => `<kbd>${x}</kbd>`).join('')} ${what}</span>`).join('')}</p>`;
const PAUSE_KEYS: [string[], string] = [['ESC', 'P'], 'pausa'];

/** Desktop key legend per level (title: the platform keys plus the shooter extras). */
export function keyLegend(level?: LevelId): string {
  if (level === 8) {
    return keys(
      [['←', '→', 'A', 'D'], 'corri'],
      [['↑', 'W'], 'mira in alto'],
      [['SPAZIO', 'Z'], 'salta / para'],
      [['J', 'X'], 'spara'],
      [['K', 'C', 'SHIFT'], 'scatto'],
      [['Q', 'L'], 'arma'],
      [['E', 'V'], 'EX / super'],
      PAUSE_KEYS,
    );
  }
  if (level === 7) return keys([['INVIO', 'SPAZIO'], "prendi l'ordine / servi"], [['MOUSE'], 'cucina'], PAUSE_KEYS);
  // level 6: a wide screen drives in the side view (↑ ↓ lanes, ← brakes); rush/panels.css shows the legend of the screen shape
  if (level === 6) {
    const upright = keys([['←', '→', 'A', 'D'], 'corsia'], [['↓', 'S', 'SPAZIO'], 'frena'], PAUSE_KEYS);
    const side = keys([['↑', '↓', 'W', 'S'], 'corsia'], [['←', 'A', 'SPAZIO'], 'frena'], PAUSE_KEYS);
    return upright.replace('cc-keys', 'cc-keys cc-only-upright') + side.replace('cc-keys', 'cc-keys cc-only-side');
  }
  if (level === 5) return keys([['←', '→', 'A', 'D'], 'muovi'], [['↑', 'W', 'SPAZIO'], 'salta'], [['K', 'C'], 'pugno'], [['J', 'X'], 'spacca'], PAUSE_KEYS);
  if (level === 3) return keys([['←', '→', 'A', 'D'], 'muovi'], [['SPAZIO', 'J', 'X'], 'fuoco'], [['K', 'C'], 'fulmine'], PAUSE_KEYS);
  if (level === 4) return keys([['←', '↑', '→', '↓'], 'muovi'], [['W', 'A', 'S', 'D'], 'muovi'], PAUSE_KEYS);
  if (level === 2) return keys([['←', '→', 'A', 'D'], 'muovi'], [['↑', 'W', 'SPAZIO'], 'salta / vola'], [['↓', 'S'], 'scendi'], PAUSE_KEYS);
  if (level === 1) return keys([['←', '→', 'A', 'D'], 'muovi'], [['↑', 'W', 'SPAZIO'], 'salta'], [['J', 'X'], 'goat'], [['K', 'C'], 'thai'], PAUSE_KEYS);
  return keys([['←', '→', '↑', '↓'], 'muovi'], [['SPAZIO'], 'salta / fuoco'], [['J', 'X'], 'goat / spacca'], [['K', 'C'], 'thai / fulmine / pugno'], PAUSE_KEYS);
}

export function audioLabel(muted: boolean): string {
  return `${muted ? SPEAKER_OFF : SPEAKER_ON}<span class="cc-btn__label">Audio ${muted ? 'off' : 'on'}</span>`;
}

/** Falling confetti + sparkles behind a winning card (deterministic layout). */
export function confetti(): string {
  const rnd = seeded(161);
  let html = '<div class="cc-confetti" aria-hidden="true">';
  for (let i = 0; i < 34; i++) {
    const x = (rnd() * 100).toFixed(1);
    const delay = (rnd() * 2.4).toFixed(2);
    const dur = (2.2 + rnd() * 1.8).toFixed(2);
    const drift = Math.round((rnd() - 0.5) * 120);
    const c = CONFETTI[i % CONFETTI.length];
    const shape = i % 3 === 0 ? ' is-long' : '';
    html += `<i class="${shape}" style="left:${x}%;background:${c};animation-delay:${delay}s;animation-duration:${dur}s;--drift:${drift}px"></i>`;
  }
  for (let i = 0; i < 6; i++) {
    // sparkles stay near the card edges so they never cover text
    const x = (i % 2 ? 84 + rnd() * 10 : 4 + rnd() * 10).toFixed(1);
    const y = (4 + rnd() * 40).toFixed(1);
    html += `<b class="cc-spark" style="left:${x}%;top:${y}%;animation-delay:${(rnd() * 1.6).toFixed(2)}s"></b>`;
  }
  return `${html}</div>`;
}

export interface Modal {
  readonly root: HTMLElement;
  readonly menu: Menu;
  readonly open: boolean;
  showPause(h: { onResume(): void; onRestart(): void; onMenu(): void; onToggleMute(): boolean }, muted: boolean): void;
  showVictory(info: VictoryInfo, h: { onNext?(): void; onReplay(): void; onMenu(): void }): void;
  showGameOver(info: GameOverInfo, h: { onRetry(): void; onMenu(): void }): void;
  /** Shows a custom card (level 6 setup / results) whose `buttons` the menu navigates. */
  present(kind: string, card: HTMLElement, buttons: HTMLElement[], armMs: number, onBack?: () => void): void;
  hide(): void;
}

export function createModal(onChange: () => void, level: () => LevelId): Modal {
  const root = el('section', 'cc-screen cc-modal');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const menu = new Menu();
  let isOpen = false;

  function present(kind: string, card: HTMLElement, buttons: HTMLElement[], armMs: number, onBack?: () => void): void {
    root.className = `cc-screen cc-modal cc-modal--${kind}`;
    root.replaceChildren(card);
    root.hidden = false;
    isOpen = true;
    menu.open(buttons, { armMs, onBack });
    onChange();
  }

  function card(cls: string, inner: string): HTMLElement {
    const c = el('div', `cc-card ${cls}`);
    c.append(el('div', 'cc-card__body', inner));
    return c;
  }

  function hide(): void {
    if (!isOpen) return;
    isOpen = false;
    root.hidden = true;
    root.replaceChildren();
    onChange();
  }

  return {
    root,
    menu,
    get open() {
      return isOpen;
    },
    showPause(h, muted) {
      const c = card('cc-pause-card', '<h2 class="cc-bigtitle cc-bigtitle--pause">PAUSA</h2>');
      let m = muted;
      // Resuming always closes the card (input re-enabled) before the game unpauses.
      const resume = (): void => {
        hide();
        h.onResume();
      };
      const audio: HTMLButtonElement = button(
        'cc-btn--audio',
        audioLabel(m),
        menu.guard(() => {
          m = h.onToggleMute();
          audio.innerHTML = audioLabel(m);
        }, false),
      );
      const btns = [
        button('cc-btn--primary', '<span class="cc-btn__label">Riprendi</span>', menu.guard(resume)),
        button('', '<span class="cc-btn__label">Ricomincia</span>', menu.guard(h.onRestart)),
        audio,
        button('', '<span class="cc-btn__label">Menu</span>', menu.guard(h.onMenu)),
      ];
      const list = el('div', 'cc-card__btns cc-card__btns--grid');
      list.append(...btns);
      c.firstElementChild?.append(list);
      c.firstElementChild?.insertAdjacentHTML('beforeend', keyLegend(level()));
      present('pause', c, btns, 120, resume);
    },
    showVictory(info, h) {
      const stats =
        `<dl class="cc-stats">` +
        `<div><dt>PUNTI</dt><dd>${info.score}</dd></div>` +
        `<div><dt>TEMPO</dt><dd>${formatTime(info.timeMs)}</dd></div>` +
        `<div><dt>RECORD</dt><dd>${info.best}</dd></div></dl>`;
      const badge = info.newBest ? '<p class="cc-record">NUOVO RECORD!</p>' : '';
      const c = card(
        cardClass(info.level, 'cc-win-card'),
        cardInner(
          info.level,
          'win',
          confetti(),
          `<h2 class="cc-bigtitle cc-bigtitle--win">IN BUCA!</h2>` +
            `<p class="cc-levelname">${levelTitle(info.level)}</p>${levelHero(info.level)}${stats}${badge}`,
        ),
      );
      const btns: HTMLButtonElement[] = [];
      const onNext = h.onNext;
      if (info.hasNext && onNext) {
        btns.push(button('cc-btn--primary cc-btn--next', '<span class="cc-btn__label">LIVELLO SUCCESSIVO&nbsp;▶</span>', menu.guard(onNext)));
      }
      btns.push(button(btns.length ? '' : 'cc-btn--primary', '<span class="cc-btn__label">Rigioca</span>', menu.guard(h.onReplay)));
      btns.push(button('', '<span class="cc-btn__label">Menu</span>', menu.guard(h.onMenu)));
      const list = el('div', 'cc-card__btns cc-card__btns--row');
      list.append(...btns);
      buttonsHost(c)?.append(list);
      present('victory', c, btns, 650);
      mountHero(c, info.level, 'win');
    },
    showGameOver(info, h) {
      const c = card(
        cardClass(info.level, 'cc-over-card'),
        cardInner(
          info.level,
          'over',
          '',
          `<h2 class="cc-bigtitle cc-bigtitle--over">GAME OVER</h2>` +
            `<p class="cc-levelname">${levelTitle(info.level)}</p>${levelHero(info.level)}` +
            `<dl class="cc-stats cc-stats--one"><div><dt>PUNTI</dt><dd>${info.score}</dd></div></dl>`,
        ),
      );
      const btns = [
        button('cc-btn--primary', '<span class="cc-btn__label">Riprova</span>', menu.guard(h.onRetry)),
        button('', '<span class="cc-btn__label">Menu</span>', menu.guard(h.onMenu)),
      ];
      const list = el('div', 'cc-card__btns cc-card__btns--row');
      list.append(...btns);
      buttonsHost(c)?.append(list);
      present('over', c, btns, 650);
      mountHero(c, info.level, 'over');
    },
    present,
    hide,
  };
}
