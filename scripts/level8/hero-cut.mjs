/**
 * Level 8 HERO art, browser half (runs inside Chromium through Playwright, see hero.mjs): cuts Ciccio out of
 * the beige paper of ref/level8_ciccio_hero.png and splits him into cut-out parts with pivots.
 *
 * Mask: everything the border flood fill reaches without crossing ink is paper; enclosed paper-coloured holes
 * (the gap inside the hip arm) are paper too; specks of the floor shadow are dropped by an opening.
 * Parts: hand-placed polygons in source pixels (from zoomed crops of the drawing) plus the gloves grown from
 * their white interiors. What a moving part uncovers is painted: the jacket under the arms in the suit navy
 * with an ink edge, the neck under the chin in skin, the trousers under the jacket hem in navy.
 * Every geometry number below is in SOURCE pixels of the 1122x1402 drawing.
 */
export const CUT = {
  /** frame units the standing hero is tall (hair top to sole) and where the rest pose stands */
  heroHeight: 52,
  anchorX: 575,
  frameFoot: { x: 32, y: 62 },
  /** atlas pixels per frame unit (2.7x the KMAX texture scale) */
  pxPerUnit: 8,
  /** paper / ink split of the flood fill */
  inkLum: 42,
  ink: [22, 16, 11],
  skin: [247, 229, 187],
  paper: [242, 203, 135],
  head: [[240, 40], [800, 40], [800, 470], [712, 478], [692, 515], [652, 546], [600, 564], [540, 570], [480, 567], [420, 555], [378, 532], [345, 515], [240, 515]],
  neck: [[400, 470], [700, 470], [712, 478], [692, 515], [652, 546], [600, 564], [540, 570], [480, 567], [420, 555], [378, 532], [390, 500]],
  gunSleeve: [[760, 540], [850, 590], [880, 620], [880, 700], [910, 735], [990, 715], [985, 770], [900, 800], [840, 790], [812, 775], [805, 720], [795, 660], [780, 610]],
  hipSleeve: [[340, 528], [250, 540], [150, 585], [70, 660], [60, 800], [150, 860], [215, 840], [260, 780], [300, 745], [350, 745], [350, 672], [365, 645], [374, 610], [365, 575]],
  /** seeds inside the white of each glove; the glove = that white grown over its ink outline */
  gloveSeeds: [[1040, 505], [915, 490], [960, 580], [910, 690]],
  fistSeeds: [[300, 870], [230, 790]],
  gloveMinX: 862,
  gloveGrow: 13,
  /** jacket hem: torso above, trousers below; the legs split at the crotch */
  hem: [[0, 950], [280, 950], [330, 977], [380, 996], [450, 1010], [520, 1030], [600, 1044], [650, 1034], [690, 1012], [720, 994], [750, 982], [790, 980], [830, 970], [1122, 960]],
  crotchX: 575,
  /** the jacket as if the arms were not there (holes inside it are painted navy) */
  underlay: [[345, 530], [420, 515], [700, 515], [775, 570], [805, 620], [818, 690], [838, 750], [850, 800], [860, 900], [850, 960], [560, 1040], [320, 990], [300, 950], [318, 880], [335, 800], [345, 745], [350, 680], [355, 600]],
  /** jacket edges hidden under the arms: inked where they become visible */
  underlayEdges: [[[345, 530], [355, 600], [350, 680], [345, 745], [335, 800], [318, 880], [300, 950]], [[775, 570], [805, 620], [818, 690], [838, 750], [850, 800]]],
  inkWidth: 12,
  /** trousers continued under the jacket around each hip so a swinging leg never shows a gap */
  legReach: 105,
  joints: {
    neck: [545, 562],
    gunShoulder: [800, 640],
    wrist: [918, 712],
    hipShoulder: [350, 600],
    hipBack: [470, 985],
    hipFront: [690, 975],
    hipCentre: [575, 1000],
    chest: [575, 780],
    soleBackToe: [190, 1302],
    soleBackHeel: [395, 1280],
    soleFrontHeel: [670, 1260],
    soleFrontToe: [965, 1260],
  },
};

