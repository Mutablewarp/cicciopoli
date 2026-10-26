/**
 * Page-side job of scripts/level8/pancetta.mjs (runs in Chromium with window.CUT from brie-cut.mjs and
 * window.PIG_PAINT from pancetta-paint.mjs; it is stringified, so it must not reference anything outside
 * its own body). The PANCETTA shirt is red line art: the job keeps every printed line (recoloured to the
 * level's dark ink), turns the solid fills (pupils, mouth, shoes) into their own regions, colours every
 * enclosed region with natural colours by seed points, and cuts the pig into puppet parts. All coordinates
 * below are SHIRT pixels of ref/level8_shirt_pancetta.png (the crop starts at OX, OY).
 */
export async function pancettaJob({ urls }) {
  const C = window.CUT;
  const PP = window.PIG_PAINT;
  // the crop runs 6 px under the board so the front wheel keeps its bottom line
  const [OX, OY, CW, CH] = [326, 752, 318, 412];
  const U = 4;
  /** output px per shirt px, shirt px per world unit */
  const OS = 1.6;
  const SPU = 2.5;
  const LINE = 3.5;
  const L = (pts) => pts.map(([x, y]) => [x - OX, y - OY]);
  const S = await C.prepare(urls.shirt, [OX, OY, CW, CH], U);
  // labels: 0 printed ink (red), 1 paper; then 2 = solid fills (ink thicker than a line)
  C.quantise(S, [
    { label: 0, rgb: [200, 25, 40] },
    { label: 0, rgb: [175, 35, 45] },
    { label: 1, rgb: [236, 236, 232] },
    { label: 1, rgb: [222, 222, 220] },
  ]);
  C.despeckle(S, 2, 1);
  const solid = PP.solidMask(S, 0, 2.6, 1.6);
  for (let i = 0; i < S.W * S.H; i++) if (solid[i]) S.lab[i] = 2;
  C.components(S, [0]);
  const inkId = PP.inkComps(S, [0, 2]);
  const px = ([x, y]) => Math.round((y - OY) * U) * S.W + Math.round((x - OX) * U);
  const compAt = (pt) => S.comp[px(pt)];

  const HEX = {
    ink: '#3b1a14', skin: '#f6b1ac', snout: '#ef9894', ear: '#ec8f96', white: '#fbf6ec', mouth: '#7c231f',
    tongue: '#ea6878', bandana: '#d8322f', tee: '#f4c64e', denim: '#3e6fb5', cuff: '#5b8fd2', seat: '#33609f',
    metal: '#cfcdc6', sock: '#f7f1e3', wood: '#e0a35c', edge: '#b4713a', wheel: '#f3ead2', truck: '#a9a7a2',
    fat: '#f8e0c4', meat: '#d65449', pinkFat: '#ffd1e6', pinkMeat: '#ff8fc0',
  };
  const RGB = Object.fromEntries(Object.entries(HEX).map(([k, h]) => [k, [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))]));
  // colour seeds: a region (or solid fill) under the point gets that colour
  const SEEDS = {
    skin: [[570, 845], [356, 807], [359, 829], [547, 1053], [610, 1010], [600, 1017], [560, 790], [586, 806]],
    snout: [[476, 856]],
    ear: [[498, 773]],
    white: [[475, 820], [517, 830], [392, 1041], [593, 1080]],
    tongue: [[516, 897]],
    mouth: [[500, 890], [493, 886]],
    bandana: [[509, 923], [589, 886], [594, 906], [566, 903], [595, 877], [600, 870]],
    tee: [[407, 890], [469, 921], [572, 964], [464, 903]],
    denim: [[450, 923], [529, 947], [473, 991], [548, 950]],
    metal: [[444, 939], [525, 952], [479, 952]],
    cuff: [[420, 1022], [579, 1049]],
    sock: [[425, 1040], [573, 1061]],
    seat: [[485, 1054]],
    wood: [[478, 1105]],
    wheel: [[412, 1086], [403, 1127], [579, 1100], [578, 1112], [584, 1142], [571, 1151]],
    truck: [[407, 1109], [416, 1119], [574, 1133]],
    fat: [[354.5, 925], [379.5, 957], [372, 913.8], [363, 924]],
    meat: [[377, 938]],
  };
  const fill = new Int16Array(S.ncomp).fill(-1);
  const names = Object.keys(RGB);
  for (const [name, pts] of Object.entries(SEEDS)) for (const s of pts) if (compAt(s) >= 0) fill[compAt(s)] = names.indexOf(name);

  const HEAD = [[449, 850], [455, 828], [466, 806], [480, 790], [488, 766], [490, 752], [520, 754], [548, 762], [575, 760], [604, 758], [608, 800], [608, 840], [618, 858], [622, 906], [602, 920], [576, 931], [548, 939], [515, 941], [490, 935], [476, 923], [466, 905], [452, 890], [447, 870]];
  const ARM = [[326, 775], [398, 775], [398, 800], [392, 850], [405, 858], [440, 862], [460, 872], [464, 902], [448, 912], [448, 915], [400, 913], [366, 911], [345, 882], [326, 862]];
  const BACON = [[340, 902], [398, 902], [420, 930], [420, 964], [380, 964], [340, 938]];
  const BODY = [[398, 900], [436, 884], [462, 882], [470, 902], [520, 916], [560, 906], [604, 908], [608, 940], [614, 990], [634, 998], [634, 1032], [608, 1040], [608, 1096], [560, 1100], [520, 1095], [460, 1083], [420, 1081], [372, 1077], [370, 1034], [388, 1000], [404, 964], [406, 930]];
  const BOARD = [[328, 1030], [642, 1030], [642, 1164], [328, 1164]];
  // the dust puff printed on the deck's underside beside the rear truck is not part of the board: painted out
  const PUFF = [[418.8, 1100.6], [440, 1100.6], [440, 1122], [418.8, 1122]];
  const parts = [
    { name: 'head', seeds: L([[570, 845], [476, 856], [509, 923], [589, 886], [594, 906], [566, 903], [498, 773]]), within: [L(HEAD)], bonus: 4 },
    { name: 'arm', seeds: L([[356, 807], [407, 890], [359, 829]]), within: [L(ARM)], bonus: 3 },
    { name: 'body', seeds: L([[473, 991], [572, 964], [547, 1053], [425, 1040], [485, 1054], [610, 1010], [450, 923], [529, 947], [469, 921], [464, 903], [444, 939], [525, 952], [479, 952]]), within: [L(BODY)], bonus: 2 },
    { name: 'bacon', seeds: L([[354.5, 925], [379.5, 957], [372, 913.8], [377, 938]]), within: [L(BACON)] },
    { name: 'board', seeds: L([[478, 1105]]), within: [L(BOARD)] },
  ];
  const cents = C.centroids(S);
  const polyOf = { head: HEAD, arm: ARM, body: BODY, bacon: BACON, board: BOARD };
  for (const pt of parts) pt.comps = C.grab(S, cents, [L(polyOf[pt.name])], 3000);
  const orphans = C.segment(S, { bgLabels: [], parts });
  const idx = (n) => parts.findIndex((pt) => pt.name === n);
  const FALLBACK = { head: 'skin', arm: 'skin', body: 'denim', bacon: 'meat', board: 'wood' };
  // strokes printed apart from any region (the left brow floats outside the head): claimed by seed
  const STROKES = { head: [[476.7, 793.7]] };
  for (const [name, pts] of Object.entries(STROKES))
    for (const pt of pts) {
      const id = inkId[px(pt)];
      for (let p = 0; p < S.W * S.H; p++) if (id >= 0 && inkId[p] === id && S.part[p] < 0) S.part[p] = idx(name);
    }

  // the printed eyes (white + pupil fill) as ellipses just inside their outlines: emptied for the closed /
  // spiral eyes; the brows: the floating left one is erased, the right one painted over, for new brows
  const eyeOf = (pts) => {
    const ids = new Set(pts.map(compAt).filter((c) => c >= 0));
    let [x0, y0, x1, y1] = [1e9, 1e9, -1e9, -1e9];
    for (let p = 0; p < S.W * S.H; p++) {
      if (!ids.has(S.comp[p])) continue;
      const x = (p % S.W) / U + OX;
      const y = ((p / S.W) | 0) / U + OY;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2, rx: (x1 - x0) / 2 + 1, ry: (y1 - y0) / 2 + 1 };
  };
  const E = { l: eyeOf([[475, 820], [488, 822]]), r: eyeOf([[517, 830], [533, 834]]) };
  const inEye = (x, y) => [E.l, E.r].some((e) => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 < 1);
  const BROW = {
    l: { ink: new Set([[476.7, 793.7], [469, 798], [484, 794]].map((pt) => inkId[px(pt)])), c: [477, 796], len: 22 },
    r: { ink: new Set([[533, 794.5], [540, 798.3], [546, 806]].map((pt) => inkId[px(pt)])), c: [540, 800], len: 22 },
  };
  const inPuff = (x, y) => C.inPoly(PUFF, x, y);
  // just under the deck's repainted top edge (between the trucks): the board's leftovers of the seat's and the
  // fingers' lines go back to plain wood
  const NOTCH = [[446, 1072], [484, 1079.6], [509, 1083.4], [556, 1087.5], [556, 1093], [553, 1099.3], [509, 1095.4], [484, 1091.6], [446, 1084]];
  const colourer = (face, pink, deck) => (cx, cy, lab) => {
    const p = Math.round(cy * U) * S.W + Math.round(cx * U);
    const [x, y] = [cx + OX, cy + OY];
    if (inPuff(x, y) || (deck && C.inPoly(NOTCH, x, y))) return RGB.wood;
    if (face && PP.EMPTY[face] && inEye(x, y)) return RGB.skin;
    const newBrows = face === 'windup' || face === 'hurt';
    if (newBrows && BROW.l.ink.has(inkId[p])) return null;
    if (newBrows && BROW.r.ink.has(inkId[p])) return RGB.skin;
    if (lab === 0) return RGB.ink;
    const c = S.comp[p];
    let n = fill[c] >= 0 ? names[fill[c]] : lab === 2 ? 'ink' : FALLBACK[parts[S.part[p]]?.name] ?? 'skin';
    if (pink && n === 'fat') n = 'pinkFat';
    if (pink && n === 'meat') n = 'pinkMeat';
    return RGB[n];
  };
  const box = (b) => [b[0] - OX, b[1] - OY, b[2], b[3]];
  const files = {};
  const sheet = { pxPerUnit: OS * SPU, origin: { x: (490 - OX) * OS, y: (1148 - OY) * OS } };
  const put = (name, frames, b) => {
    const st = C.strip(frames);
    files[name + '.webp'] = C.webp(st.canvas);
    sheet[name] = { url: 'level8/pancetta/' + name + '.webp', frames: frames.length, fw: st.fw, fh: st.fh, x: (b[0] - OX) * OS - (st.fw - frames[0].width) / 2, y: (b[1] - OY) * OS - (st.fh - frames[0].height) / 2 };
  };
  /** opt.grow: [[back parts], d] — the rendered part runs on d crop px under those front parts */
  const render = (names_, b, opt = {}) => {
    const keep = S.part;
    if (opt.grow) S.part = PP.grow(S, idx(names_[0]), opt.grow[0].map(idx), opt.grow[1]);
    const cv = C.render(S, names_.map(idx), box(b), {}, { scale: OS, recolor: colourer(opt.face, opt.pink, opt.deck), ...opt.extra });
    S.part = keep;
    return cv;
  };
  const inShirt = (fn) => (g) => {
    g.save();
    g.translate(-OX, -OY);
    fn(g);
    g.restore();
  };
  const COL = { ...HEX };
  const HBOX = [446, 752, 178, 192];
  const faces = PP.FACES.map((face) => render(['head'], HBOX, { face, extra: { over: inShirt((g) => PP.face(g, COL, face, E, BROW, LINE)) } }));
  put('head', faces, HBOX);
  sheet.faces = PP.FACES;
  const ABOX = [326, 775, 142, 142];
  const arm = render(['arm'], ABOX, { grow: [['head'], 2] });
  put('arm', [arm], ABOX);
  // under the head and the arm root: the T-shirt they uncover when they turn (kept only where they were)
  const NECK = [[398, 896], [420, 898], [440, 893], [452, 885], [470, 900], [500, 912], [540, 916], [570, 905], [600, 900], [612, 918], [598, 936], [560, 944], [520, 948], [480, 944], [452, 930], [430, 915], [400, 914]];
  const YBOX = [368, 884, 270, 218];
  const under = { under: inShirt((g) => PP.fill(g, NECK, HEX.tee)), underClip: { parts: [idx('head'), idx('arm')], grow: 1 } };
  const body = render(['body'], YBOX, { extra: under, grow: [['head', 'arm'], 2] });
  put('body', [body], YBOX);
  const BBOX = [338, 902, 84, 64];
  const bacon = render(['bacon'], BBOX, { grow: [['body', 'arm'], 1] });
  put('bacon', [bacon, render(['bacon'], BBOX, { pink: true, grow: [['body', 'arm'], 1] })], BBOX);
  // the deck's top edge runs under the shoes, the seat and the hand: painted back where the body was, so the
  // board flying alone (the kickflip) has a whole deck; no grow, or the body's line would ride on the wood
  const DECK = [[371.8, 1050.4], [390.5, 1054.5], [421.8, 1062.6], [446.8, 1070.1], [484.3, 1077.6], [509.3, 1081.4], [559.3, 1085.8], [609.3, 1088.3]];
  const KBOX = [328, 1032, 316, 130];
  const deck = { under: inShirt((g) => PP.deckEdge(g, DECK, HEX.wood, HEX.ink, 5, 16)), underClip: { parts: [idx('body')], grow: 1.5 } };
  const board = render(['board'], KBOX, { extra: deck, deck: true });
  put('board', [board], KBOX);
  const T = (x, y) => ({ x: (x - OX) * OS, y: (y - OY) * OS });
  sheet.pivots = { neck: T(530, 918), shoulder: T(455, 893), bacon: T(380, 935), hand: T(362, 815), feet: T(490, 1078) };

  // debug: part map, the rest pose rebuilt from the parts, the faces, and the printed silhouette
  const dbg = C.debug(S, [[230, 60, 60], [240, 150, 40], [40, 120, 200], [230, 200, 60], [120, 220, 120]]);
  const rest = C.canvas(CW * OS, CH * OS);
  const rg = rest.getContext('2d');
  for (let y = 0; y < rest.height; y += 24) for (let x = 0; x < rest.width; x += 24) {
    rg.fillStyle = (x + y) % 48 ? '#bbb' : '#999';
    rg.fillRect(x, y, 24, 24);
  }
  const at = (cv, b) => rg.drawImage(cv, (b[0] - OX) * OS, (b[1] - OY) * OS);
  at(bacon, BBOX);
  at(board, KBOX);
  at(body, YBOX);
  at(arm, ABOX);
  at(faces[0], HBOX);
  const all = parts.map((_, i) => i);
  const mask = C.render(S, all, [0, 0, CW, CH], { 0: [0, 0, 0], 1: [0, 0, 0], 2: [0, 0, 0] }, { scale: OS });
  const crop = C.canvas(CW * OS, CH * OS);
  const im = new Image();
  im.src = urls.shirt;
  await im.decode();
  crop.getContext('2d').drawImage(im, OX, OY, CW, CH, 0, 0, CW * OS, CH * OS);
  return {
    files,
    debug: {
      'pancetta-parts.png': C.png(C.resize(dbg, 0.5)),
      'pancetta-rest.png': C.png(rest),
      'pancetta-faces.png': C.png(C.strip(faces).canvas),
      'pancetta-mask.png': C.png(mask),
      'pancetta-crop.png': C.png(crop),
    },
    data: { orphans: orphans.map(([x, y]) => [x + OX, y + OY]), sheet },
  };
}
