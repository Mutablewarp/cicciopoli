/**
 * Dev-only harness (ui-harness.html, not part of the build).
 * ?state=loading|loaddone|title|hud|pause|victory|gameover|banner|icons|logo|rushsetup|rushresults
 * &level=1..6 &fire=&club=&down=enabled|disabled|hidden &bolts=N  &tone=goal|power|danger|info
 * level 6: &low=1 (last 10 s) &win=0 (CORSA TERMINATA) &daily=1 &calm=1 &panel=help|settings|trophies
 * level 7: state=kitchensetup (&golden=1 &calm=1 &panel=…) | kitchenresults (&win=0 &golden=1 &calm=1) |
 *          hud&level=7 (&view=counter|kitchen &ticket=long|wide|tale|double|short|none &say=0 &hint=0 &patience=0..1
 *          &mood=neutral|happy|angry &label=SERVI &fire=enabled|disabled|hidden)
 */
import type { ButtonState, ControlsLayout, LevelId } from '../contracts';
import { LEVEL_IDS } from '../contracts';
import { startTitleRunner } from '../titleRunner';
import { boltSvg, brieSvg, fistSvg, fuocoSvg, goatSvg, headSvg, hulkHeadSvg, nuggetSvg, pelletSvg, slamSvg, thaiSvg, wingsSvg } from './icons';
import { createUI } from './index';
import { LOGO_FACE_VIEWBOX, WORDMARK_VIEWBOX, logoFaceSvg, wordmarkSvg } from './logo';
import { KITCHEN_HUD, type SampleTicket, drawKitchen, headAnchor, kitchenHud, kitchenResults, kitchenSetup } from './kitchen/samples';
import { RUSH_HUD, rushResults, rushSetup } from './rush/samples';

const params = new URLSearchParams(location.search);
const root = document.getElementById('app') as HTMLElement;
const state = params.get('state') ?? 'hud';
const level: LevelId = LEVEL_IDS.find((l) => String(l) === params.get('level')) ?? 1;
const view = params.get('view') === 'kitchen' ? 'kitchen' : 'counter';
const log = (msg: string) => () => {
  (window as unknown as { __log: string[] }).__log.push(msg);
};
(window as unknown as { __log: string[] }).__log = [];

