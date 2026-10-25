/**
 * Every Italian text of level 7. Product names come from the real menu (src/config/kitchenMenu.ts);
 * the customers talk like Palermo regulars. Never print the car brand, its owner, the rocket
 * company, the space mannequin, the green giant, the yellow muncher or the seaside town.
 */
import type { CustomerId, DrinkId, IngredientId, SideId } from '../../../art/kitchen/keys';
import { euro } from '../../../config/kitchenMenu';
import { formatPoints } from '../../rush/logic/strings';
import type { GuideStep, KitchenPoints } from './types';

export const CUSTOMER_NAME: Readonly<Record<CustomerId, string>> = {
  rosalia: 'Signora Rosalia',
  turi: 'Nonno Turi',
  giulia: 'Giulia',
  salvo: 'Salvo',
  martina: 'Martina',
  kevin: 'Kevin',
  chiara: 'Chiara',
  tommaso: 'Tommaso',
  peppe: 'Peppe',
  emma: 'Emma',
};

/** Spoken names (menu names without the can size). */
const SAY_SIDE: Readonly<Record<SideId, string>> = {
  patatine: 'patatine',
  nuggets: 'nuggets',
  meatball: 'meat balls',
  chickenPopCorn: 'chicken pop corn',
  greenNuggets: 'green nuggets',
};
const SAY_DRINK: Readonly<Record<DrinkId, string>> = {
  acquaNaturale: 'acqua naturale',
  acquaFrizzante: 'acqua frizzante',
  fuzePesca: 'Fuze Tea pesca',
  fuzeLimone: 'Fuze Tea limone',
  lemonSoda: 'Lemon Soda',
  sprite: 'Sprite',
  fanta: 'Fanta',
  cocaCola: 'Coca Cola',
  cocaZero: 'Coca Cola Zero',
  chinotto: 'Chinotto',
};

/** With the article: "Ma... e il bacon?", "Tocca la carne", "Avevo chiesto la Fanta". */
export const THE: Readonly<Record<IngredientId | SideId | DrinkId, string>> = {
  manzo: 'la carne', vegetale: 'il burger vegetale', polloPastellato: 'il pollo', polloCroccante: 'il pollo',
  cosciaPanko: 'il pollo', cheddar: 'il cheddar', brie: 'il brie', provola: 'la provola', taleggio: 'il taleggio',
  tuma: 'la tuma', scamorza: 'la scamorza', gorgonzola: 'il gorgonzola', bacon: 'il bacon', guanciale: 'il guanciale',
  pancetta: 'la pancetta', songino: 'il songino', lattuga: 'la lattuga', pomodoro: 'il pomodoro',
  cipollaCaramellata: 'la cipolla caramellata', cipollaCroccante: 'la cipolla croccante', capuliato: 'il capuliato',
  peperoncino: 'il peperoncino', pere: 'le pere', fichi: 'la confettura di fichi', nocciole: 'le nocciole', noci: 'le noci',
  salsaCiccios: "la salsa Ciccio's", salsaWhite: 'la salsa white', salsaBbq: 'la salsa bbq', maionese: 'la maionese',
  salsaJalapeno: 'la salsa jalapeno',
  patatine: 'le patatine', nuggets: 'i nuggets', meatball: 'le meat balls', chickenPopCorn: 'il chicken pop corn',
  greenNuggets: 'i green nuggets',
  acquaNaturale: "l'acqua naturale", acquaFrizzante: "l'acqua frizzante", fuzePesca: 'il Fuze Tea pesca',
  fuzeLimone: 'il Fuze Tea limone', lemonSoda: 'la Lemon Soda', sprite: 'la Sprite', fanta: 'la Fanta',
  cocaCola: 'la Coca Cola', cocaZero: 'la Coca Cola Zero', chinotto: 'il Chinotto',
};
const plural = (what: string): boolean => /^(le|i|gli) /.test(what);

const LO = /^(Z|S[^AEIOUÀÈÌÒÙ]|GN|PS|X|Y)/;

/** "un BRIE", "uno ZOLA" */
function indef(name: string): string {
  return LO.test(name) ? `uno ${name}` : `un ${name}`;
}

