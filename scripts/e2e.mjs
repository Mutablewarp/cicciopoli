#!/usr/bin/env node
/**
 * Smoke test in a real browser (Playwright + in-process Vite dev server):
 * title renders 8 level cards; every level boots, accepts input and has debug hooks;
 * every level can be entered twice in a row (restart / re-entry regressions);
 * no uncaught page errors. Desktop and phone (portrait + landscape).
 *
 *   node scripts/e2e.mjs            exit code 0 = pass
 *   node scripts/e2e.mjs --dist     the same on the production build in dist/ (npm run build first): the
 *                                   minified bundle can differ from the dev server (a bundler bug once
 *                                   emptied the level 8 touch buttons only in production)
 */
import { createServer, preview } from 'vite';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.argv.includes('--dist');
const server = dist
  ? await preview({ root, logLevel: 'error', preview: { port: 0, host: '127.0.0.1' } })
  : await createServer({ root, logLevel: 'error', server: { port: 0, host: '127.0.0.1', hmr: false, watch: null } });
if (!dist) await server.listen();
const base = `http://127.0.0.1:${server.httpServer.address().port}/`;
const browser = await chromium.launch();
const failures = [];

const VIEWS = [
  { name: 'desktop', viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

async function waitFor(page, expr, ms, arg = null) {
  try {
    await page.waitForFunction(expr, arg, { timeout: dist ? ms * 2 : ms }); // the headless production run is slower
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
  check(await waitFor(page, () => document.querySelectorAll('.cc-title button, .cc-title [role="button"]').length >= 8, 8000), 'title shows 8 level cards');

  for (const level of [1, 2, 3, 4, 5, 6, 7, 8]) {
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
  if (view.name === 'phone-portrait') {
    // level 6 end paths: menu during the finale, finale -> results -> RIPROVA -> menu
    const session = (st) => waitFor(page, (want) => window.__game?.state?.().session === want, 15000, st);
    await page.evaluate(() => window.__app.app.startLevel(6));
    check(await session('setup'), 'level 6 setup panel');
    await page.evaluate(() => { window.__game.play(); });
    check(await session('run'), 'level 6 run starts');
    await page.evaluate(() => window.__game.finale());
    check(await session('finale'), 'level 6 finale plays');
    const quit = await page.evaluate(() => { try { window.__app.app.toMenu(); return true; } catch { return false; } });
    check(quit && (await waitFor(page, () => !window.__game, 4000)), 'menu during the finale');
    await page.evaluate(() => window.__app.app.startLevel(6));
    await session('setup');
    await page.evaluate(() => { window.__game.play(); window.__game.finale(); });
    check(await waitFor(page, () => window.__game?.state?.().session === 'results' && !!document.querySelector('.cc-modal .cc-btn--go'), 30000), 'level 6 results after the finale');
    await page.waitForTimeout(1500); // end screens ignore taps for a moment (ui/menu.ts guard)
    await page.click('.cc-modal .cc-btn--go');
    check(await session('run'), 'RIPROVA restarts the run');
    await page.evaluate(() => window.__app.app.toMenu());
    await waitFor(page, () => !window.__game, 4000);
  }
  if (view.name !== 'desktop') {
    // level 7: setup -> a served order (bot) -> menu mid-shift; golden finale -> results -> RIPROVA
    const kstate = (expr, ms = 20000) => waitFor(page, expr, ms);
    await page.evaluate(() => window.__app.app.startLevel(7));
    check(await kstate(() => window.__game?.state?.().session === 'setup'), 'level 7 setup panel');
    await page.evaluate(() => { window.__game.seed(3, false); window.__game.autoCook(true); });
    check(await kstate(() => window.__game?.state?.().session === 'play' && window.__game.state().served >= 1, 90000), 'level 7 bot serves an order');
    const quit = await page.evaluate(() => { try { window.__app.app.toMenu(); return true; } catch { return false; } });
    check(quit && (await waitFor(page, () => !window.__game, 4000)), 'menu during a level 7 shift');
    await page.evaluate(() => window.__app.app.startLevel(7));
    await kstate(() => window.__game?.state?.().session === 'setup');
    await page.evaluate(() => { window.__game.seed(4, false); window.__game.golden(); });
    check(await kstate(() => window.__game?.state?.().session === 'finale'), 'level 7 golden finale plays');
    check(await kstate(() => window.__game?.state?.().session === 'results' && !!document.querySelector('.cc-modal .cc-btn--go'), 30000), 'level 7 results after the finale');
    await page.waitForTimeout(1500); // end screens ignore taps for a moment (ui/menu.ts guard)
    await page.click('.cc-modal .cc-btn--go');
    check(await kstate(() => window.__game?.state?.().session === 'play'), 'level 7 RIPROVA restarts the shift');
    await page.evaluate(() => window.__app.app.toMenu());
    await waitFor(page, () => !window.__game, 4000);
  }
  {
    // level 8: map -> a boss fight -> knockout -> results -> RIPROVA; the golden ticket finale -> golden results
    const cstate = (expr, ms = 20000) => waitFor(page, expr, ms);
    await page.evaluate(() => window.__app.app.startLevel(8));
    check(await cstate(() => window.__game?.state?.().session === 'map' && !!document.querySelector('.cc-cmap__go')), 'level 8 boss map');
    await page.evaluate(() => window.__game.boss('brie'));
    check(await cstate(() => window.__game.state().session === 'round' && window.__game.state().round === 'fight', 30000), 'level 8 first boss fight starts');
    if (view.hasTouch) {
      // real touch taps on the enamel buttons: SALTA lifts Ciccio, ARMA changes the weapon
      await page.evaluate(() => window.__game.god(true));
      const tapBtn = async (sel) => {
        const box = await page.locator(sel).boundingBox();
        if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
        return !!box;
      };
      await tapBtn('.cc-tbtn--jump');
      check(await cstate(() => window.__game.state().hero.y < 300, 1500), 'level 8 SALTA (touch) jumps');
      const before = await page.evaluate(() => window.__game.state().weapon);
      await tapBtn('.cc-tbtn--swap');
      check(await waitFor(page, (w) => window.__game.state().weapon !== w, 1500, before), 'level 8 ARMA (touch) swaps the weapon');
    }
    await page.keyboard.down('KeyJ');
    await page.waitForTimeout(800);
    await page.keyboard.up('KeyJ');
    await page.evaluate(() => window.__game.kill());
    check(await cstate(() => window.__game.state().session === 'results' && !!document.querySelector('.cc-modal .cc-cres__retry'), 30000), 'level 8 knockout results');
    await page.waitForTimeout(1500); // end screens ignore taps for a moment (ui/menu.ts guard)
    await page.click('.cc-modal .cc-cres__retry');
    check(await cstate(() => window.__game.state().session === 'round', 30000), 'level 8 RIPROVA restarts the boss');
    await page.evaluate(() => window.__game.golden());
    check(await cstate(() => window.__game.state().session === 'finale', 30000), 'level 8 golden ticket finale plays');
    check(await cstate(() => window.__game.state().session === 'results' && !!document.querySelector('.cc-modal .cc-cres__retry'), 40000), 'level 8 golden results');
    await page.evaluate(() => window.__app.app.toMenu());
    await waitFor(page, () => !window.__game, 4000);
  }
  check(errors.length === 0, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await context.close();
}

await browser.close();
await server.close();
console.log(failures.length ? `\n${failures.length} failure(s)` : '\nall smoke checks passed');
process.exit(failures.length ? 1 : 0);
