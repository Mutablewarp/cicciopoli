/**
 * 02 · ALETTE CRUNCHY — the box world. 180 x 20 tiles (320 px high), lava filling the
 * bottom (surface at y = 280, see INFERNO_THEME.lavaTop), ground islands rising out of it.
 * Legend: see DEFAULT_LEGEND in ./parse.ts (# ground, = one-way dark brick ledge, X block,
 * ? / H ? blocks with fries / burger, o fries, h burger, w crunchy wings, v bat, d demon,
 * s fire spirit, S spawn, C brazier checkpoint, G burning flag + glowing hole,
 * j torch, i spire, l hanging chain).
 *
 * Flow (teach -> test -> twist), every gap after the wings needs flight:
 *  start       walk to the crunchy wings on a torch-lit pedestal (x = 200), then a 16-tile
 *              lava gap nobody can jump: a fries arc draws the climb-and-glide line
 *  bats        island with a demon and "?H?", then bats on sine paths across a fries wave
 *  ring        ledge island (burger on a hanging-chain ledge), a ring of fries around a fire
 *              spirit, the brazier checkpoint island (x = 1400) with demon and "?H?"
 *  long flight 20 tiles of lava: rest ledges, a burger up at the ceiling, bats, a spirit
 *  gauntlet    two spirits leave a fries corridor between them, bats above and below
 *  finale      wide island, last demon, "VAI IN BUCA!", burning flag + glowing hole on a mound
 */
import type { LevelDef } from './types';

const SKY30 = '..............................';
const SKY34 = '..................................';
const SKY16 = '................';
const SKY32 = '................................';

export const LEVEL2: LevelDef = {
  id: 2,
  name: 'ALETTE CRUNCHY',
  theme: 'inferno',
  chunks: [
    // start (30): spawn, wings on the pedestal at col 12, the first big gap begins at col 22
    [
      SKY30,
      SKY30,
      SKY30,
      SKY30,
      SKY30,
      SKY30,
      SKY30,
      SKY30,
      '............................oo',
      '..........................oo..',
      '.........................o....',
      '........................o.....',
      '.......................o......',
      '......ooo...w.................',
      '.j..S.....j.X.j....i..........',
      '######################........',
      '######################........',
      '######################........',
      '######################........',
      '######################........',
    ],
    // bats (34): gap ends at col 37, island 38-49 (surface row 13), bat gap 50-63
    [
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      'oo.....................oov.....oo.',
      '..oo........?H?.......o..o....o...',
      '....oo...............o....o..o....',
      '......o....................oo..v..',
      '.........j......d.j...............',
      '........############..............',
      '........############..............',
      '........############..............',
      '........############..............',
      '........############..............',
      '........############..............',
      '........############..............',
    ],
    // ring (34): ledge island 64-71, spirit ring gap 72-83, checkpoint island 84-97
    [
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      SKY34,
      '..............o...................',
      '............o...o.................',
      '..ooho............................',
      '..====.....o..s..o........?H?.....',
      SKY34,
      '..l..l......o...o.................',
      '..............o...................',
      '.j...................j.C.i.......j',
      '########............##############',
      '########............##############',
      '########............##############',
      '########............##############',
      '########............##############',
    ],
    // long flight (34): lava 98-117 with rest ledges, island 118-127 (surface row 14)
    [
      SKY34,
      SKY34,
      SKY34,
      '.............h....................',
      '...........o...o..................',
      '..........o.....o.................',
      '.........o........s...............',
      '......v...........................',
      '............ooo...................',
      '............===...................',
      '........................H.........',
      'ooo..ooo.........v................',
      '.....===..........................',
      '.....................j.....d......',
      '....................##########....',
      '....................##########....',
      '....................##########....',
      '....................##########....',
      '....................##########....',
      '....................##########....',
    ],
    // gauntlet (16): two spirits with a fries corridor between them, bats above and below
    [
      SKY16,
      SKY16,
      SKY16,
      SKY16,
      '...........v....',
      SKY16,
      '....s...........',
      SKY16,
      '.......oo.......',
      'ooooooo.........',
      '.............v..',
      '.........===....',
      '....s...........',
      SKY16,
      SKY16,
      SKY16,
      SKY16,
      SKY16,
      SKY16,
      SKY16,
    ],
    // finale (32): wide island, last demon, hole on the mound at col 169
    [
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      SKY32,
      '..........H.....................',
      SKY32,
      '...oooo.........................',
      '.....................G..........',
      '..j.....d...j.....#######...i...',
      '################################',
      '################################',
      '################################',
      '################################',
      '################################',
    ],
  ],
};
