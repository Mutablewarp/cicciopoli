/** Top HUD: hearts, coin + score, level progress, power chips, TIME (a countdown in level 6) and pause button. */
import type { HudState, LevelId, PowerState } from '../contracts';
import { el, onActivate, setText } from './dom';
import { FLAG_SVG, PAUSE_GLYPH, boltSvg, brieSvg, goatSvg, headSvg, heartSvg, hulkHeadSvg, nuggetSvg, pelletSvg, thaiSvg, wingsSvg } from './icons';
import { createRushHud } from './rush/hud';
import { finishSvg, truckSvg } from './rush/icons';
import { LOW_TIME_MS, countdownLabel } from './rush/text';

type PowerKey = keyof PowerState;

const CHIPS: ReadonlyArray<{ key: PowerKey; svg: () => string; name: string }> = [
  { key: 'brie', svg: brieSvg, name: 'Brie' },
  { key: 'goat', svg: goatSvg, name: 'Provola Goat' },
  { key: 'thai', svg: thaiSvg, name: 'Alette Thai' },
  { key: 'wings', svg: wingsSvg, name: 'Alette Crunchy' },
  { key: 'bolt', svg: boltSvg, name: 'Fulmine' },
  { key: 'pellet', svg: pelletSvg, name: 'Provola stick' },
];

/** Chips shown per level even when inactive (an active power is always shown). */
const LEVEL_CHIPS: Record<LevelId, readonly PowerKey[]> = {
  1: ['brie', 'goat', 'thai'],
  2: ['wings'],
  3: ['bolt'],
  4: ['pellet'],
  5: [],
  // level 6 powers live in their own row (rush/hud.ts)
  6: [],
};

/** Progress marker and finish icon per level: Ciccio's head, the green head (5), the truck and a checkered flag (6). */
const MARKERS: Partial<Record<LevelId, { skin: string; marker: () => string; flag: string }>> = {
  5: { skin: 'hulk', marker: hulkHeadSvg, flag: FLAG_SVG },
  6: { skin: 'truck', marker: truckSvg, flag: finishSvg() },
};
const HEAD = { skin: 'head', marker: headSvg, flag: FLAG_SVG };

const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }];

export interface Hud {
  readonly root: HTMLElement;
  setVisible(v: boolean): void;
  update(s: Partial<HudState>): void;
  onPause(cb: () => void): void;
  /** Level of the last HUD update (pause card key legend). */
  readonly level: LevelId;
}

