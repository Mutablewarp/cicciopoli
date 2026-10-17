/**
 * The four CICCIO-MAN ghosts, redrawn compact (14x14 in 16x16 frames) from the level 1-2
 * enemies: Sottaceto (pickle), Peperoncino (chili), Diavoletto (demon), Burger corazzato.
 * Per ghost: frames 0-7 = direction (right, left, up, down) x 2 wiggle frames with the eyes
 * looking the way it moves; 8-9 covered in melted cheese (scared); 10-11 white flash.
 * A shared eyes-only sheet is used after a ghost is eaten.
 */
import type { Dir4 } from '../../contracts';
import { PAL, ctxOf, makeCanvas, outline, paintGrid, type Ctx } from '../pixel';
import { MZ } from './palette';

const F = 16;

interface GhostDef {
  top: readonly string[]; //   rows 0..11
  feet: readonly [readonly string[], readonly string[]]; // rows 12..15 per wiggle frame
  pal: Readonly<Record<string, string>>;
  /** top-left of the left eye; the right eye sits 6 px to the right */
  eye: { x: number; y: number };
  sclera: string;
  /** extra face pixels drawn over the eyes (brows, mouth) */
  face?: readonly string[];
}

const PICKLE: GhostDef = {
  top: [
    '................',
    '................',
    '.....LLGGG......',
    '....LGGdGGGD....',
    '...LGbGGGGGGD...',
    '..LGGGGGGGGGGDd.',
    '.bLGGGGGGGGGGD..',
    '..LGGGGGGGGGGD..',
    '..LbGGGGGGGGdDd.',
    '.bGGGGdGGbGGGD..',
    '..GdGGGGGGGdDD..',
    '...GGbGGdGGGD...',
  ],
  feet: [
    ['...DGGGGGGGDD...', '....DDGGGDD.....', '....ff...ff.....', '................'],
    ['...DGGGGGGGDD...', '....DDGGGDD.....', '.....ff.ff......', '................'],
  ],
  pal: { L: '#9ad04a', G: '#5fa52e', D: '#3c7a22', d: '#2f6018', b: '#c4e878', f: '#2c4a18', k: '#1f3a12' },
  eye: { x: 3, y: 5 },
  sclera: MZ.eyeWhite,
  face: [
    '................',
    '................',
    '................',
    '................',
    '...kk......kk...',
    '.....k....k.....',
    '................',
    '................',
    '................',
    '................',
    '................',
    '......kkkk......',
  ],
};

const CHILI: GhostDef = {
  top: [
    '................',
    '......gG........',
    '.......gG.......',
    '.....gGGGGg.....',
    '...WRgRRgRRr....',
    '..WWRRRRRRRRr...',
    '..WRRRRRRRRRRr..',
    '..WRRRRRRRRRRr..',
    '..WRRRRRRRRRRr..',
    '...WRRRRRRRRRr..',
    '....RRRRRRRRRRr.',
    '.....RRRRRRRRRr.',
  ],
  feet: [
    ['.......RRRRRRr..', '.........RRRr...', '..........Rr....', '................'],
    ['.......RRRRRRr..', '........RRRr....', '........Rr......', '................'],
  ],
  pal: { W: '#ff8a70', R: '#e8281c', r: '#a8141a', G: '#5cbf2e', g: '#2e7a1c', k: '#5a0a0e' },
  eye: { x: 3, y: 5 },
  sclera: MZ.eyeWhite,
  face: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.......kk.......',
  ],
};

const DEMON: GhostDef = {
  top: [
    '................',
    '................',
    '..C..........C..',
    '..cC........Cc..',
    '...cPPPPPPPPc...',
    '..QPPPPPPPPPPp..',
    '..QPPPPPPPPPPp..',
    '..QPPPPPPPPPPp..',
    '..PPPPPPPPPPPp..',
    '..PPPPPPPPPPpp..',
    '..PPPPPPPPPPpp..',
    '...pPPPPPPPpp...',
  ],
  feet: [
    ['....ff....ff....', '................', '................', '................'],
    ['.....ff..ff.....', '................', '................', '................'],
  ],
  pal: { C: '#fff4c8', c: '#d8b878', Q: '#d063a8', P: '#a8327c', p: '#6a1a56', f: '#3a1030', w: '#ffffff', k: '#2a0820' },
  eye: { x: 3, y: 5 },
  sclera: '#fce040',
  face: [
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '.....kwkkwk.....',
  ],
};

const BURGER: GhostDef = {
  top: [
    '................',
    '................',
    '.......rR.......',
    '.....AHHAAa.....',
    '...AHHAAAAAAa...',
    '..AHvvvvvvvvaa..',
    '..Avvvvvvvvvva..',
    '..Avvvvvvvvvva..',
    '..avvvvvvvvvva..',
    '..lLllLllLllLl..',
    '..PPPPPPPPPPPP..',
    '..BBBBBBBBBBBB..',
  ],
  feet: [
    ['...bBBBBBBBBb...', '...ff.....ff....', '................', '................'],
    ['...bBBBBBBBBb...', '....ff...ff.....', '................', '................'],
  ],
  pal: {
    r: '#e83020', R: '#ff7050', A: '#aab2bc', H: '#e4e8ee', a: '#5c626c', v: '#22252c',
    l: '#5cc020', L: '#3a8a18', P: '#6a3418', B: '#e0902c', b: '#a85a18', f: '#3a3a40',
  },
  eye: { x: 3, y: 5 },
  sclera: MZ.eyeWhite,
};

