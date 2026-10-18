/**
 * Look of the two weapon buttons of the platform layout, per level (controls.ts applies it).
 * Levels 1-2: GOAT (fire) / THAI (club). Level 5: SPACCA (fire, ground slam) / PUGNO (club, punch);
 * the keys stay J/X and K/C, only the labels, icons and accent rings change.
 */
import type { LevelId } from '../contracts';
import { fistSvg, goatSvg, slamSvg, thaiSvg } from './icons';

export type WeaponKey = 'fire' | 'club';

export interface ActSkin {
  label: string;
  /** accent ring of the dark disc */
  ring: string;
  icon: () => string;
}

const PLATFORM: Record<WeaponKey, ActSkin> = {
  fire: { label: 'GOAT', ring: '#fcd400', icon: goatSvg },
  club: { label: 'THAI', ring: '#f2541c', icon: thaiSvg },
};
const RAMPAGE: Record<WeaponKey, ActSkin> = {
  fire: { label: 'SPACCA', ring: '#e8279c', icon: slamSvg },
  club: { label: 'PUGNO', ring: '#a6d62c', icon: fistSvg },
};

export const actionSkin = (level: LevelId, key: WeaponKey): ActSkin => (level === 5 ? RAMPAGE : PLATFORM)[key];
