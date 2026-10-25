/**
 * Sub-panels of the level 8 map, sliding over it like the level 6-7 ones (rush/panels.ts slidePanel, restyled by
 * cartoon/toon.css): COME SI GIOCA (every control with its button drawn as on screen, the three weapons, parry and
 * super) and IMPOSTAZIONI (sparo automatico, vibrazione, movimento ridotto, musica: every flip reaches onSettings).
 */
import type { CartoonSettings } from '../../contracts';
import { button, el } from '../dom';
import { type SlideHost, slidePanel } from '../rush/panels';
import { WEAPON_ICON, WEAPON_NAME, arrowSvg, dashSvg, gloveSvg, starSvg } from './icons';
import { HELP_ROWS, type HelpIcon, SUPER_CARDS, TOGGLES, WEAPON_HELP } from './text';

export interface CartoonPanelHost extends SlideHost {
  settings(): CartoonSettings;
  setSettings(s: CartoonSettings): void;
}

const TITLES = { help: 'COME SI GIOCA', settings: 'IMPOSTAZIONI' } as const;

/** The control as the player sees it on screen (same discs as cartoon/controls.ts, smaller). */
function helpIcon(icon: HelpIcon): string {
  const disc = (cls: string, inner: string): string => `<span class="cc-thelp__disc cc-thelp__disc--${cls}">${inner}</span>`;
  switch (icon) {
    case 'pad':
      return disc('pad', `<i class="is-l">${arrowSvg()}</i><i class="is-r">${arrowSvg()}</i>`);
    case 'up':
      return disc('up', arrowSvg());
    case 'jump':
      return disc('jump', arrowSvg());
    case 'parry':
      return disc('parry', starSvg('', '#ff6fae'));
    case 'shoot':
      return disc('fire', gloveSvg());
    case 'dash':
      return disc('dash', dashSvg());
    case 'swap':
      return disc('swap', WEAPON_ICON.provola());
    case 'super':
      return disc('super', `<span class="cc-tbtn__minis">${'<i class="is-full"></i>'.repeat(SUPER_CARDS)}</span>`);
  }
}

function help(): HTMLElement {
  const wrap = el('div', 'cc-thelp');
  const rows = el('ul', 'cc-thelp__rows');
  for (const r of HELP_ROWS) {
    const li = el('li', '', helpIcon(r.icon));
    const body = el('span');
    const title = el('strong');
    title.textContent = r.title;
    body.append(title, r.text);
    li.append(body);
    rows.append(li);
  }
  const weapons = el('ul', 'cc-thelp__weapons');
  for (const w of WEAPON_HELP) {
    const li = el('li', '', `<span class="cc-thelp__weapon">${WEAPON_ICON[w.id]()}</span>`);
    const body = el('span');
    const title = el('strong');
    title.textContent = WEAPON_NAME[w.id];
    body.append(title, w.text);
    li.append(body);
    weapons.append(li);
  }
  wrap.append(rows, el('p', 'cc-thelp__sub', 'LE ARMI DI CICCIO'), weapons);
  return wrap;
}

/** Four switches with a one-line note each; a tap also moves the menu cursor there. */
function settings(content: HTMLElement, host: CartoonPanelHost): HTMLElement[] {
  const switches = TOGGLES.map((t, i) => {
    const b = button(
      'cc-switch',
      `<span class="cc-setting__text"><span class="cc-setting__name">${t.label}</span><span class="cc-setting__note">${t.note}</span></span>` +
        '<span class="cc-switch__pill"><i></i><b></b></span>',
      host.menu.guard(() => {
        host.menu.select(i, false);
        host.setSettings({ ...host.settings(), [t.key]: !host.settings()[t.key] });
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
      if (state) state.textContent = s[key] ? 'SÌ' : 'NO';
    }
  }
  render();
  content.append(...switches.map((s) => s.b));
  return switches.map((s) => s.b);
}

export function openCartoonPanel(kind: 'help' | 'settings', host: CartoonPanelHost): void {
  slidePanel(
    `toon-${kind}`,
    TITLES[kind],
    host,
    (content) => {
      if (kind === 'settings') return settings(content, host);
      content.append(help());
      return [];
    },
    kind === 'settings' ? 0 : undefined,
  );
}
