/**
 * Level 8 art plumbing of the BOSS-B lane (Don Tuma + Happy Box): Node has no image library here, so the
 * pixels are processed in headless Chromium (canvas getImageData / putImageData / toDataURL) and the files
 * are written with Node fs. The browser-side helpers live in tuma-px.js (window.PX).
 *
 *   const out = await runInPage(async (PX, arg) => { ... return { 'file.webp': dataUrl } }, arg, ['ref/x.png']);
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PX_LIB = readFileSync(path.join(ROOT, 'scripts/level8/tuma-px.js'), 'utf8');

const dataUrl = (file) => `data:image/png;base64,${readFileSync(path.join(ROOT, file)).toString('base64')}`;

/**
 * Runs `fn(PX, arg, images)` in a page (images = the decoded `files`, in order) and returns its result.
 * `fn` must return a plain object (strings / numbers / data URLs). `helpers` = named functions `fn` calls.
 */
export async function runInPage(fn, arg, files, helpers = []) {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.on('console', (m) => process.stdout.write(`[page] ${m.text()}\n`));
    await page.setContent('<!doctype html><html><body></body></html>');
    await page.addScriptTag({ content: PX_LIB });
    const srcs = files.map(dataUrl);
    return await page.evaluate(
      async ({ code, lib, arg, srcs }) => {
        const imgs = await Promise.all(srcs.map((s) => window.PX.load(s)));
        // eslint-disable-next-line no-new-func
        const f = new Function('PX', 'arg', 'imgs', `${lib}\nreturn (${code})(PX, arg, imgs);`);
        return f(window.PX, arg, imgs);
      },
      { code: fn.toString(), lib: helpers.map((h) => h.toString()).join('\n'), arg, srcs },
    );
  } finally {
    await browser.close();
  }
}

/** Writes data URLs (png / webp) to `dir`; returns [name, bytes] pairs. */
export function writeDataUrls(dir, files) {
  mkdirSync(dir, { recursive: true });
  const out = [];
  for (const [name, url] of Object.entries(files)) {
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    writeFileSync(path.join(dir, name), buf);
    out.push([name, buf.length]);
  }
  return out;
}

/** Prints the sizes and fails when the module is over its byte budget (BRIEF v8 point 1). */
export function report(label, written, budget) {
  const total = written.reduce((s, [, n]) => s + n, 0);
  for (const [name, n] of written) process.stdout.write(`  ${name.padEnd(28)} ${(n / 1024).toFixed(1)} KB\n`);
  process.stdout.write(`${label}: ${(total / 1024).toFixed(1)} KB (budget ${(budget / 1024).toFixed(0)} KB)\n`);
  if (total > budget) {
    process.stderr.write(`${label} is over budget\n`);
    process.exitCode = 1;
  }
}
