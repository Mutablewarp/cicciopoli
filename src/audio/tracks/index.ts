import type { MusicName } from '../../contracts';
import type { SongSrc } from '../sequencer';
import { cartoon } from './cartoon';
import { cartoonBoss } from './cartoonBoss';
import { cartoonFinal } from './cartoonFinal';
import { hills } from './hills';
import { inferno } from './inferno';
import { invaders } from './invaders';
import { gameover, win } from './jingles';
import { kitchen } from './kitchen';
import { maze } from './maze';
import { rampage } from './rampage';
import { rush } from './rush';
import { title } from './title';

export type JingleName = 'win' | 'gameover';
export type SongName = MusicName | JingleName;

export const SONGS: Readonly<Record<SongName, SongSrc>> = {
  title, hills, inferno, invaders, maze, rampage, rush, kitchen, cartoon, cartoonBoss, cartoonFinal, win, gameover,
};
