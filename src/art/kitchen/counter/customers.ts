/**
 * The ten regulars at the counter ('kitchen-customer', 96x112 x 40 = CUSTOMERS x POSES, see
 * ../keys.ts): Signora Rosalia, Nonno Turi, Giulia, Salvo, Martina, Kevin here, Chiara, Tommaso,
 * Peppe and Emma in ./customersMore. Each one has its own silhouette (grey curls, coppola, long hair +
 * headphones, broad hi-vis builder, ponytail + scarf, a kid in a bucket hat, ...), skin tone and
 * colours. The bottom ~20 rows sit behind the counter.
 */
import { Raster, hash2, outlineRaster, packColor } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { CH, CW, POSES, arms, capsule, face, finish, head, layer, neck, roundGlasses, tones, torso, type Build, type Pose } from './customerKit';
import { MORE_LOOKS } from './customersMore';
import { KC } from './palette';

/** Signora Rosalia: grey curls, cat-eye glasses on a chain, floral blouse, shopping-bag strap. */
function rosalia(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 42, rx: 21, ry: 21, sy: 67, sw: 33, neck: 6 };
  const skin = tones('#f0c09a');
  const hair = { light: '#f2f2f6', base: '#c9c9d2', shade: '#9a9aa8', dark: '#74748a' };
  layer(r, (m) => {
    for (let a = 0; a <= 12; a++) {
      const t = Math.PI * (0.92 + (a / 12) * 1.16);
      m.ellipse(b.hx + Math.cos(t) * (b.rx + 1), b.hy - 2 + Math.sin(t) * (b.ry + 1), 6, 6, 1);
    }
    for (const side of [-1, 1]) m.ellipse(b.hx + side * (b.rx + 2), b.hy + 6, 5, 6, 1);
  }, { 1: hair });
  neck(r, b, skin);
  const blouse = tones('#7656b4');
  layer(r, (m) => torso(m, b, 1, 5), { 1: blouse });
  for (let row = 0, y = b.sy + 4; y < CH; row++, y += 7) {
    for (let x = 48 - b.sw + 4 + (row % 2) * 4; x < 48 + b.sw - 3; x += 9) {
      if (r.get(x, y) === 0 || hash2(x, y, 5) < 0.2) continue;
      rectR(r, x - 1, y, 3, 1, '#f490c0');
      rectR(r, x, y - 1, 1, 3, '#f490c0');
      r.set(x, y, '#ffe060');
    }
  }
  layer(r, (m) => capsule(m, 48 - b.sw + 10, b.sy - 1, 48 + b.sw - 8, CH + 4, 2, 1), { 1: tones('#9a6236') }, 1);
  layer(r, (m) => {
    m.ellipse(b.hx - 6, b.sy + 1, 6, 4, 1); // white round collar
    m.ellipse(b.hx + 6, b.sy + 1, 6, 4, 1);
  }, { 1: { light: KC.white, base: '#ecebe4', shade: '#c8c6be' } }, 1);
  head(r, b, skin, 0.92);
  face(r, b, pose, skin, { brow: '#8a8a98', lips: '#c02a40' });
  for (const side of [-1, 1] as const) {
    const cx = b.hx + side * 8;
    rectR(r, cx - 4, b.hy - 1, 9, 1, '#c0306a'); // cat-eye frames, swept up at the outer corner
    rectR(r, cx - 4, b.hy + 6, 9, 1, '#c0306a');
    rectR(r, cx + side * 4, b.hy - 2, 1, 8, '#c0306a');
    r.set(cx + side * 5, b.hy - 3, '#c0306a');
    rectR(r, cx - side * 4, b.hy, 1, 6, '#c0306a');
    for (let k = 0; k < 9; k++) r.set(cx + side * (5 + Math.round(k * 0.4)), b.hy + 3 + k * 2, KC.gold); // chain
  }
  for (const side of [-1, 1]) {
    rectR(r, b.hx + side * b.rx - 1, b.hy + 8, 3, 3, KC.white); // pearl earrings
    r.set(b.hx + side * b.rx - 1, b.hy + 8, '#ffffff');
  }
  layer(r, (m) => {
    for (let x = b.hx - 13; x <= b.hx + 13; x += 6) m.ellipse(x, b.hy - b.ry + 3 + (Math.abs(x - b.hx) > 8 ? 2 : 0), 4, 4, 1);
  }, { 1: hair }, 1);
  arms(r, b, pose, blouse, skin);
  finish(r, b, pose);
}

