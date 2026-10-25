/**
 * Sample level 7 data for the dev harness (ui-harness.html), from the real menu (config/kitchenMenu.ts): not
 * shipped in the game. Also a stand-in for the kitchen scene (counter or worktop) and the head anchor of its
 * customer, laid out in the free area like the scene will be.
 */
import type { HudState, KitchenHud, KitchenResultInfo, KitchenSetupInfo, KitchenTicket } from '../../contracts';
import { DRINK_NAME, INGREDIENT_NAME, SIDE_NAME, type BurgerId, burger, euro } from '../../config/kitchenMenu';

/** A ticket for `id`; `done` = how many of each line are on already, in order. */
function ticket(id: BurgerId, menu: boolean, customer: string, done: readonly number[], wrong: string[]): KitchenTicket {
  const b = burger(id);
  const counts = new Map<string, number>();
  for (const i of b.ingredients) counts.set(INGREDIENT_NAME[i].short, (counts.get(INGREDIENT_NAME[i].short) ?? 0) + 1);
  const lines: KitchenTicket['lines'] = [...counts].map(([label, count]) => ({ label, count, done: 0, group: 'burger' }));
  if (menu) {
    for (const label of [SIDE_NAME.patatine, SIDE_NAME.meatball, DRINK_NAME.cocaCola]) lines.push({ label, count: 1, done: 0, group: 'menu' });
  }
  lines.forEach((l, i) => (l.done = Math.min(done[i] ?? 0, l.count + 1)));
  return { title: b.name, form: menu ? 'MENÙ' : 'SINGOLO', price: euro(menu ? b.menuPriceCents : b.priceCents), customer, lines, wrong };
}

export type SampleTicket = 'long' | 'wide' | 'tale' | 'double' | 'short' | 'none';

const SAMPLE_TICKETS: Readonly<Record<SampleTicket, () => KitchenTicket | null>> = {
  long: () => ticket('pancetta', true, 'Signora Rosalia', [1, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0], ['POMODORO']),
  // few lines with the longest words: two columns are tried first
  wide: () => ticket('pancetta', false, 'Kevin', [1, 1], []),
  tale: () => ticket('tale', true, 'Signora Rosalia', [], []),
  double: () => ticket('doubleTriple', false, 'Salvo', [2, 2, 1, 0], []),
  short: () => ticket('cheeseburger', true, 'Nonno Turi', [1, 0, 0, 1], []),
  none: () => null,
};

export function kitchenHud(kind: SampleTicket, view: KitchenHud['view'], opts: { say: boolean; hint: boolean; patience: number; mood: 'neutral' | 'happy' | 'angry' }): KitchenHud {
  const t = SAMPLE_TICKETS[kind]();
  const line =
    opts.mood === 'angry'
      ? 'Troppo lento, me ne vado!'
      : opts.mood === 'happy'
        ? 'MIZZICA, CHE BONTÀ!'
        : 'Ciao Ciccio! Una PANCETTA in menù: meat balls e Coca Cola, grazie!';
  return {
    view,
    ticket: t,
    say: opts.say ? { text: line, mood: opts.mood, anchor: { x: 0, y: 0 } } : null,
    patience: opts.patience,
    served: { done: 3, total: 8 },
    hint: opts.hint ? 'Tocca la carne: va sulla piastra!' : null,
  };
}

export const KITCHEN_HUD: Partial<HudState> = {
  level: 7,
  hearts: 2,
  maxHearts: 3,
  score: 4280,
  timeMs: 96000,
  powers: { brie: false, goat: false, thai: false, wings: false },
};

/** Free area of the host (minus the covered strips): where the scene puts the customer. */
function free(host: HTMLElement): { x: number; y: number; w: number; h: number } {
  const cs = getComputedStyle(host);
  const px = (name: string): number => parseFloat(cs.getPropertyValue(name)) || 0;
  const t = px('--play-inset-t');
  const l = px('--play-inset-l');
  const b = px('--play-inset-b');
  return { x: l, y: t, w: host.clientWidth - l, h: host.clientHeight - t - b };
}

/** Top of the stand-in customer's head (host px). */
export function headAnchor(host: HTMLElement): { x: number; y: number } {
  const f = free(host);
  return { x: Math.round(f.x + f.w / 2), y: Math.round(f.y + f.h * 0.42) };
}

