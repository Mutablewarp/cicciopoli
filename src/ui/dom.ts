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

/** A menu button that activates on click (mouse, touch tap, keyboard via the menu). */
export function button(cls: string, html: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', `cc-btn ${cls}`, html);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
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