export function createHud(): Hud {
  const root = el('header', 'cc-hud is-hidden');
  root.setAttribute('aria-label', 'Stato di gioco');
  const hearts = el('div', 'cc-hearts');
  const score = el('div', 'cc-score', nuggetSvg());
  const scoreNum = el('span', 'cc-score__num', '161');
  score.appendChild(scoreNum);
  const left = el('div', 'cc-hud__left');
  left.append(hearts, score);

  const progress = el('div', 'cc-progress');
  const fill = el('div', 'cc-progress__fill');
  const track = el('div', 'cc-progress__track');
  track.appendChild(fill);
  const marker = el('div', 'cc-progress__marker', headSvg());
  const rush = createRushHud();
  const rail = el('div', 'cc-progress__rail');
  rail.append(track, rush.pins, marker);
  const flag = el('div', 'cc-progress__flag', FLAG_SVG);
  progress.append(rail, flag);
  const powers = el('div', 'cc-powers');
  const chipEls = new Map<PowerKey, HTMLElement>();
  for (const c of CHIPS) {
    const chip = el('span', 'cc-chip', c.svg());
    chip.title = c.name;
    chipEls.set(c.key, chip);
    powers.appendChild(chip);
  }
  const mid = el('div', 'cc-hud__mid');
  mid.append(progress, powers);

  const time = el('div', 'cc-time', '<span class="cc-time__label">TIME</span>');
  const timeNum = el('span', 'cc-time__num');
  const timeLead = el('i');
  const timeDigits = el('span');
  timeNum.append(timeLead, timeDigits);
  time.appendChild(timeNum);
  const pauseBtn = el('button', 'cc-btn cc-iconbtn cc-pause', PAUSE_GLYPH);
  pauseBtn.type = 'button';
  pauseBtn.tabIndex = -1;
  pauseBtn.setAttribute('aria-label', 'Pausa');
  // Never take focus: a focused button would be re-activated by Space (= jump).
  pauseBtn.addEventListener('pointerdown', (e) => e.preventDefault());
  const right = el('div', 'cc-hud__right');
  right.append(time, pauseBtn);
  root.append(left, mid, rush.row, right);

  const cur: HudState = {
    level: 1,
    hearts: -1,
    maxHearts: -1,
    score: -1,
    timeMs: -1,
    progress: -1,
    powers: { brie: false, goat: false, thai: false, wings: false },
  };
  let shownTime = '';
  let countdown = false;
  let shownProgress = -1;
  let heartEls: HTMLElement[] = [];
  let pauseCb: (() => void) | null = null;
  onActivate(pauseBtn, () => {
    pauseBtn.blur();
    pauseCb?.();
  });

  function renderHearts(count: number, max: number): void {
    if (max !== cur.maxHearts) {
      hearts.textContent = '';
      heartEls = [];
      for (let i = 0; i < max; i++) {
        const h = el('span', 'cc-heart-slot', heartSvg());
        heartEls.push(h);
        hearts.appendChild(h);
      }
    }
    heartEls.forEach((h, i) => {
      const full = i < count;
      if (h.classList.contains('is-full') === full) return;
      h.classList.toggle('is-full', full);
      if (cur.hearts >= 0) h.animate(full ? POP : [{ transform: 'translateX(0)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(3px)' }, { transform: 'translateX(0)' }], { duration: full ? 260 : 220 });
    });
  }

  function renderChips(level: LevelId, p: PowerState): void {
    const skin = MARKERS[level] ?? HEAD;
    if (marker.dataset.skin !== skin.skin) {
      marker.dataset.skin = skin.skin;
      marker.innerHTML = skin.marker();
      flag.innerHTML = skin.flag;
    }
    root.classList.toggle('is-rush', level === 6);
    let shown = 0;
    for (const c of CHIPS) {
      const chip = chipEls.get(c.key) as HTMLElement;
      const on = !!p[c.key];
      const hide = !on && !LEVEL_CHIPS[level].includes(c.key);
      if (!hide) shown++;
      if (chip.hidden !== hide) chip.hidden = hide;
      if (chip.classList.contains('is-on') !== on) {
        chip.classList.toggle('is-on', on);
        if (on) chip.animate(POP, { duration: 320, easing: 'ease-out' });
      }
    }
    // no chip at all (level 5): the row must not keep its flex gap
    powers.classList.toggle('is-empty', shown === 0);
  }

  /** Elapsed seconds "096" (dim leading zeros), or the time left "1:30" pulsing red in its last 10 s. */
  function renderTime(ms: number): void {
    const digits = countdown ? countdownLabel(ms) : String(Math.min(999, Math.floor(Math.max(0, ms) / 1000)));
    if (digits === shownTime) return;
    shownTime = digits;
    setText(timeLead, countdown ? '' : '000'.slice(digits.length));
    setText(timeDigits, digits);
    const low = countdown && ms > 0 && ms <= LOW_TIME_MS;
    time.classList.toggle('is-low', low);
    if (low) timeNum.animate(POP, { duration: 220 });
  }

  function update(s: Partial<HudState>): void {
    if (s.boltCount !== undefined) {
      const chip = chipEls.get('bolt');
      if (chip) chip.dataset.count = s.boltCount > 1 ? String(Math.min(99, s.boltCount)) : '';
    }
    if (s.hearts !== undefined || s.maxHearts !== undefined) {
      const max = s.maxHearts ?? (cur.maxHearts < 0 ? 4 : cur.maxHearts);
      const count = Math.max(0, Math.min(max, s.hearts ?? cur.hearts));
      if (count !== cur.hearts || max !== cur.maxHearts) {
        renderHearts(count, max);
        cur.hearts = count;
        cur.maxHearts = max;
      }
    }
    if (s.score !== undefined && s.score !== cur.score) {
      const up = cur.score >= 0 && s.score > cur.score;
      cur.score = s.score;
      setText(scoreNum, String(s.score));
      if (up) scoreNum.animate([{ transform: 'translateY(-3px)', color: '#fff' }, { transform: 'none' }], { duration: 160 });
    }
    if (s.countdown !== undefined) countdown = s.countdown;
    else if (s.level !== undefined && s.level !== cur.level) countdown = false;
    if (s.timeMs !== undefined) cur.timeMs = s.timeMs;
    if ((s.timeMs !== undefined || s.countdown !== undefined) && cur.timeMs >= 0) renderTime(cur.timeMs);
    if (s.progress !== undefined) {
      const q = Math.round(Math.max(0, Math.min(1, s.progress)) * 400) / 400;
      if (q !== shownProgress) {
        shownProgress = q;
        fill.style.transform = `scaleX(${q})`;
        marker.style.left = `${q * 100}%`;
      }
    }
    const level = s.level ?? cur.level;
    const p = s.powers;
    rush.update(s);
    const powersChanged = !!p && CHIPS.some((c) => !!p[c.key] !== !!cur.powers[c.key]);
    if (powersChanged || level !== cur.level) {
      if (p) cur.powers = { ...p };
      cur.level = level;
      renderChips(level, cur.powers);
    }
  }

  renderChips(1, cur.powers);
  return {
    root,
    setVisible(v) {
      root.classList.toggle('is-hidden', !v);
    },
    update,
    onPause(cb) {
      pauseCb = cb;
    },
    get level() {
      return cur.level;
    },
  };
}
