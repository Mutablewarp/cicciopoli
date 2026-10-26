#!/usr/bin/env node
/**
 * Level 8 · BOSS-D art builder: cuts IL BOSS DELLA BURGER GANG out of the owner's newest shirt screenshot
 * (ref/level8_shirt_burger_gang_v2.png) instead of redrawing him: crop the mascot, upscale x4, quantise to the
 * print's flat palette and despeckle (the labels only choose what is shirt, sticker band and which part a pixel
 * belongs to: the colours stay the print's own pixels, nothing is posterised), remove the black shirt (outside, the
 * holes, the print shadows under the shoes), keep the white sticker band of the shirt with a thin ink edge outside
 * it, split him into parts with pivots (legs, arms, glove, sunglasses, mouth, body), paint what each moving part
 * uncovers, pack one WebP atlas.
 * Also cuts the BURGER GANG lettering of the shirt for the arena sign. Node has no image library here: the pixels
 * are processed in headless Chromium (burgergang-px.mjs, burgergang-cut.mjs) and written with fs.
 *
 *   node scripts/level8/burgergang.mjs [--debug <dir>]
 *
 * Writes public/level8/burgergang/{boss,gang}.webp and src/game/cartoon/bosses/burgergang/art/atlas.ts.
 * --debug also writes clean.png (the cleaned print), parts.png (the atlas on a night colour), check.png (the atlas
 * parts put back together).
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC } from './burgergang-spec.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const lib = (f) => readFileSync(path.join(ROOT, 'scripts/level8', f), 'utf8');
const args = process.argv.slice(2);
const debugDir = args.includes('--debug') ? path.resolve(args[args.indexOf('--debug') + 1]) : null;
const OUT_DIR = path.join(ROOT, 'public/level8/burgergang');
const ATLAS_TS = path.join(ROOT, 'src/game/cartoon/bosses/burgergang/art/atlas.ts');

/** Runs in the page: returns data URLs + numbers. */
async function build({ spec, src, debug }) {
  const X = window.BGPX;
  const C = window.BGCUT;
  const img = await X.load(src);
  const palette = spec.palette.map(([, hex]) => hex);
  const id = (name) => spec.palette.findIndex(([n]) => n === name);
  const toPx = (pts) => pts.map(([x, y]) => [(x - spec.crop.x) * spec.up, (y - spec.crop.y) * spec.up]);
  const c = X.crop(img, spec.crop, spec.up);
  const { width: w, height: h } = c;
  let L = X.quantise(c, palette, [id('ink'), id('white')], spec.clean.grey, spec.clean.split);
  L = X.mode(L, w, h, palette.length, spec.clean.radius, spec.clean.passes);
  const { bg, contour } = X.cutout(L, w, h, {
    ink: id('ink'),
    white: id('white'),
    holes: toPx(spec.holes),
    band: spec.clean.band,
    seal: spec.clean.seal,
    ground: X.polyMask(w, h, toPx(spec.ground)),
    protect: X.polyMask(w, h, toPx(spec.protect)),
  });
  const keep = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    keep[i] = bg[i] ? 0 : 1;
    if (contour[i]) L[i] = id('ink');
  }
  // no slivers (the print shadow cut leaves hair-thin bits by the soles): an opening of the cut-out by `open` px
  const outside = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) outside[i] = 1 - keep[i];
  const dIn = X.distance(outside, w, h);
  const core = dIn.map((d) => (d > spec.clean.open ? 1 : 0));
  const dCore = X.distance(core, w, h);
  for (let i = 0; i < w * h; i++) {
    keep[i] = keep[i] && dCore[i] <= spec.clean.open ? 1 : 0;
    outside[i] = 1 - keep[i];
  }
  // a clean ink edge all round (where the cut went through a sole or a hole lining)
  const dOut = X.distance(outside, w, h);
  for (let i = 0; i < w * h; i++) if (keep[i] && dOut[i] <= spec.clean.outline) L[i] = id('ink');
  // the colours: the print's own pixels; the sticker band flat white with a thin ink ring outside it
  const rgba = X.ctx2d(c).getImageData(0, 0, w, h).data;
  // a light unsharp mask: the screenshot of the print is soft
  const soft = X.canvas(w, h);
  const sg = X.ctx2d(soft);
  sg.filter = `blur(${spec.clean.sharpen.px}px)`;
  sg.drawImage(c, 0, 0);
  const sd = sg.getImageData(0, 0, w, h).data;
  for (let i = 0; i < rgba.length; i++) if ((i & 3) !== 3) rgba[i] += spec.clean.sharpen.amount * (rgba[i] - sd[i]);
  const ink = [...X.hex(palette[id('ink')]), 255];
  const white = [...X.hex(palette[id('white')]), 255];
  for (let i = 0; i < w * h; i++) {
    if (!keep[i]) continue;
    if (dOut[i] <= spec.clean.ring) rgba.set(ink, i * 4);
    else if (contour[i]) rgba.set(white, i * 4);
  }
  const names = spec.palette.map(([n]) => n);
  // the paint under moving parts in the print's mean tones (no flat patch of another colour shows when they move)
  const tones = X.meanColours(L, rgba, w, h, palette, spec.clean.interior);
  const parts = C.cutParts(L, keep, w, h, { ...spec, names }, tones, rgba);
  const s = spec.tex / spec.up;
  const atlas = C.pack(parts, s, spec.pad, spec.maxW);
  const out = { boss: atlas.canvas.toDataURL('image/webp', spec.quality), rects: atlas.rects, size: [atlas.canvas.width, atlas.canvas.height] };
  // silhouette check: the atlas parts put back where they were cut, against the cleaned character mask
  const back = X.canvas(w * s, h * s);
  const zOf = (n) => spec.parts.find((p) => p.name === n).z;
  for (const p of [...parts].sort((u, v) => zOf(u.name) - zOf(v.name))) {
    const r = atlas.rects[p.name];
    X.ctx2d(back).drawImage(atlas.canvas, r.x, r.y, r.w, r.h, r.ox * s, r.oy * s, r.w, r.h);
  }
  const ref = X.paintFrom(rgba, Int32Array.from({ length: w * h }, (_, i) => i), w, h, keep);
  const refS = X.scaled(ref, s);
  const a = X.ctx2d(back).getImageData(0, 0, back.width, back.height).data;
  const b = X.ctx2d(refS).getImageData(0, 0, refS.width, refS.height).data;
  let inter = 0;
  let union = 0;
  for (let i = 3; i < a.length; i += 4) {
    const pa = a[i] > 127;
    const pb = b[i] > 127;
    if (pa && pb) inter++;
    if (pa || pb) union++;
  }
  out.iou = inter / union;
  // the shirt lettering for the arena sign: white-on-black print -> its own alpha
  const g = X.crop(img, spec.gang.crop, spec.gang.up);
  const gd = X.ctx2d(g).getImageData(0, 0, g.width, g.height);
  for (let i = 0; i < gd.data.length; i += 4) {
    const [r, gg, bb] = [gd.data[i], gd.data[i + 1], gd.data[i + 2]];
    const v = Math.max(r, gg, bb);
    gd.data[i + 3] = Math.max(0, Math.min(255, ((v - spec.gang.black) / (spec.gang.solid - spec.gang.black)) * 255));
  }
  X.ctx2d(g).putImageData(gd, 0, 0);
  out.gang = g.toDataURL('image/webp', spec.quality);
  out.gangSize = [g.width, g.height];
  if (debug) {
    const sheet = X.canvas(atlas.canvas.width, atlas.canvas.height);
    const sg = X.ctx2d(sheet);
    sg.fillStyle = '#3d3466';
    sg.fillRect(0, 0, sheet.width, sheet.height);
    sg.drawImage(atlas.canvas, 0, 0);
    out.debug = { clean: ref.toDataURL(), parts: sheet.toDataURL(), check: back.toDataURL() };
  }
  return out;
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  page.on('console', (m) => process.stdout.write(`[page] ${m.text()}\n`));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: lib('burgergang-px.mjs') });
  await page.addScriptTag({ content: lib('burgergang-cut.mjs') });
  const src = `data:image/png;base64,${readFileSync(path.join(ROOT, SPEC.source)).toString('base64')}`;
  const out = await page.evaluate(build, { spec: SPEC, src, debug: Boolean(debugDir) });
  const file = (url) => Buffer.from(url.split(',')[1], 'base64');
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, 'boss.webp'), file(out.boss));
  writeFileSync(path.join(OUT_DIR, 'gang.webp'), file(out.gang));
  const u = SPEC.up;
  const rect = (n) => {
    const r = out.rects[n];
    const part = SPEC.parts.find((p) => p.name === n);
    const o = { x: SPEC.crop.x + r.ox / u, y: SPEC.crop.y + r.oy / u };
    return `  ${n}: { x: ${r.x}, y: ${r.y}, w: ${r.w}, h: ${r.h}, ox: ${o.x}, oy: ${o.y}, px: ${part.pivot[0]}, py: ${part.pivot[1]}, z: ${part.z} },`;
  };
  writeFileSync(
    ATLAS_TS,
    `/**
 * GENERATED by scripts/level8/burgergang.mjs from ref/level8_shirt_burger_gang_v2.png — do not edit by hand.
 * The boss cut out of the shirt: atlas rects (atlas px) of each part, its top-left (ox, oy) and pivot (px, py) in
 * shirt-screenshot px, its draw order z, the feet point (shirt px) and the atlas px per shirt px. Silhouette IoU of the re-assembled
 * atlas against the cleaned shirt print: ${out.iou.toFixed(4)}.
 */
export const ATLAS = {
  key: 'ct-burgergang-atlas',
  url: 'level8/burgergang/boss.webp',
  w: ${out.size[0]},
  h: ${out.size[1]},
  tex: ${SPEC.tex},
  foot: { x: ${SPEC.foot[0]}, y: ${SPEC.foot[1]} },
} as const;

export const GANG_SIGN = { key: 'ct-burgergang-sign', url: 'level8/burgergang/gang.webp', w: ${out.gangSize[0]}, h: ${out.gangSize[1]} } as const;

export type PartName = ${SPEC.parts.map((p) => `'${p.name}'`).join(' | ')};
export interface AtlasPart {
  x: number;
  y: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  px: number;
  py: number;
  z: number;
}
export const PARTS: Readonly<Record<PartName, AtlasPart>> = {
${SPEC.parts.map((p) => rect(p.name)).join('\n')}
};
`,
  );
  console.log(`atlas ${out.size.join('x')} · IoU ${out.iou.toFixed(4)} · gang ${out.gangSize.join('x')}`);
  if (debugDir) {
    mkdirSync(debugDir, { recursive: true });
    for (const [k, v] of Object.entries(out.debug)) writeFileSync(path.join(debugDir, `${k}.png`), file(v));
  }
} finally {
  await browser.close();
}
