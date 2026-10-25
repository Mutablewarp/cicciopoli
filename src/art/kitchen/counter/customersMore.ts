/**
 * Four more regulars at the counter (frames 24-39 of 'kitchen-customer', after the six of ./customers),
 * so every slice of the real menu has its fan (../keys.ts CUSTOMERS): Chiara (vegetarian: green
 * beanie, wavy auburn hair, leaf earrings, linen shirt), Tommaso (foodie: trimmed beard, round
 * tortoiseshell glasses, canvas apron over a denim shirt), Peppe (fisherman from the port:
 * sun-weathered, bald with a white fringe, white stubble, striped sailor top, red neckerchief) and
 * Emma (tourist: straw sunhat with the sunglasses pushed up on it, blonde braids, freckles, coral tee,
 * camera on its strap). Same kit, light and outlines as the first six.
 */
import type { Tone } from '../../hills/mask';
import { Raster, hash2, packColor } from '../../hills/raster';
import { rectR } from '../../rampage/draw';
import { CH, CW, arms, capsule, face, finish, head, layer, neck, roundGlasses, tones, torso, type Build, type Pose } from './customerKit';
import { KC } from './palette';

/** Pixels of r painted in one of the tones' colours. */
function inTone(t: Tone): (c: number) => boolean {
  const set = new Set([t.light, t.base, t.shade, t.dark ?? t.shade].map(packColor));
  return (c) => set.has(c);
}

/** Chiara: green knit beanie with a folded band, wavy auburn hair, leaf earrings, open linen shirt. */
function chiara(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 40, rx: 20, ry: 22, sy: 66, sw: 28, neck: 5 };
  const skin = tones('#f0c4a0');
  const hair = { light: '#b8683e', base: '#8e4628', shade: '#6a321c', dark: '#4a2012' };
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - 2, b.rx + 4, b.ry + 1, 1);
    for (const side of [-1, 1]) for (let k = 0; k < 5; k++) m.ellipse(b.hx + side * (b.rx + 2 - (k % 2) * 2), b.hy + 4 + k * 5, 5, 4, 1);
  }, { 1: hair });
  neck(r, b, skin);
  const linen = tones('#e8dfc8');
  layer(r, (m) => torso(m, b, 1, 0), { 1: linen });
  layer(r, (m) => m.poly([[b.hx - 7, b.sy - 3], [b.hx + 7, b.sy - 3], [b.hx, b.sy + 11]], 1), { 1: { ...skin, light: skin.shade } }, 1);
  layer(r, (m) => {
    m.poly([[b.hx - 9, b.sy - 3], [b.hx - 1, b.sy + 9], [b.hx - 12, b.sy + 5]], 1); // collar points
    m.poly([[b.hx + 9, b.sy - 3], [b.hx + 1, b.sy + 9], [b.hx + 12, b.sy + 5]], 1);
  }, { 1: linen }, 1);
  for (let y = b.sy + 14; y < CH; y += 8) rectR(r, b.hx, y, 1, 2, '#b4a68a');
  head(r, b, skin, 0.86);
  face(r, b, pose, skin, { brow: '#6a321c', lips: '#c0504a' });
  for (const side of [-1, 1]) {
    // leaf earrings
    const x = b.hx + side * b.rx;
    r.set(x, b.hy + 7, KC.gold);
    rectR(r, x - 1, b.hy + 8, 3, 3, KC.leafLight);
    r.set(x, b.hy + 11, KC.leaf);
    r.set(x + side, b.hy + 9, KC.leafPale);
  }
  const knit = tones('#4e9e48');
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 6, b.rx + 2, 13, 1);
    for (let y = b.hy - 7; y < CH; y++) m.span(0, CW, y, 0);
    m.rect(b.hx - b.rx - 2, b.hy - 13, b.rx * 2 + 5, 6, 2);
  }, { 1: knit, 2: tones('#3c8240') });
  for (let x = b.hx - b.rx; x <= b.hx + b.rx + 1; x += 3) rectR(r, x, b.hy - 12, 1, 4, '#2e6a32'); // ribbing
  arms(r, b, pose, linen, skin);
  finish(r, b, pose);
}

