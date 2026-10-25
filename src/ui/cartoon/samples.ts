/**
 * Sample level 8 data for the dev harness (ui-harness.html), not shipped in the game: HUD, controls layout, the boss
 * map at any point of the rush and the three kinds of results card. Also a stand-in for the arena (the 16:9 stage
 * framed like logic/framing.ts does it), so the controls band and the insets can be judged.
 */
import type { CartoonBossCard, CartoonBossId, CartoonMapInfo, CartoonResultInfo, CartoonWeapon, ControlsLayout, HudState } from '../../contracts';

const BOSSES: ReadonlyArray<{ id: CartoonBossId; name: string; tagline: string }> = [
  { id: 'brie', name: 'MONSIEUR BRIE', tagline: 'Brie with friends... ma tu non sei suo amico.' },
  { id: 'pancetta', name: 'PANCETTA LO SKATER', tagline: 'Sul lungomare va a tutta birra.' },
  { id: 'tuma', name: 'DON TUMA', tagline: '100% Siciliano, 100% permaloso.' },
  { id: 'happy', name: 'HAPPY BOX', tagline: 'Make it happy... a colpi di vernice!' },
  { id: 'oldschool', name: 'THE OLD SCHOOL', tagline: "Solo da Ciccio's, solo vecchia scuola." },
  { id: 'doubletriple', name: 'DOUBLE TRIPLE', tagline: 'Doppio burger, triplo cheddar, zero pietà.' },
  { id: 'burgergang', name: 'IL BOSS DELLA BURGER GANG', tagline: "Il capo della gang. L'ultimo ostacolo." },
];
const GRADES = ['A+', 'A', 'B', 'A', 'C', 'B', 'A+'];

/** The map after `beaten` knockouts (0..7). */
export function cartoonMap(beaten: number, calm = false, autoFire = true): CartoonMapInfo {
  const bosses: CartoonBossCard[] = BOSSES.map((b, i) => ({
    ...b,
    state: i < beaten ? 'beaten' : i === beaten ? 'open' : 'locked',
    grade: i < beaten ? GRADES[i] : null,
  }));
  return {
    bosses,
    next: BOSSES[Math.min(beaten, BOSSES.length - 1)].id,
    golden: beaten >= BOSSES.length,
    best: beaten > 0 ? 18_420 + beaten * 3_100 : 0,
    settings: { autoFire, vibration: true, reducedMotion: calm, music: true },
  };
}

export type SampleResult = 'win' | 'golden' | 'over';

export function cartoonResults(kind: SampleResult, grade = 'A+', progress = 0.72): CartoonResultInfo {
  const boss = kind === 'golden' ? BOSSES[6] : kind === 'over' ? BOSSES[2] : BOSSES[1];
  const won = kind !== 'over';
  return {
    boss: boss.id,
    bossName: boss.name,
    won,
    progress: won ? 1 : progress,
    timeMs: 74_300,
    hp: won ? 2 : 0,
    parries: 3,
    supers: 1,
    grade: won ? grade : null,
    score: won ? 26_840 : 4_210,
    best: 26_840,
    newBest: kind === 'golden',
    golden: kind === 'golden',
    tip: won ? 'Para gli oggetti rosa: ogni parata vale una carta!' : 'Usa lo SCATTO per passare attraverso i colpi.',
    shareText: `Ho steso ${boss.name} con il voto ${grade} a CICCIO'S GOLDEN TICKET!`,
    hasNext: kind === 'win',
  };
}

export function cartoonHud(cards: number, weapon: CartoonWeapon, hearts: number, boss = 2): Partial<HudState> {
  return {
    level: 8,
    hearts,
    maxHearts: 3,
    score: 12_400,
    timeMs: 41_000,
    progress: 0.45,
    cartoon: { cards, weapon, bossName: BOSSES[boss].name, bossIndex: boss, bossTotal: BOSSES.length },
  };
}

export function cartoonLayout(cards: number, weapon: CartoonWeapon, autoFire: boolean): ControlsLayout {
  return { level: 8, mode: 'cartoon', fire: 'enabled', club: 'hidden', down: 'hidden', jumpLabel: 'SALTA', autoFire, weapon, superCards: Math.floor(cards) };
}

/** Stand-in arena: sepia surround, the 16:9 stage as big as it fits in the free band (art px of size `s`). */
export function drawArena(ctx: CanvasRenderingContext2D, host: HTMLElement, s: number): void {
  const cs = getComputedStyle(host);
  const px = (n: string): number => parseFloat(cs.getPropertyValue(n)) || 0;
  const W = host.clientWidth;
  const H = host.clientHeight;
  const top = px('--play-inset-t');
  const bottom = H > W ? H - px('--play-inset-b') : H;
  const z = Math.min((W - 12) / 640, (bottom - top - (H > W ? 12 : 0)) / 360);
  const w = 640 * z;
  const h = 360 * z;
  const x = (W - w) / 2;
  const y = top + (bottom - top - h) / 2;
  ctx.fillStyle = '#140d08';
  ctx.fillRect(0, 0, W / s, H / s);
  const g = ctx.createLinearGradient(0, y / s, 0, (y + h) / s);
  g.addColorStop(0, '#9ccbd8');
  g.addColorStop(0.6, '#e8d7a8');
  g.addColorStop(1, '#c49a5a');
  ctx.fillStyle = g;
  ctx.fillRect(x / s, y / s, w / s, h / s);
  ctx.fillStyle = '#6a8a3a';
  ctx.fillRect(x / s, (y + h * 0.88) / s, w / s, (h * 0.12) / s);
  ctx.fillStyle = '#1c1511';
  ctx.fillRect((x + w * 0.2) / s, (y + h * 0.74) / s, (w * 0.04) / s, (h * 0.14) / s);
  ctx.fillStyle = '#f6d88a';
  ctx.fillRect((x + w * 0.68) / s, (y + h * 0.4) / s, (w * 0.16) / s, (h * 0.48) / s);
}
