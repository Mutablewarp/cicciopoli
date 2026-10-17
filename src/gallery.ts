/**
 * Dev-only art gallery: renders every ArtPack found in src/art/*.ts.
 * URL params: ?pack=hills (filter by pack name), &scale=4, &bg=light|dark, &anim=0 (static).
 */
import type { ArtPack, AnimDef } from './contracts';

const params = new URLSearchParams(location.search);
const only = params.get('pack');
const scale = Number(params.get('scale') ?? '4');
const light = params.get('bg') === 'light';
const animate = params.get('anim') !== '0';
const out = document.getElementById('out') as HTMLDivElement;

type Builder = () => ArtPack;
const modules = import.meta.glob('./art/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

function scaled(src: HTMLCanvasElement, s: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = src.width * s;
  c.height = src.height * s;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function card(title: string, canvas: HTMLCanvasElement): HTMLDivElement {
  const d = document.createElement('div');
  d.className = light ? 'item light' : 'item';
  d.appendChild(canvas);
  const l = document.createElement('div');
  l.className = 'label';
  l.textContent = title;
  d.appendChild(l);
  return d;
}

const timers: (() => void)[] = [];

function animCard(pack: ArtPack, a: AnimDef): HTMLDivElement | null {
  const sheet = pack.sheets.find((s) => s.key === a.sheet);
  if (!sheet) return null;
  const cols = Math.max(1, Math.floor(sheet.canvas.width / sheet.frameWidth));
  const c = document.createElement('canvas');
  c.width = sheet.frameWidth * scale;
  c.height = sheet.frameHeight * scale;
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  ctx.imageSmoothingEnabled = false;
  let i = 0;
  const draw = (): void => {
    const f = a.frames[i % a.frames.length];
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(
      sheet.canvas,
      (f % cols) * sheet.frameWidth, Math.floor(f / cols) * sheet.frameHeight,
      sheet.frameWidth, sheet.frameHeight, 0, 0, c.width, c.height,
    );
    i++;
  };
  draw();
  if (animate) {
    const id = window.setInterval(draw, 1000 / Math.max(1, a.frameRate));
    timers.push(() => window.clearInterval(id));
  }
  return card(`anim ${a.key} [${a.frames.join(',')}] @${a.frameRate}fps`, c);
}

for (const [path, mod] of Object.entries(modules)) {
  for (const [name, fn] of Object.entries(mod)) {
    if (!/^build\w*Art$/.test(name) || typeof fn !== 'function') continue;
    try {
      const t0 = performance.now();
      const pack = (fn as Builder)();
      const ms = (performance.now() - t0).toFixed(1);
      if (only && pack.name !== only) continue;
      const h = document.createElement('h2');
      h.textContent = `${pack.name}  (${path}#${name}, built in ${ms} ms)`;
      out.appendChild(h);
      for (const t of pack.tilesets) out.appendChild(card(`tileset ${t.key} ${t.canvas.width}x${t.canvas.height}`, scaled(t.canvas, scale)));
      for (const s of pack.sheets) {
        const sc = s.canvas.width * scale > 1800 ? Math.max(1, Math.floor(1800 / s.canvas.width)) : scale;
        out.appendChild(card(`sheet ${s.key} ${s.frameWidth}x${s.frameHeight} (${s.canvas.width}x${s.canvas.height}) x${sc}`, scaled(s.canvas, sc)));
      }
      for (const im of pack.images) {
        const sc = im.canvas.width * scale > 1800 ? Math.max(1, Math.floor(1800 / im.canvas.width)) : scale;
        out.appendChild(card(`image ${im.key} ${im.canvas.width}x${im.canvas.height} x${sc}`, scaled(im.canvas, sc)));
      }
      for (const a of pack.anims) {
        const el = animCard(pack, a);
        if (el) out.appendChild(el);
      }
    } catch (e) {
      const d = document.createElement('div');
      d.className = 'err';
      d.textContent = `${path}#${name} failed: ${(e as Error).stack ?? e}`;
      out.appendChild(d);
    }
  }
}
(window as unknown as { __galleryReady: boolean }).__galleryReady = true;