/** Tommaso: dark quiff, trimmed beard, round tortoiseshell glasses, canvas apron over a denim shirt. */
function tommaso(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 38, rx: 20, ry: 22, sy: 64, sw: 31, neck: 6 };
  const skin = tones('#e2a87c');
  const hair = { light: '#5a3a26', base: '#3a2418', shade: '#2a1810', dark: '#1c100a' };
  neck(r, b, skin);
  const denim = tones('#4a78b0');
  layer(r, (m) => torso(m, b, 1, 4), { 1: denim });
  layer(r, (m) => {
    m.poly([[b.hx - 8, b.sy - 3], [b.hx - 1, b.sy + 5], [b.hx - 11, b.sy + 4]], 1);
    m.poly([[b.hx + 8, b.sy - 3], [b.hx + 1, b.sy + 5], [b.hx + 11, b.sy + 4]], 1);
  }, { 1: tones('#6a96c8') }, 1);
  const apron = tones('#6a5444');
  layer(r, (m) => {
    m.rect(b.hx - 15, b.sy + 12, 31, CH - b.sy - 12, 1);
    capsule(m, b.hx - 14, b.sy + 13, b.hx - 9, b.sy - 1, 1, 1); // straps round the neck
    capsule(m, b.hx + 14, b.sy + 13, b.hx + 9, b.sy - 1, 1, 1);
  }, { 1: apron });
  layer(r, (m) => m.rect(b.hx + 3, b.sy + 22, 9, 8, 1), { 1: tones('#5a4638') }, 1); // bib pocket
  rectR(r, b.hx + 5, b.sy + 19, 1, 4, KC.steelLight); // thermometer in the pocket
  rectR(r, b.hx + 8, b.sy + 20, 1, 3, KC.red);
  head(r, b, skin, 0.88);
  const beard = { light: '#4a3020', base: '#3a2418', shade: '#2a1810', dark: '#1c100a' };
  layer(r, (m) => {
    // trimmed: along the jaw and round the chin, the cheeks left bare
    m.ellipse(b.hx, b.hy + 13, b.rx - 2, 10, 1);
    m.ellipse(b.hx, b.hy + 9, b.rx - 9, 6, 0);
    for (let y = 0; y < b.hy + 7; y++) m.span(0, CW, y, 0);
    for (const side of [-1, 1]) m.rect(b.hx + side * (b.rx - 2) - 1, b.hy, 3, 9, 1); // sideburns
  }, { 1: beard }, 1);
  rectR(r, b.hx - 5, b.hy + 11, 11, 1, '#2a1810'); // moustache over the lip
  face(r, b, pose, skin, { brow: '#2a1810', browW: 7, lips: '#d07a68' });
  roundGlasses(r, b, 8, '#8a5226');
  for (const [dx, dy] of [[-12, 1], [-5, 6], [4, 0], [11, 6]] as const) r.set(b.hx + dx, b.hy + dy, '#d4a050'); // tortoiseshell flecks
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 7, b.rx + 1, 9, 1);
    m.ellipse(b.hx + 4, b.hy - b.ry + 2, 8, 4, 1); // the quiff
    for (let y = b.hy - 9; y < CH; y++) m.span(0, CW, y, 0);
    for (const side of [-1, 1]) m.rect(b.hx + side * (b.rx - 1) - 1, b.hy - 10, 3, 6, 1);
  }, { 1: hair });
  rectR(r, b.hx - 7, b.hy - b.ry - 1, 1, 6, '#5a3a26'); // the side parting
  arms(r, b, pose, denim, skin);
  finish(r, b, pose);
}

/** Peppe: sun-weathered, bald with a white fringe, white stubble, striped sailor top, red neckerchief. */
function peppe(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 40, rx: 21, ry: 22, sy: 66, sw: 33, neck: 7 };
  const skin = tones('#b8764a');
  const white = { light: KC.white, base: '#e4e2dc', shade: '#bcb8ae', dark: '#97938a' };
  neck(r, b, skin);
  const top = tones('#eef0f4');
  layer(r, (m) => torso(m, b, 1, 3), { 1: top });
  layer(r, (m) => {
    m.ellipse(b.hx, b.sy + 1, b.neck + 6, 4, 1);
    m.poly([[b.hx - 4, b.sy + 2], [b.hx + 5, b.sy + 2], [b.hx + 2, b.sy + 12], [b.hx - 1, b.sy + 12]], 1); // knot tails
  }, { 1: tones('#d8302a') }, 1);
  head(r, b, skin, 0.9);
  const bare = new Set([skin.base, skin.shade].map(packColor));
  for (let y = b.hy + 6; y < b.hy + b.ry; y++) {
    for (let x = b.hx - b.rx; x < b.hx + b.rx; x++) {
      const jaw = Math.abs(x - b.hx) > 6 || y > b.hy + 15;
      if (jaw && (x + y) % 2 === 0 && hash2(x, y, 8) < 0.35 && bare.has(r.get(x, y))) r.set(x, y, '#d2c8b8');
    }
  }
  face(r, b, pose, skin, { ex: 8, brow: '#f4f2ee', browW: 7, bigNose: true, lips: '#6a2a1c' });
  for (const side of [-1, 1]) {
    rectR(r, b.hx + side * 14 - (side < 0 ? 2 : 0), b.hy + 3, 3, 1, skin.shade); // crow's feet
    rectR(r, b.hx + side * 14 - (side < 0 ? 2 : 0), b.hy + 5, 2, 1, skin.shade);
  }
  rectR(r, b.hx - 6, b.hy - 9, 12, 1, skin.shade); // forehead lines
  rectR(r, b.hx - 4, b.hy - 12, 8, 1, skin.shade);
  layer(r, (m) => {
    for (const side of [-1, 1]) {
      // the white fringe round the back of the head, above the ears
      m.ellipse(b.hx + side * (b.rx - 1), b.hy - 1, 2, 5, 1);
      m.ellipse(b.hx + side * (b.rx - 4), b.hy - 7, 3, 2, 1);
    }
  }, { 1: white }, 1);
  r.set(b.hx - 7, b.hy - b.ry + 5, skin.light); // shine on the bald top
  rectR(r, b.hx - 9, b.hy - b.ry + 6, 2, 1, skin.light);
  arms(r, b, pose, top, skin);
  // navy stripes on the sailor top and its sleeves
  const shirt = inTone(top);
  for (let y = b.sy + 2; y < CH; y++) {
    if ((y - b.sy) % 7 > 2) continue;
    for (let x = 0; x < CW; x++) if (shirt(r.get(x, y))) r.set(x, y, (y - b.sy) % 7 === 0 ? '#3a4a8a' : '#2a3672');
  }
  finish(r, b, pose);
}

