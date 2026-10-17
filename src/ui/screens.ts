/** Modal end/pause screens: PAUSA, IN BUCA! (victory), GAME OVER. */
import type { GameOverInfo, LevelId, VictoryInfo } from '../contracts';
import { button, el, formatTime, seeded } from './dom';
import { SPEAKER_OFF, SPEAKER_ON, headSvg } from './icons';
import { Menu } from './menu';

export const LEVEL_NAMES: Record<LevelId, string> = { 1: 'LE COLLINE', 2: 'ALETTE CRUNCHY' };
export const levelTitle = (l: LevelId): string => `0${l} · ${LEVEL_NAMES[l]}`;

const CONFETTI = ['#fc9000', '#fcd400', '#fc0c24', '#60ccf0', '#a8cc00', '#fce4c0'];

export const KEY_LEGEND =
  '<p class="cc-keys">' +
  '<span><kbd>←</kbd><kbd>→</kbd><kbd>A</kbd><kbd>D</kbd> muovi</span>' +
  '<span><kbd>↑</kbd><kbd>W</kbd><kbd>SPAZIO</kbd> salta</span>' +
  '<span><kbd>↓</kbd><kbd>S</kbd> scendi</span>' +
  '<span><kbd>J</kbd><kbd>X</kbd> goat</span>' +
  '<span><kbd>K</kbd><kbd>C</kbd> thai</span>' +
  '<span><kbd>ESC</kbd><kbd>P</kbd> pausa</span>' +
  '</p>';

export function audioLabel(muted: boolean): string {
  return `${muted ? SPEAKER_OFF : SPEAKER_ON}<span class="cc-btn__label">Audio ${muted ? 'off' : 'on'}</span>`;
}

function confetti(): string {
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
  hide(): void;
}

export function createModal(onChange: () => void): Modal {
  const root = el('section', 'cc-screen cc-modal');
  root.hidden = true;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  const menu = new Menu();
  let isOpen = false;

  function present(kind: string, card: HTMLElement, buttons: HTMLButtonElement[], armMs: number, onBack?: () => void): void {
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
      c.firstElementChild?.insertAdjacentHTML('beforeend', KEY_LEGEND);
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
        'cc-win-card',
        `${confetti()}<div class="cc-hero cc-hero--win">${headSvg()}</div>` +
          `<h2 class="cc-bigtitle cc-bigtitle--win">IN BUCA!</h2>` +
          `<p class="cc-levelname">${levelTitle(info.level)}</p>${stats}${badge}`,
      );
      const btns: HTMLButtonElement[] = [];
      const onNext = h.onNext;
      if (info.hasNext && onNext) {
        btns.push(button('cc-btn--primary cc-btn--next', `<span class="cc-btn__label">LIVELLO ${info.level + 1} ▶</span>`, menu.guard(onNext)));
      }
      btns.push(button(btns.length ? '' : 'cc-btn--primary', '<span class="cc-btn__label">Rigioca</span>', menu.guard(h.onReplay)));
      btns.push(button('', '<span class="cc-btn__label">Menu</span>', menu.guard(h.onMenu)));
      const list = el('div', 'cc-card__btns cc-card__btns--row');
      list.append(...btns);
      c.firstElementChild?.append(list);
      present('victory', c, btns, 650);
    },
    showGameOver(info, h) {
      const c = card(
        'cc-over-card',
        `<div class="cc-hero cc-hero--over">${headSvg()}</div>` +
          `<h2 class="cc-bigtitle cc-bigtitle--over">GAME OVER</h2>` +
          `<p class="cc-levelname">${levelTitle(info.level)}</p>` +
          `<dl class="cc-stats cc-stats--one"><div><dt>PUNTI</dt><dd>${info.score}</dd></div></dl>`,
      );
      const btns = [
        button('cc-btn--primary', '<span class="cc-btn__label">Riprova</span>', menu.guard(h.onRetry)),
        button('', '<span class="cc-btn__label">Menu</span>', menu.guard(h.onMenu)),
      ];
      const list = el('div', 'cc-card__btns cc-card__btns--row');
      list.append(...btns);
      c.firstElementChild?.append(list);
      present('over', c, btns, 650);
    },
    hide,
  };
}
