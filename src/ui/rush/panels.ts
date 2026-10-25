/**
 * Sub-panels of the level 6 pre-run card, sliding over it: COME SI GIOCA (the four rules and the power-up
 * legend), IMPOSTAZIONI (swipe sensitivity, vibration, reduced motion, high contrast, music) and TRAGUARDI.
 * A panel takes the menu over until INDIETRO / Esc hands it back to the card.
 */
import type { RushAchievementCard, RushSettings } from '../../contracts';
import { button, el, pixelHtml, scrollPane } from '../dom';
import type { Menu } from '../menu';
import { legendSvg, trophySvg } from './icons';
import { LEGEND, RULES, SWIPE_OPTIONS, isSecret } from './text';

export type PanelKind = 'help' | 'settings' | 'trophies';

export interface PanelHost extends SlideHost {
  settings(): RushSettings;
  setSettings(s: RushSettings): void;
}

const TITLES: Readonly<Record<PanelKind, string>> = { help: 'COME SI GIOCA', settings: 'IMPOSTAZIONI', trophies: 'TRAGUARDI' };
const OUT_MS = 160;

type Toggle = 'vibration' | 'reducedMotion' | 'highContrast' | 'music';
const TOGGLES: ReadonlyArray<{ key: Toggle; label: string }> = [
  { key: 'vibration', label: 'VIBRAZIONE' },
  { key: 'reducedMotion', label: 'MOVIMENTO RIDOTTO' },
  { key: 'highContrast', label: 'ALTO CONTRASTO' },
  { key: 'music', label: 'MUSICA' },
];

function help(): HTMLElement {
  const wrap = el('div', 'cc-help');
  const rules = el('ol', 'cc-help__rules');
  RULES.forEach((r, i) => rules.append(el('li', '', `<b>${i + 1}</b><span><strong>${r.title}</strong> ${r.text}</span>`)));
  const legend = el('ul', 'cc-help__legend');
  for (const p of LEGEND) {
    legend.append(el('li', `cc-help__power${p.icon === 'secret' ? ' is-secret' : ''}`, `${legendSvg(p.icon)}<span><strong>${p.name}</strong> ${p.text}</span>`));
  }
  wrap.append(rules, el('p', 'cc-help__sub', 'POTENZIAMENTI DAL MENU'), legend);
  return wrap;
}

/** Swipe segments + four switches; returns the buttons in reading order. A tap also moves the menu cursor there,
 *  so the keyboard frame never sits on another option than the one just chosen. */
function settings(content: HTMLElement, host: PanelHost): HTMLElement[] {
  const seg = el('div', 'cc-seg');
  seg.setAttribute('role', 'radiogroup');
  seg.setAttribute('aria-label', 'Sensibilità dello scorrimento');
  const pick = (i: number, fn: () => void): (() => void) =>
    host.menu.guard(() => {
      host.menu.select(i, false);
      fn();
    }, false);
  const segBtns = SWIPE_OPTIONS.map((o, i) => {
    const b = button('cc-seg__opt', `<span class="cc-btn__label">${o.label}</span>`, pick(i, () => change({ swipe: o.value })));
    b.setAttribute('role', 'radio');
    return b;
  });
  seg.append(...segBtns);
  const swipeRow = el('div', 'cc-setting cc-setting--swipe', '<span class="cc-setting__name">SCORRIMENTO</span>');
  swipeRow.append(seg);

  const switches = TOGGLES.map((t, j) => {
    const b = button(
      'cc-switch',
      `<span class="cc-setting__name">${t.label}</span><span class="cc-switch__pill"><i></i><b></b></span>`,
      pick(SWIPE_OPTIONS.length + j, () => flip(t.key)),
    );
    b.setAttribute('role', 'switch');
    return { key: t.key, b };
  });
  content.append(swipeRow, ...switches.map((s) => s.b));

  function render(): void {
    const s = host.settings();
    SWIPE_OPTIONS.forEach((o, i) => {
      segBtns[i].classList.toggle('is-chosen', o.value === s.swipe);
      segBtns[i].setAttribute('aria-checked', String(o.value === s.swipe));
    });
    for (const { key, b } of switches) {
      b.classList.toggle('is-on', s[key]);
      b.setAttribute('aria-checked', String(s[key]));
      const state = b.querySelector('b');
      if (state) state.textContent = s[key] ? 'ON' : 'OFF';
    }
  }
  function change(patch: Partial<RushSettings>): void {
    host.setSettings({ ...host.settings(), ...patch });
    render();
  }
  function flip(key: Toggle): void {
    const next = { ...host.settings() };
    next[key] = !next[key];
    host.setSettings(next);
    render();
  }
  render();
  return [...segBtns, ...switches.map((s) => s.b)];
}

