#!/usr/bin/env node
/**
 * Fidelity proof for the BOSS-C art: composes the SHIPPED part images (public/level8/<boss>/*.webp) at their
 * rest pose (the source boxes of sprites.ts, exactly where the rig puts them at rest) over the reference crop
 * of the shirt, measures the silhouette IoU against the reference silhouette written by the build's --debug
 * run, and saves a contact sheet: reference crop | game sprite | overlay (sprite edge red, shirt edge blue).
 *
 *   node scripts/level8/oldschool.mjs --debug <dir> && node scripts/level8/oldschool-proof.mjs oldschool <dir>
 *   node scripts/level8/doubletriple.mjs --debug <dir> && node scripts/level8/oldschool-proof.mjs doubletriple <dir>
 */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dataUrl, openKit, save } from './oldschool-kit.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [boss, dir] = process.argv.slice(2);
const BOSSES = {
  oldschool: {
    ref: 'ref/level8_shirt_old_school_v2.png',
    crop: { x: 410, y: 1085, w: 490, h: 570 },
    order: { arm: 'arm', handBack: 'hand-back', burger: 'burger', handFront: 'hand-front' },
  },
  doubletriple: {
    ref: 'ref/level8_shirt_double_triple_v2.png',
    crop: { x: 335, y: 935, w: 380, h: 375 },
    order: { legL: 'leg-l', legR: 'leg-r', armR: 'arm-r', armL: 'arm-l', body: 'body' },
  },
};
const B = BOSSES[boss];
if (!B || !dir) {
  console.error('usage: node scripts/level8/oldschool-proof.mjs <oldschool|doubletriple> <dir>');
  process.exit(2);
}
const src = readFileSync(path.join(ROOT, `src/game/cartoon/bosses/${boss}/sprites.ts`), 'utf8');
const boxes = {};
for (const m of src.matchAll(/(\w+): \{ x: ([\d.]+), y: ([\d.]+), w: ([\d.]+), h: ([\d.]+) \}/g)) boxes[m[1]] = { x: +m[2], y: +m[3], w: +m[4], h: +m[5] };
const parts = Object.entries(B.order).map(([k, file]) => ({ box: boxes[k], url: `data:image/webp;base64,${readFileSync(path.join(ROOT, `public/level8/${boss}/${file}.webp`)).toString('base64')}` }));

const { page, close } = await openKit();
try {
  const res = await page.evaluate(
    async ({ crop, refUrl, maskUrl, parts }) => {
      const S = 2;
      const W = crop.w * S;
      const H = crop.h * S;
      const ref = await K.load(refUrl);
      const refC = K.canvas(W, H);
      const rg = K.ctx2d(refC);
      rg.imageSmoothingQuality = 'high';
      rg.drawImage(ref, crop.x, crop.y, crop.w, crop.h, 0, 0, W, H);
      const mImg = await K.load(maskUrl);
      const mC = K.canvas(W, H);
      K.ctx2d(mC).drawImage(mImg, 0, 0, W, H);
      const m = K.ctx2d(mC).getImageData(0, 0, W, H).data;
      const spr = K.canvas(W, H);
      const sg = K.ctx2d(spr);
      sg.imageSmoothingQuality = 'high';
      for (const p of parts) {
        const im = await K.load(p.url);
        sg.drawImage(im, (p.box.x - crop.x) * S, (p.box.y - crop.y) * S, p.box.w * S, p.box.h * S);
      }
      const a = sg.getImageData(0, 0, W, H).data;
      let inter = 0;
      let uni = 0;
      const A = new Uint8Array(W * H);
      const R = new Uint8Array(W * H);
      for (let i = 0; i < W * H; i++) {
        A[i] = a[i * 4 + 3] > 127 ? 1 : 0;
        R[i] = m[i * 4] > 127 ? 1 : 0;
        if (A[i] && R[i]) inter++;
        if (A[i] || R[i]) uni++;
      }
      const edge = (M, i) => M[i] && (!M[i - 1] || !M[i + 1] || !M[i - W] || !M[i + W]);
      const sheet = K.canvas(W * 3, H);
      const g = K.ctx2d(sheet);
      g.fillStyle = '#d9d4c8';
      g.fillRect(0, 0, W * 3, H);
      g.drawImage(refC, 0, 0);
      g.drawImage(spr, W, 0);
      const ov = rg.getImageData(0, 0, W, H);
      const od = ov.data;
      for (let i = W; i < W * H - W; i++) {
        const l = od[i * 4] * 0.3 + od[i * 4 + 1] * 0.59 + od[i * 4 + 2] * 0.11;
        const t = a[i * 4 + 3] / 255;
        for (let k = 0; k < 3; k++) od[i * 4 + k] = (l * 0.6 + 100) * (1 - t * 0.55) + a[i * 4 + k] * t * 0.55;
        if (edge(R, i)) (od[i * 4] = 30), (od[i * 4 + 1] = 90), (od[i * 4 + 2] = 255);
        if (edge(A, i)) (od[i * 4] = 255), (od[i * 4 + 1] = 30), (od[i * 4 + 2] = 30);
      }
      const oc = K.canvas(W, H);
      K.ctx2d(oc).putImageData(ov, 0, 0);
      g.drawImage(oc, W * 2, 0);
      return { iou: inter / uni, sheet: sheet.toDataURL('image/png') };
    },
    { crop: B.crop, refUrl: dataUrl(path.join(ROOT, B.ref)), maskUrl: dataUrl(path.join(dir, `${boss}_refmask.png`)), parts },
  );
  save(path.join(dir, `${boss}_proof.png`), res.sheet);
  console.log(`${boss}: silhouette IoU ${res.iou.toFixed(3)} → ${path.join(dir, `${boss}_proof.png`)}`);
} finally {
  await close();
}
