/**
 * Rig layers of a cut-out shirt print (runs in the page, see tuma-kit.mjs runInPage): used by happy-cut.mjs and
 * tuma-line.mjs.
 */

/**
 * Splits a flat colour image (work scale) into the rig layers of `s.parts` (front-most polygon wins), inpaints
 * what moving parts uncover, writes each layer at x`s.out` (WebP) and proves the rig at rest against the
 * reference silhouette m1 (IoU + optional contact sheet / debug maps).
 */
export function splitLayers(PX, o) {
  const { s, crop, K, full, m1, m2, flat } = o;
  const W = crop.w * K;
  const H = crop.h * K;
  // split into layers (front-most polygon wins), inpaint what moving parts uncover
  // a part's shape: `poly`, or several polygons `polys`, or a ready `mask`; none = the rest
  const parts = s.parts.map((p) => ({ ...p, mask: p.mask ?? (p.poly || p.polys ? PX.polyMask(W, H, p.polys ?? [p.poly], K) : null) }));
  const owner = new Int8Array(W * H).fill(-1);
  const bodyAt = parts.findIndex((p) => !p.mask);
  for (let i = 0; i < owner.length; i++) {
    if (!m2[i]) continue;
    owner[i] = bodyAt;
    for (let k = parts.length - 1; k >= 0; k--) if (parts[k].mask && parts[k].mask[i]) {
      owner[i] = k;
      break;
    }
  }
  if (o.regions) {
    // line art: a closed paper region moves as one piece, with the part that holds most of it
    const votes = new Map();
    for (let i = 0; i < owner.length; i++) {
      const r = o.regions[i];
      if (!r || owner[i] < 0) continue;
      const v = votes.get(r) ?? new Int32Array(parts.length);
      v[owner[i]]++;
      votes.set(r, v);
    }
    const best = new Map([...votes].map(([r, v]) => [r, v.indexOf(Math.max(...v))]));
    for (let i = 0; i < owner.length; i++) if (o.regions[i] && owner[i] >= 0) owner[i] = best.get(o.regions[i]);
  }
  if (o.core) {
    // sticker: a ring / edge pixel goes with the nearest part of the mascot (an arm takes its own ring along)
    let front = [];
    const got = new Uint8Array(W * H);
    for (let i = 0; i < got.length; i++) if (o.core[i] && owner[i] >= 0) (got[i] = 1), front.push(i);
    while (front.length) {
      const next = [];
      for (const i of front) {
        const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
          if (j < 0 || j >= got.length || got[j] || !m2[j]) continue;
          got[j] = 1;
          owner[j] = owner[i];
          next.push(j);
        }
      }
      front = next;
    }
  }
  if (o.core && parts.some((p) => p.sticker)) {
    // a ring two parts share (closed between them, not along the outline): each keeps the even band of its own
    // white ring, the front one where both reach (the same white at rest); a `sticker` back part gets its whole
    // ring under the front one (below), so when they move apart neither shows half a ring, a jagged edge or a cut
    // (smoothed: the ring's edge runs even past the nicks of the mascot's outline)
    const ringOf = (m, f) => PX.smoothMask(PX.dilate(m, W, H, Math.round(s.ring * K * f)), W, H, K);
    const cores = parts.map((_, k) => owner.map((v, i) => (v === k && o.core[i] ? 1 : 0)));
    const reach = cores.map((m) => ringOf(m, 1));
    // the inner half of a part's ring stays its own (a front part never bites into it)
    const inner = cores.map((m) => ringOf(m, 0.5));
    const edge = PX.dilate(m2.map((v) => 1 - v), W, H, Math.round((s.ring + s.outline) * K));
    for (let i = 0; i < owner.length; i++) {
      const was = owner[i];
      if (was < 0 || o.core[i]) continue;
      let top = parts.length - 1;
      while (top >= 0 && !reach[top][i]) top--;
      // along the outline a front part never takes a back part's ring (it would carry off a sliver of it)
      if (top >= 0 && top !== was && parts[Math.min(top, was)].sticker && !(top > was && (edge[i] || inner[was][i]))) owner[i] = top;
    }
  }
  const snap = (img, hole) => {
    for (let i = 0; i < hole.length; i++) {
      if (!hole[i]) continue;
      let best = flat[0];
      let bd = Infinity;
      for (const c of flat) {
        const d = (img.d[i * 4] - c[0]) ** 2 + (img.d[i * 4 + 1] - c[1]) ** 2 + (img.d[i * 4 + 2] - c[2]) ** 2;
        if (d < bd) (bd = d), (best = c);
      }
      img.d.set(best, i * 4);
    }
    return img;
  };
  // a layer runs a little under the layers in front of it: their resampled edges never let the background
  // (or a red canvas behind) show through as a hairline seam
  const seam = Math.ceil((K / s.out) * 1.5);
  const layer = (k) => {
    const d = new Uint8ClampedArray(W * H * 4);
    const own = owner.map((v) => (v === k ? 1 : 0));
    const near = PX.dilate(own, W, H, seam);
    for (let i = 0; i < owner.length; i++) if (own[i] || (near[i] && owner[i] > k)) d.set(full.subarray(i * 4, i * 4 + 4), i * 4);
    return { w: W, h: H, d };
  };
  const files = {};
  const layers = [];
  parts.forEach((p, k) => {
    let img = layer(k);
    let hole = null;
    if (p.under?.length) {
      // this layer continues beneath the parts in front of it there (no gap when they move)
      const u = PX.polyMask(W, H, p.under, K);
      hole = u.map((v, i) => (v && m2[i] && owner[i] > k ? 1 : 0));
      if (p.underFill) {
        const c = PX.hex(p.underFill);
        for (let i = 0; i < hole.length; i++) if (hole[i]) img.d.set([c[0], c[1], c[2], 255], i * 4);
      } else img = snap(PX.inpaint(img, hole), hole);
      if (p.rim) {
        // the hidden continuation gets its own ink edge (seen only when the part moves)
        const inner = PX.erode(u.map((v, i) => (v || owner[i] === k ? 1 : 0)), W, H, Math.round(s.rim * K));
        const ink = PX.hex(o.ink ?? o.openColor);
        for (let i = 0; i < hole.length; i++) if (hole[i] && !inner[i]) img.d.set([ink[0], ink[1], ink[2], 255], i * 4);
      }
    }
    if (p.inkEdge) {
      // where the cut runs through the print's flat colour (no line there), the part gets a thin ink edge
      const other = owner.map((v, i) => (v >= 0 && v !== k && o.core[i] ? 1 : 0));
      const near = PX.smoothMask(PX.dilate(other, W, H, Math.round(s.edge * K)), W, H, 1);
      const ink = PX.hex(o.ink);
      for (let i = 0; i < owner.length; i++) if (near[i] && owner[i] === k && o.core[i]) img.d.set([ink[0], ink[1], ink[2], 255], i * 4);
    }
    if (p.sticker) {
      // the part's own sticker edge (white ring, thin ink outline) round its shape = its mascot pixels + its
      // continuation, painted where a front part covers it at rest: seen only when they move apart
      const shape = owner.map((v, i) => ((v === k && o.core[i]) || hole?.[i] ? 1 : 0));
      const r1 = PX.smoothMask(PX.dilate(shape, W, H, Math.round(s.ring * K)), W, H, K);
      const r2 = PX.smoothMask(PX.dilate(r1, W, H, Math.round(s.outline * K)), W, H, K);
      const white = PX.hex(o.white);
      const ink = PX.hex(o.ink);
      for (let i = 0; i < owner.length; i++) {
        if (owner[i] <= k || shape[i] || !r2[i]) continue;
        const c = r1[i] ? white : ink;
        img.d.set([c[0], c[1], c[2], 255], i * 4);
      }
    }
    if (p.open) {
      // the inside of the box under the lid (seen when the lid lifts)
      const om = PX.polyMask(W, H, [p.open], K);
      const c = PX.hex(o.openColor);
      for (let i = 0; i < om.length; i++) if (om[i] && (img.d[i * 4 + 3] === 0 || owner[i] !== k)) img.d.set([c[0], c[1], c[2], 255], i * 4);
    }
    const c = PX.resize(PX.toCanvas(img), crop.w * s.out, crop.h * s.out);
    layers.push(c);
    files[p.name] = c.toDataURL('image/webp', s.quality ?? 0.9);
  });

  // proof: the rig at rest vs the reference silhouette (the print's own, when the cut-out redraws its edge)
  const ow = Math.round(crop.w * s.out);
  const oh = Math.round(crop.h * s.out);
  const comp = PX.canvas(ow, oh);
  const g = PX.ctx2d(comp);
  for (const c of layers) g.drawImage(c, 0, 0);
  const refSil = PX.resize(PX.toCanvas(PX.paint(o.refMask ?? m1, W, H, [null, '#000000'])), ow, oh);
  const iou = PX.iou(comp, refSil);
  const out = { files, iou, size: [ow, oh] };
  if (s.wantSheet) out.sheet = sheetOf(PX, PX.crop(o.img, crop.x, crop.y, crop.w, crop.h, s.out), comp, refSil, iou);
  if (s.wantDebug) {
    const map = PX.canvas(W, H);
    const mg = PX.ctx2d(map);
    mg.drawImage(o.src, 0, 0);
    const tint = ['#ff0', '#0f0', '#f0f', '#0ff', '#f80', '#88f', '#f00'];
    const d = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < owner.length; i++) {
      const t = owner[i] >= 0 && owner[i] !== bodyAt ? tint[owner[i] % tint.length] : null;
      if (!t) continue;
      const [r, gg, b] = PX.hex(t.length === 4 ? `#${t[1]}${t[1]}${t[2]}${t[2]}${t[3]}${t[3]}` : t);
      d.set([r, gg, b, 90], i * 4);
    }
    mg.drawImage(PX.toCanvas({ w: W, h: H, d }), 0, 0);
    out.debug = { ...o.debug, 'parts.png': map.toDataURL('image/png'), 'flat.png': PX.toCanvas({ w: W, h: H, d: full }).toDataURL('image/png') };
  }
  return out;
}

