/* Browser-side pixel kit of the BOSS-D lane (IL BOSS DELLA BURGER GANG), injected as a classic script into
 * headless Chromium by burgergang.mjs: window.BGPX. Images are canvases; label maps / masks are
 * Uint8Array(w * h) indexed y * w + x. Nothing here knows the character: the numbers come from burgergang.mjs. */
(() => {
  const canvas = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    return c;
  };
  const ctx2d = (c) => c.getContext('2d', { willReadFrequently: true });
  const load = async (src) => {
    const i = new Image();
    i.src = src;
    await i.decode();
    return i;
  };
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

  /** Crop (x, y, w, h) of an image scaled by s with high-quality smoothing (the x4 upscale). */
  function crop(img, r, s) {
    const c = canvas(r.w * s, r.h * s);
    const g = ctx2d(c);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, r.x, r.y, r.w, r.h, 0, 0, c.width, c.height);
    return c;
  }

  /** sRGB -> CIE Lab (D65), for perceptual nearest-colour quantisation. */
  function lab([r, g, b]) {
    const lin = (v) => {
      const c = v / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const [R, G, B] = [lin(r), lin(g), lin(b)];
    const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
    const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
    const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
    const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
    return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
  }

  /**
   * Every pixel -> index of the nearest palette colour (Lab distance, cached per 5-bit RGB cell). Greyish pixels
   * (chroma < grey) are ink (achromatic[0]) below lightness `split`, else white (achromatic[1]): the blur of a thin
   * ink line between two whites stays an ink line.
   */
  function quantise(c, palette, achromatic, grey, split) {
    const { width: w, height: h } = c;
    const d = ctx2d(c).getImageData(0, 0, w, h).data;
    const pl = palette.map((p) => lab(hex(p)));
    const cache = new Int16Array(32768).fill(-1);
    const out = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      const key = ((d[i * 4] >> 3) << 10) | ((d[i * 4 + 1] >> 3) << 5) | (d[i * 4 + 2] >> 3);
      if (cache[key] < 0) {
        const q = lab([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
        let best = achromatic[q[0] < split ? 0 : 1];
        let bd = Math.hypot(q[1], q[2]) < grey ? -1 : Infinity;
        pl.forEach((p, j) => {
          const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
          if (dd < bd) {
            bd = dd;
            best = j;
          }
        });
        cache[key] = best;
      }
      out[i] = cache[key];
    }
    return out;
  }

  /** Majority vote in a disc of radius r (despeckle + smooth flat regions); `pass` times. */
  function mode(labels, w, h, n, r, pass) {
    const offs = [];
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + r) offs.push([dx, dy]);
    let a = labels;
    for (let p = 0; p < pass; p++) {
      const b = new Uint8Array(w * h);
      const cnt = new Uint16Array(n);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          cnt.fill(0);
          let best = a[y * w + x];
          for (const [dx, dy] of offs) {
            const xx = x + dx;
            const yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            const l = a[yy * w + xx];
            if (++cnt[l] > cnt[best]) best = l;
          }
          b[y * w + x] = best;
        }
      }
      a = b;
    }
    return a;
  }

  /** 4-connected flood from the seeds over pixels where ok(i) holds; returns the mask. */
  function flood(w, h, seeds, ok) {
    const m = new Uint8Array(w * h);
    const stack = [];
    for (const s of seeds) if (ok(s) && !m[s]) {
      m[s] = 1;
      stack.push(s);
    }
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j < 0 || j >= w * h || m[j] || !ok(j)) continue;
        m[j] = 1;
        stack.push(j);
      }
    }
    return m;
  }

  /** Connected components (4-conn) of pixels where ok(i) holds: { id: Int32Array, sizes: number[] }. */
  function components(w, h, ok) {
    const id = new Int32Array(w * h).fill(-1);
    const sizes = [];
    for (let i = 0; i < w * h; i++) {
      if (id[i] >= 0 || !ok(i)) continue;
      const c = sizes.length;
      const stack = [i];
      id[i] = c;
      let n = 0;
      while (stack.length) {
        const p = stack.pop();
        n++;
        const x = p % w;
        for (const j of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
          if (j < 0 || j >= w * h || id[j] >= 0 || !ok(j)) continue;
          id[j] = c;
          stack.push(j);
        }
      }
      sizes.push(n);
    }
    return { id, sizes };
  }

  /** Chamfer distance (in px) of every pixel to the nearest pixel of mask m. */
  function distance(m, w, h) {
    const D = new Float32Array(w * h).fill(1e9);
    for (let i = 0; i < w * h; i++) if (m[i]) D[i] = 0;
    const a = 1;
    const b = Math.SQRT2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (x > 0) D[i] = Math.min(D[i], D[i - 1] + a);
      if (y > 0) {
        D[i] = Math.min(D[i], D[i - w] + a);
        if (x > 0) D[i] = Math.min(D[i], D[i - w - 1] + b);
        if (x < w - 1) D[i] = Math.min(D[i], D[i - w + 1] + b);
      }
    }
    for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (x < w - 1) D[i] = Math.min(D[i], D[i + 1] + a);
      if (y < h - 1) {
        D[i] = Math.min(D[i], D[i + w] + a);
        if (x < w - 1) D[i] = Math.min(D[i], D[i + w + 1] + b);
        if (x > 0) D[i] = Math.min(D[i], D[i + w - 1] + b);
      }
    }
    return D;
  }

  /**
   * Remove the shirt from a label map of a sticker print: `bg` = the shirt ink reachable from the border, plus the
   * shirt showing through enclosed holes (the ink island under each `holes` seed, label px), plus the `ground` mask
   * (print shadows under the feet); `contour` = the white sticker band (white pixels within
   * band px of bg, flooded from the bg edge, never closer than seal px to the character's ink lines, never inside
   * `protect`: white parts of the character that touch the band with no ink line between, like a sneaker sole). Returns
   * { bg, contour } masks.
   */
  function cutout(L, w, h, { ink, white, holes, band, seal, ground, protect }) {
    const seeds = [];
    for (let x = 0; x < w; x++) seeds.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) seeds.push(y * w, y * w + w - 1);
    const whiteMask = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) whiteMask[i] = L[i] === white ? 1 : 0;
    // the white band, thickened, keeps the shirt flood out of the character's ink through a 1-2 px break in it
    const dWhite = distance(whiteMask, w, h);
    const bg = flood(w, h, seeds, (i) => L[i] === ink && dWhite[i] > seal && !ground[i]);
    const dBg = distance(bg, w, h);
    for (let i = 0; i < w * h; i++) if (L[i] === ink && dBg[i] <= seal + 1 && !ground[i]) bg[i] = 1;
    for (const [x, y] of holes) {
      // the nearest shirt-ink pixel within 12 px of the seed
      let at = -1;
      for (let r = 0; r <= 12 && at < 0; r++) {
        for (let dy = -r; dy <= r && at < 0; dy++) for (let dx = -r; dx <= r; dx++) {
          const i = Math.round(y + dy) * w + Math.round(x + dx);
          if (L[i] === ink && !bg[i]) {
            at = i;
            break;
          }
        }
      }
      if (at < 0) throw new Error(`hole seed ${x},${y} is not on the shirt ink`);
      const m = flood(w, h, [at], (i) => L[i] === ink && !bg[i]);
      for (let i = 0; i < w * h; i++) if (m[i]) bg[i] = 1;
    }
    const D = distance(bg, w, h);
    const inkLine = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) inkLine[i] = L[i] === ink && !bg[i] ? 1 : 0;
    // the character's own ink lines, thickened, wall the band flood off from white gloves / soles behind a gap
    const wall = distance(inkLine, w, h);
    const edge = [];
    for (let i = 0; i < w * h; i++) if (L[i] === white && D[i] <= 1.5) edge.push(i);
    const contour = flood(w, h, edge, (i) => L[i] === white && D[i] <= band && wall[i] > seal && !protect[i]);
    // the wall also kept the band's last pixels next to the ink lines: give them back
    const dBand = distance(contour, w, h);
    for (let i = 0; i < w * h; i++) if (L[i] === white && !protect[i] && dBand[i] <= seal + 1) contour[i] = 1;
    for (let i = 0; i < w * h; i++) if (ground[i]) bg[i] = 1;
    return { bg, contour };
  }

  /** RGBA canvas where pixel i (mask on) takes the colour of pixel src[i] of the RGBA array `rgba`. */
  function paintFrom(rgba, src, w, h, mask) {
    const c = canvas(w, h);
    const g = ctx2d(c);
    const im = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) {
      if (!mask[i]) continue;
      const j = src[i] * 4;
      im.data.set([rgba[j], rgba[j + 1], rgba[j + 2], 255], i * 4);
    }
    g.putImageData(im, 0, 0);
    return c;
  }

  /**
   * Mean colour (hex) of each label over its interior pixels (same label r px away in the 4 directions) of the RGBA
   * array: flat paint that matches the print's tones. A label with no interior keeps its `fallback` colour.
   */
  function meanColours(labels, rgba, w, h, fallback, r) {
    const sum = fallback.map(() => [0, 0, 0, 0]);
    for (let y = r; y < h - r; y++) for (let x = r; x < w - r; x++) {
      const i = y * w + x;
      const l = labels[i];
      if (labels[i - r] !== l || labels[i + r] !== l || labels[i - r * w] !== l || labels[i + r * w] !== l) continue;
      for (let ch = 0; ch < 3; ch++) sum[l][ch] += rgba[i * 4 + ch];
      sum[l][3]++;
    }
    const to2 = (v) => Math.round(v).toString(16).padStart(2, '0');
    return sum.map((t, l) => (t[3] ? `#${to2(t[0] / t[3])}${to2(t[1] / t[3])}${to2(t[2] / t[3])}` : fallback[l]));
  }

  /**
   * Smooth fill by a push-pull pyramid: the `known` pixels keep their colour (RGBA array), every other pixel gets a
   * smooth blend of the known ones around it (the print's own shading runs on under a part that moves away).
   * Returns an opaque canvas.
   */
  function pushPull(rgba, known, w, h) {
    const lv = [{ w, h, col: new Float32Array(w * h * 3), wt: new Float32Array(w * h) }];
    for (let i = 0; i < w * h; i++) if (known[i]) {
      lv[0].wt[i] = 1;
      for (let ch = 0; ch < 3; ch++) lv[0].col[i * 3 + ch] = rgba[i * 4 + ch];
    }
    // push: each level = the weighted mean of 2 x 2 pixels below it, weight = their summed weight (max 1)
    while (lv.at(-1).w > 1 || lv.at(-1).h > 1) {
      const f = lv.at(-1);
      const n = { w: Math.ceil(f.w / 2), h: Math.ceil(f.h / 2) };
      const sum = new Float32Array(n.w * n.h * 3);
      const sw = new Float32Array(n.w * n.h);
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        const j = (y >> 1) * n.w + (x >> 1);
        sw[j] += f.wt[i];
        for (let ch = 0; ch < 3; ch++) sum[j * 3 + ch] += f.wt[i] * f.col[i * 3 + ch];
      }
      n.col = sum.map((v, k) => (sw[(k / 3) | 0] ? v / sw[(k / 3) | 0] : 0));
      n.wt = sw.map((v) => Math.min(1, v));
      lv.push(n);
    }
    // pull: each level blends in the (bilinear) level above where its own weight falls short of 1
    for (let k = lv.length - 2; k >= 0; k--) {
      const f = lv[k];
      const c = lv[k + 1];
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        const i = y * f.w + x;
        if (f.wt[i] >= 1) continue;
        const u = Math.min(c.w - 1, Math.max(0, (x + 0.5) / 2 - 0.5));
        const v = Math.min(c.h - 1, Math.max(0, (y + 0.5) / 2 - 0.5));
        const [x0, y0] = [Math.floor(u), Math.floor(v)];
        const [x1, y1] = [Math.min(c.w - 1, x0 + 1), Math.min(c.h - 1, y0 + 1)];
        const [fu, fv] = [u - x0, v - y0];
        for (let ch = 0; ch < 3; ch++) {
          const at = (xx, yy) => c.col[(yy * c.w + xx) * 3 + ch];
          const up = (at(x0, y0) * (1 - fu) + at(x1, y0) * fu) * (1 - fv) + (at(x0, y1) * (1 - fu) + at(x1, y1) * fu) * fv;
          f.col[i * 3 + ch] = f.wt[i] * f.col[i * 3 + ch] + (1 - f.wt[i]) * up;
        }
      }
    }
    const out = canvas(w, h);
    const g = ctx2d(out);
    const im = g.createImageData(w, h);
    for (let i = 0; i < w * h; i++) im.data.set([lv[0].col[i * 3], lv[0].col[i * 3 + 1], lv[0].col[i * 3 + 2], 255], i * 4);
    g.putImageData(im, 0, 0);
    return out;
  }

  /** Rasterise a polygon (points in label-map px) into a mask. */
  function polyMask(w, h, pts) {
    const c = canvas(w, h);
    const g = ctx2d(c);
    g.fillStyle = '#fff';
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
    const d = g.getImageData(0, 0, w, h).data;
    const m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 127 ? 1 : 0;
    return m;
  }

  /** Scale a canvas by s with high-quality smoothing (anti-aliased downsample). */
  function scaled(src, s) {
    const c = canvas(src.width * s, src.height * s);
    const g = ctx2d(c);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }

  window.BGPX = { canvas, ctx2d, load, hex, crop, quantise, mode, flood, components, distance, cutout, paintFrom, meanColours, pushPull, polyMask, scaled };
})();
