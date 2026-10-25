import { describe, expect, it } from 'vitest';
import { BUBBLE, MENU_RULE_TEXT, avgStars, lineView, namedBy, patienceMood, placeBubble, shortLabel, takings, ticketLabel } from './text';

describe('ticket lines', () => {
  it('drops the can size from drink labels only', () => {
    expect(ticketLabel('COCA COLA 33CL')).toBe('COCA COLA');
    expect(ticketLabel('ACQUA NATURALE 50CL')).toBe('ACQUA NATURALE');
    expect(ticketLabel("SALSA CICCIO'S")).toBe("SALSA CICCIO'S");
  });

  it('the tightest ticket uses the bin names for the longest labels only', () => {
    expect(shortLabel('CIPOLLA CARAMELLATA')).toBe('CIPOLLA CARAMELL.');
    expect(shortLabel('GREEN NUGGETS VEGGIE')).toBe('GREEN NUGGETS');
    expect(shortLabel('MANZO')).toBe('MANZO');
    // the bins print these whole (hyphenated): the ticket says the same words
    for (const n of ['POLLO PASTELLATO', 'PERE CARAMELLATE', 'CONFETTURA DI FICHI']) expect(shortLabel(n)).toBe(n);
  });

  it('the tutorial line names a ticket line only when it says every word of it', () => {
    expect(namedBy('FUZE TEA LIMONE 33CL', 'Bibita: prendi il Fuze Tea limone!')).toBe(true);
    expect(namedBy('ACQUA FRIZZANTE 50CL', "Bibita: prendi l'acqua frizzante!")).toBe(true);
    expect(namedBy("SALSA CICCIO'S", "Aggiungi la salsa Ciccio's!")).toBe(true);
    expect(namedBy('PATATINE', 'Friggitrice: tocca le patatine!')).toBe(true);
    expect(namedBy('NOCI', 'Aggiungi le nocciole!')).toBe(false);
    expect(namedBy('PERE CARAMELLATE', 'Aggiungi le pere!')).toBe(false);
    expect(namedBy('MANZO', 'Tocca la carne: va sulla piastra!')).toBe(false);
  });

  it('a single item shows no quantity; a tick once it is on', () => {
    expect(lineView({ label: 'BACON', count: 1, done: 0, group: 'burger' })).toEqual({ label: 'BACON', qty: '', state: 'todo', status: '' });
    expect(lineView({ label: 'BACON', count: 1, done: 1, group: 'burger' })).toMatchObject({ state: 'done', status: '' });
  });

  it('DOUBLE TRIPLE cheddar: x3, then the partial count, then the tick', () => {
    const line = { label: 'CHEDDAR', count: 3, group: 'burger' } as const;
    expect(lineView({ ...line, done: 0 })).toMatchObject({ qty: 'x3', state: 'todo', status: '' });
    expect(lineView({ ...line, done: 2 })).toMatchObject({ qty: 'x3', state: 'part', status: '2/3' });
    expect(lineView({ ...line, done: 3 })).toMatchObject({ state: 'done', status: '' });
    expect(lineView({ ...line, done: 4 })).toMatchObject({ state: 'over', status: '4/3' });
  });
});

describe('numbers in Italian', () => {
  it('takings: comma decimals, euro sign after, thousands dot', () => {
    expect(takings(12340)).toBe('123,40 €');
    expect(takings(1490)).toBe('14,90 €');
    expect(takings(5)).toBe('0,05 €');
    expect(takings(123456)).toBe('1.234,56 €');
  });

  it('average stars: one decimal with a comma', () => {
    expect(avgStars(4.25)).toBe('4,3');
    expect(avgStars(4)).toBe('4,0');
    expect(avgStars(0)).toBe('0,0');
  });

  it('the menù rule reads like the real board', () => {
    expect(MENU_RULE_TEXT).toBe('MENÙ = BURGER + PATATINE + STARTER + BIBITA, +5,00 €');
  });
});

describe('patience face', () => {
  it('happy, then worried, then angry', () => {
    expect(patienceMood(1)).toBe('happy');
    expect(patienceMood(0.5)).toBe('worried');
    expect(patienceMood(0.1)).toBe('angry');
  });
});

describe('speech bubble placement', () => {
  const size = { w: 200, h: 80 };
  /** 200 x 80 at its own width; a given room re-wraps the same text (up to 300 wide: shorter, narrower: taller) */
  const measure = (room: number): { w: number; h: number } => {
    const w = Number.isFinite(room) ? Math.min(room, 300) : size.w;
    return { w, h: Math.ceil((size.w * size.h) / w) };
  };

  it('right above the head while it keeps to the lower half of the room above it (the neon hangs in the upper half)', () => {
    const p = placeBubble({ x: 0, y: 120, w: 390, h: 500 }, { x: 195, y: 330 }, measure);
    expect(p).toMatchObject({ side: 'above', room: Infinity });
    expect(p.y + size.h + BUBBLE.tail).toBe(330);
    expect(p.x + p.tail).toBe(195);
  });

  it('a long line takes the whole free width: fewer lines, still under the neon', () => {
    const p = placeBubble({ x: 0, y: 50, w: 1000, h: 600 }, { x: 500, y: 200 }, measure);
    expect(p).toMatchObject({ side: 'above', room: 1000, x: 350, y: 200 - BUBBLE.tail - 54 });
    expect(p.x + p.tail).toBe(500);
  });

  it('no wider room either: beside the head, the right side first like Good Pizza, narrower and taller', () => {
    const p = placeBubble({ x: 0, y: 50, w: 400, h: 600 }, { x: 180, y: 150 }, measure);
    const room = 400 - 180 - BUBBLE.side;
    expect(p).toMatchObject({ side: 'right', room, x: 180 + BUBBLE.side, y: 150 - BUBBLE.corner });
    expect(p.y + p.tail).toBe(150 + BUBBLE.corner);
    expect(measure(p.room).w).toBeLessThanOrEqual(room);
  });

  it('to the left when the right side is too narrow', () => {
    const p = placeBubble({ x: 0, y: 50, w: 700, h: 340 }, { x: 600, y: 90 }, measure);
    expect(p.side).toBe('left');
    expect(p.x + measure(p.room).w).toBe(600 - BUBBLE.side);
  });

  it('a side so narrow the bubble would turn into a tall column: above at its widest', () => {
    const column = (room: number): { w: number; h: number } => (!Number.isFinite(room) ? size : room >= 300 ? { w: 300, h: 54 } : { w: room, h: 200 });
    expect(placeBubble({ x: 0, y: 50, w: 400, h: 600 }, { x: 180, y: 150 }, column)).toMatchObject({ side: 'above', y: 82, room: 400 });
  });

  it('no side wide enough for its longest word: above', () => {
    const stiff = (): { w: number; h: number } => ({ w: 190, h: 80 });
    expect(placeBubble({ x: 0, y: 50, w: 400, h: 600 }, { x: 180, y: 150 }, stiff)).toMatchObject({ side: 'above', y: 56 });
  });

  it('stays inside the free area horizontally, the tail still on the head', () => {
    const p = placeBubble({ x: 10, y: 0, w: 220, h: 600 }, { x: 40, y: 300 }, measure);
    expect(p.x).toBe(10);
    expect(p.x + p.tail).toBe(40);
  });

  it('nothing fits whole: above at its widest, clamped to the top of the free area', () => {
    const p = placeBubble({ x: 0, y: 40, w: 300, h: 300 }, { x: 150, y: 60 }, measure);
    expect(p).toMatchObject({ side: 'above', y: 40, room: 300 });
  });
});
