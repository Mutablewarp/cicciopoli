#!/usr/bin/env node
/**
 * Rebuilds the brand files in public/ from the official logo (white face, black lines, alpha):
 *   brand/ciccios-logo.png  re-encoded as an indexed PNG (gray and alpha in 16 steps):
 *                           ~19 KB instead of ~200 KB, so it is on screen before the game bundle
 *   apple-touch-icon.png    180x180, the logo face on black (iOS home screen)
 *   icon-192.png, icon-512.png  same, for manifest.webmanifest (Android home screen)
 * Safe to re-run: quantizing an already quantized logo changes nothing.
 *
 *   node scripts/brand-assets.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { PNG } from 'pngjs';

const pub = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const LOGO = path.join(pub, 'brand', 'ciccios-logo.png');
const LEVELS = 16;
/** Face only (the wordmark is unreadable at icon size); found from the logo's alpha rows. */
const FACE = { x: 8, y: 8, w: 553, h: 798 };
/** Share of the icon height the face fills. */
const FACE_FILL = 0.84;

const src = PNG.sync.read(readFileSync(LOGO));
const q = (v) => Math.round((Math.round((v / 255) * (LEVELS - 1)) * 255) / (LEVELS - 1));

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Gray+alpha RGBA image -> 8-bit palette PNG with tRNS (pngjs cannot write palettes). */
function indexedPng(img) {
  const pal = new Map();
  const rows = Buffer.alloc((img.width + 1) * img.height); // each row: filter byte 0 + indices
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      const a = q(img.data[i + 3]);
      const key = ((a === 0 ? 0 : q(img.data[i])) << 8) | a;
      if (!pal.has(key)) pal.set(key, pal.size);
      rows[y * (img.width + 1) + 1 + x] = pal.get(key);
    }
  }
  if (pal.size > 256) throw new Error(`brand-assets: ${pal.size} colours, palette holds 256`);
  const keys = [...pal.keys()];
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(img.width, 0);
  ihdr.writeUInt32BE(img.height, 4);
  ihdr.set([8, 3, 0, 0, 0], 8); // 8-bit, palette, deflate, no filter, no interlace
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('PLTE', Buffer.from(keys.flatMap((k) => [k >> 8, k >> 8, k >> 8]))),
    chunk('tRNS', Buffer.from(keys.map((k) => k & 255))),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9, memLevel: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** The face composited on black and area-averaged down into a size x size square. */
function icon(size) {
  const out = new PNG({ width: size, height: size });
  const scale = (size * FACE_FILL) / FACE.h; // dest px per source px
  const ox = (size - FACE.w * scale) / 2;
  const oy = (size - FACE.h * scale) / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx0 = (x - ox) / scale;
      const sy0 = (y - oy) / scale;
      let sum = 0;
      let n = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy0 + 1 / scale); sy++) {
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx0 + 1 / scale); sx++) {
          n++;
          if (sx < 0 || sy < 0 || sx >= FACE.w || sy >= FACE.h) continue;
          const i = ((sy + FACE.y) * src.width + sx + FACE.x) * 4;
          sum += (src.data[i] * src.data[i + 3]) / 255;
        }
      }
      const v = Math.round(sum / Math.max(1, n));
      out.data.set([v, v, v, 255], (y * size + x) * 4);
    }
  }
  return PNG.sync.write(out, { colorType: 2 });
}

const packed = indexedPng(src);
const back = PNG.sync.read(packed);
for (let i = 0; i < src.data.length; i += 4) {
  const a = q(src.data[i + 3]);
  const ok = back.data[i + 3] === a && (a === 0 || back.data[i] === q(src.data[i]));
  if (!ok) throw new Error(`brand-assets: round trip differs at pixel ${i / 4}`);
}
writeFileSync(LOGO, packed);
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  writeFileSync(path.join(pub, name), icon(size));
}
console.log(`logo ${src.width}x${src.height}: ${packed.length} bytes; icons 180/192/512 written`);