/** Contact sheet: reference crop | sprite on a neutral ground | overlay (sprite 55 % over the reference, edges). */
export function sheetOf(PX, ref, comp, refSil, iou) {
  const w = ref.width;
  const h = ref.height;
  const c = PX.canvas(w * 3 + 40, h + 50);
  const g = PX.ctx2d(c);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(ref, 10, 40);
  g.fillStyle = '#8a8f96';
  g.fillRect(w + 20, 40, w, h);
  g.drawImage(comp, w + 20, 40);
  g.drawImage(ref, w * 2 + 30, 40);
  g.globalAlpha = 0.55;
  g.drawImage(comp, w * 2 + 30, 40);
  g.globalAlpha = 1;
  const edge = (cv, color) => {
    const p = PX.pixels(cv);
    const d = new Uint8ClampedArray(p.d.length);
    const a = (x, y) => p.d[(y * p.w + x) * 4 + 3] > 127;
    for (let y = 1; y < p.h - 1; y++)
      for (let x = 1; x < p.w - 1; x++) if (a(x, y) && (!a(x - 1, y) || !a(x + 1, y) || !a(x, y - 1) || !a(x, y + 1))) d.set([...PX.hex(color), 255], (y * p.w + x) * 4);
    return PX.toCanvas({ w: p.w, h: p.h, d });
  };
  g.drawImage(edge(refSil, '#00c8ff'), w * 2 + 30, 40);
  g.drawImage(edge(comp, '#ff2020'), w * 2 + 30, 40);
  g.fillStyle = '#000';
  g.font = 'bold 20px sans-serif';
  g.fillText('reference crop', 14, 28);
  g.fillText('game sprite (rig at rest)', w + 24, 28);
  g.fillText(`overlay  IoU ${iou.toFixed(3)}  (cyan ref, red sprite)`, w * 2 + 34, 28);
  return c.toDataURL('image/png');
}
