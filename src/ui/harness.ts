/**
 * Dev-only harness (ui-harness.html, not part of the build).
 * ?state=loading|title|hud|pause|victory|gameover|banner|logo &level=1|2
 * &fire=&club=&down=enabled|disabled|hidden  &tone=goal|power|danger|info
 */
import type { ButtonState, ControlsLayout, LevelId } from '../contracts';
import { startTitleRunner } from '../titleRunner';
import { createUI } from './index';
import { LOGO_FACE_VIEWBOX, WORDMARK_VIEWBOX, logoFaceSvg, wordmarkSvg } from './logo';

const params = new URLSearchParams(location.search);
const root = document.getElementById('app') as HTMLElement;
const state = params.get('state') ?? 'hud';
const level: LevelId = params.get('level') === '2' ? 2 : 1;
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
  const sky = level === 1 ? ['#3aa8e0', '#60ccf0', '#a8e4f4'] : ['#4a0e1c', '#d82810', '#f0645a'];
  const hill = level === 1 ? '#489c30' : '#2a1018';
  const ground = level === 1 ? '#a8cc00' : '#fc7a10';
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
    const g = ctx.createLinearGradient(0, 0, 0, h);
    sky.forEach((col, i) => g.addColorStop(i / (sky.length - 1), col));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
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
  return lv === 1
    ? { level: 1, fire: pick('fire', 'enabled'), club: pick('club', 'disabled'), down: pick('down', 'hidden'), jumpLabel: 'SALTA' }
    : { level: 2, fire: pick('fire', 'hidden'), club: pick('club', 'hidden'), down: pick('down', 'enabled'), jumpLabel: 'VOLA' };
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
      score: level === 1 ? 161 : 1240,
      timeMs: 96000,
      progress: 0.42,
      powers: { brie: true, goat: level === 1, thai: false, wings: level === 2 },
    });
    ui.setControls(layoutFor(level));
    if (params.get('anim') === '1') {
      const tick = (): void => {
        const s = (performance.now() - t0) / 1000;
        ui.updateHud({ timeMs: 96000 + s * 1000, progress: (0.42 + s / 30) % 1 });
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
    case 'title':
      ui.showTitle({ best: { 1: 1735 }, muted: false }, { onStart: (l) => log(`start-${l}`)(), onToggleMute: () => true });
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
        { level, score: 1735, timeMs: 92500, best: 1735, newBest: true, hasNext: level === 1 },
        { onNext: log('next'), onReplay: log('replay'), onMenu: log('menu') },
      );
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

if (state === 'logo') logoCompare();
else mount();