/** Nonno Turi: coppola cap, white bushy brows and moustache, waistcoat over a white shirt. */
function turi(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 39, rx: 19, ry: 23, sy: 65, sw: 27, neck: 5 };
  const skin = tones('#d49a6a');
  const white = { light: KC.white, base: '#ecebe6', shade: '#c4c2ba', dark: '#9a988e' };
  neck(r, b, skin);
  const shirt = tones('#dfe8f2');
  layer(r, (m) => torso(m, b, 1, 4), { 1: shirt });
  const vest = tones('#5e4838');
  layer(r, (m) => {
    torso(m, b, 1, 0);
    m.poly([[b.hx - 7, b.sy - 2], [b.hx + 8, b.sy - 2], [b.hx + 1, b.sy + 26], [b.hx, b.sy + 26]], 0);
  }, { 1: vest });
  for (let y = b.sy + 28; y < CH; y += 7) rectR(r, b.hx, y, 2, 2, '#c8a060');
  layer(r, (m) => {
    m.poly([[b.hx - 7, b.sy - 3], [b.hx - 1, b.sy + 4], [b.hx - 9, b.sy + 3]], 1); // shirt collar points
    m.poly([[b.hx + 8, b.sy - 3], [b.hx + 2, b.sy + 4], [b.hx + 10, b.sy + 3]], 1);
  }, { 1: shirt }, 1);
  head(r, b, skin, 0.78);
  layer(r, (m) => {
    for (const side of [-1, 1]) m.ellipse(b.hx + side * (b.rx - 1), b.hy - 1, 3, 5, 1);
  }, { 1: white }, 1);
  face(r, b, pose, skin, { ex: 7, brow: '#f4f2ee', browW: 7, bigNose: true, hush: true });
  rectR(r, b.hx - 7 - 7, b.hy + 3, 2, 1, skin.shade); // crow's feet
  rectR(r, b.hx + 7 + 6, b.hy + 3, 2, 1, skin.shade);
  rectR(r, b.hx - 5, b.hy - 7, 10, 1, skin.shade);
  layer(r, (m) => {
    // droopy grey-white moustache (greyer than teeth so it never reads as a grin)
    for (const side of [-1, 1]) {
      m.ellipse(b.hx + side * 4, b.hy + 12, 5, 2, 1);
      m.ellipse(b.hx + side * 8, b.hy + 14, 2, 2, 1);
    }
  }, { 1: { light: '#f4f2ee', base: '#cfccc4', shade: '#a6a39a', dark: '#85827a' } }, 2);
  rectR(r, b.hx, b.hy + 11, 1, 2, '#85827a');
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 7, b.rx + 2, 10, 1);
    for (let y = b.hy - 8; y < CH; y++) m.span(0, CW, y, 0);
    m.ellipse(b.hx, b.hy - 9, b.rx + 4, 2, 2); // brim
  }, { 1: tones('#857360'), 2: tones('#5a4c3e') });
  for (let y = b.hy - b.ry - 2; y < b.hy - 10; y++) {
    for (let x = b.hx - b.rx; x < b.hx + b.rx; x++) if (hash2(x, y, 9) < 0.18 && r.get(x, y) !== 0 && r.get(x, y - 1) !== 0) r.set(x, y, '#6e5e4c');
  }
  arms(r, b, pose, shirt, skin);
  finish(r, b, pose);
}

