/**
 * BOSS-C image kit (used by scripts/level8/oldschool.mjs and scripts/level8/doubletriple.mjs): runs the pixel
 * work inside a real Chromium page (canvas getImageData / putImageData / toDataURL) because Node has no image
 * codec here, and writes the results with Node fs.
 *
 * Coordinates in configs are SOURCE pixels of the reference screenshot (ref/level8_shirt_*_v2.png); the kit
 * works on an upscaled copy (x `scale`) and maps every point / polygon / stroke itself.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

/** The in-page toolbox (serialised with toString, so it must not close over module scope). */
function pageKit() {
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  };
  const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });

  async function load(url) {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  }

  /** Crop (x, y, w, h) of the image upscaled by s with high-quality smoothing → ImageData. */
  function upscale(img, x, y, w, h, s) {
    const c = canvas(w * s, h * s);
    const g = ctx2d(c);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, x, y, w, h, 0, 0, w * s, h * s);
    return g.getImageData(0, 0, w * s, h * s);
  }

  /** 0/1 mask of filled polygons (points in source px relative to the crop, scaled by s). */
  function polyMask(W, H, polys, s) {
    const c = canvas(W, H);
    const g = ctx2d(c);
    g.fillStyle = '#fff';
    for (const p of polys) {
      g.beginPath();
      p.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
      g.closePath();
      g.fill();
    }
    const d = g.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return m;
  }

  /** 0/1 mask of stroked polylines of width w (source px). */
  function strokeMask(W, H, lines, w, s) {
    const c = canvas(W, H);
    const g = ctx2d(c);
    g.strokeStyle = '#fff';
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.lineWidth = w * s;
    for (const p of lines) {
      g.beginPath();
      p.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
      g.stroke();
    }
    const d = g.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(W * H);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    return m;
  }

  /** 4-connected flood over allowed[] from seed pixels → 0/1 mask. */
  function flood(allowed, W, H, seeds) {
    const out = new Uint8Array(W * H);
    const q = new Int32Array(W * H);
    let n = 0;
    for (const i of seeds) if (allowed[i] && !out[i]) (out[i] = 1), (q[n++] = i);
    for (let h = 0; h < n; h++) {
      const i = q[h];
      const x = i % W;
      for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
        if (j >= 0 && j < W * H && allowed[j] && !out[j]) (out[j] = 1), (q[n++] = j);
      }
    }
    return out;
  }

  /** Connected components (4-conn) of free[] → labels (1..n, 0 = not free) and areas. */
  function label(free, W, H) {
    const lab = new Int32Array(W * H);
    const q = new Int32Array(W * H);
    const areas = [0];
    let next = 0;
    for (let s = 0; s < W * H; s++) {
      if (!free[s] || lab[s]) continue;
      next++;
      let n = 0;
      lab[s] = next;
      q[n++] = s;
      for (let h = 0; h < n; h++) {
        const i = q[h];
        const x = i % W;
        for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
          if (j >= 0 && j < W * H && free[j] && !lab[j]) (lab[j] = next), (q[n++] = j);
        }
      }
      areas.push(n);
    }
    return { lab, areas };
  }

  /** Chamfer distance (px) of every pixel to the nearest pixel with mask = 1. */
  function dist(mask, W, H) {
    const D = new Float32Array(W * H);
    const INF = 1e9;
    for (let i = 0; i < D.length; i++) D[i] = mask[i] ? 0 : INF;
    const a = 1;
    const b = Math.SQRT2;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        let v = D[i];
        if (x > 0) v = Math.min(v, D[i - 1] + a);
        if (y > 0) {
          v = Math.min(v, D[i - W] + a);
          if (x > 0) v = Math.min(v, D[i - W - 1] + b);
          if (x < W - 1) v = Math.min(v, D[i - W + 1] + b);
        }
        D[i] = v;
      }
    }
    for (let y = H - 1; y >= 0; y--) {
      for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x;
        let v = D[i];
        if (x < W - 1) v = Math.min(v, D[i + 1] + a);
        if (y < H - 1) {
          v = Math.min(v, D[i + W] + a);
          if (x < W - 1) v = Math.min(v, D[i + W + 1] + b);
          if (x > 0) v = Math.min(v, D[i + W - 1] + b);
        }
        D[i] = v;
      }
    }
    return D;
  }

  /** Multi-source BFS: every pixel with tag 0 takes the tag of the nearest tagged pixel (4-conn). */
  function grow(tag, W, H, blocked) {
    const q = new Int32Array(W * H);
    let n = 0;
    for (let i = 0; i < tag.length; i++) if (tag[i]) q[n++] = i;
    for (let h = 0; h < n; h++) {
      const i = q[h];
      const x = i % W;
      for (const j of [i - W, i + W, x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1]) {
        if (j >= 0 && j < W * H && !tag[j] && !(blocked && blocked[j])) (tag[j] = tag[i]), (q[n++] = j);
      }
    }
    return tag;
  }

  /** Remove 1-blobs of `mask` smaller than minArea (in place); returns mask. */
  function despeckle(mask, W, H, minArea) {
    const { lab, areas } = label(mask, W, H);
    for (let i = 0; i < mask.length; i++) if (mask[i] && areas[lab[i]] < minArea) mask[i] = 0;
    return mask;
  }

  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

  /** RGBA buffer → canvas. */
  function toCanvas(rgba, W, H) {
    const c = canvas(W, H);
    ctx2d(c).putImageData(new ImageData(rgba, W, H), 0, 0);
    return c;
  }

  /** Resample a canvas by f (premultiplied, high quality); steps by halves for smooth downscales. */
  function resample(c, f) {
    let cur = c;
    let left = f;
    while (left < 0.5) {
      const n = canvas(Math.round(cur.width / 2), Math.round(cur.height / 2));
      const g = ctx2d(n);
      g.imageSmoothingQuality = 'high';
      g.drawImage(cur, 0, 0, n.width, n.height);
      cur = n;
      left *= 2;
    }
    const n = canvas(Math.max(1, Math.round(cur.width * left)), Math.max(1, Math.round(cur.height * left)));
    const g = ctx2d(n);
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, n.width, n.height);
    return n;
  }

  /** Tight alpha bbox of a canvas (with pad). */
  function bbox(c, pad = 2) {
    const d = ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    let x0 = c.width;
    let y0 = c.height;
    let x1 = -1;
    let y1 = -1;
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (d[(y * c.width + x) * 4 + 3] > 8) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return { x: 0, y: 0, w: 1, h: 1 };
    x0 = Math.max(0, x0 - pad);
    y0 = Math.max(0, y0 - pad);
    x1 = Math.min(c.width - 1, x1 + pad);
    y1 = Math.min(c.height - 1, y1 + pad);
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function sub(c, b) {
    const n = canvas(b.w, b.h);
    ctx2d(n).drawImage(c, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h);
    return n;
  }

  return { canvas, ctx2d, load, upscale, polyMask, strokeMask, flood, label, dist, grow, despeckle, hex, toCanvas, resample, bbox, sub };
}

/** Launch Chromium with the kit installed as window.K; returns { page, close }. */
export async function openKit() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<!doctype html><meta charset="utf-8"><body></body>');
  await page.addScriptTag({ content: `window.K = (${pageKit.toString()})();` });
  return { page, close: () => browser.close() };
}

export function dataUrl(file) {
  return `data:image/png;base64,${readFileSync(file).toString('base64')}`;
}

/** Write a data: URL to disk (creating the folder). */
export function save(file, url) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
}
