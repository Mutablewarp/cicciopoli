/* Browser-side pixel helpers of the BOSS-B lane art scripts (loaded into headless Chromium by tuma-kit.mjs).
 * Images are { w, h, d } with d = RGBA bytes; label maps / masks are Uint8Array(w * h). */
(() => {
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });

  const load = (src) =>
    new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = src;
    });

  /** Crop (x, y, w, h) of an image / canvas, scaled by s with high-quality smoothing. */
  function crop(img, x, y, w, h, s) {
    const c = canvas(w * s, h * s);
    const g = ctx2d(c);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, x, y, w, h, 0, 0, c.width, c.height);
    return c;
  }

  const pixels = (c) => ({ w: c.width, h: c.height, d: ctx2d(c).getImageData(0, 0, c.width, c.height).data });

  function toCanvas(p) {
    const c = canvas(p.w, p.h);
    ctx2d(c).putImageData(new ImageData(new Uint8ClampedArray(p.d), p.w, p.h), 0, 0);
    return c;
  }

  const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

  /**
   * Two-colour model of a print photo: each pixel is a mix of its nearest palette colour `a` and the palette
   * colour `b` whose a -> b segment passes closest to it, at `t` (0 = a, 1 = b). Flat areas come out clean, edges
   * keep their anti-aliasing, thin lines keep their width. `allow[k]` (mask or null) limits where entry k may be.
   */
  function project(p, palette, allow) {
    const pal = palette.map(hex);
    const n = p.w * p.h;
    const a = new Uint8Array(n);
    const b = new Uint8Array(n);
    const t = new Float32Array(n);
    const W3 = [2, 4, 3];
    const dist = (x, c) => W3[0] * (x[0] - c[0]) ** 2 + W3[1] * (x[1] - c[1]) ** 2 + W3[2] * (x[2] - c[2]) ** 2;
    for (let i = 0; i < n; i++) {
      const x = [p.d[i * 4], p.d[i * 4 + 1], p.d[i * 4 + 2]];
      let ia = -1;
      let da = Infinity;
      for (let k = 0; k < pal.length; k++) {
        if (allow[k] && !allow[k][i]) continue;
        const d = dist(x, pal[k]);
        if (d < da) (da = d), (ia = k);
      }
      let ib = ia;
      let tb = 0;
      let rb = da;
      for (let k = 0; k < pal.length; k++) {
        if (k === ia || (allow[k] && !allow[k][i])) continue;
        const A = pal[ia];
        const B = pal[k];
        let num = 0;
        let den = 0;
        for (let c = 0; c < 3; c++) (num += W3[c] * (x[c] - A[c]) * (B[c] - A[c])), (den += W3[c] * (B[c] - A[c]) ** 2);
        const tt = Math.max(0, Math.min(1, num / den));
        const r = dist(x, [A[0] + tt * (B[0] - A[0]), A[1] + tt * (B[1] - A[1]), A[2] + tt * (B[2] - A[2])]);
        if (r < rb) (rb = r), (ib = k), (tb = tt);
      }
      a[i] = ia;
      b[i] = ib;
      t[i] = tb;
    }
    return { a, b, t };
  }

  /** Gaussian-like blur (3 box passes of radius r) of a float map. */
  function blur(f, w, h, r) {
    let a = Float32Array.from(f);
    let b = new Float32Array(a.length);
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < h; y++) {
        let s = 0;
        for (let x = -r; x <= r; x++) s += a[y * w + Math.min(w - 1, Math.max(0, x))];
        for (let x = 0; x < w; x++) {
          b[y * w + x] = s / (2 * r + 1);
          s += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
        }
      }
      for (let x = 0; x < w; x++) {
        let s = 0;
        for (let y = -r; y <= r; y++) s += b[Math.min(h - 1, Math.max(0, y)) * w + x];
        for (let y = 0; y < h; y++) {
          a[y * w + x] = s / (2 * r + 1);
          s += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
        }
      }
    }
    return a;
  }

  /** A mask with smooth (blurred, re-thresholded) edges: no stair steps, no 1-px notches. */
  const smoothMask = (m, w, h, r) => Uint8Array.from(blur(m, w, h, r), (v) => (v >= 0.5 ? 1 : 0));

  /** Majority (mode) filter of radius r, `passes` times: flat regions, smooth edges, no speckles. */
  function mode(lab, w, h, r, passes, n) {
    let a = lab;
    for (let pass = 0; pass < passes; pass++) {
      const b = new Uint8Array(a.length);
      const cnt = new Int32Array(n);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          cnt.fill(0);
          for (let dy = -r; dy <= r; dy++) {
            const yy = Math.min(h - 1, Math.max(0, y + dy));
            for (let dx = -r; dx <= r; dx++) {
              if (dx * dx + dy * dy > r * r + r) continue;
              cnt[a[yy * w + Math.min(w - 1, Math.max(0, x + dx))]]++;
            }
          }
          let best = a[y * w + x];
          for (let k = 0; k < n; k++) if (cnt[k] > cnt[best]) best = k;
          b[y * w + x] = best;
        }
      }
      a = b;
    }
    return a;
  }

  /** 4-connected flood from seed pixels through pixels where ok(i) is true; returns a mask. */
  function flood(w, h, seeds, ok) {
    const m = new Uint8Array(w * h);
    const st = [];
    for (const i of seeds) if (ok(i) && !m[i]) (m[i] = 1), st.push(i);
    while (st.length) {
      const i = st.pop();
      const x = i % w;
      const y = (i - x) / w;
      const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of nb) if (j >= 0 && !m[j] && ok(j)) (m[j] = 1), st.push(j);
    }
    return m;
  }

  /**
   * Line-art mask of a blurry print photo: darkness = 255 - luma (the photo's chroma is smeared by JPEG, its
   * luma is sharp); a pixel is line when its darkness is above both `low` and `frac` x the local maximum
   * (square window of radius r): thin faint lines keep their width, the gaps between close lines stay open.
   */
  function lineMask(p, r, low, frac) {
    const { w, h, d } = p;
    const red = new Float32Array(w * h);
    for (let i = 0; i < red.length; i++) red[i] = 255 - (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
    const tmp = new Float32Array(w * h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let m = -1e9;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.max(m, red[y * w + k]);
        tmp[y * w + x] = m;
      }
    const out = new Uint8Array(w * h);
    for (let x = 0; x < w; x++)
      for (let y = 0; y < h; y++) {
        let m = -1e9;
        for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.max(m, tmp[k * w + x]);
        const v = red[y * w + x];
        out[y * w + x] = v > low && v > m * frac ? 1 : 0;
      }
    return out;
  }

  /** 4-connected regions of the pixels where ok(i): ids (0 = not ok) and areas (index = id). */
  function label(w, h, ok) {
    const id = new Int32Array(w * h);
    const area = [0];
    const st = [];
    for (let i0 = 0; i0 < id.length; i0++) {
      if (id[i0] || !ok(i0)) continue;
      const r = area.length;
      let a = 0;
      id[i0] = r;
      st.push(i0);
      while (st.length) {
        const i = st.pop();
        a++;
        const x = i % w;
        if (x > 0 && !id[i - 1] && ok(i - 1)) (id[i - 1] = r), st.push(i - 1);
        if (x < w - 1 && !id[i + 1] && ok(i + 1)) (id[i + 1] = r), st.push(i + 1);
        if (i >= w && !id[i - w] && ok(i - w)) (id[i - w] = r), st.push(i - w);
        if (i < id.length - w && !id[i + w] && ok(i + w)) (id[i + w] = r), st.push(i + w);
      }
      area.push(a);
    }
    return { id, area };
  }

  const border = (w, h) => {
    const s = [];
    for (let x = 0; x < w; x++) s.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) s.push(y * w, y * w + w - 1);
    return s;
  };

  /** Mask of polygons (points in source px, scaled by s); mode 'add' or 'cut' (holes) per polygon. */
  function polyMask(w, h, polys, s) {
    const c = canvas(w, h);
    const g = ctx2d(c);
    for (const poly of polys) {
      const pts = poly.pts ?? poly;
      g.globalCompositeOperation = poly.cut ? 'destination-out' : 'source-over';
      g.fillStyle = '#fff';
      g.beginPath();
      pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
      g.closePath();
      g.fill();
    }
    const d = g.getImageData(0, 0, w, h).data;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return m;
  }

  /** Disc dilation (r px) of a mask. */
  function dilate(m, w, h, r) {
    const out = new Uint8Array(m.length);
    const offs = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!m[y * w + x]) continue;
        for (const [dx, dy] of offs) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) out[yy * w + xx] = 1;
        }
      }
    return out;
  }

  const erode = (m, w, h, r) => {
    const inv = m.map((v) => 1 - v);
    return dilate(inv, w, h, r).map((v) => 1 - v);
  };

  /** Paints labels with colours (labels -> '#rrggbb' or null = transparent), alpha mask optional. */
  function paint(lab, w, h, colors, mask) {
    const cols = colors.map((c) => (c ? hex(c) : null));
    const d = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < lab.length; i++) {
      const c = cols[lab[i]];
      if (!c || (mask && !mask[i])) continue;
      d[i * 4] = c[0];
      d[i * 4 + 1] = c[1];
      d[i * 4 + 2] = c[2];
      d[i * 4 + 3] = 255;
    }
    return { w, h, d };
  }

  /**
   * Fills the `hole` pixels of an opaque image from their nearest opaque neighbours (onion peeling): what a
   * moving part uncovers gets the colours around it.
   */
  function inpaint(p, hole) {
    const { w, h } = p;
    const d = new Uint8ClampedArray(p.d);
    let todo = [];
    for (let i = 0; i < hole.length; i++) if (hole[i] || d[i * 4 + 3] === 0) todo.push(i);
    const known = new Uint8Array(w * h);
    for (let i = 0; i < known.length; i++) known[i] = d[i * 4 + 3] > 0 && !hole[i] ? 1 : 0;
    const allow = new Uint8Array(w * h);
    for (const i of todo) allow[i] = hole[i];
    todo = todo.filter((i) => allow[i]);
    while (todo.length) {
      const next = [];
      const fill = [];
      for (const i of todo) {
        const x = i % w;
        const y = (i - x) / w;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]) {
          if (j < 0 || !known[j]) continue;
          r += d[j * 4];
          g += d[j * 4 + 1];
          b += d[j * 4 + 2];
          n++;
        }
        if (n) fill.push([i, r / n, g / n, b / n]);
        else next.push(i);
      }
      if (!fill.length) break;
      for (const [i, r, g, b] of fill) {
        d[i * 4] = r;
        d[i * 4 + 1] = g;
        d[i * 4 + 2] = b;
        d[i * 4 + 3] = 255;
        known[i] = 1;
      }
      todo = next;
    }
    return { w, h, d };
  }

  /** Downscale a canvas to (w, h) with high-quality smoothing. */
  function resize(c, w, h) {
    const o = canvas(w, h);
    const g = ctx2d(o);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(c, 0, 0, o.width, o.height);
    return o;
  }

  /** Silhouette IoU of two equal-size canvases (alpha > 127). */
  function iou(a, b) {
    const pa = pixels(a).d;
    const pb = pixels(b).d;
    let i = 0;
    let u = 0;
    for (let k = 3; k < pa.length; k += 4) {
      const x = pa[k] > 127;
      const y = pb[k] > 127;
      if (x && y) i++;
      if (x || y) u++;
    }
    return u ? i / u : 1;
  }

  window.PX = { canvas, ctx2d, load, crop, pixels, toCanvas, hex, project, blur, smoothMask, mode, flood, label, lineMask, border, polyMask, dilate, erode, paint, inpaint, resize, iou };
})();