function nested(svg: string, vb: string): string {
  const [x, y, w, h] = vb.split(' ');
  return svg.replace('<svg ', `<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
}

function logoCompare(): void {
  const art = nested(logoFaceSvg(), LOGO_FACE_VIEWBOX) + nested(wordmarkSvg(), WORDMARK_VIEWBOX);
  const vb = '95 0 185 290';
  const img = '<image href="/ref/logo_ciccios.jpg" x="0" y="0" width="375" height="375" style="filter:invert(1)"/>';
  root.innerHTML =
    `<div style="display:flex;gap:8px;height:100%;background:#000;color:#fff">` +
    `<svg viewBox="${vb}" style="flex:1">${img}</svg>` +
    `<svg viewBox="${vb}" style="flex:1;color:#fff">${art}</svg>` +
    `<svg viewBox="${vb}" style="flex:1;color:rgba(255,40,40,.55)">${img}${art}</svg>` +
    `</div>`;
}

/** Stand-in for the Phaser canvas: a scrolling pixel landscape that fills gameHost. */
function fakeGame(host: HTMLElement): void {
  const c = document.createElement('canvas');
  host.appendChild(c);
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  const sky = {
    1: ['#3aa8e0', '#60ccf0', '#a8e4f4'],
    2: ['#4a0e1c', '#d82810', '#f0645a'],
    3: ['#0b0d24', '#141a3e'],
    4: ['#1e1a1e', '#1e1a1e'],
    5: ['#2a0e4a', '#a81c7c', '#f08a3c'],
    6: ['#5a4a52', '#6a5a5e'],
    7: ['#3a3036', '#3a3036'],
  }[level];
  const hill = level === 1 ? '#489c30' : level === 5 ? '#3a1456' : '#2a1018';
  const ground = level === 1 ? '#a8cc00' : level === 5 ? '#a6d62c' : '#fc7a10';
  const frame = (t: number): void => {
    const r = host.getBoundingClientRect();
    const s = 3;
    const w = Math.max(1, Math.round(r.width / s));
    const h = Math.max(1, Math.round(r.height / s));
    if (c.width !== w || c.height !== h) {
      c.width = w;
      c.height = h;
      c.style.width = `${r.width}px`;
      c.style.height = `${r.height}px`;
    }
    if (level === 7) {
      drawKitchen(ctx, host, s, view);
      requestAnimationFrame(frame);
      return;
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    sky.forEach((col, i) => g.addColorStop(i / (sky.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (level === 6) {
      // top-down road: 3 lanes scrolling down, the truck near the bottom third
      const rw = Math.min(w - 8, 120);
      const x0 = Math.round((w - rw) / 2);
      ctx.fillStyle = '#3a3242';
      ctx.fillRect(x0, 0, rw, h);
      ctx.fillStyle = '#fce4c0';
      const off = (t / 8) % 24;
      for (let y = -24 + off; y < h; y += 24) for (const k of [1, 2]) ctx.fillRect(x0 + Math.round((rw * k) / 3), y, 2, 12);
      ctx.fillStyle = '#141414';
      ctx.fillRect(x0 + Math.round(rw / 2) - 17, Math.round(h * 0.62), 34, 56);
      ctx.fillStyle = '#e81c24';
      ctx.fillRect(x0 + Math.round(rw / 2) - 17, Math.round(h * 0.62) + 26, 34, 4);
      requestAnimationFrame(frame);
      return;
    }
    if (level >= 3) {
      // portrait playfield centred like the real scenes: starfield / maze walls
      const pw = Math.min(w, Math.round((h * 224) / 288));
      const x0 = Math.round((w - pw) / 2);
      ctx.fillStyle = level === 3 ? '#e8eef8' : '#8a1c22';
      for (let i = 0; i < 60; i++) ctx.fillRect(x0 + ((i * 37) % pw), (i * 53) % h, level === 3 ? 1 : 8, level === 3 ? 1 : 3);
      ctx.strokeStyle = '#fcfcf4';
      ctx.strokeRect(x0 + 0.5, 0.5, pw - 1, h - 1);
      ctx.fillStyle = level === 3 ? '#a8dcf4' : '#f6c08a';
      ctx.fillRect(x0 + Math.round(pw / 2) - 6, h - 16, 12, 8);
      requestAnimationFrame(frame);
      return;
    }
    const off = (t / 40) % 160;
    ctx.fillStyle = hill;
    for (let x = -off; x < w + 160; x += 160) {
      ctx.beginPath();
      ctx.moveTo(x, h - 20);
      ctx.lineTo(x + 50, h - 70);
      ctx.lineTo(x + 70, h - 70);
      ctx.lineTo(x + 120, h - 20);
      ctx.fill();
    }
    ctx.fillStyle = ground;
    ctx.fillRect(0, h - 22, w, 4);
    ctx.fillStyle = level === 1 ? '#603c3c' : '#22161c';
    ctx.fillRect(0, h - 18, w, 18);
    ctx.fillStyle = '#fcfcf4';
    ctx.fillRect(Math.round(w * 0.3), h - 38, 10, 16);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

function layoutFor(lv: LevelId): ControlsLayout {
  const pick = (k: string, d: ButtonState): ButtonState => (params.get(k) as ButtonState | null) ?? d;
  if (lv === 3) {
    const bolts = Number(params.get('bolts') ?? '3');
    return { level: 3, mode: 'shooter', fire: pick('fire', 'enabled'), club: pick('club', bolts > 0 ? 'enabled' : 'disabled'), down: 'hidden', jumpLabel: 'SALTA', clubCount: bolts };
  }
  if (lv === 4) return { level: 4, mode: 'maze', fire: 'hidden', club: 'hidden', down: 'hidden', jumpLabel: 'SALTA' };
  if (lv === 7) {
    const label = params.get('label') ?? (view === 'counter' ? "PRENDI L'ORDINE" : 'SERVI');
    return { level: 7, mode: 'kitchen', fire: pick('fire', 'enabled'), club: 'hidden', down: 'hidden', jumpLabel: 'SALTA', actionLabel: label };
  }
  if (lv === 6) return { level: 6, mode: 'driver', fire: 'hidden', club: 'hidden', down: 'hidden', jumpLabel: 'SALTA', swipe: 'mid' };
  if (lv === 5) return { level: 5, mode: 'platform', fire: pick('fire', 'enabled'), club: pick('club', 'enabled'), down: 'hidden', jumpLabel: 'SALTA' };
  return lv === 1
    ? { level: 1, mode: 'platform', fire: pick('fire', 'enabled'), club: pick('club', 'disabled'), down: pick('down', 'hidden'), jumpLabel: 'SALTA' }
    : { level: 2, mode: 'platform', fire: pick('fire', 'hidden'), club: pick('club', 'hidden'), down: pick('down', 'enabled'), jumpLabel: 'VOLA' };
}

function mount(): void {
  const { ui, input } = createUI(root);
  (window as unknown as Record<string, unknown>).__ui = { ui, input, layoutFor };
  if (params.get('safe') === '1') {
    // Simulated iPhone notch / home-indicator insets (Playwright cannot emulate env()).
    const shell = root.firstElementChild as HTMLElement;
    const land = innerWidth > innerHeight;
    shell.style.setProperty('--safe-t', land ? '0px' : '47px');
    shell.style.setProperty('--safe-b', land ? '21px' : '34px');
    shell.style.setProperty('--safe-l', land ? '47px' : '0px');
    shell.style.setProperty('--safe-r', land ? '47px' : '0px');
  }
  fakeGame(ui.gameHost);
  const t0 = performance.now();
  const hudOn = (): void => {
    ui.showHud(true);
    ui.updateHud({
      level,
      hearts: 3,
      maxHearts: 4,
      score: [161, 1240, 3150, 870, 2260, 2350, 4280][level - 1],
      timeMs: 96000,
      progress: 0.42,
      powers: { brie: level === 1, goat: level === 1, thai: false, wings: level === 2, bolt: level === 3, pellet: false },
    });
    if (level === 6) ui.updateHud({ ...RUSH_HUD, timeMs: params.get('low') === '1' ? 8400 : RUSH_HUD.timeMs });
    if (level === 7) {
      const k = kitchenHud((params.get('ticket') as SampleTicket | null) ?? 'long', view, {
        say: params.get('say') !== '0',
        hint: params.get('hint') !== '0',
        patience: Number(params.get('patience') ?? '0.7'),
        mood: (params.get('mood') as 'happy' | 'angry' | null) ?? 'neutral',
      });
      // the scene re-anchors the bubble on every resize (the free area moves with the insets)
      const place = (): void => ui.updateHud({ kitchen: { ...k, say: k.say && { ...k.say, anchor: headAnchor(ui.gameHost) } } });
      ui.updateHud({ ...KITCHEN_HUD, kitchen: k });
      window.addEventListener('resize', place);
      requestAnimationFrame(place);
    }
    ui.setControls(layoutFor(level));
    if (params.get('anim') === '1') {
      const tick = (): void => {
        const s = (performance.now() - t0) / 1000;
        ui.updateHud({ timeMs: level === 6 ? Math.max(0, 23000 - s * 1000) : 96000 + s * 1000, progress: (0.42 + s / 30) % 1 });
        requestAnimationFrame(tick);
      };
      tick();
    }
  };
  ui.onPauseButton(log('pause-button'));
  switch (state) {
    case 'loading':
      ui.setLoading(0.62, 'Impasto i panini…');
      break;
    case 'loaddone':
      // main.ts boot order: loading -> null -> title in the same tick
      ui.setLoading(0.35, 'Impasto i panini…');
      window.setTimeout(() => {
        ui.setLoading(null);
        ui.showTitle({ best: { 1: 1735 }, muted: false }, { onStart: (l) => log(`start-${l}`)(), onToggleMute: () => true });
      }, 400);
      break;
    case 'icons':
      showIcons();
      return;
    case 'title':
      ui.showTitle({ best: { 1: 1735, 2: 2480 }, muted: false }, { onStart: (l) => log(`start-${l}`)(), onToggleMute: () => true });
      import('../art/ciccio')
        .then((m) => ui.titleRunnerCanvas && startTitleRunner(ui.titleRunnerCanvas, m.buildCiccioArt()))
        .catch(log('runner-unavailable'));
      break;
    case 'pause':
      hudOn();
      ui.showPause({ onResume: log('resume'), onRestart: log('restart'), onMenu: log('menu'), onToggleMute: () => true }, false);
      break;
    case 'victory':
      hudOn();
      ui.showVictory(
        { level, score: 1735, timeMs: 92500, best: 1735, newBest: true, hasNext: level < LEVEL_IDS.length },
        { onNext: log('next'), onReplay: log('replay'), onMenu: log('menu') },
      );
      break;
    case 'rushsetup':
      ui.showRushSetup(rushSetup(params.get('daily') === '1'), { onPlay: (d, daily) => log(`play-${d}-${daily}`)(), onSettings: (st) => log(`settings-${JSON.stringify(st)}`)(), onMenu: log('menu') });
      // after the card's 250 ms arm time
      if (params.get('panel')) {
        const i = ['help', 'settings', 'trophies'].indexOf(params.get('panel') ?? '');
        window.setTimeout(() => document.querySelectorAll<HTMLElement>('.cc-btn--more')[i]?.click(), 400);
      }
      break;
    case 'rushresults':
      // "movimento ridotto" reaches the results through the setup panel, as in the game
      if (params.get('calm') === '1') ui.showRushSetup(rushSetup(false, true), { onPlay: log('play'), onSettings: log('settings'), onMenu: log('menu') });
      ui.showRushResults(rushResults(params.get('win') !== '0', params.get('daily') === '1'), { onRetry: log('retry'), onMenu: log('menu') });
      break;
    case 'kitchensetup':
      ui.showKitchenSetup(kitchenSetup(params.get('golden') === '1', params.get('calm') === '1'), { onPlay: log('play'), onSettings: (st) => log(`settings-${JSON.stringify(st)}`)(), onMenu: log('menu') });
      if (params.get('panel')) {
        const i = ['help', 'settings', 'trophies'].indexOf(params.get('panel') ?? '');
        window.setTimeout(() => document.querySelectorAll<HTMLElement>('.cc-btn--more')[i]?.click(), 400);
      }
      break;
    case 'kitchenresults':
      if (params.get('calm') === '1') ui.showKitchenSetup(kitchenSetup(false, true), { onPlay: log('play'), onSettings: log('settings'), onMenu: log('menu') });
      ui.showKitchenResults(kitchenResults(params.get('win') !== '0', params.get('golden') === '1'), { onRetry: log('retry'), onMenu: log('menu') });
      break;
    case 'gameover':
      hudOn();
      ui.showGameOver({ level, score: 486 }, { onRetry: log('retry'), onMenu: log('menu') });
      break;
    case 'banner':
      hudOn();
      ui.banner(params.get('text') ?? 'VAI IN BUCA!', {
        tone: (params.get('tone') as 'goal' | null) ?? 'goal',
        sub: params.get('sub') ?? 'La bandiera è vicina',
        ms: 60000,
      });
      break;
    default:
      hudOn();
  }
}

/** All HUD / control icons, big, for pixel review. */
function showIcons(): void {
  const all = [nuggetSvg(), goatSvg(), pelletSvg(), fuocoSvg(), boltSvg(), brieSvg(), thaiSvg(), wingsSvg(), headSvg(), hulkHeadSvg(), fistSvg(), slamSvg()];
  root.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:16px;padding:16px;background:#242424">${all
    .map((svg) => `<div style="width:120px;height:120px;background:#1a1a1c;padding:8px">${svg.replace('<svg ', '<svg style="width:100%;height:100%" ')}</div>`)
    .join('')}</div>`;
}

if (state === 'logo') logoCompare();
else mount();
