/**
 * Page-side painting for scripts/level8/brie.mjs (installed as window.BRIE_PAINT; stringified, so it must
 * not reference anything outside its body). Everything is drawn in crop pixels of the Brie crop, in the
 * shirt's own line weight, over / under the cut-out pixels: the cheese the arm and the bottle hid, the
 * wedge tip under the beret, the face expressions, the spoked wheels, the frame tubes behind the legs.
 */
export function briePaint() {
  const P = {};
  const LW = 4.6;

  const stroke = (g, col, lw) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.stroke();
  };
  const path = (g, pts, close) => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) g.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else g.lineTo(p[0], p[1]);
    }
    if (close) g.closePath();
  };

  /** What the wedge shows where the glove + arm, the bottle and the beret covered it. */
  P.wedgeUnder = (g, c, glove, hose) => {
    // the arm: plain cheese, and the bottom edge of the cheese that ran under the glove
    g.fillStyle = c.cheese;
    for (const poly of [glove, hose]) {
      path(g, poly, true);
      g.fill();
    }
    path(g, [[168, 309], [230, 313, 292, 309]]);
    stroke(g, c.ink, LW);
    // the left edge behind the bottle: rind strip + outline down to the bottom corner
    path(g, [[127, 206], [119, 240, 123, 276], [129, 300, 152, 312], [175, 316], [180, 300], [160, 210]], true);
    g.fillStyle = c.white;
    g.fill();
    path(g, [[134, 208], [127, 240, 130, 274], [137, 296, 158, 305], [178, 306], [180, 290], [165, 212]], true);
    g.fillStyle = c.cheese;
    g.fill();
    path(g, [[134, 206], [127, 240, 130, 274], [137, 296, 158, 305]]);
    stroke(g, c.ink, LW * 0.8);
    path(g, [[127, 204], [119, 240, 123, 276], [129, 300, 152, 312], [168, 314]]);
    stroke(g, c.ink, LW);
    // the tip under the beret: the rind cap and the cheese point
    path(g, [[194, 60], [216, 20, 258, 30], [300, 44, 334, 92], [300, 110], [205, 90]], true);
    g.fillStyle = c.white;
    g.fill();
    path(g, [[202, 64], [222, 38, 247, 46], [256, 70, 262, 100], [205, 100]], true);
    g.fillStyle = c.cheese;
    g.fill();
    path(g, [[247, 48], [256, 70, 262, 100]]);
    stroke(g, c.ink, LW * 0.7);
    path(g, [[194, 60], [216, 20, 258, 30], [300, 44, 334, 92]]);
    stroke(g, c.ink, LW);
  };

  /** The end of the handlebar the right glove grips (seen when the glove lets go). */
  P.bar = (g, c) => {
    const pts = [[178, 280], [205, 276, 238, 283]];
    path(g, pts);
    stroke(g, c.ink, 9 + LW * 2);
    path(g, pts);
    stroke(g, c.white, 9);
  };

  // the face, measured on the shirt
  const EYES = [
    { x: 189, y: 167, rx: 26, ry: 38 },
    { x: 243, y: 166, rx: 25, ry: 38 },
  ];
  const coverEyes = (g, c) => {
    g.fillStyle = c.cheese;
    for (const e of EYES) {
      g.beginPath();
      g.ellipse(e.x, e.y, e.rx + 4, e.ry + 3.5, 0, 0, Math.PI * 2);
      g.fill();
    }
    // the nose under the eyes
    g.beginPath();
    g.arc(207, 209, 6.5, -1.9, 2.3);
    stroke(g, c.ink, LW * 0.8);
  };
  const brows = (g, c) => {
    g.fillStyle = c.cheese;
    g.fillRect(164, 102, 50, 24);
    g.fillRect(226, 98, 48, 24);
    path(g, [[168, 108], [190, 114, 212, 128]]);
    stroke(g, c.ink, LW * 1.5);
    path(g, [[228, 128], [250, 112, 272, 104]]);
    stroke(g, c.ink, LW * 1.5);
  };

  /** Face frames: idle (as printed), blink, hurt, windup (frowning brows), shout, dizzy. */
  P.FACES = ['idle', 'blink', 'hurt', 'windup', 'shout', 'dizzy'];
  P.face = (g, c, kind) => {
    if (kind === 'idle') return;
    if (kind === 'blink' || kind === 'hurt' || kind === 'dizzy') coverEyes(g, c);
    if (kind === 'blink')
      for (const e of EYES) {
        path(g, [[e.x - e.rx * 0.85, e.y + 2], [e.x, e.y + 18, e.x + e.rx * 0.85, e.y + 2]]);
        stroke(g, c.ink, LW);
        path(g, [[e.x - e.rx * 0.85, e.y + 2], [e.x - e.rx - 4, e.y - 4]]);
        stroke(g, c.ink, LW * 0.8);
      }
    if (kind === 'hurt') {
      path(g, [[170, 146], [207, 168], [170, 190]]);
      stroke(g, c.ink, LW * 1.4);
      path(g, [[262, 146], [225, 168], [262, 190]]);
      stroke(g, c.ink, LW * 1.4);
    }
    if (kind === 'dizzy')
      for (const e of EYES) {
        g.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.15) {
          const r = 2 + a * 1.25;
          const x = e.x + Math.cos(a) * r * 0.85;
          const y = e.y + Math.sin(a) * r * 1.15;
          if (a === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        stroke(g, c.ink, LW * 0.8);
      }
    if (kind === 'windup' || kind === 'shout') brows(g, c);
    if (kind === 'shout') {
      g.fillStyle = c.cheese;
      g.beginPath();
      g.ellipse(222, 234, 44, 18, -0.05, 0, Math.PI * 2);
      g.fill();
      path(g, [[188, 226], [222, 220, 260, 219], [256, 256, 224, 257], [192, 256, 188, 226]], true);
      g.fillStyle = c.mouth;
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = c.tongue;
      g.beginPath();
      g.ellipse(228, 258, 20, 12, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      stroke(g, c.ink, LW);
      g.beginPath();
      g.arc(207, 207, 6.5, -1.9, 2.0);
      stroke(g, c.ink, LW * 0.8);
    }
  };

  /** A spoked wheel (tyre ellipse + 16 spokes + hub) turned by `turn` of a spoke gap; interior left clear. */
  P.wheel = (g, c, e, turn) => {
    const T = 12.5;
    g.beginPath();
    g.ellipse(e.x, e.y, e.rx - T / 2, e.ry - T / 2, e.tilt ?? 0, 0, Math.PI * 2);
    stroke(g, c.ink, T);
    const n = 16;
    g.save();
    g.translate(e.x, e.y);
    g.rotate(e.tilt ?? 0);
    g.beginPath();
    for (let i = 0; i < n; i++) {
      const a = ((i + turn) / n) * Math.PI * 2;
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * (e.rx - T + 1), Math.sin(a) * (e.ry - T + 1));
    }
    stroke(g, c.ink, 2.4);
    g.beginPath();
    g.ellipse(0, 0, 5, 6, 0, 0, Math.PI * 2);
    g.fillStyle = c.ink;
    g.fill();
    g.restore();
  };

  /** The frame tubes, chain guard and saddle the legs and feet covered (empty bike, flung away). */
  P.tubes = (g, c) => {
    const tube = (pts, w) => {
      path(g, pts);
      stroke(g, c.ink, w + 5.2);
      path(g, pts);
      stroke(g, c.blue, w);
    };
    path(g, [[246, 334], [262, 326, 284, 330], [282, 340, 250, 342]], true);
    g.fillStyle = c.ink;
    g.fill();
    tube([[264, 340], [229, 468]], 7);
    tube([[152, 351], [252, 345]], 7);
    tube([[155, 380], [232, 468]], 9);
    tube([[218, 480], [332, 458]], 15);
    g.beginPath();
    g.arc(232, 472, 8, 0, Math.PI * 2);
    g.fillStyle = c.ink;
    g.fill();
  };

  window.BRIE_PAINT = P;
}
