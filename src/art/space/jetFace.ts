/**
 * Ciccio's face logo on the jet (ref/logo_ciccios.jpg, ref/invaders_sprites.png): a round white
 * head, a thin black fringe with short side locks, two round black lenses with a glint each, a
 * small nose and a dark smile. 15 x 15 px, centre column 7. It is the hit box of the jet, so it
 * is drawn last. The silhouette is a 15 px circle (rows 5, 9, 11, 13, 15 ... 15, 13, 11, 9, 5
 * wide); the lenses are 5 px discs (corners cut) with one skin pixel between them, no black
 * bridge, so they read as two round glasses and not as a visor bar.
 */
import type { Buf } from './buf';

export const FACE_SIZE = 15;

export const FACE = [
  '.....kkkkk.....',
  '...khhHhhhhk...',
  '..khhhhhhhhhk..',
  '.khhssssssshhk.',
  'khssssssssssshk',
  'kssogosssogossk',
  'ksogooooogooosk',
  'ksooooosooooosk',
  'ksooooosooooosk',
  'kssooosssooossk',
  'kssssssSsssssSk',
  '.ksssmsssmssSk.',
  '..ksssmmmssSk..',
  '...ksssssSSk...',
  '.....kkkkk.....',
];

export const FACE_PAL: Readonly<Record<string, string>> = {
  k: '#0c0c1c',
  h: '#161616',
  H: '#52526a',
  s: '#fff6e8',
  S: '#e4d6c4',
  o: '#0a0a0a',
  g: '#8fa6d8',
  m: '#7a2830',
};

/** Draws the face with its top-left at (x, y). */
export function drawFace(b: Buf, x: number, y: number): void {
  b.grid(FACE, FACE_PAL, x, y);
}
