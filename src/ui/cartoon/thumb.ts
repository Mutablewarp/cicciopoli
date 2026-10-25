/**
 * Level 8 title-card thumbnail (thumbs.ts) and the golden ticket art of the map / report card: a 1930s cartoon frame
 * in vector SVG — sepia sunburst, the golden ticket with the owner's original face logo in an engraved cameo,
 * film grain, scratches and the vignette. Like the pixel thumbs it slices to any card (the ticket stays in the
 * centre 60%, the part a landscape card keeps).
 */
import { TOON } from './icons';

export const FACE_HD_URL = `${import.meta.env.BASE_URL}brand/ciccio-face-hd.png`;

let uid = 0;

/** The ticket alone, centred on (0, 0), about 200 x 104 units: engraved border, cameo, CICCIO'S, stars, serial. */
export function ticketArt(id: string): string {
  const scallops = Array.from({ length: 9 }, (_, i) => `<circle cx="${-84 + i * 21}" cy="-52" r="4.5"/><circle cx="${-84 + i * 21}" cy="52" r="4.5"/>`).join('');
  return (
    `<g>` +
    `<rect x="-100" y="-52" width="200" height="104" rx="6" fill="${TOON.ink}" transform="translate(4 5)" opacity=".45"/>` +
    `<path d="M-100 -52 H100 V-16 A14 14 0 0 0 100 16 V52 H-100 V16 A14 14 0 0 0 -100 -16 Z" fill="url(#${id}g)" stroke="${TOON.ink}" stroke-width="4"/>` +
    `<g fill="${TOON.ink}">${scallops}</g>` +
    `<rect x="-90" y="-43" width="180" height="86" rx="3" fill="none" stroke="${TOON.goldLo}" stroke-width="2"/>` +
    `<rect x="-85" y="-38" width="170" height="76" rx="2" fill="none" stroke="${TOON.goldLo}" stroke-width="1" stroke-dasharray="4 3"/>` +
    `<ellipse cx="-50" cy="0" rx="27" ry="33" fill="${TOON.cream}" stroke="${TOON.ink}" stroke-width="3.5"/>` +
    `<ellipse cx="-50" cy="0" rx="22" ry="28" fill="none" stroke="${TOON.goldLo}" stroke-width="1.4"/>` +
    `<image href="${FACE_HD_URL}" x="-67" y="-25" width="34" height="49" preserveAspectRatio="xMidYMid meet"/>` +
    `<g font-family="Rockwell, 'Bodoni 72', Didot, Georgia, 'Noto Serif', serif" font-weight="900" text-anchor="middle" fill="${TOON.ink}">` +
    // textLength: the lettering keeps its box whatever serif the device has (the cameo ends at x -23)
    `<text x="32" y="-14" font-size="11" textLength="96" lengthAdjust="spacingAndGlyphs">BIGLIETTO D'ORO</text>` +
    `<text x="32" y="10" font-size="22" textLength="100" lengthAdjust="spacingAndGlyphs" fill="${TOON.red}" stroke="${TOON.ink}" stroke-width="1.2">CICCIO'S</text>` +
    `<text x="32" y="30" font-size="8" textLength="70" lengthAdjust="spacingAndGlyphs" fill="${TOON.goldLo}">N° 0000161</text>` +
    `</g>` +
    `<path d="M-14 -24 l2.4 5 5.4 .4 -4 3.6 1.3 5.3 -5.1 -2.8 -5 2.8 1.2 -5.3 -4 -3.6 5.4 -.4 Z" fill="${TOON.red}" transform="translate(92 44)"/>` +
    `<path d="M-92 -44 H-10" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/>` +
    `</g>`
  );
}

/** The gold gradient the ticket fills with (`<defs>` content). */
export const ticketDefs = (id: string): string =>
  `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1">` +
  `<stop offset="0" stop-color="${TOON.goldHi}"/><stop offset=".45" stop-color="${TOON.gold}"/>` +
  `<stop offset=".7" stop-color="#f6cf6a"/><stop offset="1" stop-color="${TOON.goldLo}"/></linearGradient>`;

/** Sunburst rays around (cx, cy). */
function rays(cx: number, cy: number, n: number, r: number): string {
  let d = '';
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += `M${cx} ${cy} L${(cx + Math.cos(a0) * r).toFixed(1)} ${(cy + Math.sin(a0) * r).toFixed(1)} L${(cx + Math.cos(a1) * r).toFixed(1)} ${(cy + Math.sin(a1) * r).toFixed(1)} Z`;
  }
  return `<path d="${d}" fill="#fff3d0" opacity=".28"/>`;
}

/** 16:9 vintage frame for the 8th title card. */
export function cartoonThumb(): string {
  const id = `ct8-${uid++}-`;
  const defs =
    `<radialGradient id="${id}bg" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#f6dc9a"/><stop offset=".55" stop-color="#d9a253"/><stop offset="1" stop-color="#6e4214"/></radialGradient>` +
    `<radialGradient id="${id}v" cx=".5" cy=".5" r=".72"><stop offset=".55" stop-color="#2a1606" stop-opacity="0"/><stop offset="1" stop-color="#2a1606" stop-opacity=".85"/></radialGradient>` +
    ticketDefs(id) +
    `<filter id="${id}n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8"/>` +
    `<feColorMatrix values="0 0 0 0 .16  0 0 0 0 .1  0 0 0 0 .04  0 0 0 .55 -.18"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  return (
    `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">` +
    `<defs>${defs}</defs>` +
    `<rect width="320" height="180" fill="url(#${id}bg)"/>` +
    rays(160, 84, 36, 260) +
    `<g transform="translate(160 88) rotate(-5) scale(.86)">${ticketArt(id)}</g>` +
    `<g stroke="${TOON.cream}" stroke-width="1.4" fill="none" opacity=".8">` +
    `<path d="M100 40 l4 -9 l4 9 l-4 9 Z M222 128 l3 -7 l3 7 l-3 7 Z M238 46 l2.5 -6 l2.5 6 l-2.5 6 Z" fill="${TOON.goldHi}" stroke="${TOON.ink}"/></g>` +
    `<rect width="320" height="180" fill="#000" filter="url(#${id}n)"/>` +
    `<path d="M74 0 V180 M251 0 V96" stroke="#fff6e0" stroke-opacity=".35" stroke-width="1"/>` +
    `<rect width="320" height="180" fill="url(#${id}v)"/>` +
    `</svg>`
  );
}
