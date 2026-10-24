/**
 * Visual pieces shared by the level 6 cards: the stage (Palermo at sunset, a scrolling road and the side-view
 * truck, the pixel van until the art pack is ready), the star row and the driver portraits.
 */
import type { RushDriverId } from '../../contracts';
import { el } from '../dom';
import { headSvg } from '../icons';
import { rushArt } from './art';
import { starSvg } from './icons';
import { skylineSvg, vanSvg } from './scene';
import { DRIVER_FRAME } from './text';

export function createStage(): HTMLElement {
  const stage = el(
    'div',
    'cc-rstage',
    `<div class="cc-rstage__sky">${skylineSvg()}</div><div class="cc-rstage__road"></div>` +
      '<span class="cc-rstage__lines" aria-hidden="true"><i></i><i></i><i></i></span>',
  );
  const truck = el('div', 'cc-rstage__truck', vanSvg('cc-rstage__van'));
  stage.append(truck);
  void rushArt().then((art) => {
    if (!art || !truck.isConnected) return;
    const img = el('img', 'cc-rstage__img');
    img.alt = "Il burger truck di Ciccio's";
    img.src = art.truck;
    truck.replaceChildren(img);
  });
  return stage;
}

/** Three stars, `n` of them lit; `pop` makes them land one by one (results). */
export function starsHtml(n: number, pop = false): string {
  const stars = [0, 1, 2].map((i) => `<i class="cc-star${i < n ? ' is-on' : ''}" style="--i:${i}">${starSvg()}</i>`).join('');
  return `<span class="cc-stars${pop ? ' is-pop' : ''}" role="img" aria-label="${n} ${n === 1 ? 'stella' : 'stelle'} su 3">${stars}</span>`;
}

/** A driver portrait: Ciccio's head until the art pack's portrait sheet is ready. */
export function driverFace(id: RushDriverId): HTMLElement {
  const face = el('span', 'cc-driver__face', headSvg());
  void rushArt().then((art) => {
    if (!art?.drivers) return;
    const sprite = el('span', 'cc-driver__sprite');
    sprite.style.backgroundImage = `url(${art.drivers})`;
    sprite.style.backgroundPosition = `${DRIVER_FRAME[id] * 50}% 0`;
    face.replaceChildren(sprite);
  });
  return face;
}
