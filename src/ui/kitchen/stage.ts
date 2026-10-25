/**
 * The pre-shift stage: the Sperlinga room seen from behind the polished steel counter, the big burger steaming on
 * it and the owner's original face logo on its disc at the side, as on the game's counter. The pixel backdrop and
 * burger (scene.ts) show at once; the art pack's scene and stack (art.ts) replace them when built. The backdrop is
 * composed for the box's own aspect, so the pixels stay square in portrait and landscape.
 */
import { el } from '../dom';
import { STAGE_ART, kitchenArt } from './art';
import { faceLogoHtml } from './icons';
import { stageBurgerSvg, stageSvg } from './scene';

export function createKitchenStage(): HTMLElement {
  const stage = el('div', 'cc-kstage');
  stage.style.setProperty('--stand', `${(STAGE_ART.stand / STAGE_ART.h) * 100}%`);
  const room = el('div', 'cc-kstage__room', stageSvg());
  const burger = el('div', 'cc-kstage__burger', stageBurgerSvg());
  stage.append(room, burger, el('span', 'cc-kstage__steam', '<i></i><i></i><i></i>'), el('span', 'cc-kstage__logo', faceLogoHtml()));
  void kitchenArt().then((art) => {
    if (!art) return;
    const img = el('img', 'cc-kstage__img');
    img.alt = "Un AMERICAN BACONCHEESE sul bancone di Ciccio's";
    img.src = art.burger;
    burger.replaceChildren(img);
    const backdrop = el('img', 'cc-kstage__img');
    backdrop.alt = '';
    room.replaceChildren(backdrop);
    const fit = (): void => {
      const { width, height } = stage.getBoundingClientRect();
      if (width > 0 && height > 0) backdrop.src = art.stage(width / height);
    };
    const sizes = new ResizeObserver(() => (stage.isConnected ? fit() : sizes.disconnect()));
    sizes.observe(stage);
  });
  return stage;
}
