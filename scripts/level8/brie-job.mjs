/**
 * Page-side job of scripts/level8/brie.mjs (runs in Chromium with window.CUT from brie-cut.mjs; it is
 * stringified, so it must not reference anything outside its own body). All coordinates are crop pixels
 * of the 420 x 620 crop at (540, 1090) of ref/level8_shirt_brie_v2.png.
 */
export async function brieJob({ urls }) {
  const C = window.CUT;
  const U = 4;
  const S = await C.prepare(urls.shirt, [540, 1090, 420, 620], U);
  // labels: 0 ink, 1 white, 2 cheese, 3 blue, 4 green (hill; grey hatching inside the rind), 5 red roof
  C.quantise(S, [
    { label: 0, rgb: [20, 20, 20] },
    { label: 0, rgb: [45, 45, 45] },
    { label: 1, rgb: [222, 222, 222] },
    { label: 1, rgb: [205, 205, 200] },
    { label: 1, rgb: [236, 236, 232] },
    { label: 2, rgb: [240, 210, 150] },
    { label: 3, rgb: [48, 112, 176] },
    { label: 4, rgb: [144, 144, 80] },
    { label: 5, rgb: [200, 70, 60] },
  ]);
  C.despeckle(S, 2, 1);
  C.components(S, [0]);

  const BERET = [[196, 50], [198, 30], [215, 17], [240, 13], [268, 21], [285, 29], [296, 19], [307, 21], [301, 40], [330, 54], [343, 68], [343, 83], [333, 93], [318, 90], [300, 85], [280, 81], [262, 78], [248, 74], [238, 69], [224, 64], [210, 59], [200, 56]];
  const GLOVE = [[184, 268], [196, 252], [222, 250], [252, 252], [270, 262], [271, 290], [262, 309], [236, 311], [200, 309], [186, 296]];
  const HOSE = [[252, 262], [286, 236], [306, 222], [323, 223], [327, 238], [312, 250], [282, 272], [262, 284]];
  const FRONT = { x: 98, y: 496, rx: 81, ry: 95 };
  const REAR = { x: 324, y: 456, rx: 67, ry: 93 };
  const ell = (e, d) => Array.from({ length: 48 }, (_, i) => [e.x + Math.cos((i / 48) * Math.PI * 2) * (e.rx + d), e.y + Math.sin((i / 48) * Math.PI * 2) * (e.ry + d)]);

  const WEDGE = [[194, 44], [345, 58], [372, 110], [396, 190], [409, 260], [406, 302], [391, 324], [350, 339], [300, 341], [240, 338], [170, 331], [140, 319], [124, 290], [118, 250], [121, 212], [129, 190], [136, 168], [150, 128], [169, 95]];
  const BOTTLE = [[128, 214], [150, 214], [151, 238], [148, 312], [116, 312], [112, 262]];
  const SCENERY = [[0, 0], [192, 0], [192, 40], [157, 110], [143, 150], [133, 180], [124, 205], [105, 222], [60, 229], [0, 232]];
  const BUSH = [[0, 375], [16, 375], [20, 470], [14, 560], [0, 560]];
  const parts = [
    { name: 'glove', seeds: [[225, 275]], grab: [GLOVE], grabLabel: 1, within: [GLOVE], bonus: 6 },
    { name: 'hose', seeds: [[300, 238], [285, 250], [270, 262]], within: [HOSE], bonus: 6 },
    { name: 'beret', seeds: [[226, 41], [241, 39]], within: [BERET] },
    { name: 'wedge', seeds: [[250, 250], [330, 200]], within: [WEDGE], without: [BERET, BOTTLE] },
    { name: 'footN', seeds: [[270, 428], [269, 434]] },
    { name: 'footF', seeds: [[206, 420], [208, 422]] },
    { name: 'legs', seeds: [[175, 330], [174, 331], [228, 336], [229, 336], [190, 381], [189, 381], [255, 368], [256, 367]] },
    { name: 'wheels', seeds: [], grab: [ell(FRONT, -10), ell(REAR, -10)], grabLabel: 1, within: [ell(FRONT, 2), ell(REAR, 2)] },
    { name: 'bike', seeds: [[100, 340], [200, 345]] },
    { name: 'basket', seeds: [] },
  ];
  for (const pt of parts) pt.without = [...(pt.without ?? []), SCENERY, BUSH];
  const BG_HOLES = [[204, 333], [224, 393], [223, 386], [168, 377], [169, 378], [155, 408], [154, 406], [182, 446], [267, 382], [267, 383], [280, 388]];
  const cents = C.centroids(S);
  for (const pt of parts) pt.comps = C.grab(S, cents, pt.grab ?? []).filter((c) => pt.grabLabel === undefined || S.lab[Math.round(cents[c].y * U) * S.W + Math.round(cents[c].x * U)] === pt.grabLabel);
  const orphans = C.segment(S, { bgLabels: [4, 5], bgMinArea: 2500, bgSeeds: BG_HOLES, fallback: parts.length - 2, parts });
  // the basket, its loaf and bottle, the left glove and the handlebar sit in front of the wedge
  const BASKET = [[10, 215], [150, 206], [160, 240], [165, 266], [186, 266], [190, 300], [170, 304], [166, 330], [172, 392], [10, 392]];
  {
    const bike = parts.length - 2;
    for (let y = 205 * U; y < 395 * U; y++)
      for (let x = 0; x < 195 * U; x++) {
        const p = y * S.W + x;
        if (S.part[p] === bike && C.inPoly(BASKET, x / U, y / U)) S.part[p] = bike + 1;
      }
  }
  const B = window.BRIE_PAINT;
  const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
  const PAL = { 0: [27, 24, 23], 1: [248, 245, 237], 2: [250, 212, 146], 3: [44, 113, 190], 4: [128, 124, 116] };
  const COL = { ink: hex(PAL[0]), white: hex(PAL[1]), cheese: hex(PAL[2]), blue: hex(PAL[3]), mouth: '#6b1e16', tongue: '#e9747c' };
  const idx = (...names) => names.map((nm) => parts.findIndex((pt) => pt.name === nm));
  const files = {};
  const sheet = { pxPerUnit: 3, origin: { x: 205, y: 590 } };
  const put = (name, frames, box) => {
    const st = C.strip(frames);
    files[name + '.webp'] = C.webp(st.canvas);
    sheet[name] = { url: 'level8/brie/' + name + '.webp', frames: frames.length, fw: st.fw, fh: st.fh, x: box[0] - (st.fw - frames[0].width) / 2, y: box[1] - (st.fh - frames[0].height) / 2 };
    return st;
  };
  const WBOX = [112, 12, 302, 334];
  const faces = B.FACES.map((kind) => C.render(S, idx('wedge'), WBOX, PAL, { under: (g) => B.wedgeUnder(g, COL, GLOVE, HOSE), over: (g) => B.face(g, COL, kind) }));
  put('wedge', faces, WBOX);
  sheet.faces = B.FACES;
  const BBOX = [192, 8, 156, 90];
  const beret = C.render(S, idx('beret'), BBOX, PAL);
  put('beret', [beret], BBOX);
  const GBOX = [182, 248, 92, 66];
  const glove = C.render(S, idx('glove'), GBOX, PAL);
  put('glove', [glove], GBOX);
  const FN = [226, 386, 88, 94];
  put('foot', [C.render(S, idx('footN'), FN, PAL)], FN);
  const KBOX = [10, 210, 392, 326];
  const riding = C.render(S, idx('footN', 'footF', 'legs', 'bike'), KBOX, PAL);
  const empty = C.render(S, idx('bike'), KBOX, PAL, { over: (g) => B.tubes(g, COL) });
  put('bike', [riding, empty], KBOX);
  const FBOX = [10, 204, 240, 192];
  const front = C.render(S, idx('basket'), FBOX, PAL, { under: (g) => B.bar(g, COL) });
  put('basket', [front], FBOX);
  const wheelFrames = (e) => {
    const box = [Math.floor(e.x - e.rx - 4), Math.floor(e.y - e.ry - 4), Math.ceil(e.rx * 2 + 8), Math.ceil(e.ry * 2 + 8)];
    return { box, frames: [0, 0.25, 0.5, 0.75].map((t) => C.render(S, [], box, PAL, { under: (g) => B.wheel(g, COL, e, t) })) };
  };
  const wf = wheelFrames(FRONT);
  put('wheelF', wf.frames, wf.box);
  const wr = wheelFrames(REAR);
  put('wheelR', wr.frames, wr.box);
  // pivots measured on the shirt (crop px): where the parts join and turn
  sheet.pivots = {
    hubF: { x: FRONT.x, y: FRONT.y },
    hubR: { x: REAR.x, y: REAR.y },
    wedgeBase: { x: 265, y: 338 },
    beret: { x: 270, y: 52 },
    shoulderR: { x: 316, y: 238 },
    shoulderL: { x: 138, y: 236 },
    wrist: { x: 264, y: 268 },
    hipFar: { x: 198, y: 330 },
    hipNear: { x: 252, y: 334 },
    ankle: { x: 276, y: 398 },
    basket: { x: 100, y: 300 },
  };

  // debug: the rest pose rebuilt from the parts over a grey checker, next to the crop
  const rest = C.canvas(420, 620);
  const rg = rest.getContext('2d');
  for (let y = 0; y < 620; y += 20) for (let x = 0; x < 420; x += 20) {
    rg.fillStyle = (x + y) % 40 ? '#bbb' : '#999';
    rg.fillRect(x, y, 20, 20);
  }
  const at = (cv, box) => rg.drawImage(cv, box[0], box[1]);
  at(wf.frames[0], wf.box);
  at(wr.frames[0], wr.box);
  at(riding, KBOX);
  at(faces[0], WBOX);
  at(front, FBOX);
  at(beret, BBOX);
  at(glove, GBOX);
  const sheetDbg = C.strip([...faces, empty]);
  // the printed character's silhouette (every part) and the plain crop, for the fidelity overlay
  const all = parts.map((_, i) => i);
  const mask = C.render(S, all, [0, 0, 420, 620], Object.fromEntries([0, 1, 2, 3, 4, 5].map((l) => [l, [0, 0, 0]])));
  const crop = C.canvas(420, 620);
  crop.getContext('2d').drawImage(await (async () => { const im = new Image(); im.src = urls.shirt; await im.decode(); return im; })(), 540, 1090, 420, 620, 0, 0, 420, 620);
  const dbg = C.debug(S, [[230, 60, 60], [240, 150, 40], [40, 40, 200], [230, 200, 60], [250, 120, 200], [160, 60, 220], [120, 220, 120], [60, 200, 200], [60, 140, 60]]);
  return {
    files,
    debug: { 'brie-parts.png': C.png(C.resize(dbg, 0.5)), 'brie-rest.png': C.png(rest), 'brie-sheet.png': C.png(sheetDbg.canvas), 'brie-empty.png': C.png(C.resize(empty, 2)), 'brie-mask.png': C.png(mask), 'brie-crop.png': C.png(crop) },
    data: { orphans, sheet },
  };
}
