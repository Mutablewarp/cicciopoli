/**
 * The Ciccio's truck vinyl, hand-pixelled over a levelled bake of the real lettering
 * (scripts/truck-logo-guide.mjs prints the guide from ref/truck_top.png): the white
 * "Ciccio's" script with its big swash C, the line-art burger and the official face logo
 * (public/brand/ciccios-logo.png: slick black hair, round black glasses, dark lips).
 * Script: '#' vinyl white. Faces: k black, w white, g grey shade, o hairline round the hair, m lips.
 */
import { gridR, type Raster } from '../hills/raster';
import { RU } from './colors';

/** Roof script for the top-down truck: 30x12, C 12 px tall, x-height 6 px. */
export const ROOF_SCRIPT: readonly string[] = [
  '.......###....................',
  '.....###.##................##.',
  '....##...#.................##.',
  '..##.......................#..',
  '..##......#.........#.....#...',
  '..##.........................#',
  '.##......#..##..##.#..##....##',
  '.##......#.#.#.#.#.#.#..#..#..',
  '.##......#.#...#...#.#..#...#.',
  '##......#.#...#...#.#..#....#.',
  '##....#.#.#...#...#.#..#..#.#.',
  '.#####..##.##..##.##.##....#..',
];

/** Side-view script: 40x16, bold downstrokes, C 16 px tall, x-height 8 px. */
export const SIDE_SCRIPT: readonly string[] = [
  '.........#####..........................',
  '......###...##..........................',
  '.....##....##...........................',
  '....###....#........................##..',
  '...##..............................##...',
  '..###........##...........##.......##...',
  '..##................................#..#',
  '.##...............................#..##.',
  '.##.........##..###..###.##..###....##..',
  '.##.........##.##.#.##.#.##.##..#...##..',
  '##.........##.##...##...##.##..#....##..',
  '##.........##.##...##...##.##..#.....##.',
  '###........##.##...##...##.##..#.....##.',
  '##......####.##...##...##.##..#.....##..',
  '###...###.##.##.#.##.#.##.##..#...#.##..',
  '.######...###.##...##..###.###.....##...',
];

/** Line-art burger beside the script (top bun with sesame, cheese drips, patty, bottom bun). */
export const BURGER_S: readonly string[] = [
  '...######...',
  '.##......##.',
  '#..#..#.#..#',
  '#..........#',
  '############',
  '#.##.#.##.##',
  '.##########.',
  '##+##+##+###',
  '############',
  '#..........#',
  '.##########.',
];

export const BURGER_L: readonly string[] = [
  '....#######....',
  '..##.......##..',
  '.#...#...#...#.',
  '#..#....#..#..#',
  '#.............#',
  '###############',
  '#.###.#.###.###',
  '.#############.',
  '##+##+###+##+##',
  '###############',
  '#++#+++#++++#+#',
  '#.............#',
  '.#############.',
];

/** Face logo, 9x11 (top-down rear door, the delivery bag). */
export const FACE_S: readonly string[] = [
  '..ooooo..',
  '.okkkkkoo',
  'okkkkkkko',
  'okkwwwwko',
  'okwkwkwko',
  'owkkwkkwo',
  'kkkkkkkkk',
  'owkkwkkgo',
  '.wwwkwwg.',
  '.wwmmmwg.',
  '..wwwgg..',
];

/** Face logo, 13x17 (side-view rear door, storefront signs). */
export const FACE_L: readonly string[] = [
  '...ooooooo...',
  '..okkkkkkkoo.',
  '.okkkkkkkkkko',
  'okkkkkkkkkkko',
  'okkkkwwwwwkko',
  'okkwwwwwwwwko',
  'okwkkkwwkkkwo',
  'okwwwwwwwwwko',
  'owwkkwwwkkwwo',
  'kkkkkkkkkkkkk',
  'owkkkkwkkkkwo',
  'owwkkwwwkkwgo',
  '.wwwwwkwwwwg.',
  '.wwwwkkwwwwg.',
  '.wwwkmmmkwgg.',
  '..wwwwwwwgg..',
  '....wwwgg....',
];

const VINYL = { '#': RU.vinyl, '+': RU.vinylShade };

export function faceColours(hairline: string = RU.vinylShade): Readonly<Record<string, string>> {
  return { k: RU.hair, w: RU.vinyl, g: RU.vinylShade, o: hairline, m: RU.lips };
}

/** Stamps vinyl artwork ('#' white, '+' shade) with its top-left at (x, y). */
export function vinyl(r: Raster, rows: readonly string[], x: number, y: number, pal: Readonly<Record<string, string>> = VINYL): void {
  gridR(r, rows, pal, x, y);
}

export function face(r: Raster, rows: readonly string[], x: number, y: number, hairline?: string): void {
  gridR(r, rows, faceColours(hairline), x, y);
}
