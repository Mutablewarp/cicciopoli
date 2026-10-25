/**
 * Sub-panels of the level 7 pre-shift card, sliding over it like the level 6 ones (rush/panels.ts slidePanel):
 * COME SI GIOCA (the four illustrated steps of a customer and the real menù rule), IMPOSTAZIONI (aiuti,
 * vibrazione, movimento ridotto, musica; every flip reaches onSettings) and TRAGUARDI.
 */
import type { KitchenSettings } from '../../contracts';
import { button, el, pixelHtml } from '../dom';
import { type SlideHost, slidePanel, trophyList } from '../rush/panels';
import { stepSvg } from './icons';
import { MENU_NOTE, MENU_RULE_TEXT, STEPS, TOGGLES } from './text';

export type KitchenPanel = 'help' | 'settings' | 'trophies';

export interface KitchenPanelHost extends SlideHost {
  settings(): KitchenSettings;
  setSettings(s: KitchenSettings): void;
}

const TITLES: Readonly<Record<KitchenPanel, string>> = { help: 'COME SI GIOCA', settings: 'IMPOSTAZIONI', trophies: 'TRAGUARDI' };

function help(): HTMLElement {
  const wrap = el('div', 'cc-khelp');
  const steps = el('ol', 'cc-ksteps');
  STEPS.forEach((s, i) => {
    const li = el('li', 'cc-kstep', `<span class="cc-kstep__art">${stepSvg(s.icon)}<b>${i + 1}</b></span>`);
    const body = el('span', 'cc-kstep__text');
    const title = el('strong');
    title.textContent = s.title;
    body.append(title, s.text);
    li.append(body);
    steps.append(li);
  });
  const rule = el('p', 'cc-krule', pixelHtml(MENU_RULE_TEXT));
  const note = el('p', 'cc-krule__note');
  note.textContent = MENU_NOTE;
  wrap.append(steps, rule, note);
  return wrap;
}

/** Four switches; a tap also moves the menu cursor there, like the level 6 settings. */
function settings(content: HTMLElement, host: KitchenPanelHost): HTMLElement[] {
  const switches = TOGGLES.map((t, i) => {
    const b = button(
      'cc-switch',
      `<span class="cc-setting__name">${t.label}</span><span class="cc-switch__pill"><i></i><b></b></span>`,
      host.menu.guard(() => {
        host.menu.select(i, false);
        const next = { ...host.settings() };
        next[t.key] = !next[t.key];
        host.setSettings(next);
        render();
      }, false),
    );
    b.setAttribute('role', 'switch');
    return { key: t.key, b };
  });
  function render(): void {
    const s = host.settings();
    for (const { key, b } of switches) {
      b.classList.toggle('is-on', s[key]);
      b.setAttribute('aria-checked', String(s[key]));
      const state = b.querySelector('b');
      if (state) state.textContent = s[key] ? 'ON' : 'OFF';
    }
  }
  render();
  content.append(...switches.map((s) => s.b));
  return switches.map((s) => s.b);
}

export function openKitchenPanel(kind: KitchenPanel, host: KitchenPanelHost): void {
  slidePanel(
    kind,
    TITLES[kind],
    host,
    (content) => {
      if (kind === 'settings') return settings(content, host);
      content.append(kind === 'help' ? help() : trophyList(host.achievements));
      return [];
    },
    kind === 'settings' ? 0 : undefined,
  );
}