/** Browser function (serialised by Playwright): returns the atlas as a WebP data URL plus part / joint data. */
export async function cutHero({ cfg, dataUrl }) {
  const im = new Image();
  im.src = dataUrl;
  await im.decode();
  const W = im.width;
  const H = im.height;
  const N = W * H;
  const ctx2d = (w, h) => new OffscreenCanvas(w, h).getContext('2d', { willReadFrequently: true });
  const g0 = ctx2d(W, H);
  g0.drawImage(im, 0, 0);
  const src = g0.getImageData(0, 0, W, H).data;
  const lum = new Float32Array(N);
  for (let i = 0; i < N; i++) lum[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];

  /** polygon / polyline rasterised by the canvas into a 0/1 mask */
  const raster = (paint) => {
    const g = ctx2d(W, H);
    g.fillStyle = g.strokeStyle = '#fff';
    g.lineCap = g.lineJoin = 'round';
    paint(g);
    const a = g.getImageData(0, 0, W, H).data;
    const m = new Uint8Array(N);
    for (let i = 0; i < N; i++) m[i] = a[i * 4 + 3] > 127 ? 1 : 0;
    return m;
  };
  const path = (g, pts) => {
    g.beginPath();
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  };
  const poly = (pts) => raster((g) => (path(g, pts), g.closePath(), g.fill()));
  const below = (line) => poly([...line, [W, H], [0, H]]);

  /** flood fill from `seeds` over pixels where ok(i) */
  const flood = (seeds, ok) => {
    const m = new Uint8Array(N);
    const q = new Int32Array(N);
    let t = 0;
    for (const s of seeds) if (ok(s) && !m[s]) (m[s] = 1), (q[t++] = s);
    for (let h = 0; h < t; h++) {
      const i = q[h];
      const x = i % W;
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && !m[j] && ok(j)) (m[j] = 1), (q[t++] = j);
    }
    return m;
  };
  /** square max filter of radius r (r < 0 = erosion) */
  const grow = (m, r) => {
    if (r < 0) return grow(m.map((v) => 1 - v), -r).map((v) => 1 - v);
    const pass = (a, step, len, lines, lineStep) => {
      const o = new Uint8Array(N);
      for (let l = 0; l < lines; l++) {
        const b = l * lineStep;
        let c = 0;
        for (let k = 0; k < Math.min(r, len); k++) c += a[b + k * step];
        for (let k = 0; k < len; k++) {
          if (k + r < len) c += a[b + (k + r) * step];
          if (k - r - 1 >= 0) c -= a[b + (k - r - 1) * step];
          o[b + k * step] = c > 0 ? 1 : 0;
        }
      }
      return o;
    };
    return pass(pass(m, 1, W, H, W), W, H, W, 1);
  };
  const and = (a, b) => a.map((v, i) => v & b[i]);
  const or = (a, b) => a.map((v, i) => v | b[i]);
  const not = (a) => a.map((v) => 1 - v);
  const at = ([x, y]) => y * W + x;
  const near = (i, c, d) => Math.hypot(src[i * 4] - c[0], src[i * 4 + 1] - c[1], src[i * 4 + 2] - c[2]) < d;

  // 1. paper = the flood from the border over non-ink (the warm floor shadow counts as paper)
  const border = [];
  for (let x = 0; x < W; x++) border.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) border.push(y * W, y * W + W - 1);
  const passable = (i) => lum[i] > cfg.inkLum || (src[i * 4] - src[i * 4 + 2] > 24 && lum[i] > 30);
  let fg = not(flood(border, passable));
  // 2. enclosed paper-coloured holes (inside the hip arm) are paper
  const seen = new Uint8Array(N);
  for (let s = 0; s < N; s++) {
    if (!fg[s] || seen[s] || lum[s] < 120) continue;
    const comp = flood([s], (i) => fg[i] && lum[i] >= 120);
    let n = 0;
    let paperish = 0;
    for (let i = 0; i < N; i++) if (comp[i]) (seen[i] = 1), n++, (paperish += near(i, cfg.paper, 22) ? 1 : 0);
    if (n > 300 && paperish > n * 0.6) for (let i = 0; i < N; i++) if (comp[i]) fg[i] = 0;
  }
  // 3. the biggest body only (drops the motion ticks), opened so shadow specks fall off the soles
  const big = (m) => {
    const lab = new Uint8Array(N);
    let best = null;
    let bestN = 0;
    for (let s = 0; s < N; s++) {
      if (!m[s] || lab[s]) continue;
      const comp = flood([s], (i) => m[i]);
      let n = 0;
      for (let i = 0; i < N; i++) if (comp[i]) (lab[i] = 1), n++;
      if (n > bestN) (best = comp), (bestN = n);
    }
    return best;
  };
  fg = and(fg, grow(big(grow(grow(fg, -3), 3)), 4));
  fg = big(fg);

  // 4. parts
  const light = (seeds) => grow(flood(seeds.map(at), (i) => fg[i] && lum[i] >= 120), cfg.gloveGrow);
  const legsZone = below(cfg.hem);
  const leftOf = raster((g) => g.fillRect(0, 0, cfg.crotchX, H));
  const rightOfGlove = raster((g) => g.fillRect(cfg.gloveMinX, 0, W, H));
  const zones = [
    ['head', poly(cfg.head)],
    ['glove', and(light(cfg.gloveSeeds), rightOfGlove)],
    ['hipArm', or(poly(cfg.hipSleeve), light(cfg.fistSeeds))],
    ['gunSleeve', poly(cfg.gunSleeve)],
    ['backLeg', and(legsZone, leftOf)],
    ['frontLeg', and(legsZone, not(leftOf))],
  ];
  const label = new Uint8Array(N); // 0 paper, 1 torso, 2.. zones
  const names = ['torso', ...zones.map((z) => z[0])];
  for (let i = 0; i < N; i++) {
    if (!fg[i]) continue;
    const z = zones.findIndex(([, m]) => m[i]);
    label[i] = z < 0 ? 1 : z + 2;
  }

  // 5. layers + the painted underlays
  const sum = [0, 0, 0, 0];
  for (let i = 0; i < N; i++) if (label[i] === 1 && lum[i] > 28 && lum[i] < 52) for (let c = 0; c < 4; c++) sum[c] += c < 3 ? src[i * 4 + c] : 1;
  const navy = sum.slice(0, 3).map((v) => Math.round(v / sum[3]));
  const layers = names.map(() => new Uint8ClampedArray(N * 4));
  const put = (L, i, rgb) => ((L[i * 4] = rgb[0]), (L[i * 4 + 1] = rgb[1]), (L[i * 4 + 2] = rgb[2]), (L[i * 4 + 3] = 255));
  for (let i = 0; i < N; i++) if (label[i]) put(layers[label[i] - 1], i, [src[i * 4], src[i * 4 + 1], src[i * 4 + 2]]);
  const torso = layers[0];
  const neck = poly(cfg.neck);
  const under = poly(cfg.underlay);
  const edges = raster((g) => {
    g.lineWidth = cfg.inkWidth;
    for (const e of cfg.underlayEdges) path(g, e), g.stroke();
  });
  // only pixels another part covers at rest: the rest pose stays the drawing, pixel for pixel
  for (let i = 0; i < N; i++) {
    if (label[i] <= 1 || legsZone[i] || !(neck[i] || under[i])) continue;
    put(torso, i, neck[i] ? cfg.skin : edges[i] ? cfg.ink : navy);
  }
  const inner = and(grow(fg, -8), not(legsZone));
  for (const [name, joint] of [['backLeg', cfg.joints.hipBack], ['frontLeg', cfg.joints.hipFront]]) {
    const L = layers[names.indexOf(name)];
    const side = name === 'backLeg' ? leftOf : not(leftOf);
    for (let i = 0; i < N; i++) if (inner[i] && side[i] && !legsZone[i] && Math.hypot((i % W) - joint[0], ((i / W) | 0) - joint[1]) < cfg.legReach) put(L, i, navy);
  }

  // 6. scale: rest pose in frame units; atlas pixels
  let top = H;
  let bottom = 0;
  for (let i = 0; i < N; i++) if (fg[i]) (top = Math.min(top, (i / W) | 0)), (bottom = Math.max(bottom, (i / W) | 0));
  const S = cfg.heroHeight / (bottom + 1 - top);
  const A = S * cfg.pxPerUnit;
  const toFrame = ([x, y]) => [cfg.frameFoot.x + (x - cfg.anchorX) * S, cfg.frameFoot.y + (y + 1 - (bottom + 1)) * S];
  const parts = names.map((name, p) => {
    const L = layers[p];
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (let i = 0; i < N; i++) if (L[i * 4 + 3]) (x0 = Math.min(x0, i % W)), (x1 = Math.max(x1, i % W)), (y0 = Math.min(y0, (i / W) | 0)), (y1 = Math.max(y1, (i / W) | 0));
    if (x1 < x0) throw new Error(`empty part ${name}`);
    x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W, x1 + 5); y1 = Math.min(H, y1 + 5);
    const full = ctx2d(W, H);
    full.putImageData(new ImageData(L, W, H), 0, 0);
    const pw = Math.ceil((x1 - x0) * A);
    const ph = Math.ceil((y1 - y0) * A);
    const g = ctx2d(pw, ph);
    g.imageSmoothingQuality = 'high';
    g.drawImage(full.canvas, x0, y0, pw / A, ph / A, 0, 0, pw, ph);
    const [fx, fy] = toFrame([x0, y0]);
    return { name, canvas: g.canvas, pw, ph, x: fx, y: fy, w: pw / cfg.pxPerUnit, h: ph / cfg.pxPerUnit };
  });

  // 7. shelf-pack the parts into one atlas
  const PAD = 2;
  const AW = 1024;
  let cx = PAD, cy = PAD, row = 0;
  for (const p of [...parts].sort((a, b) => b.ph - a.ph)) {
    if (cx + p.pw + PAD > AW) (cx = PAD), (cy += row + PAD), (row = 0);
    p.sx = cx; p.sy = cy;
    cx += p.pw + PAD;
    row = Math.max(row, p.ph);
  }
  const AH = cy + row + PAD;
  const atlas = new OffscreenCanvas(AW, AH);
  const ga = atlas.getContext('2d');
  for (const p of parts) ga.drawImage(p.canvas, p.sx, p.sy);
  const blob = await atlas.convertToBlob({ type: 'image/webp', quality: 0.92 });
  const webp = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.readAsDataURL(blob);
  });

  // fingertip = the right-most glove pixel (the finger-gun muzzle)
  let tip = [0, 0];
  const gi = names.indexOf('glove') + 1;
  for (let i = 0; i < N; i++) if (label[i] === gi && i % W > tip[0]) tip = [i % W, (i / W) | 0];
  const joints = Object.fromEntries(Object.entries({ ...cfg.joints, fingertip: tip }).map(([k, v]) => [k, toFrame(v)]));
  // the rest silhouette at 1 px per frame unit x4, for the fidelity overlay
  const sil = ctx2d(W, H);
  const sd = new Uint8ClampedArray(N * 4);
  for (let i = 0; i < N; i++) if (fg[i]) sd[i * 4 + 3] = 255;
  sil.putImageData(new ImageData(sd, W, H), 0, 0);
  const SW = 64 * 4;
  const sg = ctx2d(SW, SW);
  const [ox, oy] = toFrame([0, 0]);
  sg.drawImage(sil.canvas, ox * 4, oy * 4, W * S * 4, H * S * 4);
  const labUrl = await (async () => {
    const pal = [[0, 0, 0, 0], [80, 80, 200, 255], [230, 60, 60, 255], [60, 200, 60, 255], [230, 160, 30, 255], [200, 60, 200, 255], [40, 200, 220, 255], [240, 240, 60, 255]];
    const ld = new Uint8ClampedArray(N * 4);
    for (let i = 0; i < N; i++) ld.set(pal[label[i]], i * 4);
    const lg = ctx2d(W, H);
    lg.putImageData(new ImageData(ld, W, H), 0, 0);
    const b = await lg.canvas.convertToBlob({ type: 'image/png' });
    return new Promise((res) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.readAsDataURL(b);
    });
  })();
  const silUrl = await new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    sg.canvas.convertToBlob({ type: 'image/png' }).then((b) => r.readAsDataURL(b));
  });
  return {
    webp,
    silUrl,
    labUrl,
    size: [AW, AH],
    navy,
    scale: S,
    parts: parts.map(({ name, sx, sy, pw, ph, x, y, w, h }) => ({ name, sx, sy, sw: pw, sh: ph, x, y, w, h })),
    joints,
  };
}
