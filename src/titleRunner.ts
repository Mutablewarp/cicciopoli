import type { ArtPack } from './contracts';
import { CICCIO } from './art/keys';

/**
 * Animates the pixel Ciccio running across the title-screen strip canvas.
 * Returns a stop function. Pure canvas 2D, independent of Phaser.
 */
export function startTitleRunner(canvas: HTMLCanvasElement, pack: ArtPack): () => void {
  const sheet = pack.sheets.find((s) => s.key === CICCIO.sheet);
  const ctx = canvas.getContext('2d');
  if (!sheet || !ctx) return () => undefined;
  const fw = sheet.frameWidth;
  const fh = sheet.frameHeight;
  const cols = Math.max(1, Math.floor(sheet.canvas.width / fw));
  let raf = 0;
  let running = true;
  const t0 = performance.now();

  const frame = (now: number): void => {
    if (!running) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const ch = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cw, ch);
    const scale = Math.max(1, Math.floor(ch / fh));
    const t = (now - t0) / 1000;
    const span = cw + fw * scale * 2;
    const x = ((t * 70 * scale) % span) - fw * scale;
    const f = CICCIO.run[Math.floor(t * 14) % CICCIO.run.length];
    ctx.drawImage(sheet.canvas, (f % cols) * fw, Math.floor(f / cols) * fh, fw, fh, Math.round(x), ch - fh * scale, fw * scale, fh * scale);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => {
    running = false;
    cancelAnimationFrame(raf);
  };
}
