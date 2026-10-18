/**
 * Hero of the end screens. Levels 1-4 show Ciccio's head icon; level 5 shows the real pixel sprite of
 * art pack `hulk` (victory pose / hurt frame), drawn crisp by CSS. The three poses are rendered once
 * straight from the pose table (frame i of the pack sheet is POSES[i]): the pack the game already built
 * is not rebuilt here, and no other pose or effect is drawn. The art chunk is lazy: while it renders,
 * or if it fails to load, the card keeps the green head icon.
 * Caller: screens.ts (showVictory / showGameOver). Data: one data-URL strip per mood, frames side by side.
 */
import type { LevelId } from '../contracts';
import { HULK } from '../art/keys';
import { toCanvas, type Raster } from '../art/ciccio/raster';
import { ctxOf, makeCanvas } from '../art/pixel';
import { el } from './dom';
import { headSvg, hulkHeadSvg } from './icons';

export type HeroMood = 'win' | 'over';

/** Victory flips between its two poses (CSS, 4 fps); game over holds the hurt frame. */
const FRAMES: Record<HeroMood, readonly number[]> = { win: HULK.victory, over: [HULK.hurt] };

type Strips = Record<HeroMood, string>;
let strips: Promise<Strips | null> | undefined;

/** Renders only the frames the end screens show (victory x2, hurt), not the 35-pose sheet and its effects. */
export async function heroRasters(): Promise<Record<HeroMood, Raster[]>> {
  const [{ renderPose }, { POSES }] = await Promise.all([import('../art/hulk/body'), import('../art/hulk/poses')]);
  const render = (f: number): Raster => renderPose(POSES[f]).raster;
  return { win: FRAMES.win.map(render), over: FRAMES.over.map(render) };
}

/** Puts `frames` side by side on one canvas and returns it as a PNG data URL. */
function strip(frames: readonly Raster[]): string {
  const out = makeCanvas(HULK.frame * frames.length, HULK.frame);
  const ctx = ctxOf(out);
  frames.forEach((r, i) => ctx.drawImage(toCanvas(r), i * HULK.frame, 0));
  return out.toDataURL();
}

/** Builds the hero art once per session; a failed load is forgotten so the next end screen tries again. */
function loadStrips(): Promise<Strips | null> {
  strips ??= heroRasters()
    .then((r): Strips => ({ win: strip(r.win), over: strip(r.over) }))
    .catch(() => null)
    .then((s) => {
      if (!s) strips = undefined;
      return s;
    });
  return strips;
}

/** Hero slot of an end card: level 5 reserves the sprite box right away (no layout jump when it swaps in). */
export const heroHtml = (level: LevelId, mood: HeroMood): string =>
  level === 5
    ? `<div class="cc-hero cc-hero--${mood} cc-hero--sprite">${hulkHeadSvg()}</div>`
    : `<div class="cc-hero cc-hero--${mood}">${headSvg()}</div>`;

/** Swaps the level 5 fallback head of `card` for the sprite as soon as the art is ready. */
export function mountHero(card: HTMLElement, level: LevelId, mood: HeroMood): void {
  const hero = card.querySelector('.cc-hero--sprite');
  if (level !== 5 || !hero) return;
  void loadStrips().then((art) => {
    if (!art || !hero.isConnected) return;
    const sprite = el('span', 'cc-sprite');
    sprite.style.backgroundImage = `url(${art[mood]})`;
    hero.replaceChildren(sprite);
  });
}