/** TRAGUARDI list, shared with level 7 (kitchen/panels.ts). */
export function trophyList(list: readonly RushAchievementCard[]): HTMLElement {
  const ul = el('ul', 'cc-trophies');
  for (const a of list) {
    const secret = isSecret(a);
    const li = el('li', `cc-trophy${a.unlocked ? ' is-unlocked' : ''}${secret ? ' is-secret' : ''}`, trophySvg());
    const text = el('span', 'cc-trophy__text');
    const name = el('strong', '', pixelHtml(secret ? '???' : a.name));
    const desc = el('span');
    desc.textContent = secret ? 'Traguardo segreto: scoprilo giocando.' : a.desc;
    text.append(name, desc);
    li.append(text);
    ul.append(li);
  }
  return ul;
}

/** What a sliding panel needs from its card (level 6 here, level 7 in kitchen/panels.ts). */
export interface SlideHost {
  /** card the panel slides over (its body may scroll on tiny screens) */
  readonly body: HTMLElement;
  readonly menu: Menu;
  readonly achievements: readonly RushAchievementCard[];
  /** gives the menu back to the card */
  back(): void;
}

/**
 * Slides a panel over the card: its title (TRAGUARDI adds the won / total count), `content` filled by `fill`
 * (which returns its own buttons, in reading order) and INDIETRO; the menu starts on `initial` (default INDIETRO).
 */
export function slidePanel(kind: string, titleText: string, host: SlideHost, fill: (content: HTMLElement) => HTMLElement[], initial?: number): void {
  const panel = el('section', `cc-rpanel cc-rpanel--${kind}`);
  panel.setAttribute('aria-label', titleText);
  const title = el('h3', 'cc-rpanel__title');
  title.textContent = titleText;
  if (kind === 'trophies') {
    const won = host.achievements.filter((a) => a.unlocked).length;
    title.append(el('span', 'cc-rpanel__count', `${won}/${host.achievements.length}`));
  }
  const content = el('div', 'cc-rpanel__content');
  const buttons = fill(content);

  const close = (): void => {
    panel.classList.add('is-out');
    window.setTimeout(() => panel.remove(), OUT_MS);
    host.back();
  };
  const back = button('cc-btn--primary cc-rpanel__back', '<span class="cc-btn__label">INDIETRO</span>', host.menu.guard(close));
  buttons.push(back);
  panel.append(title, content, back);
  scrollPane(content, content);
  host.body.append(panel);
  host.menu.open(buttons, { onBack: close, initial: initial ?? buttons.length - 1 });
}

export function openPanel(kind: PanelKind, host: PanelHost): void {
  // settings: the cursor starts on the stored sensitivity (the one drawn as chosen)
  const chosen = SWIPE_OPTIONS.findIndex((o) => o.value === host.settings().swipe);
  slidePanel(
    kind,
    TITLES[kind],
    host,
    (content) => {
      if (kind === 'settings') return settings(content, host);
      content.append(kind === 'help' ? help() : trophyList(host.achievements));
      return [];
    },
    kind === 'settings' ? Math.max(0, chosen) : undefined,
  );
}
