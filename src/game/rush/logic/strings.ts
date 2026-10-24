/**
 * Every Italian text of level 6. Real places and menu names only (cicciosburger.it); the
 * flying-car meme is told with our own words. Never print the car brand, its owner, the
 * rocket company, the space mannequin or the seaside town without a Ciccio's any more.
 */
import type { RushZone } from '../../../art/rush/keys';
import type { RushDriverId } from '../../../contracts';
import type { PowerId } from './types';

export const RUSH_TEXT = {
  newOrder: 'NUOVO ORDINE!',
  zoneAhead: 'CONSEGNA IN ARRIVO!',
  lastChanceAhead: 'ULTIMA CHANCE!',
  delivered: 'ORDINE CONSEGNATO!',
  perfect: 'CONSEGNA PERFETTA!',
  sky: 'CONSEGNA DAL CIELO!',
  missed: 'CONSEGNA MANCATA!',
  lastChance: 'ULTIMA CHANCE',
  lost: 'ORDINE PERSO',
  lostSub: 'Niente paura, la corsa continua!',
  cleanZone: 'ZONA SENZA URTI!',
  over: 'CORSA TERMINATA!',
  complete: 'CONSEGNA COMPLETATA!',
  roadcoaster: 'ROADCOASTER ATTIVATA!',
  zeroTo: '0–100 in 1,61 secondi',
  /** finale meme card */
  card: [
    "CICCIO'S ROADCOASTER",
    '0–100: 1,61 s',
    'Autonomia: 3 panini',
    'Pilota: Ciccio (in tuta spaziale)',
    'NIENTE PANICO',
    'Ciccio nello Spazio dal 2021',
  ],
  hints: ['SCORRI O USA ◀ ▶ PER CAMBIARE CORSIA', 'TIENI PREMUTO FRENA PER RALLENTARE', 'PASSA SULLA ZONA VERDE PER CONSEGNARE'],
  /** the first hint with SWIPE set to OFF */
  hintNoSwipe: 'USA ◀ ▶ PER CAMBIARE CORSIA',
  customerLines: ['MIZZICA!', 'TALÌA CHE VELOCITÀ!', 'GRAZIE CICCIO!', 'AMUNÌ, CHE FAME!', 'ANCORA CAUDU!'],
} as const;

export const ZONE_TEXT: Readonly<Record<RushZone, { name: string; sub: string }>> = {
  centro: { name: 'PALERMO CENTRO', sub: "Partenza dal Ciccio's La Lumia" },
  stadio: { name: 'ZONA STADIO', sub: 'Viale del Fante' },
  mare: { name: 'LUNGOMARE TERRASINI', sub: "Ciccio's Terrasini: prossima apertura!" },
};

export const POWER_TEXT: Readonly<Record<PowerId, { name: string; sub: string }>> = {
  shield: { name: 'SCUDO NUGGETS', sub: 'Assorbe un urto' },
  radar: { name: 'WAFFLE RADAR', sub: 'Vedi le corsie sicure' },
  sprint: { name: 'POPCORN SPRINT', sub: 'Turbo di Chicken Pop Corn!' },
  grip: { name: 'CHEDDAR GRIP', sub: 'Sterzo pronto, niente scivoloni' },
};

/** Real menu pairs (burger + side). */
export const MENU_PAIRS: readonly string[] = [
  'Big + Waffle Fries',
  'Tuma + Fries',
  'Crispy Goat + Chicken Pop Corn',
  'Old School + Fries',
  'American Baconcheese + Waffle Fries',
  'Brie + Nuggets',
  'Double Triple + Fries',
  'Green + Green Nuggets Veggie',
  'Cheeseburger + Chicken Pop Corn',
  'Bacon Cheeseburger + Waffle Fries',
  'Talè + Fries',
  'Zola + Nuggets',
  'Egg + Waffle Fries',
  'Pancetta + Fries',
  'Meatball + Nuggets',
];

export const CUSTOMERS: readonly string[] = [
  'Rosalia', 'Totò', 'Giusy', 'Turi', 'Ninni', 'Peppe', 'Concetta', 'Mimmo', 'Sarina', 'Salvo', 'Agata', 'Gaspare',
];

/** Where each order goes, by zone; the third one is the new shop, still to open. */
export const ORDER_PLACES: Readonly<Record<RushZone, readonly string[]>> = {
  centro: ['Via Libertà', 'Piazza Politeama', 'Via Ruggero Settimo', 'Via Principe di Belmonte'],
  stadio: ['Viale del Fante', 'Piazza Leoni', 'Viale Diana'],
  mare: ["Ciccio's Terrasini"],
};

