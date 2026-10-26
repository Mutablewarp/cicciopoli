/**
 * Cut-out pipeline of a COLOUR sticker print (runs in the page, see tuma-kit.mjs runInPage): used by happy.mjs.
 * crop -> x`work` -> two-colour model on the print's palette (PX.project: flat areas come out clean, edges keep
 * their anti-aliasing, thin lines and the lettering keep their shape) with the paint palette swapped in -> the
 * black shirt goes transparent outside the white sticker ring (kept, as on the shirt) with a thin ink edge
 * around it -> rig layers + IoU proof (tuma-cut.mjs splitLayers).
 */
export function buildCutout(PX, s, imgs) {
  const { crop, work: K } = s;
  const W = crop.w * K;
  const H = crop.h * K;
  const src = PX.crop(imgs[0], crop.x, crop.y, crop.w, crop.h, K);
  const px = PX.pixels(src);
  if (s.unsharp) unsharp(PX, px, s.unsharp[0] * K, s.unsharp[1]);
  const names = Object.keys(s.palette);
  const allow = names.map((n) => (s.only[n] ? PX.polyMask(W, H, s.only[n], K) : null));
  const { a, b, t } = PX.project(px, names.map((n) => s.palette[n]), allow);

  // the white sticker ring decides inside / outside (raw pixels, dilated so the flood never leaks through it)
  const cut = PX.polyMask(W, H, s.cuts, K);
  const white = new Uint8Array(W * H);
  for (let i = 0; i < white.length; i++) {
    const r = px.d[i * 4];
    const g = px.d[i * 4 + 1];
    const bl = px.d[i * 4 + 2];
    white[i] = Math.min(r, g, bl) > s.whiteMin && Math.max(r, g, bl) - Math.min(r, g, bl) < 60 ? 1 : 0;
  }
  const wd = PX.dilate(white, W, H, s.ringPad);
  const holes = s.holes.map(([x, y]) => Math.round(y * K) * W + Math.round(x * K));
  const seeds = [...PX.border(W, H), ...holes];
  // cut regions are outside but never let the flood through (a cut can open the ring)
  const outside = PX.flood(W, H, seeds, (i) => !cut[i] && !wd[i]).map((v, i) => v | cut[i]);
  const c0 = Math.round(s.centre[1] * K) * W + Math.round(s.centre[0] * K);
  const paint = names.map((n) => PX.hex(s.paint[n]));
  const wi = names.indexOf('white');
  const whiteness = (i) => (a[i] === wi ? 1 - t[i] : 0) + (b[i] === wi ? t[i] : 0);
  // the mascot = what the ring encloses (its eyes, teeth, letters too), minus the shirt seen through its loops
  const reach = PX.flood(W, H, [c0], (i) => !outside[i] && whiteness(i) < 0.5);
  const core = PX.smoothMask(PX.flood(W, H, seeds, (i) => !reach[i]).map((v) => 1 - v), W, H, Math.round(s.smooth * K));
  // a clean sticker: an even ink line round the mascot, the white ring, a thin ink edge outside it
  const inner = PX.erode(core, W, H, Math.round(s.edge * K));
  const edge = core.map((v, i) => (v && !inner[i] ? 1 : 0));
  const m1 = PX.smoothMask(PX.dilate(core, W, H, Math.round(s.ring * K)), W, H, Math.round(s.smooth * K));
  const m2 = PX.smoothMask(PX.dilate(m1, W, H, Math.round(s.outline * K)), W, H, Math.round(s.smooth * K));

  const ink = PX.hex(s.paint.ink);
  const ring = PX.hex(s.paint.white);
  const [lo, hi] = s.sharp;
  const full = new Uint8ClampedArray(W * H * 4);
  for (let i = 0; i < m2.length; i++) {
    if (!m2[i]) continue;
    if (!core[i] || edge[i]) {
      const c = m1[i] && !core[i] ? ring : ink;
      full.set([c[0], c[1], c[2], 255], i * 4);
      continue;
    }
    // a little crisper than the photo: the mix ramps over [lo, hi] instead of [0, 1]
    const u = Math.max(0, Math.min(1, (t[i] - lo) / (hi - lo)));
    const v = u * u * (3 - 2 * u);
    const A = paint[a[i]];
    const B = paint[b[i]];
    full.set([A[0] + (B[0] - A[0]) * v, A[1] + (B[1] - A[1]) * v, A[2] + (B[2] - A[2]) * v, 255], i * 4);
  }
  // `minus`: a part never takes the pixels of these colours (+ pad crop px), e.g. the lid leaves the box blue
  const parts = s.parts.map((p) => {
    if (!p.minus) return p;
    const k = names.indexOf(p.minus.colour);
    const col = new Uint8Array(W * H);
    for (let i = 0; i < col.length; i++) col[i] = (a[i] === k && t[i] < 0.5) || (b[i] === k && t[i] >= 0.5) ? 1 : 0;
    const near = PX.dilate(PX.smoothMask(col, W, H, K), W, H, Math.round(p.minus.pad * K));
    const poly = PX.polyMask(W, H, [p.poly], K);
    return { ...p, mask: poly.map((v, i) => (v && !near[i] ? 1 : 0)) };
  });

  const flat = Object.values(s.paint).map(PX.hex);
  const dbg = { 'mask.png': PX.toCanvas(PX.paint(outside.map((v, i) => (v ? 1 : core[i] ? 0 : 2)), W, H, ['#000000', '#3060ff', '#ff3030'])).toDataURL('image/png') };
  return splitLayers(PX, { s: { ...s, parts }, crop, K, img: imgs[0], src, full, m1, m2, core, refMask: PX.flood(W, H, [c0], (i) => !outside[i]), flat, ink: s.paint.ink, white: s.paint.white, openColor: s.inside, debug: dbg });
}

/** Unsharp mask (radius work px, amount) in place: the print's thin lines (teeth, letter edges) come back from the photo blur. */
export function unsharp(PX, px, r, amount) {
  const n = px.w * px.h;
  for (let c = 0; c < 3; c++) {
    const ch = Float32Array.from({ length: n }, (_, i) => px.d[i * 4 + c]);
    const bl = PX.blur(ch, px.w, px.h, Math.round(r));
    for (let i = 0; i < n; i++) px.d[i * 4 + c] = ch[i] + amount * (ch[i] - bl[i]);
  }
}