/** Giulia: long brown hair with a fringe, round glasses, headphones round the neck, yellow hoodie. */
function giulia(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 38, rx: 20, ry: 22, sy: 64, sw: 28, neck: 5 };
  const skin = tones('#f6c9a2');
  const hair = { light: '#7a4a32', base: '#4e2e1e', shade: '#3a2016', dark: '#28160e' };
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - 3, b.rx + 4, b.ry + 2, 1);
    m.rect(b.hx - b.rx - 4, b.hy, b.rx * 2 + 9, b.sy - b.hy + 14, 1);
  }, { 1: hair });
  neck(r, b, skin);
  const hoodie = tones('#f2c230');
  layer(r, (m) => m.ellipse(b.hx, b.sy + 1, b.neck + 10, 6, 1), { 1: tones('#d8a418') }); // bunched hood
  layer(r, (m) => torso(m, b, 1, 4), { 1: hoodie });
  for (const side of [-1, 1]) {
    rectR(r, b.hx + side * 3, b.sy + 3, 1, 12, KC.white); // drawstrings
    rectR(r, b.hx + side * 3, b.sy + 15, 1, 2, KC.steel);
  }
  layer(r, (m) => {
    capsule(m, b.hx - b.neck - 7, b.sy - 2, b.hx + b.neck + 7, b.sy - 2, 1, 1);
    for (const side of [-1, 1]) m.ellipse(b.hx + side * (b.neck + 8), b.sy + 1, 4, 5, 2);
  }, { 1: tones('#2a2a30'), 2: tones('#e23a3a') }, 1);
  head(r, b, skin, 0.86);
  face(r, b, pose, skin, { brow: '#4e2e1e', lips: '#a83a3a' });
  roundGlasses(r, b, 8, '#2a2a34');
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 6, b.rx + 1, 10, 1);
    for (let y = b.hy - 6; y < CH; y++) m.span(0, CW, y, 0);
    for (const side of [-1, 1]) m.rect(b.hx + side * (b.rx - 1) - 2, b.hy - 8, 4, 18, 1);
  }, { 1: hair });
  arms(r, b, pose, hoodie, skin);
  finish(r, b, pose);
}

/** Salvo: tanned builder, cap on backwards, stubble, orange hi-vis vest over a grey tee. */
function salvo(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 36, rx: 22, ry: 23, sy: 62, sw: 35, neck: 8 };
  const skin = tones('#c4844f');
  neck(r, b, skin);
  const tee = tones('#6c7688');
  layer(r, (m) => torso(m, b, 1, 4), { 1: tee });
  layer(r, (m) => {
    torso(m, b, 1, 0);
    m.poly([[b.hx - 9, b.sy - 2], [b.hx + 9, b.sy - 2], [b.hx, b.sy + 18]], 0);
  }, { 1: tones('#ff7a1a') });
  for (const y of [b.sy + 22, b.sy + 36]) {
    for (let x = 0; x < CW; x++) {
      if (r.get(x, y) === 0 || r.get(x, y + 3) === 0 || Math.abs(x - b.hx) < 1) continue;
      rectR(r, x, y, 1, 3, '#e4e8ee');
      r.set(x, y + 2, '#a8b0bc');
    }
  }
  rectR(r, b.hx, b.sy + 18, 1, CH, KC.ink);
  head(r, b, skin, 0.92);
  const bare = new Set([skin.base, skin.shade].map(packColor));
  for (let y = b.hy + 6; y < b.hy + b.ry; y++) {
    for (let x = b.hx - b.rx; x < b.hx + b.rx; x++) {
      const jaw = Math.abs(x - b.hx) > 6 || y > b.hy + 15; // stubble on the jaw and the chin
      if (jaw && (x + y) % 2 === 0 && hash2(x, y, 4) < 0.5 && bare.has(r.get(x, y))) r.set(x, y, '#8e5e3a');
    }
  }
  face(r, b, pose, skin, { ex: 9, brow: '#2a1c14', browW: 7 });
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 8, b.rx + 2, 11, 1);
    for (let y = b.hy - 6; y < CH; y++) m.span(0, CW, y, 0);
    m.rect(b.hx - b.rx - 1, b.hy - 9, b.rx * 2 + 3, 3, 2); // band
  }, { 1: tones('#2c5cba'), 2: tones('#1e4290') });
  rectR(r, b.hx - 4, b.hy - 11, 9, 3, '#2a1c14'); // snapback gap showing the hair
  rectR(r, b.hx - 3, b.hy - 12, 7, 1, '#2a1c14');
  rectR(r, b.hx - 3, b.hy - 10, 7, 1, '#c8ccd4'); // strap
  arms(r, b, pose, tee, skin, true);
  finish(r, b, pose);
}

