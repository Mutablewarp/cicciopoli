/**
 * The seven mascots of the Ciccio's shirts as small rubber-hose portraits for the boss cards of the map
 * (cartoon/map.ts) and the report card (cartoon/results.ts): pie-cut eyes, thick ink outlines, flat 1930s colours.
 * A locked card draws the same portrait as an ink silhouette (CSS). Pure SVG strings, no ids.
 */
import type { CartoonBossId } from '../../contracts';
import { TOON, outlined } from './icons';

const K = TOON.ink;

/** A pie-cut eye: white ellipse, black pupil looking `dx`, the classic wedge cut out of it. */
function eye(x: number, y: number, rx: number, ry: number, dx = 0): string {
  const px = x + dx;
  const py = y + ry * 0.2;
  return (
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#fff" stroke="${K}" stroke-width="2.2"/>` +
    `<ellipse cx="${px}" cy="${py}" rx="${rx * 0.62}" ry="${ry * 0.68}" fill="${K}"/>` +
    `<path d="M${px} ${py} L${px - rx * 0.5} ${py - ry * 0.62} L${px + rx * 0.1} ${py - ry * 0.7} Z" fill="#fff"/>`
  );
}
const line = (d: string, w = 2.4, c: string = K): string => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}"/>`;
const fill = (d: string, c: string, w = 2.2): string => `<path d="${d}" fill="${c}" stroke="${K}" stroke-width="${w}"/>`;

function brie(): string {
  return (
    outlined('<path d="M10 54 L32 10 Q37 9 40 13 L56 52 Q34 60 10 54 Z"/>', '#f6d88a') +
    fill('M32 10 Q37 9 40 13 L56 52 Q53 54 49 54 L36 15 Z', '#fbf3df', 0) +
    line('M32 10 Q37 9 40 13 L56 52', 3) +
    outlined('<ellipse cx="34" cy="11" rx="15" ry="6" transform="rotate(-8 34 11)"/><path d="M34 3 l2 -3"/>', K, 2) +
    eye(25, 32, 5, 7, 1.2) +
    eye(37, 32, 5, 7, 1.2) +
    line('M22 44 Q31 50 40 43') +
    fill('M30 46 Q32 53 36 46', '#ff8a8a', 1.6)
  );
}

function pancetta(): string {
  return (
    outlined('<path d="M14 18 L10 4 L24 12 Z"/><path d="M50 18 L54 4 L40 12 Z"/><circle cx="32" cy="32" r="22"/>', '#f6a9a2') +
    fill('M17 52 Q32 62 47 52 L50 60 Q32 66 14 60 Z', TOON.red) +
    eye(24, 26, 4.6, 6, 1) +
    eye(39, 26, 4.6, 6, 1) +
    fill('M23 40 Q31 33 41 40 Q42 47 32 47 Q22 47 23 40 Z', '#e58780') +
    `<ellipse cx="28.5" cy="41" rx="1.6" ry="2.4" fill="${K}"/><ellipse cx="35.5" cy="41" rx="1.6" ry="2.4" fill="${K}"/>` +
    line('M22 50 Q32 56 42 50', 2.2)
  );
}

function tuma(): string {
  return (
    outlined('<circle cx="32" cy="36" r="21"/>', '#f6e2a6') +
    outlined('<path d="M9 24 Q12 8 32 8 Q52 8 55 22 Q58 26 48 26 H12 Q6 26 9 24 Z"/>', '#7a6248', 2.4) +
    line('M16 24 Q30 18 52 22', 2, '#4a3a2c') +
    fill('M14 30 h15 q0 8 -7 8 q-8 0 -8 -8 Z M35 30 h15 q0 8 -8 8 q-7 0 -7 -8 Z', '#c8321e') +
    line('M29 32 h6', 2.4) +
    fill('M18 46 Q25 40 32 45 Q39 40 46 46 Q40 50 32 48 Q24 50 18 46 Z', K, 1) +
    line('M26 52 Q32 55 38 52', 2)
  );
}

