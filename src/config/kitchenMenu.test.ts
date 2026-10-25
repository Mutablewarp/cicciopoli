import { describe, expect, it } from 'vitest';
import { INGREDIENTS } from '../art/kitchen/keys';
import { BURGERS, INGREDIENT_NAME, MENU_RULE, STATION_OF, burger, euro, menuStarters } from './kitchenMenu';

describe('real Ciccio\'s Palermo menu (2026-10-24 snapshot)', () => {
  it('17 burgers: 4 classic + 13 Ciccio\'s, unique names', () => {
    expect(BURGERS.filter((b) => b.line === 'classic')).toHaveLength(4);
    expect(BURGERS.filter((b) => b.line === 'ciccios')).toHaveLength(13);
    expect(new Set(BURGERS.map((b) => b.name)).size).toBe(BURGERS.length);
  });

  it('menù price = burger price + 5,00 € (the real rule and the real list agree)', () => {
    for (const b of BURGERS) expect(b.menuPriceCents, b.id).toBe(b.priceCents + MENU_RULE.extraCents);
  });

  it('prices as printed', () => {
    expect(euro(burger('hamburger').priceCents)).toBe('6,50 €');
    expect(euro(burger('brie').menuPriceCents)).toBe('14,90 €');
    expect(euro(burger('big').menuPriceCents)).toBe('16,90 €');
    expect(euro(burger('doubleTriple').priceCents)).toBe('11,90 €');
  });

  it('every burger has exactly one protein first and every ingredient is known', () => {
    const proteins = new Set(['manzo', 'vegetale', 'polloPastellato', 'polloCroccante', 'cosciaPanko']);
    for (const b of BURGERS) {
      expect(proteins.has(b.ingredients[0]), b.id).toBe(true);
      for (const i of b.ingredients) expect(INGREDIENTS, b.id).toContain(i);
    }
    expect(burger('doubleTriple').ingredients.filter((i) => i === 'cheddar')).toHaveLength(3);
    expect(burger('big').ingredients.filter((i) => i === 'manzo')).toHaveLength(2);
  });

  it('every ingredient is used by some burger, has a station and a name', () => {
    const used = new Set(BURGERS.flatMap((b) => b.ingredients));
    for (const i of INGREDIENTS) {
      expect(used.has(i), i).toBe(true);
      expect(STATION_OF[i], i).toBeDefined();
      expect(INGREDIENT_NAME[i].short.length, i).toBeGreaterThan(0);
    }
  });

  it('green nuggets only in the GREEN menù', () => {
    expect(menuStarters('green')).toContain('greenNuggets');
    expect(menuStarters('brie')).not.toContain('greenNuggets');
    expect(menuStarters('brie')).toHaveLength(3);
  });

  it('no forbidden or alcoholic name', () => {
    const all = JSON.stringify({ BURGERS, INGREDIENT_NAME }).toLowerCase();
    for (const w of ['mondello', 'ceres', 'hippana', 'birra']) expect(all).not.toContain(w);
  });
});
