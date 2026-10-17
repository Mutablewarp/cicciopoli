/** Title screen: Ciccio's logo, level select, sound toggle, runner strip. */
import type { LevelId, TitleInfo } from '../contracts';
import { PAL } from '../art/pixel';
import { el, pixelSvg } from './dom';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';
import { logoFaceSvg, wordmarkSvg } from './logo';
import { Menu } from './menu';
import { KEY_LEGEND, LEVEL_NAMES } from './screens';

const THUMBS: Record<LevelId, { rows: string[]; pal: Record<string, string> }> = {
  1: {
    rows: [
      'ssssssssssssssss',
      'ssccssssssssyrrs',
      'scccccssssssyrrr',
      'ssssssssHHssyrrs',
      'sssssssHhhHsysss',
      'ssHHsssHhhhHysss',
      'sHhhHsHhhhhhyhss',
      'gggggggggggggggg',
      'GgGGgGGgGGgGGgGG',
      'bbkbbbbkbbbbkbbb',
    ],
    pal: { s: PAL.sky, c: PAL.cream, H: PAL.hillLight, h: PAL.hill, g: PAL.grass, G: PAL.grassMid, b: PAL.brick, k: PAL.mortar, y: PAL.poleLight, r: PAL.flagRed },
  },
  2: {
    rows: [
      'BBBBBBBBBBBBBBBB',
      'BBWWBBBBBBBBBBBB',
      'BWWWWBBBBKBBBBBB',
      'WWRRWWWBBKBBBBWW',
      'WRRRRWWWKKKWWWWR',
      'RRCCRRRRKLKRRRRR',
      'RCCCCRRRKKKRRCCC',
      'dddddddddddddddd',
      'oYYooYYoooYYooYo',
      'oooooooooooooooo',
    ],
    pal: { B: PAL.bordeaux, W: PAL.wine, R: PAL.lavaRed, C: PAL.coral, K: PAL.castle, L: PAL.castleLit, d: PAL.ink, o: PAL.lavaOrange, Y: PAL.lavaYellow },
  },
};

const GRASS_TILE = pixelSvg(
  ['..g......g...g..', '.gGg....gGg.gGg.', 'gggggggggggggggg', 'GGGGGGGGGGGGGGGG', 'kkkkkkkkkkkkkkkk'],
  { g: PAL.grass, G: PAL.grassMid, k: PAL.hillOutline },
).replace('<svg class=""', '<svg xmlns="http://www.w3.org/2000/svg"');

export interface TitleHandlers {
  onStart(level: LevelId): void;
  onToggleMute(): boolean;
}

export interface Title {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly menu: Menu;
  readonly open: boolean;
  show(info: TitleInfo, h: TitleHandlers): void;
  hide(): void;
}

export function createTitle(onChange: () => void): Title {
  const root = el('section', 'cc-screen cc-title');
  root.hidden = true;
  const menu = new Menu();
  let handlers: TitleHandlers | null = null;
  let isOpen = false;

  const sound = el('button', 'cc-btn cc-iconbtn cc-title__sound');
  sound.type = 'button';
  sound.addEventListener('click', () => {
    if (!handlers) return;
    renderMute(handlers.onToggleMute());
    sound.blur();
  });
  function renderMute(muted: boolean): void {
    sound.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    sound.setAttribute('aria-label', muted ? 'Attiva audio' : 'Disattiva audio');
    sound.setAttribute('aria-pressed', String(muted));
  }

  const brand = el(
    'div',
    'cc-title__brand',
    `<div class="cc-logo">${logoFaceSvg('cc-logo__face')}${wordmarkSvg('cc-logo__word')}</div>` +
      '<p class="cc-title__sub">THE BURGER ADVENTURE</p>',
  );
  const bests = new Map<LevelId, HTMLElement>();
  const levelBtns = ([1, 2] as const).map((lv) => {
    const b = el('button', `cc-btn cc-level cc-level--${lv}`);
    b.type = 'button';
    const best = el('span', 'cc-level__best');
    bests.set(lv, best);
    const text = el('span', 'cc-level__text', `<span class="cc-level__name"><b>0${lv}</b> · ${LEVEL_NAMES[lv]}</span>`);
    text.append(best);
    b.append(el('span', 'cc-level__thumb', pixelSvg(THUMBS[lv].rows, THUMBS[lv].pal)), text, el('span', 'cc-level__go', '▶'));
    b.addEventListener('click', menu.guard(() => handlers?.onStart(lv)));
    return b;
  });
  const nav = el('nav', 'cc-title__menu');
  nav.setAttribute('aria-label', 'Scegli il livello');
  nav.append(...levelBtns);
  nav.insertAdjacentHTML('beforeend', KEY_LEGEND);

  const main = el('div', 'cc-title__main');
  main.append(brand, nav);
  const canvas = el('canvas', 'cc-runner__canvas');
  const runner = el('div', 'cc-runner');
  const grass = el('div', 'cc-runner__grass');
  grass.style.backgroundImage = `url("data:image/svg+xml,${encodeURIComponent(GRASS_TILE)}")`;
  runner.append(canvas, grass);
  root.append(sound, main, runner, el('p', 'cc-title__foot', 'Demo concept non ufficiale'));

  return {
    root,
    canvas,
    menu,
    get open() {
      return isOpen;
    },
    show(info, h) {
      handlers = h;
      renderMute(info.muted);
      for (const [lv, node] of bests) {
        const v = info.best[lv];
        node.textContent = v !== undefined ? `RECORD ${v}` : 'NUOVO';
        node.classList.toggle('is-new', v === undefined);
      }
      root.hidden = false;
      isOpen = true;
      menu.open(levelBtns, { armMs: 250 });
      onChange();
    },
    hide() {
      if (!isOpen) return;
      isOpen = false;
      root.hidden = true;
      onChange();
    },
  };
}
