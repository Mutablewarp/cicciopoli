/** Centred pixel banner over the game ("VAI IN BUCA!", "CHECKPOINT", power-up names). */
import type { BannerTone } from '../contracts';
import { el } from './dom';

const OUT_MS = 240;
const MIN_MS = 400;
const DEFAULT_MS = 1600;

export interface Banner {
  show(text: string, opts?: { ms?: number; tone?: BannerTone; sub?: string }): void;
  /** Pause: the banner on screen stops counting down (game time is frozen too). */
  freeze(): void;
  /** Resume: it stays up for the time it had left. */
  thaw(): void;
}

export function createBanner(layer: HTMLElement): Banner {
  let current: HTMLElement | null = null;
  let timer = 0;
  let endsAt = 0;
  let left = 0;
  let frozen = false;

  function dismiss(b: HTMLElement): void {
    b.classList.add('is-out');
    window.setTimeout(() => b.remove(), OUT_MS);
    if (current === b) current = null;
  }

  function arm(b: HTMLElement, ms: number): void {
    window.clearTimeout(timer);
    left = ms;
    if (frozen) return;
    endsAt = performance.now() + ms;
    timer = window.setTimeout(() => dismiss(b), ms);
  }

  return {
    show(text, opts = {}) {
      if (current) dismiss(current); // the old one slides away while the new one pops in
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
      arm(b, Math.max(MIN_MS, opts.ms ?? DEFAULT_MS));
    },
    freeze() {
      if (frozen) return;
      frozen = true;
      window.clearTimeout(timer);
      left = Math.max(0, endsAt - performance.now());
    },
    thaw() {
      if (!frozen) return;
      frozen = false;
      if (current) arm(current, left);
    },
  };
}