/** "il GREEN", "lo ZOLA", "l'AMERICAN BACONCHEESE" */
function def(name: string): string {
  if (/^[AEIOU]/.test(name)) return `l'${name}`;
  return LO.test(name) ? `lo ${name}` : `il ${name}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type SingoloLine = (n: string) => string;
type MenuLine = (n: string, s: string, d: string) => string;
type Voice = { readonly singolo: readonly [SingoloLine, SingoloLine, SingoloLine]; readonly menu: readonly [MenuLine, MenuLine, MenuLine] };

/** How each regular orders (n = burger name, s = starter, d = drink); visit after visit the phrasing rotates. */
const VOICE: Readonly<Record<CustomerId, Voice>> = {
  rosalia: {
    singolo: [
      (n) => `Buongiorno Ciccio! Mi fai ${indef(n)}? Grazie, gioia.`,
      (n) => `Ciccio, figghiu mio: ${indef(n)}, fatto bene!`,
      (n) => `Gioia mia, ${indef(n)} per pranzo. Senza fretta, eh!`,
    ],
    menu: [
      (n, s, d) => `Buongiorno Ciccio! ${cap(indef(n))} in menù, con ${s} e ${d}.`,
      (n, s, d) => `Gioia, mi fai ${indef(n)} in menù? Con ${s} e ${d}.`,
      (n, s, d) => `Oggi mi tratto bene: ${indef(n)} in menù, con ${s} e ${d}!`,
    ],
  },
  turi: {
    singolo: [
      (n) => `Ciccio! ${cap(indef(n))}, come ai miei tempi!`,
      (n) => `Amunì Ciccio: ${indef(n)} e nenti cchiù!`,
      (n) => `Ai miei tempi bastava un panino: ${indef(n)}, Ciccio!`,
    ],
    menu: [
      (n, s, d) => `Picciotto, ${indef(n)} in menù: ${s} e ${d}!`,
      (n, s, d) => `Ciccio! ${cap(indef(n))} in menù, con ${s} e ${d}. Amunì!`,
      (n, s, d) => `Oggi si festeggia! ${cap(indef(n))} in menù, con ${s} e ${d}.`,
    ],
  },
  giulia: {
    singolo: [
      (n) => `Ciao Ciccio! ${cap(indef(n))} al volo, che ho lezione!`,
      (n) => `Mi fai ${indef(n)}? Poi torno a studiare!`,
      (n) => `Pausa studio! ${cap(indef(n))}, grazie Ciccio!`,
    ],
    menu: [
      (n, s, d) => `Ciao! ${cap(indef(n))} in menù, con ${s} e ${d}. Oggi ho l'esame!`,
      (n, s, d) => `${cap(indef(n))} in menù, per favore: ${s} e ${d}!`,
      (n, s, d) => `Ho passato l'esame! ${cap(indef(n))} in menù, con ${s} e ${d}!`,
    ],
  },
  salvo: {
    singolo: [
      (n) => `Ciccio, ${indef(n)} bello carico: ho una fame da cantiere!`,
      (n) => `Mi fai ${indef(n)}? Amunì, che fame!`,
      (n) => `Pausa pranzo dal cantiere: ${indef(n)}, Ciccio!`,
    ],
    menu: [
      (n, s, d) => `Fame da cantiere! ${cap(indef(n))} in menù, con ${s} e ${d}!`,
      (n, s, d) => `Ciccio! ${cap(indef(n))} in menù: ${s} e ${d}, abbondante!`,
      (n, s, d) => `Ciccio, oggi si mangia: ${indef(n)} in menù, ${s} e ${d}!`,
    ],
  },
  martina: {
    singolo: [
      (n) => `Prima della partita: ${indef(n)}, grazie Ciccio!`,
      (n) => `${cap(indef(n))} per me! Stasera si vince!`,
      (n) => `Dopo l'allenamento ci vuole ${indef(n)}!`,
    ],
    menu: [
      (n, s, d) => `${cap(indef(n))} in menù, con ${s} e ${d}: stasera c'è la partita!`,
      (n, s, d) => `Ciao Ciccio! ${cap(indef(n))} in menù: ${s} e ${d}, grazie!`,
      (n, s, d) => `Abbiamo vinto! ${cap(indef(n))} in menù, con ${s} e ${d}!`,
    ],
  },
  kevin: {
    singolo: [
      (n) => `Ciccio! ${cap(indef(n))}, troppo top!`,
      (n) => `Bro, ${indef(n)} al volo, per favore!`,
      (n) => `Raga, ${indef(n)}: lo devo postare!`,
    ],
    menu: [
      (n, s, d) => `Bro! ${cap(indef(n))} in menù, con ${s} e ${d}!`,
      (n, s, d) => `Mi fai ${indef(n)} in menù? Con ${s} e ${d}. Top!`,
      (n, s, d) => `Ciccio, ${indef(n)} in menù con ${s} e ${d}. Spacca!`,
    ],
  },
  chiara: {
    singolo: [
      (n) => `Per me ${def(n)}, sono vegetariana!`,
      (n) => `Ciao Ciccio! ${cap(indef(n))}, niente carne per me!`,
      (n) => `Ciccio, il solito: ${def(n)}, niente carne!`,
    ],
    menu: [
      (n, s, d) => `Per me ${def(n)} in menù, sono vegetariana! Con ${s} e ${d}.`,
      (n, s, d) => `${cap(indef(n))} in menù, con ${s} e ${d}: tutto veggie!`,
      (n, s, d) => `Il solito veggie: ${def(n)} in menù, con ${s} e ${d}!`,
    ],
  },
  tommaso: {
    singolo: [
      (n) => `Ciccio, ${indef(n)}: voglio proprio assaggiarlo!`,
      (n) => `Ho letto gli ingredienti: ${indef(n)}, per favore!`,
      (n) => `Stasera provo ${indef(n)}: me ne hanno parlato benissimo!`,
    ],
    menu: [
      (n, s, d) => `${cap(indef(n))} in menù, con ${s} e ${d}: abbinamento perfetto!`,
      (n, s, d) => `Da buongustaio: ${indef(n)} in menù, con ${s} e ${d}.`,
      (n, s, d) => `Degustazione completa: ${indef(n)} in menù, con ${s} e ${d}.`,
    ],
  },
  peppe: {
    singolo: [
      (n) => `Talìa, Ciccio! ${cap(indef(n))}, amunì!`,
      (n) => `Ciccio, fammi ${indef(n)}, ca sugnu affamatu!`,
      (n) => `Talìa chi fami! ${cap(indef(n))}, Ciccio!`,
    ],
    menu: [
      (n, s, d) => `Ciccio! ${cap(indef(n))} in menù, cu ${s} e ${d}!`,
      (n, s, d) => `Talìa: ${indef(n)} in menù, cu ${s} e ${d}. Amunì!`,
      (n, s, d) => `Ciccio, staiu murennu ri fami: ${indef(n)} in menù, cu ${s} e ${d}!`,
    ],
  },
  emma: {
    singolo: [
      (n) => `Hello! Ehm... ${indef(n)}, per favore?`,
      (n) => `Buongiorno! Vorrei ${indef(n)}... si dice così?`,
      (n) => `Ciao! Io prendo ${indef(n)}... grazie mille!`,
    ],
    menu: [
      (n, s, d) => `Hello Ciccio! ${cap(indef(n))} in menù, con ${s} e ${d}, please!`,
      (n, s, d) => `Buongiorno! Vorrei ${indef(n)} in menù... con ${s} e ${d}?`,
      (n, s, d) => `Ciao! ${cap(indef(n))} in menù, con ${s} e ${d}. Grazie mille!`,
    ],
  },
};
/** Phrasings per customer and form. */
export const LINE_VARIANTS = 3;

