/**
 * Level 8 vector icons (1930s rubber-hose look: thick ink outline around the whole shape, cream / gold / red, a soft
 * highlight), as SVG strings for the HUD, the touch controls, the map and the report card. No ids: every icon can
 * appear many times in the DOM. Callers: cartoon/hud.ts, cartoon/controls.ts, cartoon/map.ts, cartoon/results.ts.
 */
import type { CartoonWeapon } from '../../contracts';

export const TOON = {
  ink: '#1c1511',
  cream: '#f6e7c8',
  paper: '#efdcb4',
  red: '#d2392a',
  redLo: '#962216',
  gold: '#e7b04a',
  goldHi: '#fbe08c',
  goldLo: '#a8701e',
  brown: '#8a4a26',
  brownLo: '#5a2c14',
  batter: '#e8b252',
  batterLo: '#b87a28',
  blue: '#3f78b4',
  pink: '#ff6fae',
} as const;

const svg = (vb: string, body: string, cls = ''): string =>
  `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

/**
 * `shapes` (no fills of their own) drawn as one silhouette: a fat ink stroke behind, the fill on top, so the shapes
 * merge into one body with a single thick outline (no seams where they overlap).
 */
export function outlined(shapes: string, fill: string, w = 3): string {
  return `<g fill="${TOON.ink}" stroke="${TOON.ink}" stroke-width="${w * 2}">${shapes}</g><g fill="${fill}">${shapes}</g>`;
}

/** Ink detail lines (knuckles, crumbs, smiles). */
const ink = (d: string, w = 2.5): string => `<path d="${d}" fill="none" stroke="${TOON.ink}" stroke-width="${w}"/>`;
/** A soft white highlight streak. */
const shine = (d: string, w = 3): string => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="${w}"/>`;

