/* Browser-side cut-out kit of the BOSS-D lane, injected after burgergang-px.mjs: window.BGCUT. Splits the cleaned
 * character (label map + keep mask, label px = orig px * up; the labels choose the parts, the colours are the
 * shirt's own pixels) into animation parts, paints what each moving part uncovers, downsamples and packs the parts
 * into one atlas. Every number comes from the SPEC in burgergang.mjs. */
(() => {
  const X = window.BGPX;

  /** Mask of one part: a polygon, optionally narrowed to labels, or seeded floods grown into their outline. */
  function partMask(L, keep, w, h, part, toPx, idx) {
    const inPoly = X.polyMask(w, h, toPx(part.poly));
    const only = part.labels ? new Set(part.labels.map(idx)) : null;
    const m = new Uint8Array(w * h);
    if (!part.seeds) {
      for (let i = 0; i < w * h; i++) m[i] = keep[i] && inPoly[i] && (!only || only.has(L[i])) ? 1 : 0;
      return m;
    }
    const fl = new Set(part.flood.map(idx));
    const seeds = toPx(part.seeds).map(([x, y]) => Math.round(y) * w + Math.round(x));
    const core = X.flood(w, h, seeds, (i) => keep[i] && inPoly[i] && fl.has(L[i]));
    // plus every pixel of the `labels` colours in the polygon (bits the floods cannot reach)
    if (only) for (let i = 0; i < w * h; i++) if (keep[i] && inPoly[i] && only.has(L[i])) core[i] = 1;
    const grow = new Set(part.grow.labels.map(idx));
    const D = X.distance(core, w, h);
    for (let i = 0; i < w * h; i++) m[i] = keep[i] && inPoly[i] && (core[i] || (D[i] <= part.grow.px && grow.has(L[i]))) ? 1 : 0;
    // plus a fringe of any colour (the print's soft edge would stay behind as a ghost outline when the part moves)
    if (part.fringe) {
      const F = X.distance(m, w, h);
      for (let i = 0; i < w * h; i++) if (keep[i] && inPoly[i] && F[i] <= part.fringe) m[i] = 1;
    }
    // plus the plain polygon area of `also` (e.g. the shoe under a leg)
    for (const extra of part.also ?? []) {
      const am = X.polyMask(w, h, toPx(extra));
      for (let i = 0; i < w * h; i++) if (keep[i] && am[i]) m[i] = 1;
    }
    return m;
  }

  /**
   * Vector paint ops (orig coords, stroke widths in orig px, optional clip polygon) on a context mapped to label px;
   * an op with `inpaint` (colour names) is filled with fillOf(names) instead of a flat `fill`.
   */
  function paintOps(g, ops, hexOf, fillOf) {
    g.lineJoin = 'round';
    g.lineCap = 'round';
    for (const op of ops) {
      g.save();
      if (op.clip) {
        g.beginPath();
        op.clip.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.clip();
      }
      g.beginPath();
      if (op.ellipse) g.ellipse(op.ellipse[0], op.ellipse[1], op.ellipse[2], op.ellipse[3], 0, 0, Math.PI * 2);
      else op.pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      if (op.close) g.closePath();
      if (op.fill || op.inpaint) {
        g.fillStyle = op.inpaint ? fillOf(op.inpaint) : hexOf(op.fill);
        g.fill();
      }
      for (const [col, wd] of op.strokes ?? []) {
        g.strokeStyle = hexOf(col);
        g.lineWidth = wd;
        g.stroke();
      }
      g.restore();
    }
  }

  /**
   * Cut every part: topmost part first claims its pixels, `body` gets the rest; colours from `rgba` (the cleaned
   * print, RGBA per label px); `under` paint goes beneath each part where a part with a higher z (drawn in front)
   * hides it. Returns [{ name, canvas, box } (label px)].
   */
  function cutParts(L, keep, w, h, spec, palette, rgba) {
    const idx = (name) => {
      const i = spec.names.indexOf(name);
      if (i < 0) throw new Error(`unknown colour ${name}`);
      return i;
    };
    const hexOf = (name) => palette[idx(name)];
    const toPx = (pts) => pts.map(([x, y]) => [(x - spec.crop.x) * spec.up, (y - spec.crop.y) * spec.up]);
    const owner = new Int8Array(w * h).fill(-1);
    spec.parts.forEach((part, p) => {
      if (part.name === 'body') return;
      const m = partMask(L, keep, w, h, part, toPx, idx);
      for (let i = 0; i < w * h; i++) if (m[i] && owner[i] < 0) owner[i] = p;
    });
    const bodyZ = spec.parts.find((part) => part.name === 'body').z;
    return spec.parts.map((part, p) => {
      const mine = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) mine[i] = keep[i] && (owner[i] === p || (part.name === 'body' && owner[i] < 0)) ? 1 : 0;
      const frontMask = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) frontMask[i] = keep[i] && (owner[i] >= 0 ? spec.parts[owner[i]].z : bodyZ) > part.z ? 1 : 0;
      // bleed: the part's own edge colours run on bleed px under the parts in front (no seam at their soft edges)
      const own = Int32Array.from({ length: w * h }, (_, i) => i);
      let edge = [];
      for (let i = 0; i < w * h; i++) if (mine[i]) edge.push(i);
      for (let r = 0; r < spec.bleed; r++) {
        const next = [];
        for (const i of edge) {
          const x = i % w;
          for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
            if (j < 0 || j >= w * h || mine[j] || !frontMask[j]) continue;
            mine[j] = 2;
            own[j] = own[i];
            next.push(j);
          }
        }
        edge = next;
      }
      const c = X.paintFrom(rgba, own, w, h, mine);
      if (part.under) {
        const u = X.canvas(w, h);
        const g = X.ctx2d(u);
        g.setTransform(spec.up, 0, 0, spec.up, -spec.crop.x * spec.up, -spec.crop.y * spec.up);
        // `inpaint` fills: the part's own visible pixels of those colours (away from their edges, no blend of the
        // ink beside them), run on smoothly under the parts in front
        const r = spec.clean.interior;
        const fillOf = (names) => {
          const only = new Set(names.map(idx));
          const known = mine.map((v, i) => {
            const l = L[i];
            return v === 1 && only.has(l) && L[i - r] === l && L[i + r] === l && L[i - r * w] === l && L[i + r * w] === l ? 1 : 0;
          });
          const pat = g.createPattern(X.pushPull(rgba, known, w, h), 'no-repeat');
          pat.setTransform(new DOMMatrix([1 / spec.up, 0, 0, 1 / spec.up, spec.crop.x, spec.crop.y]));
          return pat;
        };
        paintOps(g, part.under, hexOf, fillOf);
        // the paint lives only where a part in front hides this one: at rest the part stays the print's own pixels
        const ud = g.getImageData(0, 0, w, h).data;
        const cg = X.ctx2d(c);
        const im = cg.getImageData(0, 0, w, h);
        const cd = im.data;
        for (let i = 0; i < w * h; i++) {
          const a = ud[i * 4 + 3] / 255;
          if (!a || !keep[i]) continue;
          if (!frontMask[i] || mine[i] === 1) continue;
          const b = cd[i * 4 + 3] / 255;
          const oa = a + b * (1 - a);
          for (let ch = 0; ch < 3; ch++) cd[i * 4 + ch] = (ud[i * 4 + ch] * a + cd[i * 4 + ch] * b * (1 - a)) / oa;
          cd[i * 4 + 3] = oa * 255;
        }
        cg.putImageData(im, 0, 0);
      }
      return { name: part.name, canvas: c, box: alphaBox(c) };
    });
  }

  /** Bounding box of the non-transparent pixels. */
  function alphaBox(c) {
    const d = X.ctx2d(c).getImageData(0, 0, c.width, c.height).data;
    let [x0, y0, x1, y1] = [c.width, c.height, -1, -1];
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      if (d[(y * c.width + x) * 4 + 3] < 8) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /**
   * Downsample each part box by s (anti-aliased) and shelf-pack them `pad` px apart into one atlas no wider than
   * maxW. Returns { canvas, rects: { name: { x, y, w, h, ox, oy } } } with ox / oy = the box origin in label px.
   */
  function pack(parts, s, pad, maxW) {
    const tiles = parts.map((p) => {
      const t = X.canvas(p.box.w, p.box.h);
      X.ctx2d(t).drawImage(p.canvas, -p.box.x, -p.box.y);
      return { p, img: X.scaled(t, s) };
    });
    tiles.sort((a, b) => b.img.height - a.img.height);
    let [x, y, row, W] = [pad, pad, 0, 0];
    const rects = {};
    for (const t of tiles) {
      if (x + t.img.width + pad > maxW) {
        x = pad;
        y += row + pad;
        row = 0;
      }
      rects[t.p.name] = { x, y, w: t.img.width, h: t.img.height, ox: t.p.box.x, oy: t.p.box.y };
      t.at = [x, y];
      x += t.img.width + pad;
      row = Math.max(row, t.img.height);
      W = Math.max(W, x);
    }
    const c = X.canvas(W, y + row + pad);
    for (const t of tiles) X.ctx2d(c).drawImage(t.img, t.at[0], t.at[1]);
    return { canvas: c, rects };
  }

  window.BGCUT = { cutParts, pack, paintOps };
})();