/** Emma: straw sunhat with the sunglasses up on it, blonde braids, freckles, coral tee, camera strap. */
function emma(r: Raster, pose: Pose): void {
  const b: Build = { hx: 48, hy: 44, rx: 19, ry: 21, sy: 69, sw: 27, neck: 5 };
  const skin = tones('#f8d4b8');
  const hair = { light: '#fbe08a', base: '#e8c060', shade: '#c49a3a', dark: '#9a7426' };
  layer(r, (m) => m.ellipse(b.hx, b.hy - 2, b.rx + 3, b.ry, 1), { 1: hair });
  neck(r, b, skin);
  const tee = tones('#f07a62');
  layer(r, (m) => torso(m, b, 1, 4), { 1: tee });
  layer(r, (m) => {
    // two braids over the shoulders
    for (const side of [-1, 1]) capsule(m, b.hx + side * (b.rx - 2), b.hy + 6, b.hx + side * (b.rx + 1), b.sy + 22, 3, 1);
  }, { 1: hair }, 1);
  for (const side of [-1, 1]) {
    for (let y = b.hy + 9; y < b.sy + 22; y += 3) r.set(b.hx + side * (b.rx - 1), y, hair.dark);
    rectR(r, b.hx + side * (b.rx + 1) - 1, b.sy + 23, 3, 2, '#3a7ad0'); // hair ties
  }
  layer(r, (m) => capsule(m, b.hx - b.sw + 8, b.sy - 1, b.hx + 16, b.sy + 30, 1, 1), { 1: tones('#2a2a30') }, 1); // camera strap
  layer(r, (m) => m.rect(b.hx + 9, b.sy + 26, 15, 10, 1), { 1: tones('#34343c') }, 1);
  rectR(r, b.hx + 14, b.sy + 28, 6, 6, '#1a1a20'); // lens
  rectR(r, b.hx + 15, b.sy + 29, 4, 4, '#4a5a7a');
  r.set(b.hx + 16, b.sy + 30, KC.white);
  rectR(r, b.hx + 11, b.sy + 27, 2, 1, KC.steelLight);
  head(r, b, skin, 0.86);
  for (const [dx, dy] of [[-11, 7], [-9, 8], [-12, 9], [-8, 10], [10, 7], [8, 8], [11, 9], [9, 10], [-1, 6], [1, 6]] as const) {
    r.set(b.hx + dx, b.hy + dy, '#d89470');
  }
  face(r, b, pose, skin, { brow: '#c49a3a', lips: '#d0505a' });
  const straw = tones('#e8cc84');
  layer(r, (m) => {
    m.ellipse(b.hx, b.hy - b.ry + 6, b.rx + 1, 12, 1);
    for (let y = b.hy - 9; y < CH; y++) m.span(0, CW, y, 0);
    m.ellipse(b.hx, b.hy - 10, b.rx + 14, 4, 2); // the wide brim
  }, { 1: straw, 2: straw });
  rectR(r, b.hx - b.rx, b.hy - 15, b.rx * 2 + 1, 3, '#2a3a6a'); // hat band
  for (let x = b.hx - b.rx - 12; x < b.hx + b.rx + 12; x += 4) r.set(x, b.hy - 10, '#c8a860'); // weave
  for (const side of [-1, 1]) {
    // sunglasses pushed up onto the hat
    rectR(r, b.hx + side * 7 - 3, b.hy - 19, 7, 4, KC.ink);
    r.set(b.hx + side * 7 - 2, b.hy - 18, '#6a7a9a');
  }
  rectR(r, b.hx - 1, b.hy - 18, 3, 1, KC.ink);
  arms(r, b, pose, tee, skin, true);
  finish(r, b, pose);
}

export const MORE_LOOKS = [chiara, tommaso, peppe, emma] as const;
