/** Centred pixel banner over the game ("VAI IN BUCA!", "CHECKPOINT", power-up names). */
import type { BannerTone } from '../contracts';
import { el } from './dom';

const OUT_MS = 240;

export function createBanner(layer: HTMLElement): (text: string, opts?: { ms?: number; tone?: BannerTone; sub?: string }) => void {
  let current: HTMLElement | null = null;
  let timer = 0;

  function dismiss(b: HTMLElement): void {
    b.classList.add('is-out');
    window.setTimeout(() => b.remove(), OUT_MS);
    if (current === b) current = null;
  }

  return (text, opts = {}) => {
    if (current) dismiss(current); // the old one slides away while the new one pops in
    window.clearTimeout(timer);
    const b = el('div', `cc-banner cc-banner--${opts.tone ?? 'info'}`);
    b.setAttribute('role', 'status');
    const t = el('span', 'cc-banner__text');
    t.textContent = text;
    b.append(t);
    if (opts.sub) {
      const s = el('span', 'cc-banner__sub');
      s.textContent = opts.sub;
      b.append(s);
    }
    layer.append(b);
    current = b;
    timer = window.setTimeout(() => dismiss(b), Math.max(400, opts.ms ?? 1600));
  };
}
