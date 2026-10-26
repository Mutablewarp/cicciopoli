/**
 * In-page builder for a LINE-ART shirt mascot (THE OLD SCHOOL): keeps the shirt's ink exactly (upscaled x s,
 * thresholded with an anti-aliased coverage) and fills its closed regions with natural colours (seed points →
 * region, cel shading), recolours chosen solid-ink zones (the patty, the mouth), splits the result into cut-out
 * parts (seed regions, a polygon for the front fingers), paints what a part hides and inks every edge a cut exposes.
 * Runs inside the Chromium page opened by oldschool-kit.mjs (window.K); returns data URLs and source boxes.
 */
export async function buildLineArt({ cfg, url, debug }) {
  const K = window.K;
  const s = cfg.s;
  const { x: X, y: Y, w, h } = cfg.crop;
  const img = await K.load(url);
  const id = K.upscale(img, X, Y, w, h, s);
  const W = id.width;
  const H = id.height;
  const N = W * H;
  const d = id.data;
  const at = ([x, y]) => Math.round((y - Y) * s) * W + Math.round((x - X) * s);
  const rel = (poly) => poly.map(([x, y]) => [x - X, y - Y]);
  const INK = K.hex(cfg.ink);

  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
  const ink = new Uint8Array(N);
  const cov = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    ink[i] = lum[i] < cfg.inkLum ? 1 : 0;
    cov[i] = Math.min(1, Math.max(0, (cfg.paperLum - lum[i]) / (cfg.paperLum - cfg.solidLum)));
  }

  /** nearest pixel to p (spiral search) for which ok(i) holds */
  const near = (p, ok) => {
    const c = at(p);
    if (ok(c)) return c;
    for (let r = 1; r < 40; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const i = c + dy * W + dx;
          if (i >= 0 && i < N && ok(i)) return i;
        }
      }
    }
    throw new Error(`no pixel near ${p}`);
  };

  // character ink = the biggest ink component, the keep points' components, and every ink inside its outline
  const ic = K.label(ink, W, H);
  let biggest = 1;
  for (let L = 1; L < ic.areas.length; L++) if (ic.areas[L] > ic.areas[biggest]) biggest = L;
  const mainSet = new Set([biggest, ...cfg.keep.map((p) => ic.lab[near(p, (i) => ink[i] === 1)])]);
  const main = new Uint8Array(N);
  for (let i = 0; i < N; i++) main[i] = mainSet.has(ic.lab[i]) ? 1 : 0;
  for (const wall of cfg.walls ?? []) {
    const m = K.strokeMask(W, H, [rel(wall)], 2, s);
    for (let i = 0; i < N; i++) if (m[i]) main[i] = 1;
  }
  const Dm = K.dist(main, W, H);
  const open = new Uint8Array(N);
  for (let i = 0; i < N; i++) open[i] = Dm[i] > cfg.close ? 1 : 0;
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  const bg = K.flood(open, W, H, border);
  const charInk = new Uint8Array(N);
  for (let i = 0; i < N; i++) charInk[i] = (ink[i] && !bg[i]) || (main[i] && !ink[i] && Dm[i] === 0) ? 1 : 0;
  for (let i = 0; i < N; i++) if (charInk[i] && !ink[i]) cov[i] = 1;

  // regions between the character's lines
  const Dc = K.dist(charInk, W, H);
  const freeR = new Uint8Array(N);
  for (let i = 0; i < N; i++) freeR[i] = Dc[i] > cfg.close ? 1 : 0;
  const rl = K.label(freeR, W, H);
  const nR = rl.areas.length;
  const isBg = new Uint8Array(nR);
  for (let i = 0; i < N; i++) if (rl.lab[i] && bg[i]) isBg[rl.lab[i]] = 1;
  const regionOf = (p) => rl.lab[near(p, (i) => rl.lab[i] > 0)];
  const fill = new Array(nR).fill(null);
  for (const [x, y, name] of cfg.regions) fill[regionOf([x, y])] = name;

  // solid ink zones that are food, not lines
  const notInk = charInk.map((v) => 1 - v);
  const Din = K.dist(notInk, W, H);
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) solid[i] = charInk[i] && Din[i] > cfg.solid ? 1 : 0;
  const zones = cfg.solidZones.map((z) => ({ m: K.polyMask(W, H, [rel(z.poly)], s), c: z.color }));
  const solidFill = new Array(N).fill(null);
  for (let i = 0; i < N; i++) {
    if (!charInk[i] || Din[i] <= cfg.solid - 3) continue;
    for (const z of zones) if (z.m[i]) solidFill[i] = z.c;
  }

  // every pixel → its nearest region (colour / outside decision)
  const reg = Int32Array.from(rl.lab);
  K.grow(reg, W, H);
  const detail = cfg.details.map((z) => ({ m: K.polyMask(W, H, [rel(z.poly)], s), c: z.color }));
  const unpainted = [];
  const regionColor = new Array(nR).fill(null);
  for (let L = 1; L < nR; L++) {
    if (isBg[L]) continue;
    if (fill[L]) regionColor[L] = cfg.colors[fill[L]];
    else if (rl.areas[L] < cfg.small) {
      let c = cfg.colors.detail;
      for (let i = 0; i < N; i++) {
        if (rl.lab[i] !== L) continue;
        for (const z of detail) if (z.m[i]) c = z.c;
        break;
      }
      regionColor[L] = c;
    } else {
      regionColor[L] = '#ff00ff';
      for (let i = 0; i < N; i++) if (rl.lab[i] === L) { unpainted.push([Math.round((i % W) / s + X), Math.round(Math.floor(i / W) / s + Y), rl.areas[L]]); break; }
    }
  }

  // parts: big regions decide (hand regions → hand), polygons override, the rest grows to the nearest
  const PART = { burger: 1, arm: 2, handBack: 3, handFront: 4 };
  const names = Object.keys(PART);
  const handSet = new Set(cfg.hand.map(regionOf));
  const armSet = new Set(cfg.arm.map(regionOf));
  const frontM = K.polyMask(W, H, [rel(cfg.handFront)], s);
  const armM = K.polyMask(W, H, [rel(cfg.armLimit)], s);
  const tag = new Int32Array(N);
  for (let i = 0; i < N; i++) {
    const L = rl.lab[i];
    if (L && armSet.has(L)) tag[i] = PART.arm;
    else if (L && !isBg[L] && rl.areas[L] >= cfg.small) tag[i] = handSet.has(L) ? PART.handBack : PART.burger;
    else if (solidFill[i]) tag[i] = PART.burger;
  }
  const outside = new Uint8Array(N);
  for (let i = 0; i < N; i++) outside[i] = isBg[reg[i]] && !charInk[i] && cov[i] < 0.02 ? 1 : 0;
  K.grow(tag, W, H, outside);
  for (let i = 0; i < N; i++) {
    if (!tag[i] || outside[i]) {
      tag[i] = 0;
      continue;
    }
    if (tag[i] === PART.handBack && frontM[i]) tag[i] = PART.handFront;
    else if (tag[i] === PART.arm && !armM[i]) tag[i] = PART.burger;
  }

  // colour: region fill with cel shading, solid zones, ink on top with its coverage
  const rgbOf = new Map();
  const rgb = (c) => {
    if (!rgbOf.has(c)) rgbOf.set(c, K.hex(c));
    return rgbOf.get(c);
  };
  const o = Math.round(cfg.cel.shadow * s);
  const o2 = Math.round(cfg.cel.light * s);
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const color = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    if (!tag[i]) continue;
    const L = reg[i];
    const x = i % W;
    const y = (i / W) | 0;
    let base;
    let a = 1;
    if (isBg[L]) {
      base = INK;
      a = cov[i];
    } else {
      base = rgb(regionColor[L] ?? cfg.colors.detail);
      if (rl.areas[L] >= cfg.small) {
        const dn = x + o < W && y + o < H ? reg[i + o * W + o] : L;
        const up = x - o2 >= 0 && y - o2 >= 0 ? reg[i - o2 * W - o2] : L;
        if (dn !== L) base = mix(base, [40, 18, 10], cfg.cel.shadowAmt);
        else if (up !== L) base = mix(base, [255, 250, 235], cfg.cel.lightAmt);
      }
      let inkC = INK;
      const zc = solidFill[i];
      if (zc) inkC = mix(INK, rgb(cfg.colors[zc]), Math.min(1, (Din[i] - cfg.solid + 3) / 5));
      base = mix(base, inkC, cov[i]);
    }
    color[i * 4] = base[0];
    color[i * 4 + 1] = base[1];
    color[i * 4 + 2] = base[2];
    color[i * 4 + 3] = a;
  }

  // per part: own pixels, painted hidden areas underneath, ink on every edge a cut / a paint exposes
  const ringW = cfg.ring * s;
  /** parts always drawn together: no ink along their shared cut */
  const joined = (a, b) => (cfg.joined ?? []).some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  const out = {};
  const boxes = {};
  for (const name of names) {
    const P = PART[name];
    const rgba = new Uint8ClampedArray(N * 4);
    const mine = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (tag[i] !== P) continue;
      mine[i] = 1;
      rgba[i * 4] = color[i * 4];
      rgba[i * 4 + 1] = color[i * 4 + 1];
      rgba[i * 4 + 2] = color[i * 4 + 2];
      rgba[i * 4 + 3] = color[i * 4 + 3] * 255;
    }
    const painted = new Uint8Array(N);
    for (const pt of cfg.paint[name] ?? []) {
      const m = K.polyMask(W, H, [rel(pt.poly)], s);
      // `under`: repaint (overwrite) what that part covers, a little grown so its outline goes too
      let Du = null;
      if (pt.under) {
        const um = new Uint8Array(N);
        for (let i = 0; i < N; i++) um[i] = tag[i] === PART[pt.under] ? 1 : 0;
        Du = K.dist(um, W, H);
      }
      const c = rgb(cfg.colors[pt.color]);
      for (let i = 0; i < N; i++) {
        if (!m[i]) continue;
        if (Du ? Du[i] > pt.grow * s : rgba[i * 4 + 3] > 250) continue;
        const t = Du ? 0 : rgba[i * 4 + 3] / 255;
        rgba[i * 4] = rgba[i * 4] * t + c[0] * (1 - t);
        rgba[i * 4 + 1] = rgba[i * 4 + 1] * t + c[1] * (1 - t);
        rgba[i * 4 + 2] = rgba[i * 4 + 2] * t + c[2] * (1 - t);
        rgba[i * 4 + 3] = 255;
        painted[i] = 1;
        mine[i] = 1;
      }
    }
    // cel shadow on the painted areas' lower-right rim, like the regions around them
    for (let i = 0; i < N; i++) {
      if (!painted[i]) continue;
      const x = i % W;
      const y = (i / W) | 0;
      const j = x + o < W && y + o < H ? i + o * W + o : i;
      if (mine[j]) continue;
      for (let k = 0; k < 3; k++) rgba[i * 4 + k] = rgba[i * 4 + k] * (1 - cfg.cel.shadowAmt) + [40, 18, 10][k] * cfg.cel.shadowAmt;
    }
    for (const ln of cfg.lines[name] ?? []) {
      const m = K.strokeMask(W, H, [rel(ln)], cfg.lineW, s);
      for (let i = 0; i < N; i++) {
        if (!m[i]) continue;
        rgba[i * 4] = INK[0];
        rgba[i * 4 + 1] = INK[1];
        rgba[i * 4 + 2] = INK[2];
        rgba[i * 4 + 3] = 255;
        mine[i] = 1;
      }
    }
    const Dmine = K.dist(mine, W, H);
    const Dp = K.dist(painted, W, H);
    for (let i = 0; i < N; i++) {
      if (mine[i]) continue;
      const cutEdge = tag[i] && tag[i] !== P && !joined(name, names[tag[i] - 1]) && Dmine[i] <= ringW;
      const paintEdge = Dp[i] <= ringW;
      if (!cutEdge && !paintEdge) continue;
      rgba[i * 4] = INK[0];
      rgba[i * 4 + 1] = INK[1];
      rgba[i * 4 + 2] = INK[2];
      rgba[i * 4 + 3] = 255;
    }
    const full = K.toCanvas(rgba, W, H);
    const b = K.bbox(full, 4);
    const half = K.resample(K.sub(full, b), cfg.outScale);
    out[name] = half.toDataURL('image/webp', 0.9);
    boxes[name] = { x: b.x / s + X, y: b.y / s + Y, w: b.w / s, h: b.h / s };
  }

  const res = { files: out, boxes, unpainted };
  if (debug) {
    // the reference silhouette (inside the shirt's outline), for the fidelity proof
    const ref = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const inside = !bg[i] || charInk[i];
      ref[i * 4] = ref[i * 4 + 1] = ref[i * 4 + 2] = inside ? 255 : 0;
      ref[i * 4 + 3] = 255;
    }
    res.refmask = K.resample(K.toCanvas(ref, W, H), 0.5).toDataURL('image/png');
    const tint = { 1: [255, 160, 0], 2: [0, 200, 255], 3: [120, 255, 120], 4: [255, 80, 200] };
    const dbg = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const t = tag[i] ? tint[tag[i]] : [255, 255, 255];
      const c = tag[i] ? [color[i * 4], color[i * 4 + 1], color[i * 4 + 2]] : [255, 255, 255];
      dbg[i * 4] = c[0] * 0.55 + t[0] * 0.45;
      dbg[i * 4 + 1] = c[1] * 0.55 + t[1] * 0.45;
      dbg[i * 4 + 2] = c[2] * 0.55 + t[2] * 0.45;
      dbg[i * 4 + 3] = 255;
    }
    res.parts = K.resample(K.toCanvas(dbg, W, H), 0.5).toDataURL('image/png');
    const all = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) {
      const a = tag[i] ? color[i * 4 + 3] : 0;
      for (let k = 0; k < 3; k++) all[i * 4 + k] = (tag[i] ? color[i * 4 + k] : 0) * a + 214 * (1 - a);
      all[i * 4 + 3] = 255;
    }
    res.color = K.resample(K.toCanvas(all, W, H), 0.5).toDataURL('image/png');
    const sheetC = K.canvas(W, H);
    const g = K.ctx2d(sheetC);
    g.fillStyle = '#9aa0a6';
    g.fillRect(0, 0, W, H);
    const spread = { burger: [-40, 40], arm: [-80, -60], handBack: [80, 60], handFront: [160, -80] };
    for (const name of names) {
      const im = await K.load(out[name]);
      const b = boxes[name];
      const [dx, dy] = spread[name] ?? [0, 0];
      g.drawImage(im, (b.x - X) * s + dx * s, (b.y - Y) * s + dy * s, b.w * s, b.h * s);
    }
    res.sheet = K.resample(sheetC, 0.5).toDataURL('image/png');
  }
  return res;
}
