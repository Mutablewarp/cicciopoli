/** Title screen: official Ciccio's logo, 2x2 level select, sound toggle, runner strip. */
import type { LevelId, TitleInfo } from '../contracts';
import { LEVEL_IDS } from '../contracts';
import { PAL } from '../art/pixel';
import { brandImage, el, onActivate, pixelSvg } from './dom';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';
import { LOGO_URL } from './loading';
import { Menu } from './menu';
import { LEVEL_NAMES, keyLegend } from './screens';
import { levelThumb } from './thumbs';

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
  onActivate(sound, () => {
    if (!handlers) return;
    renderMute(handlers.onToggleMute());
    sound.blur();
  });
  function renderMute(muted: boolean): void {
    sound.innerHTML = muted ? SPEAKER_OFF : SPEAKER_ON;
    sound.setAttribute('aria-label', muted ? 'Attiva audio' : 'Disattiva audio');
    sound.setAttribute('aria-pressed', String(muted));
  }

  const logo = brandImage('cc-logo', LOGO_URL).img;
  const brand = el('div', 'cc-title__brand');
  brand.append(logo, el('p', 'cc-title__sub', 'THE BURGER ADVENTURE'));

  const bests = new Map<LevelId, HTMLElement>();
  const levelBtns = LEVEL_IDS.map((lv) => {
    const b = el('button', `cc-btn cc-level cc-level--${lv}`);
    b.type = 'button';
    b.setAttribute('aria-label', `Livello ${lv}: ${LEVEL_NAMES[lv]}`);
    const best = el('span', 'cc-level__best');
    bests.set(lv, best);
    const thumb = el('span', 'cc-level__thumb', levelThumb(lv));
    thumb.append(el('span', 'cc-level__num', `0${lv}`), el('span', 'cc-level__go', '▶'));
    const text = el('span', 'cc-level__text');
    text.append(el('span', 'cc-level__name', LEVEL_NAMES[lv]), best);
    b.append(thumb, text);
    onActivate(b, menu.guard(() => handlers?.onStart(lv)));
    return b;
  });
  const grid = el('nav', 'cc-title__menu');
  grid.setAttribute('aria-label', 'Scegli il livello');
  grid.append(...levelBtns);
  const menuCol = el('div', 'cc-title__levels');
  menuCol.append(grid);
  menuCol.insertAdjacentHTML('beforeend', keyLegend());

  const main = el('div', 'cc-title__main');
  main.append(brand, menuCol);
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
      menu.open(levelBtns, { armMs: 250, cols: 2 });
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