export function orderText(pair: string, customer: string, place: string, zone: RushZone): string {
  return zone === 'mare' ? `${pair} per ${customer}, al ${place} (PROSSIMA APERTURA)` : `${pair} per ${customer}, ${place}`;
}

export function comboText(combo: number): string {
  return `COMBO x${String(combo).replace('.', ',')}`;
}

export const DRIVER_TEXT: Readonly<Record<RushDriverId, { name: string; ability: string; unlockHint: string }>> = {
  riflessi: { name: 'RIFLESSI DA CICCIO', ability: 'Cambia corsia più in fretta.', unlockHint: '' },
  occhio: { name: 'OCCHIO AL TRAFFICO', ability: 'Vede i pericoli 0,3 secondi prima.', unlockHint: 'Fai la tua prima consegna.' },
  consegne: {
    name: 'RE DELLE CONSEGNE',
    ability: 'Gli urti rovinano metà della freschezza.',
    unlockHint: 'Completa tutte e 3 le consegne in una corsa.',
  },
};

export type AchievementId = 'prima' | 'zero' | 're' | 'tris' | 'maestro' | 'vola';

export const ACHIEVEMENT_TEXT: Readonly<Record<AchievementId, { name: string; desc: string; secret?: true }>> = {
  prima: { name: 'PRIMA CONSEGNA', desc: 'Consegna il tuo primo ordine.' },
  zero: { name: 'ZERO URTI', desc: 'Arriva al traguardo senza urti.' },
  re: { name: 'RE DI PALERMO', desc: 'Completa tutte e 3 le consegne.' },
  tris: { name: 'TRIS PERFETTO', desc: 'Tre consegne perfette in una corsa.' },
  maestro: { name: 'MAESTRO DEL TRAFFICO', desc: 'Raggiungi la combo x3.' },
  vola: { name: 'IL TRUCK VOLA!', desc: 'Hai trovato il PROPULSORE segreto.', secret: true },
};

export const SECRET_TEXT = { name: '???', desc: 'Traguardo segreto: guida pulito fino al mare.' } as const;

const MONTHS = ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'];

export function dailyLabel(date: Date): string {
  return `SFIDA DEL ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

const CAP_ACCENT: Readonly<Record<string, string>> = { À: 'A', È: 'E', É: 'E', Ì: 'I', Ò: 'O', Ù: 'U' };

/**
 * The pixel font draws accented capitals as small letters: an accent closing a word becomes the
 * apostrophe of Italian capitals (VELOCITÀ -> VELOCITA'), inside a word it is dropped (TALÌA -> TALIA).
 */
export function pixelCaps(s: string): string {
  return s.replace(/([ÀÈÉÌÒÙ])(\p{L})?/gu, (_m, cap: string, next?: string) => CAP_ACCENT[cap] + (next ?? "'"));
}

/** 5250 -> "5.250" (fixed, independent of the browser locale). */
export function formatPoints(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function shareText(score: number): string {
  return `Ho fatto ${formatPoints(score)} punti su Ciccio's Rush! Riesci a battermi?`;
}

export const BREAKDOWN_TEXT = {
  deliveries: 'Consegne',
  fresh: 'Freschezza',
  sky: 'Consegne dal cielo',
  passes: 'Sorpassi puliti',
  zones: 'Zone senza urti',
  pickups: 'Bonus raccolti',
} as const;

export const TIP_TEXT = {
  record: (n: number): string => `Ti mancavano ${formatPoints(n)} punti per il tuo record!`,
  oneHit: 'Evita un urto per la terza stella!',
  brake: 'Tieni premuto FRENA per passare tra le auto!',
  deliver: 'Passa sulla zona verde: la consegna è automatica!',
  fresh: 'Niente urti e poca frenata: la freschezza vale fino a 500 punti!',
  combo: 'Sorpassi puliti di fila = combo fino a x3!',
  perfect: 'Corsa perfetta! Prova la SFIDA DEL GIORNO.',
  perfectDaily: 'Corsa perfetta! Torna domani per la nuova SFIDA DEL GIORNO.',
  /** a run that crashed out or delivered nothing scored more than the record */
  recordRule: 'Il record conta solo se arrivi alla fine con almeno una consegna!',
} as const;
