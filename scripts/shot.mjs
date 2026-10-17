#!/usr/bin/env node
/**
 * Headless screenshot / scripted-play tool (Playwright + an in-process Vite dev server).
 *
 *   node scripts/shot.mjs <path> <out.png> [--size 1280x720] [--wait 800] [--mobile]
 *        [--landscape] [--steps steps.json] [--full] [--console]
 *
 *   <path>   page relative to project root, e.g. "gallery.html?pack=hills" or "index.html?level=1&debug=1"
 *   --mobile emulates a touch phone (iPhone-like, DPR 3). Default size then 390x844.
 *   --steps  JSON file: array of steps executed in order:
 *            {"wait":500} | {"down":"ArrowRight"} | {"up":"ArrowRight"} | {"press":"Space"}
 *            {"tap":"#selector"} | {"click":"#selector"} | {"eval":"js expression"}
 *            {"shot":"out-2.png"} | {"size":"844x390"}
 *   --console prints browser console messages and page errors.
 * Exit code 1 if the page threw an uncaught error.
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const pagePath = args[0];
const outFile = args[1];
if (!pagePath || !outFile) {
  console.error('usage: node scripts/shot.mjs <path> <out.png> [options]');
  process.exit(2);
}
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name) => args.includes(name);
const mobile = flag('--mobile');
const [w, h] = (opt('--size') ?? (mobile ? (flag('--landscape') ? '844x390' : '390x844') : '1280x720')).split('x').map(Number);
const wait = Number(opt('--wait') ?? '800');
const stepsFile = opt('--steps');
const showConsole = flag('--console');

const server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1' } });
await server.listen();
const addr = server.httpServer.address();
const base = `http://127.0.0.1:${addr.port}/`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: mobile ? 3 : 1,
  isMobile: mobile,
  hasTouch: mobile,
});
const page = await context.newPage();
let pageError = null;
page.on('pageerror', (e) => {
  pageError = e;
  console.error('[pageerror]', e.message);
});
if (showConsole) page.on('console', (m) => console.log(`[console.${m.type()}]`, m.text()));

try {
  await page.goto(base + pagePath, { waitUntil: 'load' });
  await page.waitForTimeout(wait);
  if (stepsFile) {
    const steps = JSON.parse(readFileSync(path.resolve(stepsFile), 'utf8'));
    for (const s of steps) {
      if (s.wait) await page.waitForTimeout(s.wait);
      if (s.down) await page.keyboard.down(s.down);
      if (s.up) await page.keyboard.up(s.up);
      if (s.press) await page.keyboard.press(s.press);
      if (s.tap) await page.tap(s.tap);
      if (s.click) await page.click(s.click);
      if (s.size) {
        const [sw, sh] = s.size.split('x').map(Number);
        await page.setViewportSize({ width: sw, height: sh });
      }
      if (s.eval) console.log('[eval]', JSON.stringify(await page.evaluate(s.eval)));
      if (s.shot) await page.screenshot({ path: s.shot, fullPage: flag('--full') });
    }
  }
  await page.screenshot({ path: outFile, fullPage: flag('--full') });
  console.log('saved', outFile);
} finally {
  await browser.close();
  await server.close();
}
process.exit(pageError ? 1 : 0);
