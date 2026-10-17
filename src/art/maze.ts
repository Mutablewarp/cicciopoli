/**
 * [maze] art pack — level 4 CICCIO-MAN: tray-wall board, Ciccio's chomping head, the four
 * ghosts (+ cheese-scared and eyes), nugget dots, provola sticks, bonus food, hole + flag.
 * Keys and frame indices: src/art/maze/keys.ts.
 */
import type { AnimDef, ArtPack, SheetDef } from '../contracts';
import { packSheet } from './pixel';
import { buildBoard, buildPanel } from './maze/board';
import { eyesFrames, ghostFrames } from './maze/ghosts';
import { deflateFrames, headFrames, printedHead } from './maze/head';
import { MAZE_ANIMS, MAZE_ART } from './maze/keys';
import { bonusFrames, caption, flagFrames, holeImage, nuggetDot, stickFrames, tunnelMouth } from './maze/props';

function sheet(key: string, frames: HTMLCanvasElement[], w: number, h: number): SheetDef {
  return { key, canvas: packSheet(frames, w, h), frameWidth: w, frameHeight: h };
}

export function buildMazeArt(): ArtPack {
  const anims: AnimDef[] = [{ key: MAZE_ANIMS.flag, sheet: MAZE_ART.flag, frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 }];
  return {
    name: 'maze',
    sheets: [
      sheet(MAZE_ART.ciccio, [...headFrames(), ...deflateFrames()], 16, 16),
      sheet(MAZE_ART.ghost.pickle, ghostFrames('pickle'), 16, 16),
      sheet(MAZE_ART.ghost.chili, ghostFrames('chili'), 16, 16),
      sheet(MAZE_ART.ghost.demon, ghostFrames('demon'), 16, 16),
      sheet(MAZE_ART.ghost.burger, ghostFrames('burger'), 16, 16),
      sheet(MAZE_ART.eyes, eyesFrames(), 16, 16),
      sheet(MAZE_ART.stick, stickFrames(), 8, 8),
      sheet(MAZE_ART.bonus, bonusFrames(), 16, 16),
      sheet(MAZE_ART.flag, flagFrames(), 16, 24),
    ],
    images: [
      { key: MAZE_ART.board, canvas: buildBoard(printedHead()) },
      { key: MAZE_ART.panel, canvas: buildPanel() },
      { key: MAZE_ART.dot, canvas: nuggetDot() },
      { key: MAZE_ART.hole, canvas: holeImage() },
      { key: MAZE_ART.mouth, canvas: tunnelMouth() },
      { key: MAZE_ART.ready, canvas: caption('PRONTI!') },
      { key: MAZE_ART.goText, canvas: caption('VAI IN BUCA!') },
    ],
    tilesets: [],
    anims,
  };
}
