/**
 * BOSS-A lane cut-out toolkit (used by brie.mjs and pancetta.mjs): runs the image work inside headless
 * Chromium (Playwright) because Node has no image library here. The page side (`pageLib`, injected as
 * window.CUT) crops a shirt reference, upscales it x U, quantises it to the print's flat palette,
 * despeckles it and splits it into enclosed regions; brie-seg.mjs assigns the regions + their ink to the
 * animation parts (seed points / polygons in crop pixels); render() draws each part (with painted under /
 * over layers for what a moving part uncovers) back at 1 crop pixel = 1 output pixel, as WebP data URLs.
 *
 *   import { runCut } from './brie-cut.mjs';
 *   await runCut({ ref: 'ref/x.png', out: 'public/level8/brie', debug: '/abs/scratch', job: (refUrl) => {...} });
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { pageSeg } from './brie-seg.mjs';

/** Page-side library (stringified into the page; plain ES2020, no imports). */
function pageLib() {
  const CUT = {};
  const loadImg = async (url) => {
    const im = new Image();
    im.src = url;
    await im.decode();
    return im;
  };
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  CUT.canvas = canvas;

  /** Crop [x, y, w, h] of the reference, upscaled x U with high-quality smoothing. */
  CUT.prepare = async (url, crop, U) => {
    const im = await loadImg(url);
    const [x, y, w, h] = crop;
    const c = canvas(w * U, h * U);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(im, x, y, w, h, 0, 0, w * U, h * U);
    const W = c.width;
    const H = c.height;
    return { W, H, U, w, h, rgb: g.getImageData(0, 0, W, H).data };
  };

  /** Nearest palette entry per pixel; palette = [{ label, rgb }] (several entries may share a label). */
  CUT.quantise = (S, palette) => {
    const n = S.W * S.H;
    const lab = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const r = S.rgb[i * 4];
      const g = S.rgb[i * 4 + 1];
      const b = S.rgb[i * 4 + 2];
      let best = 0;
      let bd = 1e9;
      for (const p of palette) {
        const dr = r - p.rgb[0];
        const dg = g - p.rgb[1];
        const db = b - p.rgb[2];
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
        if (d < bd) {
          bd = d;
          best = p.label;
        }
      }
      lab[i] = best;
    }
    S.lab = lab;
  };

  /** Majority filter (radius r) to remove speckles, `passes` times. */
  CUT.despeckle = (S, passes, r = 1) => {
    const { W, H } = S;
    for (let p = 0; p < passes; p++) {
      const src = S.lab;
      const dst = new Uint8Array(src);
      const cnt = new Uint16Array(256);
      for (let y = r; y < H - r; y++)
        for (let x = r; x < W - r; x++) {
          const seen = [];
          for (let j = -r; j <= r; j++)
            for (let i = -r; i <= r; i++) {
              const v = src[(y + j) * W + x + i];
              if (cnt[v]++ === 0) seen.push(v);
            }
          let best = src[y * W + x];
          let bc = cnt[best];
          for (const v of seen) {
            if (cnt[v] > bc) {
              bc = cnt[v];
              best = v;
            }
            cnt[v] = 0;
          }
          dst[y * W + x] = best;
        }
      S.lab = dst;
    }
  };

  /** Connected regions (4-neighbour) of non-ink pixels; ink pixels get -1. */
  CUT.components = (S, ink) => {
    const { W, H, lab } = S;
    const comp = new Int32Array(W * H).fill(-2);
    const stack = new Int32Array(W * H);
    let n = 0;
    for (let s = 0; s < W * H; s++) {
      if (comp[s] !== -2) continue;
      if (ink.includes(lab[s])) {
        comp[s] = -1;
        continue;
      }
      const L = lab[s];
      let top = 0;
      stack[top++] = s;
      comp[s] = n;
      while (top) {
        const p = stack[--top];
        const x = p % W;
        const y = (p / W) | 0;
        const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
        for (const q of nb) if (q >= 0 && comp[q] === -2 && lab[q] === L) {
          comp[q] = n;
          stack[top++] = q;
        }
      }
      n++;
    }
    S.comp = comp;
    S.ncomp = n;
  };

  /** Centroid (crop px) and area (upscaled px) of every region. */
  CUT.centroids = (S) => {
    const cx = new Float64Array(S.ncomp);
    const cy = new Float64Array(S.ncomp);
    const n = new Float64Array(S.ncomp);
    for (let p = 0; p < S.W * S.H; p++) {
      const c = S.comp[p];
      if (c < 0) continue;
      cx[c] += p % S.W;
      cy[c] += (p / S.W) | 0;
      n[c]++;
    }
    return Array.from({ length: S.ncomp }, (_, c) => ({ x: cx[c] / n[c] / S.U, y: cy[c] / n[c] / S.U, n: n[c] }));
  };

  /** Regions whose centroid lies inside one of `polys` (and smaller than maxArea crop px). */
  CUT.grab = (S, cents, polys, maxArea = 4000) => {
    const out = [];
    cents.forEach((c, i) => {
      if (c.n < maxArea * S.U * S.U && polys.some((poly) => inPoly(poly, c.x, c.y))) out.push(i);
    });
    return out;
  };

  const inPoly = (poly, x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  CUT.inPoly = inPoly;

  /**
   * Render parts `idx` inside box [bx, by, bw, bh] (crop px) with flat colours `paint[label]`; `under(g)` /
   * `over(g)` draw in crop px before / after the part pixels; `recolor(x, y, label)` may override a colour.
   * Returns a canvas at 1 crop px = `scale` output px.
   */
  CUT.render = (S, idx, box, paint, opt = {}) => {
    const { W, U, lab, part } = S;
    const [bx, by, bw, bh] = box;
    const big = canvas(bw * U, bh * U);
    const g = big.getContext('2d');
    g.lineJoin = 'round';
    g.lineCap = 'round';
    g.setTransform(U, 0, 0, U, -bx * U, -by * U);
    if (opt.under) opt.under(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (opt.underClip) {
      // keep the under-paint only where the parts `underClip.parts` were (grown by `grow` crop px)
      const m = canvas(bw * U, bh * U);
      const mg = m.getContext('2d');
      const mid = mg.createImageData(m.width, m.height);
      for (let y = 0; y < m.height; y++)
        for (let x = 0; x < m.width; x++) {
          const sx = x + bx * U;
          const sy = y + by * U;
          if (sx >= 0 && sy >= 0 && sx < W && sy < S.H && opt.underClip.parts.includes(part[sy * W + sx])) mid.data[(y * m.width + x) * 4 + 3] = 255;
        }
      mg.putImageData(mid, 0, 0);
      const grown = canvas(bw * U, bh * U);
      const gg = grown.getContext('2d');
      const r = (opt.underClip.grow ?? 0) * U;
      for (let a = 0; a < 16; a++) gg.drawImage(m, Math.cos((a / 16) * Math.PI * 2) * r, Math.sin((a / 16) * Math.PI * 2) * r);
      gg.drawImage(m, 0, 0);
      g.globalCompositeOperation = 'destination-in';
      g.drawImage(grown, 0, 0);
      g.globalCompositeOperation = 'source-over';
    }
    const px = canvas(bw * U, bh * U);
    const pg = px.getContext('2d');
    const id = pg.createImageData(px.width, px.height);
    for (let y = 0; y < px.height; y++)
      for (let x = 0; x < px.width; x++) {
        const sx = x + bx * U;
        const sy = y + by * U;
        if (sx < 0 || sy < 0 || sx >= W || sy >= S.H) continue;
        const p = sy * W + sx;
        if (!idx.includes(part[p])) continue;
        const col = (opt.recolor && opt.recolor(sx / U, sy / U, lab[p])) || paint[lab[p]];
        if (!col) continue;
        id.data.set([col[0], col[1], col[2], 255], (y * px.width + x) * 4);
      }
    pg.putImageData(id, 0, 0);
    g.drawImage(px, 0, 0);
    if (opt.over) {
      g.setTransform(U, 0, 0, U, -bx * U, -by * U);
      opt.over(g);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    return CUT.resize(big, (opt.scale ?? 1) / U);
  };

  /** Smooth resize by factor f (halving steps for big reductions). */
  CUT.resize = (src, f) => {
    let cur = src;
    let left = f;
    while (left < 0.5) {
      const c = canvas(cur.width / 2, cur.height / 2);
      const g = c.getContext('2d');
      g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, c.width, c.height);
      cur = c;
      left *= 2;
    }
    const c = canvas(cur.width * left, cur.height * left);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, c.width, c.height);
    return c;
  };

  /** Horizontal strip of equally sized frames (each a canvas, centred on a cell of the largest size). */
  CUT.strip = (frames) => {
    const fw = Math.max(...frames.map((f) => f.width));
    const fh = Math.max(...frames.map((f) => f.height));
    const c = canvas(fw * frames.length, fh);
    const g = c.getContext('2d');
    frames.forEach((f, i) => g.drawImage(f, i * fw + (fw - f.width) / 2, (fh - f.height) / 2));
    return { canvas: c, fw, fh };
  };

  /** Ink-outlined hose / stroke helper in crop px: stroke `path` with ink of width w + 2*line, then fill colour. */
  CUT.tube = (g, pts, w, line, fill, ink) => {
    for (const [col, lw] of [
      [ink, w + 2 * line],
      [fill, w],
    ]) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.strokeStyle = col;
      g.lineWidth = lw;
      g.stroke();
    }
  };

  CUT.webp = (c) => c.toDataURL('image/webp', 0.9);
  CUT.png = (c) => c.toDataURL('image/png');
  window.CUT = CUT;
}

