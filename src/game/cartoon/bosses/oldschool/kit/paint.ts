/**
 * Watercolour helpers for the BOSS-C arenas (canvas 2D in world units, deterministic): seeded noise,
 * pigment washes, paper grain, edge pooling and soft-inked background shapes (thinner, warmer lines than
 * the characters so the action reads first).
 */
type Ctx = CanvasRenderingContext2D;

/** Seeded 0..1 generator (mulberry32) so every arena paints the same each time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `rgba()` of a #rrggbb colour. */
export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** Vertical gradient fill of a rectangle. */
export function vgrad(ctx: Ctx, x: number, y: number, w: number, h: number, stops: readonly (readonly [number, string])[]): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
}

/** Watercolour blooms: n soft blobs of colour inside the box. */
export function wash(ctx: Ctx, rng: () => number, x: number, y: number, w: number, h: number, color: string, n: number, rMin: number, rMax: number, alpha: number): void {
  for (let i = 0; i < n; i++) {
    const cx = x + rng() * w;
    const cy = y + rng() * h;
    const r = rMin + rng() * (rMax - rMin);
    const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    g.addColorStop(0, rgba(color, alpha));
    g.addColorStop(0.7, rgba(color, alpha * 0.45));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
}

/** Paper grain specks over the box. */
export function grain(ctx: Ctx, rng: () => number, x: number, y: number, w: number, h: number, n: number, color: string, alpha: number): void {
  ctx.fillStyle = rgba(color, alpha);
  for (let i = 0; i < n; i++) ctx.fillRect(x + rng() * w, y + rng() * h, 0.5 + rng() * 0.9, 0.5 + rng() * 0.9);
}

/**
 * Painted background shape: flat fill, pigment pooling darker along the inside of the edge, then a
 * thin warm ink line (lw 0 = no line, for far layers).
 */
export function painted(ctx: Ctx, path: (c: Ctx) => void, fill: string, edge: string, lw: number, line = '#3a2a20'): void {
  // every pass starts a fresh path: a bare c.rect() must not drag the previous shape along
  const trace = (): void => {
    ctx.beginPath();
    path(ctx);
  };
  trace();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  trace();
  ctx.clip();
  trace();
  ctx.strokeStyle = rgba(edge, 0.45);
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.restore();
  if (lw <= 0) return;
  trace();
  ctx.strokeStyle = line;
  ctx.lineWidth = lw;
  ctx.stroke();
}

/** Rounded rectangle path. */
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Puffy watercolour cloud: a row of overlapping bumps on a soft flat base, no ink line. */
export function cloud(ctx: Ctx, x: number, y: number, w: number, fill: string, edge: string): void {
  const bumps = Math.max(3, Math.round(w / 26));
  const r = (w / bumps) * 0.72;
  painted(ctx, (c) => {
    for (let i = 0; i < bumps; i++) {
      const bx = x + r + ((w - 2 * r) * i) / (bumps - 1);
      const rr = r * (0.8 + 0.35 * Math.sin((i / (bumps - 1)) * Math.PI));
      c.moveTo(bx + rr, y);
      c.arc(bx, y - rr * 0.35, rr, 0, Math.PI * 2);
    }
    c.moveTo(x + w, y + r * 0.2);
    c.ellipse(x + w / 2, y + r * 0.2, w / 2, r * 0.55, 0, 0, Math.PI * 2);
  }, fill, edge, 0);
}
