/**
 * Title screen: official Ciccio's logo, seven level cards (2 columns in portrait, 4 in landscape; the newest, level 7,
 * is a wide card), sound toggle, runner strip.
 */
import type { LevelId, TitleInfo } from '../contracts';
import { LEVEL_IDS } from '../contracts';
import { PAL } from '../art/pixel';
import { cutoutReady } from './cutout';
import { brandImage, el, onActivate, pixelSvg } from './dom';
import { SPEAKER_OFF, SPEAKER_ON } from './icons';
import { kitchenArt } from './kitchen/art';
import { LOGO_URL } from './loading';
import { Menu } from './menu';
import { rushArt } from './rush/art';
import { LEVEL_HEROES, LEVEL_NAMES, LEVEL_TAGS, keyLegend } from './screens';
import { levelThumb } from './thumbs';

const GRASS_TILE = pixelSvg(
  ['..g......g...g..', '.gGg....gGg.gGg.', 'gggggggggggggggg', 'GGGGGGGGGGGGGGGG', 'kkkkkkkkkkkkkkkk'],
  { g: PAL.grass, G: PAL.grassMid, k: PAL.hillOutline },
).replace('<svg class=""', '<svg xmlns="http://www.w3.org/2000/svg"');

/** The truck and kitchen art are built after the title has painted and the runner started. */
const ART_DELAY_MS = 600;

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
  const thumbs = new Map<LevelId, HTMLElement>();
  const levelBtns = LEVEL_IDS.map((lv) => {
    const b = el('button', `cc-btn cc-level cc-level--${lv}`);
    b.type = 'button';
    b.setAttribute('aria-label', `Livello ${lv}: ${LEVEL_NAMES[lv]}`);
    const best = el('span', 'cc-level__best');
    bests.set(lv, best);
    const thumb = el('span', 'cc-level__thumb', levelThumb(lv));
    thumb.append(el('span', 'cc-level__num', `0${lv}`), el('span', 'cc-level__go', '▶'));
    // level 5: the owner's cut-out replaces the pixel stand-in once it has loaded
    if (lv === 5) void cutoutReady().then((ok) => thumb.classList.toggle('has-cutout', ok));
    thumbs.set(lv, thumb);
    const text = el('span', 'cc-level__text');
    text.append(el('span', 'cc-level__name', LEVEL_NAMES[lv]));
    if (LEVEL_HEROES[lv]) text.append(el('span', 'cc-level__hero', LEVEL_HEROES[lv]));
    if (LEVEL_TAGS[lv]) text.append(el('span', 'cc-level__tag', LEVEL_TAGS[lv]));
    text.append(best);
    b.append(thumb, text);
    onActivate(b, menu.guard(() => handlers?.onStart(lv)));
    return b;
  });
  /** The art packs' side-view truck (6) and counter scene (7) replace the pixel stand-ins (built lazily, after the title is up). */
  function loadArt(): void {
    const truck = thumbs.get(6);
    if (truck && !truck.classList.contains('has-truck')) {
      void rushArt().then((art) => {
        if (!art) return;
        truck.querySelector('.cc-thumb__truck')?.setAttribute('href', art.truck);
        truck.classList.add('has-truck');
      });
    }
    const kitchen = thumbs.get(7);
    if (kitchen && !kitchen.classList.contains('has-art')) {
      void kitchenArt().then((art) => {
        if (!art) return;
        kitchen.querySelector('.cc-thumb__kitchen')?.setAttribute('href', art.thumb);
        kitchen.classList.add('has-art');
      });
    }
  }

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
      menu.open(levelBtns, { armMs: 250 });
      window.setTimeout(loadArt, ART_DELAY_MS);
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
