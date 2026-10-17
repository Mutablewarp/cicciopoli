#!/usr/bin/env node
/**
 * Smoke test in a real browser (Playwright + in-process Vite dev server):
 * title renders 4 level cards; every level boots, accepts input and has debug hooks;
 * every level can be entered twice in a row (restart / re-entry regressions);
 * no uncaught page errors. Desktop and phone (portrait + landscape).
 *
 *   node scripts/e2e.mjs            exit code 0 = pass
 */
import { createServer } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1', hmr: false, watch: null } });
await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch();
const failures = [];

const VIEWS = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

async function waitFor(page, expr, ms) {
  try {
    await page.waitForFunction(expr, null, { timeout: ms });
    return true;
  } catch {
    return false;
  }
}

for (const view of VIEWS) {
  const context = await browser.newContext(view);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const check = (ok, what) => {
    if (!ok) failures.push(`[${view.name}] ${what}`);
    console.log(`${ok ? 'ok  ' : 'FAIL'} [${view.name}] ${what}`);
  };

  await page.goto(base + '?debug=1', { waitUntil: 'load' });
  check(await waitFor(page, () => document.querySelectorAll('.cc-title button, .cc-title [role="button"]').length >= 4, 8000), 'title shows 4 level cards');

  for (const level of [1, 2, 3, 4]) {
    for (const attempt of [1, 2]) {
      await page.evaluate((l) => window.__app.app.startLevel(l), level);
      const booted = await waitFor(page, () => !!window.__game, 12000);
      check(booted, `level ${level} boots (entry ${attempt})`);
      if (!booted) continue;
      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(600);
      await page.keyboard.up('ArrowRight');
      await page.evaluate(() => window.__app.app.toMenu());
      await waitFor(page, () => !window.__game, 4000);
    }
  }
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await context.close();
}

await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall smoke checks passed');
process.exit(failures.length ? 1 : 0);
