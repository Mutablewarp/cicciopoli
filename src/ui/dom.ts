/** Tiny DOM helpers shared by the UI modules. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  html = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html) node.innerHTML = html;
  return node;
}

/** Hidden content shorter than this does not count (sub-pixel rounding at the end of a scroll). */
const MORE_SLACK_PX = 4;

/**
 * Makes `scroll` a touch-scrollable pane (main.ts blocks touch scrolling everywhere else) and toggles
 * `has-more` on `flagOn` while content still hides below its fold, for a fade / ▼ cue in CSS.
 */
export function scrollPane(scroll: HTMLElement, flagOn: HTMLElement): void {
  scroll.dataset.scrollable = '';
  const update = (): void => {
    flagOn.classList.toggle('has-more', scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - MORE_SLACK_PX);
  };
  const sizes = new ResizeObserver(() => (scroll.isConnected ? update() : sizes.disconnect()));
  scroll.addEventListener('scroll', update, { passive: true });
  for (const n of [scroll, ...scroll.children]) sizes.observe(n);
}

/** Extra px around a button where releasing a finger still counts as a tap. */
const TAP_SLOP = 10;
/** A click this soon after a touch activation is the browser's echo of that tap. */
const CLICK_ECHO_MS = 700;

/**
 * Activates `fn` on a tap made while other fingers are down (browsers skip `click` then):
 * touch/pen fire on pointerup of a pointer that went down on this element and ends inside
 * it; mouse and keyboard (Menu calls .click()) keep using click. Never fires twice per tap.
 */
export function onActivate(node: HTMLElement, fn: () => void): void {
  let finger: number | null = null;
  let echoUntil = 0;
  const lift = (): void => {
    finger = null;
    node.classList.remove('is-pressed');
  };
  node.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' || finger !== null) return;
    finger = e.pointerId;
    node.classList.add('is-pressed');
    try {
      node.setPointerCapture(e.pointerId);
    } catch {
      // pointer already gone
    }
  });
  node.addEventListener('pointerup', (e) => {
    if (e.pointerId !== finger) return;
    lift();
    const r = node.getBoundingClientRect();
    const inside =
      e.clientX >= r.left - TAP_SLOP && e.clientX <= r.right + TAP_SLOP && e.clientY >= r.top - TAP_SLOP && e.clientY <= r.bottom + TAP_SLOP;
    if (!inside) return;
    echoUntil = performance.now() + CLICK_ECHO_MS;
    fn();
  });
  node.addEventListener('pointercancel', (e) => {
    if (e.pointerId === finger) lift();
  });
  // cancels the compatibility click at the source; the echo guard below covers the rest
  node.addEventListener('touchend', (e) => {
    if (performance.now() < echoUntil) e.preventDefault();
  });
  node.addEventListener('click', () => {
    if (performance.now() < echoUntil) {
      echoUntil = 0;
      return;
    }
    fn();
  });
}

/** A menu button: tap (even multi-touch), mouse click or keyboard via the menu. */
export function button(cls: string, html: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `cc-btn ${cls}`, html);
  b.type = 'button';
  onActivate(b, onClick);
  return b;
}

/**
 * The official logo <img>: CSS keeps `.cc-brandimg` invisible until it is fully decoded, so a
 * slow network never shows it painting in top-down. Resolves (and shows it) even on error.
 */
export function brandImage(cls: string, src: string): { img: HTMLImageElement; ready: Promise<void> } {
  const img = el('img', `${cls} cc-brandimg`);
  img.src = src;
  img.alt = "CICCIO'S";
  img.decoding = 'async';
  // already in memory (preloaded by index.html, shown by the splash): no fade, no flicker
  if (img.complete && img.naturalWidth > 0) img.classList.add('is-ready');
  const ready = img
    .decode()
    .catch(() => undefined)
    .then(() => img.classList.add('is-ready'));
  return { img, ready };
}

const HTML_ESCAPES: Readonly<Record<string, string>> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/**
 * `text` as HTML for the pixel font. Press Start 2P draws À È Ì Ò Ù as small lowercase letters or drops the accent
 * (MENÙ, BONTÀ, TALÈ): each becomes its plain capital in a `.cc-acc` span that draws the accent on the pixel grid
 * (styles.css). Everything else is escaped.
 */
export function pixelHtml(text: string): string {
  return text
    .replace(/[&<>"]/g, (c) => HTML_ESCAPES[c])
    .replace(/[ÀÈÉÌÒÙ]/g, (c) => `<span class="cc-acc${c === 'É' ? ' is-acute' : ''}">${c.normalize('NFD')[0]}</span>`);
}

/** Sets textContent only when it changes (HUD writes run every frame). */
export function setText(node: Node, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}

/**
 * Converts a character grid into a crisp pixel-art SVG. Horizontal runs of the same
 * colour become one rect, so a 14x14 icon is ~40 rects instead of ~200.
 */
export function pixelSvg(rows: readonly string[], pal: Readonly<Record<string, string>>, cls = ''): string {
  const w = Math.max(...rows.map((r) => r.length));
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let end = x + 1;
      while (end < row.length && row[end] === ch) end++;
      const fill = pal[ch];
      if (fill) rects += `<rect x="${x}" y="${y}" width="${end - x}" height="1" fill="${fill}"/>`;
      x = end;
    }
  });
  return `<svg class="${cls}" viewBox="0 0 ${w} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true">${rects}</svg>`;
}

/** mm:ss style "m:ss" for result screens. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** Deterministic 0..1 sequence (confetti layout) — same look on every run. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
