/**
 * In-page builder for a COLOUR sticker mascot (DOUBLE TRIPLE on the black shirt): removes the shirt (dark flood
 * from the border) and the white sticker band (light flood from the shirt, which also drops the touching
 * lettering), keeps the character's pixels, quantises them to its flat palette (k-means seeded with the
 * config palette), despeckles, cuts the parts with polygons, paints the hose a limb hides under the body and
 * regrows a clean white sticker edge + ink rim around the whole character, each part keeping its own share.
 * Runs inside the Chromium page opened by oldschool-kit.mjs (window.K); returns data URLs and source boxes.
 */
export async function buildSticker({ cfg, url, debug }) {
  const K = window.K;
  const s = cfg.s;
  const { x: X, y: Y, w, h } = cfg.crop;
  const img = await K.load(url);
  const id = K.upscale(img, X, Y, w, h, s);
  const W = id.width;
  const H = id.height;
  const N = W * H;
  const d = id.data;
  const rel = (poly) => poly.map(([x, y]) => [x - X, y - Y]);

  const lum = new Float32Array(N);
  const sat = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = d[i * 4];
    const g = d[i * 4 + 1];
    const b = d[i * 4 + 2];
    lum[i] = r * 0.3 + g * 0.59 + b * 0.11;
    sat[i] = Math.max(r, g, b) - Math.min(r, g, b);
  }
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  const dark = new Uint8Array(N);
  for (let i = 0; i < N; i++) dark[i] = lum[i] < cfg.shirtLum ? 1 : 0;
  const bg = K.flood(dark, W, H, border);
  const Dbg = K.dist(bg, W, H);
  const inkish = new Uint8Array(N);
  for (let i = 0; i < N; i++) inkish[i] = lum[i] < 150 && Dbg[i] > 4 ? 1 : 0;
  const Dink = K.dist(inkish, W, H);
  const light = new Uint8Array(N);
  for (let i = 0; i < N; i++) light[i] = !bg[i] && Dink[i] > 2 && lum[i] >= 150 && sat[i] < 40 ? 1 : 0;
  const seeds = [];
  for (let i = 0; i < N; i++) if (light[i] && Dbg[i] <= 10) seeds.push(i);
  const sticker = K.flood(light, W, H, seeds);
  // the AA fringe of the sticker belongs to it too (the rim is regrown below)
  const Dst = K.dist(sticker, W, H);
  let core = new Uint8Array(N);
  for (let i = 0; i < N; i++) core[i] = !bg[i] && !sticker[i] && !(Dst[i] <= 2 && lum[i] > 110) && !(Dbg[i] <= 3) ? 1 : 0;
  // only the character: drop small far bits (lettering crumbs, the menu line)
  const cl = K.label(core, W, H);
  let big = 1;
  for (let L = 1; L < cl.areas.length; L++) if (cl.areas[L] > cl.areas[big]) big = L;
  for (let i = 0; i < N; i++) if (core[i] && cl.areas[cl.lab[i]] < cl.areas[big] * cfg.keepFrac) core[i] = 0;

  // flat palette: k-means seeded with the config palette, a few rounds on a sample of the core pixels
  const pal = cfg.palette.map((c) => K.hex(c));
  const sample = [];
  for (let i = 0; i < N; i += 7) if (core[i]) sample.push(i);
  for (let round = 0; round < cfg.kmeansRounds; round++) {
    const acc = pal.map(() => [0, 0, 0, 0]);
    for (const i of sample) {
      const k = nearest(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
      acc[k][0] += d[i * 4];
      acc[k][1] += d[i * 4 + 1];
      acc[k][2] += d[i * 4 + 2];
      acc[k][3]++;
    }
    acc.forEach((a, k) => {
      if (a[3] && !cfg.fixed.includes(k)) pal[k] = [a[0] / a[3], a[1] / a[3], a[2] / a[3]];
    });
  }
  function nearest(r, g, b) {
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < pal.length; k++) {
      const dr = r - pal[k][0];
      const dg = g - pal[k][1];
      const db = b - pal[k][2];
      const e = dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11;
      if (e < bd) (bd = e), (best = k);
    }
    return best;
  }
  let idx = new Int16Array(N).fill(-1);
  for (let i = 0; i < N; i++) if (core[i]) idx[i] = nearest(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
  // despeckle: majority of the (2r+1)^2 window, twice
  const r = cfg.despeckle;
  for (let pass = 0; pass < 2; pass++) {
    const next = Int16Array.from(idx);
    const cnt = new Int32Array(pal.length);
    for (let y = r; y < H - r; y++) {
      for (let x = r; x < W - r; x++) {
        const i = y * W + x;
        if (idx[i] < 0) continue;
        cnt.fill(0);
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          const v = idx[i + dy * W + dx];
          if (v >= 0) cnt[v]++;
        }
        let m = idx[i];
        for (let k = 0; k < pal.length; k++) if (cnt[k] > cnt[m]) m = k;
        if (cnt[m] > cnt[idx[i]] + 2) next[i] = m;
      }
    }
    idx = next;
  }

  // parts by polygon (first match wins), the body takes the rest
  const names = ['body', ...Object.keys(cfg.parts)];
  const tag = new Uint8Array(N);
  const polys = Object.values(cfg.parts).map((p) => K.polyMask(W, H, [rel(p)], s));
  for (let i = 0; i < N; i++) {
    if (!core[i]) continue;
    tag[i] = 1;
    for (let k = 0; k < polys.length; k++) if (polys[k][i]) {
      tag[i] = k + 2;
      break;
    }
  }
  // the sticker band + rim around the whole character, each pixel to the nearest part
  const Dcore = K.dist(core, W, H);
  const stickTag = Uint8Array.from(tag);
  K.grow(stickTag, W, H, Dcore.map((v) => (v > (cfg.stickerW + cfg.rimW) * s ? 1 : 0)));
  const ink = K.hex(cfg.rim);
  const white = K.hex(cfg.sticker);
  const out = {};
  const boxes = {};
  for (let p = 1; p <= names.length; p++) {
    const name = names[p - 1];
    const rgba = new Uint8ClampedArray(N * 4);
    const put = (i, c, a = 255) => {
      rgba[i * 4] = c[0];
      rgba[i * 4 + 1] = c[1];
      rgba[i * 4 + 2] = c[2];
      rgba[i * 4 + 3] = a;
    };
    for (let i = 0; i < N; i++) {
      if (stickTag[i] !== p) continue;
      if (tag[i] === p) put(i, pal[idx[i]]);
      else if (Dcore[i] <= cfg.stickerW * s) put(i, white);
      else if (Dcore[i] <= (cfg.stickerW + cfg.rimW) * s) put(i, ink, 255 * Math.min(1, (cfg.stickerW + cfg.rimW) * s - Dcore[i] + 1));
    }
    for (const pt of cfg.paint[name] ?? []) {
      const m = K.polyMask(W, H, [rel(pt.poly)], s);
      const c = K.hex(pt.color);
      for (let i = 0; i < N; i++) if (m[i] && rgba[i * 4 + 3] === 0) put(i, c);
    }
    const full = K.toCanvas(rgba, W, H);
    const b = K.bbox(full, 4);
    out[name] = K.resample(K.sub(full, b), cfg.outScale).toDataURL('image/webp', 0.9);
    boxes[name] = { x: b.x / s + X, y: b.y / s + Y, w: b.w / s, h: b.h / s };
  }
  const res = { files: out, boxes, palette: pal.map((c) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`) };
  if (debug) {
    // the reference silhouette: everything off the shirt, minus far white (the lettering), for the fidelity proof
    const ref = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const inside = !bg[i] && Dcore[i] <= (cfg.stickerW + 3) * s;
      ref[i * 4] = ref[i * 4 + 1] = ref[i * 4 + 2] = inside ? 255 : 0;
      ref[i * 4 + 3] = 255;
    }
    res.refmask = K.resample(K.toCanvas(ref, W, H), 0.5).toDataURL('image/png');
    const tint = [[0, 0, 0], [255, 160, 0], [0, 200, 255], [120, 255, 120], [255, 80, 200], [160, 120, 255]];
    const dbg = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const t = tint[stickTag[i]] ?? [255, 255, 255];
      const c = core[i] ? pal[idx[i]] : stickTag[i] ? white : [90, 90, 90];
      const a = stickTag[i] ? 0.4 : 0;
      for (let k = 0; k < 3; k++) dbg[i * 4 + k] = c[k] * (1 - a) + t[k] * a;
      dbg[i * 4 + 3] = 255;
    }
    res.parts = K.resample(K.toCanvas(dbg, W, H), 0.5).toDataURL('image/png');
  }
  return res;
}
