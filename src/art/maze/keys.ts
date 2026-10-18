/** [maze] art pack manifest (level 4 · CICCIO-MAN). Frame indices are fixed; gameplay relies on them. */

export const MAZE_ART = {
  /** image 224x248 — floor + tray walls + ghost house, pre-rendered from the layout */
  board: 'maze-board',
  /** image 100x52 — the official logo label, drawn at half size over the centre tray (see LOGO_LABEL) */
  logo: 'maze-logo',
  /** image 64x64 seamless — tray paper with a faint printed wordmark (landscape side panels) */
  panel: 'maze-panel',
  /** image 4x4 — mini nugget dot */
  dot: 'maze-dot',
  /** sheet 8x8, frames 0-1 — battered provola stick (power), 1 = glint */
  stick: 'maze-stick',
  /**
   * sheet 16x16 — Ciccio's head, faces RIGHT (left = flipX):
   * 0-2 right (closed, half, open), 3-5 up, 6-8 down, 9-12 deflating (death)
   */
  ciccio: 'maze-ciccio',
  /** sheets 16x16 per ghost: 0-7 = dir (right,left,up,down) x 2 wiggle, 8-9 cheese-scared, 10-11 white flash */
  ghost: { pickle: 'maze-pickle', chili: 'maze-chili', demon: 'maze-demon', burger: 'maze-burger' },
  /** sheet 16x16, frames 0-3 — eaten ghost: just the eyes (right, left, up, down) */
  eyes: 'maze-eyes',
  /** sheet 16x16, frames 0-2 — bonus: burger, fries tray, crunchy wings */
  bonus: 'maze-bonus',
  /** image 24x12 — putting green with the golf hole (hole centre at 12,6) */
  hole: 'maze-hole',
  /** sheet 16x18, frames 0-3 — waving red flag on an orange pole, pole base at (3,17) */
  flag: 'maze-flag',
  /** image 12x22 — left tunnel mouth (corridor fading to dark under the paper); flipX for the right */
  mouth: 'maze-mouth',
  /** images — pixel captions */
  ready: 'maze-ready',
  goText: 'maze-go',
} as const;

/** Where the logo label sits on the board (world px, top-left): the inside of the big centre tray. */
export const LOGO_LABEL = { x: 87, y: 55, scale: 0.5 } as const;

export const CICCIO_FRAMES = {
  right: [0, 1, 2],
  up: [3, 4, 5],
  down: [6, 7, 8],
  deflate: [9, 10, 11, 12],
} as const;

export const GHOST_FRAMES = {
  dirBase: { right: 0, left: 2, up: 4, down: 6 },
  scared: [8, 9],
  flash: [10, 11],
} as const;

export const EYES_FRAME = { right: 0, left: 1, up: 2, down: 3 } as const;

export const BONUS_FRAME = { burger: 0, fries: 1, wings: 2 } as const;

export const MAZE_ANIMS = {
  flag: 'maze-flag-wave',
} as const;
