/**
 * The owner's cut-out of CICCIO SPACCA! (public/brand/hulk-cutout.png, produced by the art lane).
 * It lives on the level 5 title card only: thumbs.ts (the card art) and title.ts (swaps the card to it),
 * each drawing a pixel stand-in first. The end screens use the upright pixel sprite (hero.ts) instead.
 */
export const CUTOUT_URL = `${import.meta.env.BASE_URL}brand/hulk-cutout.png`;

let probe: Promise<boolean> | undefined;

/** Resolves true once the cut-out is decoded and cached by the browser, false while the file is missing. */
export function cutoutReady(): Promise<boolean> {
  if (!probe) {
    const img = new Image();
    img.src = CUTOUT_URL;
    probe = img.decode().then(
      () => true,
      () => false,
    );
  }
  return probe;
}
