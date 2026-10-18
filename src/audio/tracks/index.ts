import type { MusicName } from '../../contracts';
import type { SongSrc } from '../sequencer';
import { hills } from './hills';
import { inferno } from './inferno';
import { invaders } from './invaders';
import { gameover, win } from './jingles';
import { maze } from './maze';
import { rampage } from './rampage';
import { title } from './title';

export type JingleName = 'win' | 'gameover';
export type SongName = MusicName | JingleName;

export const SONGS: Readonly<Record<SongName, SongSrc>> = { title, hills, inferno, invaders, maze, rampage, win, gameover };