export const GHOST_DEFS = { pickle: PICKLE, chili: CHILI, demon: DEMON, burger: BURGER } as const;
export type GhostKey = keyof typeof GHOST_DEFS;

const EYE = ['.ww.', 'wwww', 'wwww', '.ww.'];
const PUPIL_AT: Readonly<Record<Dir4, [number, number]>> = { right: [2, 1], left: [0, 1], up: [1, 0], down: [1, 2] };
export const DIRS: readonly Dir4[] = ['right', 'left', 'up', 'down'];

function drawEyes(ctx: Ctx, x: number, y: number, dir: Dir4, sclera: string): void {
  const [px, py] = PUPIL_AT[dir];
  for (const ox of [0, 6]) {
    paintGrid(ctx, EYE, { w: sclera }, x + ox, y);
    ctx.fillStyle = MZ.pupil;
    ctx.fillRect(x + ox + px, y + py, 2, 2);
  }
}

function body(def: GhostDef, wiggle: 0 | 1): HTMLCanvasElement {
  const c = makeCanvas(F, F);
  paintGrid(ctxOf(c), [...def.top, ...def.feet[wiggle]], def.pal);
  return c;
}

function normalFrame(def: GhostDef, dir: Dir4, wiggle: 0 | 1): HTMLCanvasElement {
  const c = body(def, wiggle);
  const ctx = ctxOf(c);
  drawEyes(ctx, def.eye.x, def.eye.y, dir, def.sclera);
  if (def.face) paintGrid(ctx, def.face, def.pal);
  outline(c, PAL.ink);
  return c;
}

/** The ghost's silhouette drowned in melted cheese: drips, worried face, wobble. */
function cheeseFrame(def: GhostDef, wiggle: 0 | 1, flash: boolean): HTMLCanvasElement {
  const src = body(def, wiggle);
  const img = ctxOf(src).getImageData(0, 0, F, F).data;
  const on = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < F && y < F && img[(y * F + x) * 4 + 3] > 0;
  const tone = flash
    ? { light: MZ.flashLight, mid: MZ.flash, dark: MZ.flashDark, ink: MZ.flashInk, face: '#d02a2a' }
    : { light: MZ.cheeseLight, mid: MZ.cheese, dark: MZ.cheeseDark, ink: MZ.cheeseInk, face: '#7a4a00' };
  const c = makeCanvas(F, F);
  const ctx = ctxOf(c);
  for (let y = 0; y < F; y++) {
    for (let x = 0; x < F; x++) {
      if (!on(x, y)) continue;
      ctx.fillStyle = !on(x, y - 1) || !on(x - 1, y) ? tone.light : !on(x, y + 1) || !on(x + 1, y) ? tone.dark : tone.mid;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // drips hanging off the bottom edge, different lengths per wobble frame
  for (let x = 2; x < 14; x++) {
    let bottom = -1;
    for (let y = F - 1; y >= 0; y--) if (on(x, y)) { bottom = y; break; }
    if (bottom < 0 || bottom > 13) continue;
    const len = ((x * 5 + wiggle * 3) % 7) - 4;
    for (let k = 1; k <= len && bottom + k < F - 1; k++) {
      ctx.fillStyle = k === len ? tone.light : tone.dark;
      ctx.fillRect(x, bottom + k, 1, 1);
    }
  }
  // worried face: small eyes and a wavy mouth
  const ex = def.eye.x;
  const ey = def.eye.y + 1;
  ctx.fillStyle = tone.face;
  ctx.fillRect(ex + 1, ey, 2, 2);
  ctx.fillRect(ex + 7, ey, 2, 2);
  for (let x = ex; x <= ex + 9; x++) ctx.fillRect(x, ey + 4 + ((x + wiggle) % 2), 1, 1);
  outline(c, tone.ink);
  return c;
}

/** 12 frames for one ghost (see header). */
export function ghostFrames(key: GhostKey): HTMLCanvasElement[] {
  const def = GHOST_DEFS[key];
  const out: HTMLCanvasElement[] = [];
  for (const d of DIRS) for (const w of [0, 1] as const) out.push(normalFrame(def, d, w));
  for (const flash of [false, true]) for (const w of [0, 1] as const) out.push(cheeseFrame(def, w, flash));
  return out;
}

/** Eaten ghost: just the eyes, heading home. Frames: right, left, up, down. */
export function eyesFrames(): HTMLCanvasElement[] {
  return DIRS.map((d) => {
    const c = makeCanvas(F, F);
    drawEyes(ctxOf(c), 3, 6, d, MZ.eyeWhite);
    outline(c, PAL.ink);
    return c;
  });
}
