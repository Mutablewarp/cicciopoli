/**
 * Cut-out pipeline of a LINE-ART shirt print (runs in the page, see tuma-kit.mjs runInPage): used by tuma.mjs.
 * The print's line art is kept exactly (it becomes the ink) and its closed paper regions are filled with
 * natural colours: crop -> x`work` (-> `unsharp`) -> line / paper by darkness -> despeckle (+ `close` strokes)
 * -> paper regions (4-connected) ->
 * the item = its paper regions inside `poly` (minus `skip` seeds) + the lines within `reach` of them + the
 * solid fills they enclose (moustache, lenses), minus the shirt showing through closed loops (`holes`) ->
 * every paper region gets the colour of its seed (or the part's default), a `solid` coral fill its colour ->
 * rig layers (splitLayers).
 */
export function buildLineArt(PX, s, imgs) {
  const img = imgs[0];
  const out = { files: {}, iou: {}, size: {}, debug: {} };
  for (const it of s.items) {
    const K = s.work;
    const { crop } = it;
    const W = crop.w * K;
    const H = crop.h * K;
    const src = PX.crop(img, crop.x, crop.y, crop.w, crop.h, K);
    const px = PX.pixels(src);
    if (it.unsharp) {
      // unsharp mask (radius, amount): the photo blur closes the gaps between close lines; this reopens them
      const [ur, ua] = it.unsharp;
      for (let c = 0; c < 3; c++) {
        const ch = Float32Array.from({ length: W * H }, (_, i) => px.d[i * 4 + c]);
        const bl = PX.blur(ch, W, H, Math.round(ur * K));
        for (let i = 0; i < ch.length; i++) px.d[i * 4 + c] = ch[i] + ua * (ch[i] - bl[i]);
      }
    }
    const line = PX.mode(PX.lineMask(px, Math.round(s.line.r * K), s.line.low, s.line.frac), W, H, 1, 1, 2);
    if (it.close) {
      // short ink strokes (crop px) that close a gap the photo blur opened in a line of the print
      const c = PX.canvas(W, H);
      const g = PX.ctx2d(c);
      g.lineWidth = s.closeW * K;
      g.lineCap = 'round';
      for (const [x1, y1, x2, y2] of it.close) {
        g.beginPath();
        g.moveTo(x1 * K, y1 * K);
        g.lineTo(x2 * K, y2 * K);
        g.stroke();
      }
      const d = g.getImageData(0, 0, W, H).data;
      for (let i = 0; i < line.length; i++) if (d[i * 4 + 3] > 127) line[i] = 1;
    }
    // paper regions: id per pixel (0 = line)
    const { id, area } = PX.label(W, H, (i) => !line[i]);
    const n = area.length - 1;
    // region under a point (a point on a line snaps to the nearest region within 2 crop px)
    const at = ([x, y]) => {
      for (let r = 0; r <= 2 * K; r++)
        for (let dy = -r; dy <= r; dy++)
          for (let dx = -r; dx <= r; dx++) {
            const v = id[Math.round(y * K + dy) * W + Math.round(x * K + dx)];
            if (v) return v;
          }
      return 0;
    };
    const poly = PX.polyMask(W, H, [it.poly], K);
    const inside = new Int32Array(n + 1);
    for (let i = 0; i < id.length; i++) if (poly[i]) inside[id[i]]++;
    // `holes`: the shirt seen through a closed loop of the drawing (between chair bars): never kept, transparent
    const skip = new Set([...(it.skip ?? []), ...(it.holes ?? [])].map(at));
    const keep = new Uint8Array(n + 1);
    for (let r = 1; r <= n; r++) keep[r] = inside[r] > area[r] * 0.5 && !skip.has(r) && area[r] >= (s.minArea ?? 3) * K * K ? 1 : 0;
    for (const r of PX.border(W, H).map((i) => id[i])) keep[r] = 0;
    const paper = id.map((r) => (keep[r] ? 1 : 0));
    const reach = PX.dilate(paper, W, H, Math.round(it.reach * K));
    const m0 = paper.map((v, i) => (v || (line[i] && reach[i])) && poly[i] ? 1 : 0);
    const seedsOut = [...PX.border(W, H), ...(it.holes ?? []).map(([x, y]) => Math.round(y * K) * W + Math.round(x * K))];
    const outside = PX.flood(W, H, seedsOut, (i) => !m0[i]);
    const m1 = outside.map((v) => 1 - v);

    // colours: seeded regions, else the default of the part polygon the region's pixels fall in (front-most)
    const colour = new Map();
    for (const [x, y, c] of it.seeds ?? []) {
      const r = at([x, y]);
      if (!keep[r]) console.log(`${it.name}: seed ${x},${y} is not on a kept region`);
      if (colour.has(r) && colour.get(r) !== c) console.log(`${it.name}: seed ${x},${y} recolours a region (was ${colour.get(r)})`);
      colour.set(r, c);
    }
    const defaults = it.parts.map((p) => ({ c: p.fill, m: p.poly || p.polys ? PX.polyMask(W, H, p.polys ?? [p.poly], K) : null }));
    const ink = PX.hex(s.ink);
    // `solid`: the print's solid coral fills inside these polygons are the background seen through gaps, not ink
    const solid = new Map();
    if (it.solid) {
      const core = PX.erode(line, W, H, Math.round(s.solidInset * K));
      for (const { poly: sp, colour: sc } of it.solid) {
        const m = PX.polyMask(W, H, [sp], K);
        for (let i = 0; i < m.length; i++) if (m[i] && core[i]) solid.set(i, sc);
      }
    }
    const full = new Uint8ClampedArray(W * H * 4);
    for (let i = 0; i < m1.length; i++) {
      if (!m1[i]) continue;
      let c = solid.get(i) ?? s.ink;
      if (!line[i]) {
        c = colour.get(id[i]);
        if (!c) for (let k = defaults.length - 1; k >= 0; k--) if (!defaults[k].m || defaults[k].m[i]) {
          c = defaults[k].c;
          break;
        }
      }
      const h = c === s.ink ? ink : PX.hex(c);
      full.set([h[0], h[1], h[2], 255], i * 4);
    }
    if (it.mirrorTop) {
      // complete a part hidden by something in front: the rows above `below` mirror the right of `axis` to the left
      const ax = Math.round(it.mirrorTop.axis * K);
      for (let y = 0; y < Math.round(it.mirrorTop.below * K); y++)
        for (let x = 0; x < ax; x++) {
          const i = y * W + x;
          const j = y * W + Math.min(W - 1, 2 * ax - x);
          full.set(full.subarray(j * 4, j * 4 + 4), i * 4);
          m1[i] = m1[j];
        }
    }
    const used = new Set([s.ink, ...it.parts.map((p) => p.fill), ...(it.seeds ?? []).map((q) => q[2]), ...(it.solid ?? []).map((q) => q.colour)]);
    const sub = { ...s, crop, parts: it.parts, paint: {} };
    const res = splitLayers(PX, { s: sub, crop, K, img, src, full, m1, m2: m1, flat: [...used].map(PX.hex), openColor: s.ink, regions: id, debug: {} });
    for (const [k, v] of Object.entries(res.files)) out.files[it.parts.length > 1 ? `${it.name}-${k}` : it.name] = v;
    out.iou[it.name] = res.iou;
    out.size[it.name] = res.size;
    if (res.sheet) out.sheet = out.sheet ?? res.sheet;
    const gridOn = (c) => {
      const g = PX.ctx2d(c);
      g.font = '12px sans-serif';
      for (let x = 0; x <= crop.w; x += 10) {
        g.strokeStyle = x % 50 ? 'rgba(0,120,255,0.25)' : 'rgba(0,0,255,0.7)';
        g.beginPath();
        g.moveTo(x * K, 0);
        g.lineTo(x * K, H);
        g.stroke();
        g.fillStyle = '#00f';
        g.fillText(String(x), x * K + 1, 11);
      }
      for (let y = 0; y <= crop.h; y += 10) {
        g.strokeStyle = y % 50 ? 'rgba(0,120,255,0.25)' : 'rgba(0,0,255,0.7)';
        g.beginPath();
        g.moveTo(0, y * K);
        g.lineTo(W, y * K);
        g.stroke();
        g.fillStyle = '#00f';
        g.fillText(String(y), 1, y * K - 1);
      }
    };
    if (s.wantDebug) {
      // paper regions in random colours + a crop-px grid, to pick seeds
      const c = PX.canvas(W, H);
      const g = PX.ctx2d(c);
      const d = new Uint8ClampedArray(W * H * 4);
      const hue = (r) => [(r * 97) % 200 + 40, (r * 57) % 200 + 40, (r * 151) % 200 + 40];
      for (let i = 0; i < id.length; i++) {
        const col = line[i] ? [120, 30, 20] : keep[id[i]] ? hue(id[i]) : [235, 235, 235];
        d.set([...col, m1[i] || line[i] ? 255 : 120], i * 4);
      }
      g.putImageData(new ImageData(d, W, H), 0, 0);
      gridOn(c);
      out.debug[`${it.name}-regions.png`] = c.toDataURL('image/png');
      const flat = PX.toCanvas({ w: W, h: H, d: full });
      gridOn(flat);
      out.debug[`${it.name}-flatgrid.png`] = flat.toDataURL('image/png');
      Object.assign(out.debug, Object.fromEntries(Object.entries(res.debug ?? {}).map(([k, v]) => [`${it.name}-${k}`, v])));
    }
  }
  return out;
}