/** What `customer` says at the counter; `variant` picks the phrasing (the deck: the regular's visits so far). */
export function orderLine(customer: CustomerId, name: string, variant: number, menu: { starter: SideId; drink: DrinkId } | null): string {
  const v = VOICE[customer];
  const i = variant % LINE_VARIANTS;
  return menu ? v.menu[i](name, SAY_SIDE[menu.starter], SAY_DRINK[menu.drink]) : v.singolo[i](name);
}

/** Reaction lines after tasting. */
export const REACTION = {
  praise: {
    5: ['MIZZICA, CHE BONTÀ!', 'Talìa che panino!', 'Spettacolo, Ciccio!'],
    4: ['Buonissimo, grazie Ciccio!', 'Bello buono, grazie!'],
    3: ['Buono, dai!', 'Non male, Ciccio!'],
    2: ['Mah... poteva andare meglio.'],
    1: ['Ma che è stu panino?!'],
  } as Readonly<Record<1 | 2 | 3 | 4 | 5, readonly string[]>>,
  raw: 'È crudo!',
  rawFries: 'Le patatine sono crude!',
  rawStarter: 'Lo starter è crudo!',
  /** "Ma... e il bacon?", "Ma... e le patatine?" */
  missing: (id: IngredientId | SideId): string => `Ma... e ${THE[id]}?`,
  wrong: (kind: IngredientId): string => `Ma che ci ${plural(THE[kind]) ? 'fanno' : 'fa'} ${THE[kind]} qui?`,
  missingDrink: 'Ma... e la bibita?',
  wrongPart: (want: SideId | DrinkId, got: SideId | DrinkId): string => `Avevo chiesto ${THE[want]}, non ${THE[got]}!`,
  over: 'Bruciacchiato... vabbè.',
  slow: 'Finalmente! Che attesa...',
  extra: 'Bello carico... troppo, però!',
  angry: 'Troppo lento, me ne vado!',
} as const;

