/** Loading screen: bouncing pixel burger, segmented bar, message and percent. */
import { PAL } from '../art/pixel';
import { el, pixelSvg, setText } from './dom';
import { wordmarkSvg } from './logo';

const BURGER = [
  '.....kkkkkk.....',
  '...kkBBBBBBkk...',
  '..kBBwBBBBBBBk..',
  '.kBBBBBBBwBBBBk.',
  '.kBwBBBBBBBBwBk.',
  'kBBBBBwBBBBBBBBk',
  'kbbbbbbbbbbbbbbk',
  'kkkkkkkkkkkkkkkk',
  'kGgGggGggGgGgGgk',
  'kyyyyyyyyyyyyyyk',
  'kkyyykyyyyykyykk',
  'kPPPPPPPPPPPPPPk',
  'kpPPpPPPpPPPpPPk',
  'kpppppppppppppPk',
  'kkkkkkkkkkkkkkkk',
  'kBBBBBBBBBBBBBBk',
  '.kbbbbbbbbbbbbk.',
  '..kkkkkkkkkkkk..',
];
const BURGER_PAL = {
  k: PAL.ink,
  B: PAL.bun,
  b: PAL.bunDark,
  w: PAL.creamLight,
  G: PAL.lettuce,
  g: '#3c9a14',
  y: PAL.cheese,
  P: PAL.patty,
  p: '#3c1c10',
};
const SEGMENTS = 14;

export interface Loading {
  readonly root: HTMLElement;
  set(progress: number | null, message?: string): void;
}

export function createLoading(): Loading {
  const root = el('section', 'cc-screen cc-loading');
  root.setAttribute('aria-live', 'polite');
  const burger = el('div', 'cc-loading__burger', pixelSvg(BURGER, BURGER_PAL) + '<i class="cc-loading__shadow"></i>');
  const msg = el('p', 'cc-loading__msg', 'Caricamento…');
  const bar = el('div', 'cc-loading__bar');
  const segs: HTMLElement[] = [];
  for (let i = 0; i < SEGMENTS; i++) segs.push(bar.appendChild(el('i')));
  const pct = el('p', 'cc-loading__pct', '0%');
  root.insertAdjacentHTML('afterbegin', wordmarkSvg('cc-loading__word'));
  root.append(burger, msg, bar, pct);
  root.hidden = true;
  let hideTimer = 0;

  return {
    root,
    set(progress, message) {
      window.clearTimeout(hideTimer);
      if (progress === null) {
        root.classList.add('is-leaving');
        hideTimer = window.setTimeout(() => {
          root.hidden = true;
          root.classList.remove('is-leaving');
        }, 320);
        return;
      }
      root.hidden = false;
      root.classList.remove('is-leaving');
      const p = Math.max(0, Math.min(1, progress));
      const lit = Math.round(p * SEGMENTS);
      segs.forEach((s, i) => s.classList.toggle('is-on', i < lit));
      setText(pct, `${Math.round(p * 100)}%`);
      if (message) setText(msg, message);
    },
  };
}