/** Martina: rosanero scarf, dark high ponytail, gold hoop earrings, black jacket. */
function martina(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 38, rx: 20, ry: 22, sy: 64, sw: 28, neck: 5 };
  const skin = tones('#d99c6c');
  const hair = { light: '#4a3028', base: '#2a1a16', shade: '#1c100e', dark: '#140a08' };
  layer(r, (m) => {
    capsule(m, b.hx + 8, b.hy - b.ry, b.hx + b.rx + 8, b.hy - b.ry - 2, 4, 1); // ponytail
    capsule(m, b.hx + b.rx + 8, b.hy - b.ry - 2, b.hx + b.rx + 11, b.hy + 8, 4, 1);
  }, { 1: hair });
  neck(r, b, skin);
  const jacket = tones('#30303c');
  layer(r, (m) => torso(m, b, 1, 4), { 1: jacket });
  rectR(r, b.hx, b.sy + 6, 1, CH, '#8a8a96'); // zip
  head(r, b, skin, 0.84);
  face(r, b, pose, skin, { brow: '#2a1a16', lips: '#c0405a' });
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 7, b.rx + 1, 10, 1);
    for (let y = b.hy - 8; y < CH; y++) m.span(0, CW, y, 0);
  }, { 1: hair });
  rectR(r, b.hx + 9, b.hy - b.ry - 1, 3, 4, KC.pink); // hair tie
  for (const side of [-1, 1]) {
    const x = b.hx + side * b.rx;
    for (const [dx, dy] of [[-2, 8], [2, 8], [-3, 10], [3, 10], [-3, 12], [3, 12], [-2, 14], [2, 14], [-1, 15], [1, 15], [0, 15]] as const) {
      r.set(x + dx, b.hy + dy, KC.gold);
    }
  }
  layer(r, (m) => {
    m.ellipse(b.hx, b.sy + 1, b.neck + 11, 5, 1);
    m.rect(b.hx - 15, b.sy + 2, 9, 32, 1);
  }, { 1: tones(KC.pink) });
  for (let y = b.sy - 4; y < CH; y++) {
    if (Math.floor((y - b.sy) / 4) % 2 === 0) continue;
    for (let x = 0; x < CW; x++) {
      const c = r.get(x, y);
      if (c !== 0 && Math.abs(x - b.hx) < b.neck + 12 && y < b.sy + 34 && isPink(c)) r.set(x, y, '#1e1e24');
    }
  }
  arms(r, b, pose, jacket, skin);
  finish(r, b, pose);
}

const PINK = tones(KC.pink);
const PINKS = new Set([PINK.light, PINK.base, PINK.shade, PINK.dark ?? PINK.shade].map((h) => parseInt(h.slice(1), 16)));
const isPink = (c: number): boolean => PINKS.has(c & 0xffffff);

/** Kevin: skater kid, bucket hat, oversized tee with a little burger print, freckles, braces. */
function kevin(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 45, rx: 19, ry: 21, sy: 71, sw: 27, neck: 5 };
  const skin = tones('#f7cfae');
  neck(r, b, skin);
  const tee = tones('#62b0ea');
  layer(r, (m) => torso(m, b, 1, 3), { 1: tee });
  const print = ['.oooooo.', 'oyyyyyyo', 'gggggggg', 'bbbbbbbb', '.oooooo.'];
  print.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== '.') r.set(b.hx - 4 + i, b.sy + 12 + j, { o: '#e0902c', y: '#fcd400', g: '#5cc020', b: '#6a3420' }[ch] ?? KC.ink);
  }));
  head(r, b, skin, 0.88);
  for (const [dx, dy] of [[-10, 7], [-8, 8], [-11, 9], [9, 7], [11, 8], [8, 9]] as const) r.set(b.hx + dx, b.hy + dy, '#d48a62');
  face(r, b, pose, skin, { brow: '#b0521e', braces: true });
  layer(r, (m) => {
    for (const side of [-1, 1]) m.rect(b.hx + side * (b.rx - 2) - 2, b.hy - 9, 5, 6, 1);
  }, { 1: tones('#c8642a') }, 1);
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 6, b.rx - 1, 10, 1);
    for (let y = b.hy - 9; y < CH; y++) m.span(0, CW, y, 0);
    m.ellipse(b.hx, b.hy - 9, b.rx + 6, 3, 2); // floppy brim
  }, { 1: tones('#2aa59a'), 2: tones('#1f8278') });
  arms(r, b, pose, tee, skin, true);
  finish(r, b, pose);
}

const LOOKS = [rosalia, turi, giulia, salvo, martina, kevin, ...MORE_LOOKS] as const;

export function buildCustomers(): Raster[] {
  return LOOKS.flatMap((draw) => POSES.map((pose) => {
    const r = new Raster(CW, CH);
    draw(r, pose);
    outlineRaster(r, KC.ink);
    return r;
  }));
}