function happy(): string {
  return (
    outlined('<path d="M14 20 L50 20 L52 58 L12 58 Z"/>', TOON.blue) +
    outlined('<path d="M12 20 L20 8 H44 L52 20 Z"/>', '#f2c64a', 2.4) +
    fill('M47 30 h9 v22 h-9 Z', TOON.pink) +
    fill('M48 26 h7 v4 h-7 Z', '#d8d8d8', 1.6) +
    eye(24, 32, 4.6, 6.4, 1) +
    eye(36, 32, 4.6, 6.4, 1) +
    fill('M19 42 Q30 54 42 42 Z', '#fff') +
    line('M23 44 V48 M28 45 V50 M33 45 V50 M38 44 V48', 1.6)
  );
}

function burger(top: number, layers: string, bottom: number, bun = '#e8a24c'): string {
  return (
    outlined(`<path d="M8 ${top + 16} Q8 ${top} 32 ${top} Q56 ${top} 56 ${top + 16} Z"/>`, bun) +
    layers +
    outlined(`<path d="M9 ${bottom} H55 Q55 ${bottom + 9} 46 ${bottom + 9} H18 Q9 ${bottom + 9} 9 ${bottom} Z"/>`, bun, 2.6) +
    `<g fill="#fff4cc">${[18, 26, 36, 44].map((x, i) => `<ellipse cx="${x}" cy="${top + 5 + (i % 2) * 3}" rx="1.6" ry="1"/>`).join('')}</g>`
  );
}

function oldschool(): string {
  const layers = fill('M8 36 Q20 32 32 36 Q44 32 56 36 L54 40 H10 Z', '#6ab04c') + fill('M9 40 H55 V47 H9 Z', '#6a3a1e') + fill('M10 47 H54 L50 52 L44 48 L38 54 L32 48 H10 Z', '#f4c430');
  return (
    outlined('<path d="M44 52 Q60 50 62 60 L40 64 Z"/><circle cx="50" cy="52" r="7"/>', '#fffaf0', 2.4) +
    burger(12, layers, 50) +
    fill('M17 23 h11 q0 7 -5.5 7 q-5.5 0 -5.5 -7 Z M34 23 h11 q0 7 -5.5 7 q-5.5 0 -5.5 -7 Z', K) +
    line('M28 24 h6', 2.2) +
    line('M24 33 Q32 36 40 32', 2)
  );
}

function doubletriple(): string {
  const layers =
    fill('M8 31 H56 V36 H8 Z', '#c8402c') +
    fill('M9 36 H55 V42 H9 Z', '#6a3a1e') +
    fill('M10 42 H54 L49 46 L42 43 L34 47 L26 43 H10 Z', '#f4c430') +
    fill('M9 45 H55 V51 H9 Z', '#6a3a1e');
  return (
    burger(8, layers, 51, '#f0902c') +
    line('M18 20 Q22 17 26 20 M38 20 Q42 17 46 20', 3) +
    line('M24 27 Q32 31 40 26', 2.2) +
    outlined('<path d="M54 18 L52 6 L56 6 L57 15 L59 4 L63 5 L60 18 Z"/>', '#fffaf0', 1.8)
  );
}

function burgergang(): string {
  const layers = fill('M8 32 Q20 28 32 32 Q44 28 56 32 L54 36 H10 Z', '#6ab04c') + fill('M9 36 H55 V44 H9 Z', '#6a3a1e') + fill('M10 44 H54 L50 49 L44 45 L36 50 L28 45 H10 Z', '#f4c430');
  return (
    burger(8, layers, 48) +
    fill('M12 18 H30 L28 27 Q20 30 15 26 Z M34 18 H52 L49 26 Q44 30 36 27 Z', '#ff4f9a') +
    line('M30 20 H34', 2.4) +
    `<path d="M16 20 l5 4 M37 20 l5 4" stroke="#fff" stroke-width="1.8"/>` +
    fill('M2 36 h9 l-1 18 h-7 Z', TOON.red, 2) +
    line('M7 36 L10 28', 2)
  );
}

const EMBLEMS: Readonly<Record<CartoonBossId, () => string>> = { brie, pancetta, tuma, happy, oldschool, doubletriple, burgergang };

/** Portrait of a boss, 64x64 view box (the caller sizes it). */
export function bossEmblem(id: CartoonBossId, cls = ''): string {
  return `<svg class="${cls}" viewBox="0 0 64 64" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${EMBLEMS[id]()}</svg>`;
}
