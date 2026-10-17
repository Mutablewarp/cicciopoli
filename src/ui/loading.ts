/** Loading screen: bouncing pixel burger, segmented bar, message and percent. */
import { PAL } from '../art/pixel';
import { brandImage, el, pixelSvg, setText } from './dom';

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

/** Official logo (public/brand), served next to index.html in dev and in the build. */
export const LOGO_URL = `${import.meta.env.BASE_URL}brand/ciccios-logo.png`;
const FILL_STEP_MS = 22;
const FADE_MS = 240;
/** Longest a finished loader waits for the logo to decode before leaving to the title. */
const LOGO_WAIT_MS = 1500;
const LOGO_POLL_MS = 50;

export interface Loading {
  readonly root: HTMLElement;
  set(progress: number | null, message?: string): void;
}

/**
 * set(null) first runs the bar to 100%, then leaves. Over the title (`opaqueExit`) only the
 * content fades and the black stays until it is gone, so the title fades in from black
 * (`onHidden`) instead of cross-fading under a second logo; over the game it dissolves.
 */
export function createLoading(opaqueExit: () => boolean, onHidden: () => void): Loading {
  const root = el('section', 'cc-screen cc-loading');
  root.setAttribute('aria-live', 'polite');
  const { img: logo, ready } = brandImage('cc-loading__logo', LOGO_URL);
  let logoShown = false;
  void ready.then(() => (logoShown = true));
  const burger = el('div', 'cc-loading__burger', pixelSvg(BURGER, BURGER_PAL) + '<i class="cc-loading__shadow"></i>');
  const msg = el('p', 'cc-loading__msg', 'Caricamento…');
  const bar = el('div', 'cc-loading__bar');
  const segs: HTMLElement[] = [];
  for (let i = 0; i < SEGMENTS; i++) segs.push(bar.appendChild(el('i')));
  const pct = el('p', 'cc-loading__pct', '0%');
  root.append(logo, burger, msg, bar, pct);
  root.hidden = true;
  let timer = 0;
  let lit = 0;
  let waited = 0;

  function show(p: number): void {
    lit = Math.round(p * SEGMENTS);
    segs.forEach((s, i) => s.classList.toggle('is-on', i < lit));
    setText(pct, `${Math.round(p * 100)}%`);
  }

  function leave(): void {
    root.classList.add(opaqueExit() ? 'is-leaving-opaque' : 'is-leaving');
    timer = window.setTimeout(() => {
      root.hidden = true;
      root.classList.remove('is-done', 'is-leaving', 'is-leaving-opaque');
      onHidden();
    }, FADE_MS);
  }

  function fill(): void {
    if (lit >= SEGMENTS) {
      setText(pct, '100%');
      // first visit on a slow network: the title must not appear before its logo can
      if (!logoShown && waited < LOGO_WAIT_MS && opaqueExit()) {
        waited += LOGO_POLL_MS;
        timer = window.setTimeout(fill, LOGO_POLL_MS);
        return;
      }
      timer = window.setTimeout(leave, 120);
      return;
    }
    show((lit + 1) / SEGMENTS);
    timer = window.setTimeout(fill, FILL_STEP_MS);
  }

  return {
    root,
    set(progress, message) {
      window.clearTimeout(timer);
      if (progress === null) {
        if (root.hidden) return;
        waited = 0;
        root.classList.add('is-done'); // the game is live underneath: touches go through (overlays.css)
        fill();
        return;
      }
      root.hidden = false;
      root.classList.remove('is-done', 'is-leaving', 'is-leaving-opaque');
      show(Math.max(0, Math.min(1, progress)));
      if (message) setText(msg, message);
    },
  };
}
