/**
 * Page-side region splitter of the BOSS-A cut-out toolkit (brie-cut.mjs injects it after its own page
 * library; stringified, so it only uses window.CUT): assigns the enclosed regions of a quantised shirt crop
 * and their ink to the animation parts, and draws the part map for debugging.
 */
export function pageSeg() {
  const CUT = window.CUT;
  const { canvas, inPoly } = CUT;

  /**
   * Parts, front to back: { name, seeds: [[x, y]], comps?: [region id], within?: [poly], without?: [poly], bonus?: px }.
   * A region belongs to the first part with a seed in it; the ink goes to the nearest part region (a part
   * may only take pixels inside `within` and outside `without`; `bonus` = extra reach of a front part).
   * Regions touching the crop border, of a `bgLabels` label (when >= `bgMinArea` crop px) or holding a
   * `bgSeeds` point are background.
   */
  CUT.segment = (S, cfg) => {
    const { W, H, U, comp, lab } = S;
    const owner = new Int32Array(S.ncomp).fill(-1);
    const isBg = new Uint8Array(S.ncomp);
    for (let x = 0; x < W; x++) for (const y of [0, H - 1]) if (comp[y * W + x] >= 0) isBg[comp[y * W + x]] = 1;
    for (let y = 0; y < H; y++) for (const x of [0, W - 1]) if (comp[y * W + x] >= 0) isBg[comp[y * W + x]] = 1;
    // a region of a background colour counts only when it is big and fat (not an anti-aliasing halo)
    const area = new Int32Array(S.ncomp);
    const inner = new Int32Array(S.ncomp);
    for (let p = W; p < W * H - W; p++) {
      const c = comp[p];
      if (c < 0) continue;
      area[c]++;
      if (comp[p - 1] === c && comp[p + 1] === c && comp[p - W] === c && comp[p + W] === c) inner[c]++;
    }
    const minArea = (cfg.bgMinArea ?? 0) * U * U;
    for (let p = 0; p < W * H; p++) {
      const c = comp[p];
      if (c >= 0 && cfg.bgLabels.includes(lab[p]) && area[c] >= minArea && inner[c] > area[c] * 0.6) isBg[c] = 1;
    }
    const at = ([x, y]) => comp[Math.round(y * U) * W + Math.round(x * U)];
    for (const s of cfg.bgSeeds ?? []) if (at(s) >= 0) isBg[at(s)] = 1;
    cfg.parts.forEach((pt, i) => {
      for (const s of pt.seeds) {
        const c = at(s);
        if (c >= 0 && owner[c] < 0) owner[c] = i;
      }
      for (const c of pt.comps ?? []) if (owner[c] < 0 && !isBg[c]) owner[c] = i;
    });
    // every remaining fat region goes to the fallback part (thin anti-aliasing halos stay free for the ink)
    // (only outside the other parts' `within` areas, which their own ink spreading fills)
    if (cfg.fallback !== undefined) {
      const fenced = cfg.parts.flatMap((pt, i) => (i === cfg.fallback ? [] : pt.within ?? []));
      const cents = CUT.centroids(S);
      for (let c = 0; c < S.ncomp; c++) {
        if (owner[c] >= 0 || isBg[c] || area[c] < (cfg.fallbackMin ?? 30) * U * U || inner[c] <= area[c] * 0.5) continue;
        if (!fenced.some((poly) => inPoly(poly, cents[c].x, cents[c].y))) owner[c] = cfg.fallback;
      }
    }
    const allowed = (i, p) => {
      const pt = cfg.parts[i];
      const x = (p % W) / U;
      const y = ((p / W) | 0) / U;
      if (pt.within && !pt.within.some((poly) => inPoly(poly, x, y))) return false;
      if (pt.without && pt.without.some((poly) => inPoly(poly, x, y))) return false;
      return true;
    };
    // multi-source BFS from every owned region over the free pixels (ink, halos, unowned regions, and the
    // pixels of a region outside its owner's area); bucket queue: front parts start ahead by `bonus`
    const part = new Int16Array(W * H).fill(-1);
    const dist = new Float32Array(W * H).fill(1e9);
    const isSrc = new Uint8Array(W * H);
    const buckets = [];
    const push = (p, d) => {
      const b = Math.max(0, Math.round(d));
      (buckets[b] ??= []).push(p);
    };
    const maxBonus = Math.max(0, ...cfg.parts.map((p) => (p.bonus ?? 0) * U));
    for (let p = 0; p < W * H; p++) {
      const c = comp[p];
      if (c < 0 || isBg[c] || owner[c] < 0 || !allowed(owner[c], p)) continue;
      isSrc[p] = 1;
      part[p] = owner[c];
      dist[p] = maxBonus - (cfg.parts[owner[c]].bonus ?? 0) * U;
      push(p, dist[p]);
    }
    for (let b = 0; b < buckets.length; b++) {
      const list = buckets[b];
      if (!list) continue;
      for (let li = 0; li < list.length; li++) {
        const p = list[li];
        if (dist[p] < b) continue;
        const x = p % W;
        const y = (p / W) | 0;
        const nb = [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, y > 0 ? p - W : -1, y < H - 1 ? p + W : -1];
        for (const q of nb) {
          if (q < 0 || dist[q] <= b + 1 || isSrc[q]) continue;
          const cq = comp[q];
          if ((cq >= 0 && isBg[cq]) || !allowed(part[p], q)) continue;
          dist[q] = b + 1;
          part[q] = part[p];
          push(q, b + 1);
        }
      }
    }
    S.part = part;
    S.owner = owner;
    S.isBg = isBg;
    // regions inside the character that no part claimed (to fix in the job: add a seed or a bg seed)
    const orphans = [];
    const seenC = new Uint8Array(S.ncomp);
    for (let p = 0; p < W * H; p++) {
      const c = comp[p];
      if (c < 0 || isBg[c] || part[p] >= 0 || seenC[c]) continue;
      seenC[c] = 1;
      orphans.push([Math.round((p % W) / U), Math.round(((p / W) | 0) / U)]);
    }
    return orphans;
  };

  /** Part map as a colour-coded image (debug), orphans in magenta. */
  CUT.debug = (S, colors) => {
    const { W, H } = S;
    const c = canvas(W, H);
    const g = c.getContext('2d');
    const id = g.createImageData(W, H);
    for (let p = 0; p < W * H; p++) {
      const k = S.part[p];
      const orphan = S.comp[p] >= 0 && !S.isBg[S.comp[p]] && k < 0;
      const col = orphan ? [255, 0, 255] : k >= 0 ? colors[k % colors.length] : [S.rgb[p * 4] * 0.35 + 160, S.rgb[p * 4 + 1] * 0.35 + 160, S.rgb[p * 4 + 2] * 0.35 + 160];
      id.data.set([col[0], col[1], col[2], 255], p * 4);
    }
    g.putImageData(id, 0, 0);
    return c;
  };
}