/** Tutorial / AIUTI lines; `what` = the thing to tap, with its article ("la carne", "le patatine"). */
export function guideText(step: GuideStep, what: string): string {
  switch (step) {
    case 'order': return "Tocca PRENDI L'ORDINE!";
    case 'griddleBin': return `Tocca ${what}: va sulla piastra!`;
    case 'waitFlip': return 'Aspetta la zona dorata...';
    case 'flip': return 'Girala quando è dorata!';
    case 'waitTake': return "Ora cuoci l'altro lato...";
    case 'take': return 'Perfetto! Tocca: va sul panino!';
    case 'hurry': return 'Sta bruciando: tocca subito!';
    case 'trash': return 'Bruciato! Toccalo: va nel cestino.';
    case 'fryBin': return `Friggitrice: tocca ${what}!`;
    case 'waitFry': return 'Friggono... occhio al colore!';
    case 'lift': return 'Dorato! Tira su il cestello!';
    case 'topping': return `Aggiungi ${what}!`;
    case 'drink': return `Bibita: prendi ${what}!`;
    case 'removeTop': return 'Questo non va! Tocca la cima per toglierlo.';
    case 'trayTrash': return 'Questo non va! Toccalo per toglierlo.';
    case 'close': return 'Tocca il pane per chiudere il panino!';
    case 'serve': return 'Tutto pronto: tocca SERVI!';
  }
}

export const BANNER = {
  perfect: 'PERFETTO!',
  burnt: 'BRUCIATO!',
  finished: 'TURNO FINITO!',
  closed: 'TURNO CHIUSO!',
  golden: 'YOU ARE SO GOLDEN!',
} as const;

/** The big DOM action button (ControlsMode 'kitchen'). */
export const BUTTON = { take: "PRENDI L'ORDINE", serve: 'SERVI' } as const;

/** Reaction extras: "+14,90 €", "Mancia +1,00 €". */
export const plusEuro = (cents: number): string => `+${euro(cents)}`;
export const tipLine = (cents: number): string => `Mancia ${plusEuro(cents)}`;

/** "COMBO x2", "COMBO x1,5" */
export function comboText(combo: number): string {
  return `COMBO x${String(combo).replace('.', ',')}`;
}

export type AchievementId = 'primo' | 'piastra' | 'bacon' | 'menu' | 'nessuno' | 'golden';

export const ACHIEVEMENT_TEXT: Readonly<Record<AchievementId, { name: string; desc: string }>> = {
  primo: { name: 'PRIMO PANINO', desc: 'Servi il tuo primo panino.' },
  piastra: { name: "PIASTRA D'ORO", desc: 'Servi 10 burger cotti alla perfezione.' },
  bacon: { name: 'RE DEL BACON', desc: 'Tutto il bacon di un turno cotto alla perfezione.' },
  menu: { name: 'MENÙ COMPLETO', desc: 'Un menù da 5 stelle: panino, patatine, starter e bibita giusti.' },
  nessuno: { name: 'NESSUNO SCONTENTO', desc: 'Finisci il turno senza clienti arrabbiati.' },
  golden: { name: 'YOU ARE SO GOLDEN', desc: "Turno da 3 stelle: sei proprio d'oro!" },
};

export const BREAKDOWN_TEXT: Readonly<Record<keyof KitchenPoints, string>> = {
  orders: 'Panini serviti',
  speed: 'Velocità',
  perfect: 'Cotture perfette',
  combo: 'Combo 5 stelle',
};

export const TIP_TEXT = {
  record: (n: number): string => `Ti mancavano ${formatPoints(n)} punti per il tuo record!`,
  angry: "Tieni d'occhio la pazienza del cliente: prima la carne, poi il resto!",
  raw: 'Gira la carne nella zona dorata!',
  over: 'Togli la carne appena è dorata: troppo cotta perde stelle.',
  wrong: 'Leggi lo scontrino: solo gli ingredienti giusti!',
  menu: 'Nel menù servono patatine, lo starter giusto e la bibita!',
  slow: 'Più veloce = mance e punti velocità!',
  combo: 'Panini da 5 stelle di fila = COMBO fino a x3!',
  golden: "Sei d'oro! Ora prova a battere il tuo record.",
} as const;

export function shareText(score: number): string {
  return `Ho fatto ${formatPoints(score)} punti su Ciccio's Kitchen! Riesci a battermi?`;
}
