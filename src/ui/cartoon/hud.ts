/**
 * Level 8 HUD (inside the top HUD bar, shown with `.cc-hud.is-cartoon`): the hearts as vintage playing cards (a lost
 * one flips to its back), the five super cards filling with gold, the weapon medallion, the boss name in serif
 * display lettering and the seven boss pins of the rush. Caller: ui/hud.ts (update with every HudState partial).
 */
import type { CartoonWeapon, HudState } from '../../contracts';
import { el, setText } from '../dom';
import { WEAPON_ICON, WEAPON_NAME, cardHeartSvg } from './icons';
import { HERO_HEARTS, cardFills } from './text';

const POP: Keyframe[] = [{ transform: 'scale(1)' }, { transform: 'scale(1.3) rotate(-6deg)' }, { transform: 'scale(1)' }];

export interface CartoonHudLayer {
  readonly root: HTMLElement;
  update(s: Partial<HudState>): void;
}

export function createCartoonHud(): CartoonHudLayer {
  const root = el('div', 'cc-thud');
  const hearts = el('div', 'cc-thud__hearts');
  hearts.setAttribute('role', 'img');
  const cards = el('div', 'cc-thud__cards');
  cards.setAttribute('role', 'img');
  const cardEls = Array.from({ length: cardFills(0).length }, () => el('span', 'cc-tcard', '<i></i>'));
  cards.append(...cardEls);
  const weapon = el('span', 'cc-thud__weapon');
  const power = el('div', 'cc-thud__power');
  power.append(cards, weapon);
  const left = el('div', 'cc-thud__left');
  left.append(hearts, power);
  const name = el('b', 'cc-thud__name');
  const pins = el('div', 'cc-thud__pins');
  const boss = el('div', 'cc-thud__boss');
  boss.append(name, pins);
  root.append(left, boss);

  let heartEls: HTMLElement[] = [];
  let shown = { hearts: -1, max: -1, cards: '', weapon: '' as CartoonWeapon | '', pins: '' };

  function renderHearts(count: number, max: number): void {
    if (max !== shown.max) {
      heartEls = Array.from({ length: max }, () => el('span', 'cc-thp', `<span class="cc-thp__in">${cardHeartSvg(true)}${cardHeartSvg(false)}</span>`));
      hearts.replaceChildren(...heartEls);
    }
    heartEls.forEach((h, i) => {
      const full = i < count;
      if (h.classList.contains('is-full') === full) return;
      h.classList.toggle('is-full', full);
      // a lost heart shakes as it flips (CSS); a regained one pops
      if (shown.hearts >= 0) h.classList.add(full ? 'is-gain' : 'is-loss');
      window.setTimeout(() => h.classList.remove('is-gain', 'is-loss'), 600);
    });
    hearts.setAttribute('aria-label', `Cuori: ${count} su ${max}`);
    shown = { ...shown, hearts: count, max };
  }

  function renderCards(value: number): void {
    const fills = cardFills(value);
    const key = fills.join(',');
    if (key === shown.cards) return;
    const before = shown.cards ? shown.cards.split(',').map(Number) : [];
    fills.forEach((f, i) => {
      const c = cardEls[i];
      c.style.setProperty('--f', String(f));
      const full = f >= 1;
      if (full && (before[i] ?? 0) < 1 && shown.cards) c.animate(POP, { duration: 360, easing: 'cubic-bezier(.3,1.6,.5,1)' });
      c.classList.toggle('is-full', full);
    });
    root.classList.toggle('is-super', fills.every((f) => f >= 1));
    cards.setAttribute('aria-label', `Carte super: ${Math.floor(value)} su ${fills.length}`);
    shown = { ...shown, cards: key };
  }

  function renderWeapon(w: CartoonWeapon): void {
    if (w === shown.weapon) return;
    const swap = shown.weapon !== '';
    weapon.innerHTML = WEAPON_ICON[w]();
    weapon.title = WEAPON_NAME[w];
    if (swap) weapon.animate(POP, { duration: 320 });
    shown = { ...shown, weapon: w };
  }

  function renderPins(index: number, total: number): void {
    const key = `${index}/${total}`;
    if (key === shown.pins) return;
    pins.replaceChildren(
      ...Array.from({ length: total }, (_, i) => el('i', `cc-tpin${i < index ? ' is-done' : i === index ? ' is-now' : ''}`)),
    );
    pins.setAttribute('aria-label', `Boss ${index + 1} di ${total}`);
    shown = { ...shown, pins: key };
  }

  return {
    root,
    update(s) {
      if (s.hearts !== undefined || s.maxHearts !== undefined) {
        const max = Math.max(1, s.maxHearts ?? (shown.max < 0 ? HERO_HEARTS : shown.max));
        const count = Math.max(0, Math.min(max, s.hearts ?? shown.hearts));
        if (count !== shown.hearts || max !== shown.max) renderHearts(count, max);
      }
      const c = s.cartoon;
      if (!c) return;
      renderCards(c.cards);
      renderWeapon(c.weapon);
      setText(name, c.bossName);
      renderPins(c.bossIndex, c.bossTotal);
    },
  };
}