/** Stand-in scene, art px of size `s`: the counter (room, customer, steel counter) or the worktop with stations. */
export function drawKitchen(ctx: CanvasRenderingContext2D, host: HTMLElement, s: number, view: KitchenHud['view']): void {
  const f = free(host);
  const w = Math.ceil(host.clientWidth / s);
  const h = Math.ceil(host.clientHeight / s);
  const fx = Math.round(f.x / s);
  const fw = Math.round(f.w / s);
  const fy = Math.round(f.y / s);
  const fh = Math.round(f.h / s);
  if (view === 'counter') {
    ctx.fillStyle = '#3a3036';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2c6a24';
    for (let x = 0; x < w; x += 9) ctx.fillRect(x, 0, 3, Math.round(h * 0.4) + ((x * 7) % 13));
    const a = headAnchor(host);
    const cx = Math.round(a.x / s);
    const top = Math.round(a.y / s);
    ctx.fillStyle = '#f4d2a8';
    ctx.fillRect(cx - 9, top, 18, 20);
    ctx.fillStyle = '#e8a040';
    ctx.fillRect(cx - 16, top + 20, 32, h);
    ctx.fillStyle = '#c8ced2';
    ctx.fillRect(0, fy + Math.round(fh * 0.72), w, h);
    ctx.fillStyle = '#8a9298';
    for (let x = 0; x < w; x += 3) ctx.fillRect(x, fy + Math.round(fh * 0.72) + 6, 1, h);
    return;
  }
  ctx.fillStyle = '#9aa2a8';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#b4bcc2';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  // griddle, fryer, bins and the paper laid out in the free area
  const box = (x: number, y: number, bw: number, bh: number, c: string): void => {
    ctx.fillStyle = '#141414';
    ctx.fillRect(fx + Math.round(fw * x) - 1, fy + Math.round(fh * y) - 1, Math.round(fw * bw) + 2, Math.round(fh * bh) + 2);
    ctx.fillStyle = c;
    ctx.fillRect(fx + Math.round(fw * x), fy + Math.round(fh * y), Math.round(fw * bw), Math.round(fh * bh));
  };
  box(0.05, 0.06, 0.55, 0.22, '#26262c');
  box(0.66, 0.06, 0.29, 0.22, '#d8a020');
  for (let i = 0; i < 4; i++) box(0.05 + i * 0.235, 0.36, 0.2, 0.14, '#5cc020');
  box(0.25, 0.62, 0.5, 0.12, '#fbf6ea');
  box(0.05, 0.82, 0.9, 0.14, '#1a1a1c');
}

export function kitchenSetup(golden: boolean, calm = false): KitchenSetupInfo {
  return {
    best: golden ? 18640 : 0,
    bestStars: golden ? 3 : 0,
    golden,
    settings: { hints: true, vibration: true, reducedMotion: calm, music: true },
    achievements: [
      { id: 'primo', name: 'PRIMO PANINO', desc: 'Servi il tuo primo cliente.', unlocked: golden },
      { id: 'piastra', name: "PIASTRA D'ORO", desc: 'Togli 10 burger nella zona PERFETTO.', unlocked: golden },
      { id: 'bacon', name: 'RE DEL BACON', desc: 'Servi 5 panini con il bacon perfetto.', unlocked: false },
      { id: 'menu', name: 'MENÙ COMPLETO', desc: 'Servi un menù con tutto giusto.', unlocked: golden },
      { id: 'nessuno', name: 'NESSUNO SCONTENTO', desc: 'Finisci il turno senza clienti arrabbiati.', unlocked: false },
      { id: 'golden', name: 'YOU ARE SO GOLDEN', desc: 'Chiudi il turno con 3 stelle.', unlocked: golden },
    ],
  };
}

export function kitchenResults(completed: boolean, golden: boolean): KitchenResultInfo {
  return {
    completed,
    golden,
    score: golden ? 18640 : completed ? 11320 : 3450,
    best: 18640,
    newBest: golden,
    stars: golden ? 3 : completed ? 2 : 1,
    breakdown: completed
      ? [
          { label: 'Panini serviti', points: 9480 },
          { label: 'Piastrate perfette', points: 2400 },
          { label: 'Velocità', points: 1860 },
          { label: 'Combo 5 stelle', points: golden ? 4900 : 1580 },
        ]
      : [
          { label: 'Panini serviti', points: 2650 },
          { label: 'Piastrate perfette', points: 600 },
          { label: 'Velocità', points: 200 },
        ],
    served: completed ? 8 : 3,
    total: 8,
    avgStars: golden ? 4.75 : completed ? 3.9 : 2.33,
    takingsCents: golden ? 12340 : completed ? 10980 : 3870,
    perfectCooks: golden ? 12 : completed ? 7 : 2,
    angry: completed ? (golden ? 0 : 1) : 3,
    tip: completed ? 'Gira la carne nella zona dorata!' : 'Leggi lo scontrino: il cliente vuole solo quello!',
    newAchievements: golden ? [{ name: 'YOU ARE SO GOLDEN', desc: 'Chiudi il turno con 3 stelle.' }, { name: "PIASTRA D'ORO", desc: 'Togli 10 burger nella zona PERFETTO.' }] : [],
    shareText: `Ho fatto ${golden ? '18.640' : '11.320'} punti a CICCIO'S KITCHEN, il turno da Ciccio's!`,
  };
}
