/**
 * KITCHEN.binFill (frame = INGREDIENTS index): every ingredient as it sits in its pan, from above;
 * KITCHEN.binBun: the glossy brioche tops waiting to close the burger.
 */
import { Raster } from '../../hills/raster';
import { INGREDIENTS, type IngredientId } from '../keys';
import { binBrie, binCheddar, binGorgonzola, binProvola, binScamorza, binTaleggio, binTuma } from './binsCheese';
import { binBacon, binCroccante, binGuanciale, binManzo, binPancetta, binPanko, binPastellato, binVegetale } from './binsMeat';
import { binFichi, binNocciole, binNoci, binPere, binSauce } from './binsSweet';
import {
  binCapuliato, binCipollaCaramellata, binCipollaCroccante, binLattuga, binPeperoncino, binPomodoro, binSongino,
} from './binsVeg';
import { PAN, ballLight, panClip, piece, rampAt } from './kit';
import { BUN_RAMP, T, WHITE } from './palette';

const DRAW: Readonly<Record<IngredientId, (r: Raster) => void>> = {
  manzo: binManzo, vegetale: binVegetale, polloPastellato: binPastellato, polloCroccante: binCroccante, cosciaPanko: binPanko,
  cheddar: binCheddar, brie: binBrie, provola: binProvola, taleggio: binTaleggio, tuma: binTuma, scamorza: binScamorza,
  gorgonzola: binGorgonzola,
  bacon: binBacon, guanciale: binGuanciale, pancetta: binPancetta,
  songino: binSongino, lattuga: binLattuga, pomodoro: binPomodoro, cipollaCaramellata: binCipollaCaramellata,
  cipollaCroccante: binCipollaCroccante, capuliato: binCapuliato, peperoncino: binPeperoncino,
  pere: binPere, fichi: binFichi, nocciole: binNocciole, noci: binNoci,
  salsaCiccios: (r) => binSauce(r, 'salsaCiccios'),
  salsaWhite: (r) => binSauce(r, 'salsaWhite'),
  salsaBbq: (r) => binSauce(r, 'salsaBbq'),
  maionese: (r) => binSauce(r, 'maionese'),
  salsaJalapeno: (r) => binSauce(r, 'salsaJalapeno'),
};

export function buildBinFill(): Raster[] {
  return INGREDIENTS.map((k) => {
    const r = new Raster(PAN.w, PAN.h);
    DRAW[k](r);
    return panClip(r);
  });
}

/** Egg-washed brioche domes packed in the pan, back row first, each lit as a volume with a hot glint. */
export function buildBinBun(): Raster {
  const r = new Raster(PAN.w, PAN.h);
  for (const [x, y] of [[7, 7], [22, 6], [37, 7], [0, 19], [14, 19], [29, 19], [44, 19]] as const) {
    piece(r, T.bun, (m) => m.ellipse(x, y, 8, 6, 1), {
      line: BUN_RAMP[0],
      detail: (p, m) => {
        for (let yy = y - 6; yy <= y + 6; yy++) {
          for (let xx = x - 8; xx <= x + 8; xx++) {
            const l = ballLight(xx, yy, x, y, 8.5, 6.5);
            if (m.get(xx, yy)) p.set(xx, yy, l > 0.93 ? WHITE : rampAt(BUN_RAMP, (l + 0.55) / 1.45, xx, yy));
          }
        }
      },
    });
  }
  return panClip(r);
}
