/**
 * Page-side helpers of scripts/level8/pancetta.mjs (stringified into the page as window.PIG_PAINT; plain
 * ES2020, no imports): the solid-ink mask of the shirt's line art (pupils, mouth, shoes, the strap in
 * shadow), the face expressions painted over the printed eyes and brows, and the T-shirt under-paint that
 * a turning head or arm uncovers. Every drawing call works in SHIRT pixels (the job translates).
 */
export function pancettaPaint() {
  const P = {};

  /** Two-pass chamfer distance (3-4 metric, in px) from every `on` pixel to the nearest off pixel. */
  const chamfer = (on, W, H) => {
    const d = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) d[i] = on[i] ? 1e6 : 0;
    const relax = (p, q, w) => {
      if (d[q] + w < d[p]) d[p] = d[q] + w;
    };
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const p = y * W + x;
        if (!on[p]) continue;
        relax(p, p - 1, 3);
        relax(p, p - W, 3);
        relax(p, p - W - 1, 4);
        relax(p, p - W + 1, 4);
      }
    for (let y = H - 2; y > 0; y--)
      for (let x = W - 2; x > 0; x--) {
        const p = y * W + x;
        if (!on[p]) continue;
        relax(p, p + 1, 3);
        relax(p, p + W, 3);
        relax(p, p + W + 1, 4);
        relax(p, p + W - 1, 4);
      }
    for (let i = 0; i < W * H; i++) d[i] /= 3;
    return d;
  };

  /**
   * Ink pixels that belong to a solid fill (thicker than `core` crop px from the paper), minus an ink rim of
   * `rim` crop px so the fill keeps its outline.
   */
  P.solidMask = (S, ink, core, rim) => {
    const { W, H, U, lab } = S;
    const isInk = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) isInk[i] = lab[i] === ink ? 1 : 0;
    const dt = chamfer(isInk, W, H);
    const notCore = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) notCore[i] = dt[i] > core * U ? 0 : 1;
    const toCore = chamfer(notCore, W, H);
    const m = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) m[i] = isInk[i] && toCore[i] <= (core - rim) * U ? 1 : 0;
    return m;
  };

  /** Connected strokes (8-neighbour) of the labels `inks` (line + solid fill): an id per such pixel, -1 elsewhere. */
  P.inkComps = (S, inks) => {
    const { W, H, lab } = S;
    const id = new Int32Array(W * H).fill(-1);
    const stack = new Int32Array(W * H);
    let n = 0;
    for (let s = 0; s < W * H; s++) {
      if (!inks.includes(lab[s]) || id[s] >= 0) continue;
      let top = 0;
      stack[top++] = s;
      id[s] = n;
      while (top) {
        const p = stack[--top];
        const x = p % W;
        for (const q of [p - W - 1, p - W, p - W + 1, p - 1, p + 1, p + W - 1, p + W, p + W + 1]) {
          if (q < 0 || q >= W * H || Math.abs((q % W) - x) > 1 || !inks.includes(lab[q]) || id[q] >= 0) continue;
          id[q] = n;
          stack[top++] = q;
        }
      }
      n++;
    }
    return id;
  };

  /**
   * Part map where `part` also takes the pixels of the parts `from` within `d` crop px of it (so a back part
   * runs on under the front parts: no see-through seam where two cut parts meet).
   */
  P.grow = (S, part, from, d) => {
    const { W, H, U } = S;
    const out = new Int16Array(S.part);
    let front = [];
    for (let p = 0; p < W * H; p++) if (S.part[p] === part) front.push(p);
    for (let step = 0; step < d * U && front.length; step++) {
      const next = [];
      for (const p of front) {
        const x = p % W;
        for (const q of [x > 0 ? p - 1 : -1, x < W - 1 ? p + 1 : -1, p - W, p + W]) {
          if (q < 0 || q >= W * H || out[q] === part || !from.includes(out[q])) continue;
          out[q] = part;
          next.push(q);
        }
      }
      front = next;
    }
    return out;
  };

  const ell = (g, e, grow = 0) => {
    g.beginPath();
    g.ellipse(e.x, e.y, e.rx + grow, e.ry + grow, e.a ?? 0, 0, Math.PI * 2);
  };
  const stroke = (g, col, w) => {
    g.strokeStyle = col;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.stroke();
  };
  const curve = (g, pts) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i];
      const [nx, ny] = pts[i + 1];
      g.quadraticCurveTo(x, y, i === pts.length - 2 ? nx : (x + nx) / 2, i === pts.length - 2 ? ny : (y + ny) / 2);
    }
  };

  /** Expressions the job renders (frame order of the head strip). */
  P.FACES = ['laugh', 'blink', 'windup', 'hurt', 'dizzy', 'cocky'];
  /** Faces whose eyes are first emptied (white + pupil painted skin) by the job's recolour. */
  P.EMPTY = { blink: true, hurt: true, dizzy: true };

  /** Over-paint of the face `kind`: eyes E.l / E.r { x, y, rx, ry } (inside the printed outline), new brows B.l / B.r { c, len }. */
  P.face = (g, COL, kind, E, B, LINE) => {
    const eyes = [E.l, E.r];
    if (kind === 'dizzy')
      for (const e of eyes) {
        ell(g, e, 0.5);
        g.fillStyle = COL.white;
        g.fill();
        g.beginPath();
        const turns = 2.2;
        for (let i = 0; i <= 60; i++) {
          const t = (i / 60) * turns * Math.PI * 2;
          const r = (i / 60) * 0.85;
          g[i ? 'lineTo' : 'moveTo'](e.x + Math.cos(t) * e.rx * r, e.y + Math.sin(t) * e.ry * r);
        }
        stroke(g, COL.ink, LINE * 0.75);
      }
    if (kind === 'blink')
      for (const e of eyes) {
        curve(g, [[e.x - e.rx * 0.9, e.y - e.ry * 0.05], [e.x, e.y + e.ry * 0.55], [e.x + e.rx * 0.9, e.y - e.ry * 0.05]]);
        stroke(g, COL.ink, LINE);
      }
    if (kind === 'hurt')
      for (const [e, s] of [[E.l, 1], [E.r, -1]]) {
        curve(g, [[e.x - s * e.rx * 0.8, e.y - e.ry * 0.55], [e.x + s * e.rx * 0.45, e.y], [e.x - s * e.rx * 0.8, e.y + e.ry * 0.55]]);
        stroke(g, COL.ink, LINE);
      }
    if (kind === 'cocky')
      for (const e of eyes) {
        // heavy upper lids down to the middle of the eye: a smug half-look
        g.save();
        ell(g, e, 0.6);
        g.clip();
        g.fillStyle = COL.skin;
        g.fillRect(e.x - e.rx - 2, e.y - e.ry - 2, e.rx * 2 + 4, e.ry * 0.95 + 2);
        g.restore();
        curve(g, [[e.x - e.rx - 1, e.y - e.ry * 0.12], [e.x, e.y - e.ry * 0.02], [e.x + e.rx + 1, e.y - e.ry * 0.14]]);
        stroke(g, COL.ink, LINE * 1.1);
      }
    if (kind === 'windup' || kind === 'hurt') {
      // (the job's recolour removed the printed brows) new ones: angry (slanting down to the snout) or pained
      const angry = kind === 'windup';
      for (const [b, s] of [[B.l, 1], [B.r, -1]]) {
        const [cx, cy] = b.c;
        const h = b.len / 2;
        const tilt = (angry ? 0.42 : -0.34) * s;
        curve(g, [[cx - h, cy - tilt * h],[cx, cy - 1.5], [cx + h, cy + tilt * h]]);
        stroke(g, COL.ink, LINE * 1.15);
      }
    }
  };

  /** Fills `poly` (shirt px) with `col` and no outline. */
  P.fill = (g, poly, col) => {
    g.beginPath();
    poly.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fillStyle = col;
    g.fill();
  };

  /**
   * The deck's top edge where the rider sat on it (shirt px): the wood `depth` px down from the curve `pts`,
   * then the printed-weight ink line along it (the job clips it to where the body was).
   */
  P.deckEdge = (g, pts, wood, ink, line, depth) => {
    curve(g, pts);
    for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], pts[i][1] + depth);
    g.closePath();
    g.fillStyle = wood;
    g.fill();
    curve(g, pts);
    stroke(g, ink, line);
  };

  window.PIG_PAINT = P;
}