/** PROVOLA GOAT: a golden battered cheese stick, bumpy crust, melty end. */
export function provolaSvg(cls = ''): string {
  const body = '<rect x="10" y="22" width="44" height="22" rx="7" transform="rotate(-18 32 33)"/>';
  const bumps = [
    [17, 34], [25, 28], [33, 26], [41, 23], [22, 40], [31, 37], [40, 34], [47, 30],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.1" fill="${TOON.goldHi}"/>`)
    .join('');
  return svg(
    '0 0 64 64',
    outlined(body, TOON.batter) +
      `<path d="M14 44 Q33 40 54 30 L55 34 Q34 46 15 49 Z" fill="${TOON.batterLo}" opacity=".55"/>` +
      bumps +
      `<path d="M53 26 q5 1 4 7 q-1 4 2 7" fill="none" stroke="${TOON.ink}" stroke-width="5"/>` +
      `<path d="M53 26 q5 1 4 7 q-1 4 2 7" fill="none" stroke="${TOON.goldHi}" stroke-width="2.4"/>` +
      shine('M16 28 L30 23'),
    cls,
  );
}

/** MEATBALL: a sauced meatball bomb with a lit fuse. */
export function meatballSvg(cls = ''): string {
  return svg(
    '0 0 64 64',
    outlined('<circle cx="30" cy="38" r="20"/>', TOON.brown) +
      `<circle cx="22" cy="44" r="3" fill="${TOON.brownLo}"/><circle cx="36" cy="48" r="2.4" fill="${TOON.brownLo}"/><circle cx="40" cy="38" r="2" fill="${TOON.brownLo}"/>` +
      outlined('<path d="M14 30 Q18 18 31 19 Q44 19 46 30 Q42 27 38 31 Q33 26 28 31 Q22 26 14 30 Z"/>', TOON.red, 2) +
      shine('M19 25 Q24 21 30 21', 2.4) +
      ink('M42 20 Q46 12 52 11', 3) +
      `<path d="M52 4 L54 9 L59 8 L55 12 L58 16 L53 14 L50 18 L50 13 L45 12 L50 10 Z" fill="${TOON.goldHi}" stroke="${TOON.ink}" stroke-width="1.6"/>`,
    cls,
  );
}

/** NUGGETS: two crunchy nuggets, the front one smiling with pie-cut eyes. */
export function nuggetsSvg(cls = ''): string {
  const back = '<path d="M34 12 Q48 8 54 20 Q60 32 48 38 Q36 42 30 32 Q24 18 34 12 Z"/>';
  const front = '<path d="M12 30 Q20 20 34 26 Q46 30 44 44 Q42 56 28 56 Q12 56 8 46 Q5 36 12 30 Z"/>';
  const crumbs = [
    [40, 18], [47, 24], [44, 31], [16, 36], [37, 49], [21, 51],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${TOON.batterLo}"/>`)
    .join('');
  const eye = (x: number): string =>
    `<ellipse cx="${x}" cy="38" rx="2.6" ry="3.6" fill="${TOON.ink}"/><path d="M${x - 1.4} 36 l1.6 2.2 l1 -2.6 z" fill="#fff"/>`;
  return svg('0 0 64 64', outlined(back, TOON.goldLo) + outlined(front, TOON.batter) + crumbs + eye(20) + eye(29) + ink('M18 45 Q25 50 32 44', 2.4) + shine('M14 33 Q18 28 24 28', 2.4), cls);
}

export const WEAPON_ICON: Readonly<Record<CartoonWeapon, (cls?: string) => string>> = {
  provola: provolaSvg,
  meatball: meatballSvg,
  nuggets: nuggetsSvg,
};
export const WEAPON_NAME: Readonly<Record<CartoonWeapon, string>> = { provola: 'PROVOLA GOAT', meatball: 'MEATBALL', nuggets: 'NUGGETS' };

/** SPARA: the white four-finger glove making a finger-gun, cuff on the left. */
export function gloveSvg(cls = ''): string {
  const shapes =
    '<rect x="4" y="25" width="15" height="22" rx="5"/>' +
    '<circle cx="28" cy="38" r="13"/>' +
    '<rect x="24" y="10" width="9" height="22" rx="4.5" transform="rotate(-12 28 21)"/>' +
    '<rect x="28" y="26" width="31" height="10" rx="5"/>';
  return svg(
    '0 0 64 64',
    outlined(shapes, '#fffaf0') +
      ink('M8 31 V41 M12 31 V41', 2) +
      ink('M30 41 Q36 41 38 37', 2.2) +
      ink('M28 47 Q35 48 39 43', 2.2) +
      shine('M33 29 L52 29', 2),
    cls,
  );
}

/** SCATTO: a little shoe dashing, with speed lines. */
export function dashSvg(cls = ''): string {
  return svg(
    '0 0 64 64',
    ink('M4 24 H20 M2 34 H16 M6 44 H20', 4) +
      outlined('<path d="M22 22 Q30 14 38 22 L40 34 Q52 32 58 40 Q60 48 50 49 H24 Q20 49 21 42 Z"/>', TOON.ink, 2) +
      `<path d="M24 46 H52" stroke="#5c4a3c" stroke-width="3"/>` +
      shine('M44 37 Q52 38 55 43', 2.4),
    cls,
  );
}

/** A fat rounded arrow pointing up (SALTA, the ▲ cap); rotate it with CSS for ◀ ▶. */
export function arrowSvg(cls = ''): string {
  return svg('0 0 64 64', outlined('<path d="M32 8 L56 36 H42 V56 H22 V36 H8 Z"/>', TOON.cream, 3.5) + shine('M30 16 L16 32', 2.6), cls);
}

/** A vintage padlock (locked boss card). */
export function lockSvg(cls = ''): string {
  return svg(
    '0 0 64 64',
    `<path d="M20 30 V20 Q20 8 32 8 Q44 8 44 20 V30" fill="none" stroke="${TOON.ink}" stroke-width="10"/>` +
      `<path d="M20 30 V20 Q20 8 32 8 Q44 8 44 20 V30" fill="none" stroke="#b9a37c" stroke-width="4"/>` +
      outlined('<rect x="12" y="28" width="40" height="30" rx="5"/>', TOON.gold) +
      `<circle cx="32" cy="40" r="4" fill="${TOON.ink}"/><path d="M30 42 h4 l1 9 h-6 z" fill="${TOON.ink}"/>` +
      shine('M17 33 H28', 2.4),
    cls,
  );
}

/** Five-point star (beaten pins, the golden card). */
export function starSvg(cls = '', fill: string = TOON.gold): string {
  return svg('0 0 64 64', outlined('<path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z"/>', fill, 3) + shine('M27 18 L23 27', 2.4), cls);
}

/** Playing card with a heart pip (HUD hearts): `full` = face up, else the card back. */
export function cardHeartSvg(full: boolean): string {
  if (!full) {
    return svg(
      '0 0 40 56',
      `<rect x="2" y="2" width="36" height="52" rx="5" fill="${TOON.redLo}" stroke="${TOON.ink}" stroke-width="3"/>` +
        `<rect x="7" y="7" width="26" height="42" rx="2" fill="none" stroke="${TOON.cream}" stroke-opacity=".55" stroke-width="1.6"/>` +
        `<path d="M7 7 L33 49 M33 7 L7 49 M20 7 L33 28 L20 49 L7 28 Z" fill="none" stroke="${TOON.cream}" stroke-opacity=".35" stroke-width="1.4"/>`,
      'cc-thp__back',
    );
  }
  const heart = (x: number, y: number, s: number): string =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 -3 C-2 -8 -9 -7 -9 -1 C-9 4 -3 7 0 10 C3 7 9 4 9 -1 C9 -7 2 -8 0 -3 Z"/>`;
  return svg(
    '0 0 40 56',
    `<rect x="2" y="2" width="36" height="52" rx="5" fill="${TOON.cream}" stroke="${TOON.ink}" stroke-width="3"/>` +
      `<g fill="${TOON.red}" stroke="${TOON.ink}" stroke-width="2.4">${heart(20, 27, 1.25)}</g>` +
      `<g fill="${TOON.red}">${heart(9, 10, 0.42)}${heart(31, 47, 0.42)}</g>` +
      shine('M15 23 Q16 20 19 21', 2),
    'cc-thp__face',
  );
}

/** The golden ticket (map prize card, report card banner): engraved gold stub with the punched edge. */
export function ticketSvg(cls = ''): string {
  return svg(
    '0 0 96 56',
    outlined('<path d="M6 6 H90 V20 Q84 22 84 28 Q84 34 90 36 V50 H6 V36 Q12 34 12 28 Q12 22 6 20 Z"/>', TOON.gold, 3) +
      `<path d="M12 11 H84 V45 H12 Z" fill="none" stroke="${TOON.goldLo}" stroke-width="1.6" stroke-dasharray="3 2"/>` +
      `<path d="M28 6 V50" stroke="${TOON.goldLo}" stroke-width="1.4" stroke-dasharray="2 3"/>` +
      `<g fill="${TOON.goldLo}"><path d="M44 20 h32 v4 h-32 z"/><path d="M44 28 h26 v3 h-26 z"/><path d="M44 35 h30 v3 h-30 z"/></g>` +
      `<g transform="translate(19 28)" fill="${TOON.goldHi}" stroke="${TOON.goldLo}" stroke-width="1"><path d="M0 -7 L2 -2 L7 -2 L3 1 L4.6 6 L0 3 L-4.6 6 L-3 1 L-7 -2 L-2 -2 Z"/></g>` +
      shine('M14 9 H40', 2),
    cls,
  );
}
