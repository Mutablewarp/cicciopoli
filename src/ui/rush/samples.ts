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
      { id: 'pelo', name: 'MAESTRO DEL PELO', desc: 'Sfiora 10 veicoli in una corsa.', unlocked: daily },
      { id: 'catena', name: "CATENA D'ORO", desc: 'Prendi 3 file intere di patatine.', unlocked: false },
      { id: 'febbre', name: 'FEBBRE DA CICCIO', desc: 'Accendi la Ciccio Fever 2 volte.', unlocked: false },
    ],
  };
}

export function rushResults(win: boolean, daily: boolean): RushResultInfo {
  return {
    completed: win,
    daily,
    score: win ? 7460 : 1630,
    best: 7460,
    newBest: win,
    stars: win ? 2 : 1,
    breakdown: win
      ? [
          { label: 'Consegne', points: 3000 },
          { label: 'Freschezza', points: 1120 },
          { label: 'Sorpassi puliti', points: 450 },
          { label: 'Zone senza urti', points: 300 },
          { label: 'Sfiorati x12', points: 900 },
          { label: 'Catene x3', points: 450 },
          { label: 'Ciccio Fever x2', points: 1240 },
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
    newAchievements: win
      ? [
          { name: 'RE DI PALERMO', desc: 'Completa tutte e 3 le consegne.' },
          { name: 'MAESTRO DEL PELO', desc: 'Sfiora 10 veicoli in una corsa.' },
          { name: 'FEBBRE DA CICCIO', desc: 'Accendi la Ciccio Fever 2 volte.' },
        ]
      : [],
    unlockedDriver: win ? 'RE DELLE CONSEGNE' : undefined,
    shareText: `Ho fatto ${win ? 7460 : 1630} punti a CICCIO'S RUSH, la missione consegna a Palermo!`,
  };
}
