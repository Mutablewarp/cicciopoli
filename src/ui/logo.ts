/**
 * Ciccio's logo redrawn as vector line art (white on black) from ref/logo_ciccios.jpg.
 * Coordinates are in the reference image space (375x375) so the drawing can be
 * overlaid on the reference for tracing (ui-harness.html?state=logo).
 */

const HAIR =
  'M122 136C117 128 115.5 114 115 100C114.5 86 113 72 113.5 62C114 54 117 46 122 39' +
  'C128 30 136 22 146 17C156 13 168 11 178 10.5C183 10 186 8.5 189 7C192 6 195 7.5 198 9' +
  'C210 10.5 222 14 230 18.5C233 20 236 22.5 237 25C235 25.5 233.5 25.5 232 26' +
  'C240 33 247 43 250.5 55C254 70 255 88 254 103C253 115 250.5 127 247.5 138' +
  'C245.5 128 244 117 242.5 106C241 92 239.5 78 234 66C228 55 218 48 204 44.5' +
  'C192 42 178 42 166 45.5C153 49.5 143 57 137 68C132 78 131 92 130.5 106C130 118 127 128 122 136Z';

const BROWS =
  'M139 106C141 99 150 94 161 92C168 91 174 90.5 178.5 90L178.5 97.5C171 97.5 163 98.5 155 100C149 101 144 103 139 106Z' +
  'M199 90.5C207 90.5 216 91.5 224 94C230 96 234 100 236 105C231 101.5 225 99.5 218 98.5C211 97.5 205 97.5 199 97.5Z';

const FACE = 'M122.5 138C123 158 128 176 138 190C148 203 165 212 186 214.5C202 214 216 205 228 193C239 181 245 163 247.5 139';
const EARS = 'M122.6 116.5C117.6 116 116.8 123.5 118.2 128.5C119.2 132 121 134.8 123.2 136M247.6 117C252.4 116.6 253.4 123.5 252 128.5C251 132 249.4 134.8 247.4 136';
const NOSE = 'M176.5 141C178 147 182.5 152 188 154.5C192.5 151.5 196.5 147 198.5 142';
const LIP_LINE =
  'M165 170.6C171.5 170 178 169 183 168.8C186 168.6 188 167.6 189.5 167.6C191 167.6 193 168.6 196 168.8C201 169 206 169.2 211.5 168.2';
const LIPS = 'M175.5 170.4C181 169 186 168.6 189.5 169.4C193 168.6 198 169 203.5 170C199 175 194 177 189.5 177C185 177 180 175 175.5 170.4Z';
const CHIN_LIP = 'M178 179.5C185 182 195 182 202 179';

function lens(cx: number, cy: number, r: number): string {
  // Glint: short arc in the upper-left quadrant (light comes from the top-left).
  const a0 = (205 * Math.PI) / 180;
  const a1 = (250 * Math.PI) / 180;
  const gr = r - 6;
  const p = (a: number): string => `${(cx + gr * Math.cos(a)).toFixed(1)} ${(cy + gr * Math.sin(a)).toFixed(1)}`;
  return (
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" stroke="currentColor" stroke-width="3.4"/>` +
    `<path d="M${p(a0)}A${gr} ${gr} 0 0 1 ${p(a1)}" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity=".9"/>`
  );
}

export const LOGO_FACE_VIEWBOX = '106 2 156 218';

/** Face only, `currentColor` line art: put it on black and set `color`. */
export function logoFaceSvg(cls = ''): string {
  return (
    `<svg class="${cls}" viewBox="${LOGO_FACE_VIEWBOX}" fill="none" aria-hidden="true">` +
    `<path d="${FACE}" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/>` +
    `<path d="${EARS}" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="${HAIR}" fill="currentColor"/>` +
    `<path d="${BROWS}" fill="currentColor"/>` +
    `<path d="M141.5 120.5L121.5 119.2M236.5 120.5L250 121.4" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>` +
    `<path d="M178.5 117.5C184 112.6 194.5 112.6 200.5 117.5" stroke="currentColor" stroke-width="4.6" stroke-linecap="round"/>` +
    lens(160.5, 121.5, 19) +
    lens(218.5, 121.5, 18.8) +
    `<path d="${NOSE}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>` +
    `<path d="${LIP_LINE}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="${LIPS}" fill="currentColor"/>` +
    `<path d="${CHIN_LIP}" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>` +
    `</svg>`
  );
}

/* Wordmark "CICCIO'S": condensed rounded capitals, drawn as strokes on the reference grid. */
const C = (x: number): string =>
  `M${x + 15} 247C${x + 15} 241 ${x + 12.5} 238 ${x + 7.5} 238C${x + 2.5} 238 ${x} 241 ${x} 246.5L${x} 270.5` +
  `C${x} 276 ${x + 2.5} 279 ${x + 7.5} 279C${x + 12.5} 279 ${x + 15} 276 ${x + 15} 270`;
const I = (x: number): string => `M${x} 237.5L${x} 279.5`;
const O = (x: number): string =>
  `M${x + 7.5} 238C${x + 12.5} 238 ${x + 15} 241 ${x + 15} 246.5L${x + 15} 270.5C${x + 15} 276 ${x + 12.5} 279 ${x + 7.5} 279` +
  `C${x + 2.5} 279 ${x} 276 ${x} 270.5L${x} 246.5C${x} 241 ${x + 2.5} 238 ${x + 7.5} 238Z`;
const S = (x: number): string =>
  `M${x + 14.5} 247C${x + 14.5} 241 ${x + 12} 238 ${x + 7.5} 238C${x + 3} 238 ${x} 241 ${x} 246C${x} 253 ${x + 14.5} 258 ${x + 14.5} 266.5` +
  `L${x + 14.5} 270.5C${x + 14.5} 276 ${x + 12} 279 ${x + 7.5} 279C${x + 3} 279 ${x} 276 ${x} 270.5`;

export const WORDMARK_VIEWBOX = '99 233 176 51';

export function wordmarkSvg(cls = ''): string {
  const d = [C(104.5), I(132.6), C(150), C(176), I(202), O(217.8), S(254.2)].join('');
  return (
    `<svg class="${cls}" viewBox="${WORDMARK_VIEWBOX}" fill="none" role="img" aria-label="CICCIO'S">` +
    `<path d="${d}" stroke="currentColor" stroke-width="4.4" stroke-linejoin="round"/>` +
    `<path d="M243.6 239.5L240.6 251" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/>` +
    `</svg>`
  );
}
