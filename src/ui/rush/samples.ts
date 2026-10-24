/** Sample level 6 data for the dev harness (ui-harness.html): realistic Italian copy, not shipped in the game. */
import type { HudState, RushResultInfo, RushSetupInfo } from '../../contracts';

export const RUSH_HUD: Partial<HudState> = {
  level: 6,
  hearts: 2,
  maxHearts: 3,
  score: 2350,
  timeMs: 23000,
  countdown: true,
  progress: 0.45,
  fresh: 72,
  deliveries: { done: 1, total: 3 },
  powers: { brie: false, goat: false, thai: false, wings: false, shield: true, radar: true },
  powerLeft: 0.4,
  combo: 1.75,
};

export function rushSetup(daily: boolean, calm = false): RushSetupInfo {
  return {
    best: daily ? 4870 : 0,
    bestStars: daily ? 2 : 0,
    selected: 'riflessi',
    drivers: [
      { id: 'riflessi', name: 'RIFLESSI DA CICCIO', ability: 'Cambio corsia fulmineo.', locked: false },
      { id: 'occhio', name: 'OCCHIO AL TRAFFICO', ability: 'Vedi i pericoli un attimo prima.', locked: !daily, unlockHint: 'Fai la tua prima consegna per sbloccarlo.' },
      { id: 'consegne', name: 'RE DELLE CONSEGNE', ability: 'Gli urti raffreddano meno il panino.', locked: true, unlockHint: 'Completa le 3 consegne in una sola corsa.' },
    ],
    daily: { label: '20 OTTOBRE', best: daily ? 3400 : null },
    settings: { swipe: 'mid', vibration: true, reducedMotion: calm, highContrast: false, music: true },
    achievements: [
      { id: 'prima', name: 'PRIMA CONSEGNA', desc: 'Consegna il tuo primo ordine.', unlocked: true },
      { id: 'zero', name: 'ZERO URTI', desc: 'Finisci una corsa senza urti.', unlocked: false },
      { id: 're', name: 'RE DI PALERMO', desc: 'Completa tutte e 3 le consegne.', unlocked: daily },
      { id: 'tris', name: 'TRIS PERFETTO', desc: 'Prendi 3 stelle in una corsa.', unlocked: false },
      { id: 'maestro', name: 'MAESTRO DEL TRAFFICO', desc: 'Arriva a una combo x3.', unlocked: false },
      { id: 'vola', name: 'IL TRUCK VOLA!', desc: 'Trova il propulsore.', unlocked: false },
    ],
  };
}

export function rushResults(win: boolean, daily: boolean): RushResultInfo {
  return {
    completed: win,
    daily,
    score: win ? 4870 : 1630,
    best: 4870,
    newBest: win,
    stars: win ? 2 : 1,
    breakdown: win
      ? [
          { label: 'Consegne', points: 3000 },
          { label: 'Freschezza', points: 1120 },
          { label: 'Sorpassi puliti', points: 450 },
          { label: 'Zone senza urti', points: 300 },
        ]
      : [
          { label: 'Consegne', points: 1000 },
          { label: 'Freschezza', points: 380 },
          { label: 'Sorpassi puliti', points: 250 },
        ],
    delivered: win ? 3 : 1,
    avgFresh: win ? 84 : 62,
    collisions: win ? 1 : 3,
    bestCombo: win ? 2.25 : 1.5,
    tip: win ? 'Evita un urto per la terza stella!' : 'Ti mancavano 150 punti per il tuo record!',
    newAchievements: win ? [{ name: 'RE DI PALERMO', desc: 'Completa tutte e 3 le consegne.' }] : [],
    unlockedDriver: win ? 'RE DELLE CONSEGNE' : undefined,
    shareText: `Ho fatto ${win ? 4870 : 1630} punti a CICCIO'S RUSH, la missione consegna a Palermo!`,
  };
}