/**
 * Run `job` in the page (after `libs`, page-side functions that install helpers on window):
 * job({ urls, arg }) -> { files: { name: dataURL }, debug: { name: dataURL }, data: any }.
 * Files go to `out`, debug images to `debug`; returns `data`.
 */
export async function runCut({ refs, out, debug, job, arg, libs = [] }) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent('<!doctype html><body></body>');
    for (const lib of [pageLib, pageSeg, ...libs]) await page.evaluate(`(${lib.toString()})()`);
    const urls = Object.fromEntries(
      Object.entries(refs).map(([k, f]) => [k, `data:image/${f.endsWith('.png') ? 'png' : 'jpeg'};base64,${fs.readFileSync(f).toString('base64')}`]),
    );
    const res = await page.evaluate(job, { urls, arg });
    fs.mkdirSync(out, { recursive: true });
    if (debug) fs.mkdirSync(debug, { recursive: true });
    const save = (dir, name, url) => {
      const file = path.join(dir, name);
      fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      return fs.statSync(file).size;
    };
    let total = 0;
    for (const [name, url] of Object.entries(res.files ?? {})) total += save(out, name, url);
    if (debug) for (const [name, url] of Object.entries(res.debug ?? {})) save(debug, name, url);
    process.stdout.write(`wrote ${Object.keys(res.files ?? {}).length} files to ${out} (${(total / 1024).toFixed(0)} KB)\n`);
    return res.data;
  } finally {
    await browser.close();
  }
}

/** Compact TS literal: numbers rounded to 0.1, single-quoted strings, short arrays on one line. */
export function tsLiteral(v, pad = '') {
  if (typeof v === 'number') return String(Math.round(v * 10) / 10);
  if (typeof v === 'string') return `'${v}'`;
  if (Array.isArray(v)) {
    const items = v.map((x) => tsLiteral(x, pad + '  '));
    const one = `[${items.join(', ')}]`;
    return one.length < 100 ? one : `[\n${items.map((x) => pad + '  ' + x).join(',\n')},\n${pad}]`;
  }
  const items = Object.entries(v).map(([k, x]) => `${k}: ${tsLiteral(x, pad + '  ')}`);
  const one = `{ ${items.join(', ')} }`;
  return one.length < 100 ? one : `{\n${items.map((x) => pad + '  ' + x).join(',\n')},\n${pad}}`;
}

