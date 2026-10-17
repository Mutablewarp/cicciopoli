/**
 * CICCIO-MAN actors: Ciccio's chomping head and the four ghosts (state machine, speeds,
 * sprites). Pure movement/targeting lives in movement.ts / ai.ts.
 */
import type Phaser from 'phaser';
import type { Dir4 } from '../../contracts';
import { CICCIO_FRAMES, EYES_FRAME, GHOST_FRAMES, MAZE_ART } from '../../art/maze/keys';
import { chooseRandom, chooseToward, frightFlashWhite, type GhostName } from './ai';
import { HOUSE, MAZE, OPPOSITE, START, TUNNEL_ROWS, tileOf, type TilePos } from './layout';
import { stepGhost, stepPlayer, tryTurn, type Mover } from './movement';

export const SPEED = {
  ciccio: 64,
  ciccioPower: 70,
  ghost: 60,
  elroy: 64,
  fright: 40,
  tunnel: 32,
  eyes: 120,
  house: 30,
  enter: 90,
} as const;

export const DEPTH = { board: 0, dots: 1, items: 3, hole: 4, ghosts: 10, eyes: 11, ciccio: 12, covers: 40, text: 45, popup: 50 } as const;

/* ---------------------------------------------------------------- Ciccio */

export class Ciccio {
  readonly m: Mover = { x: START.ciccio.x, y: START.ciccio.y, dir: 'left', moving: true };
  readonly sprite: Phaser.GameObjects.Sprite;
  private chompMs = 0;

  constructor(scene: Phaser.Scene) {
    this.sprite = scene.add.sprite(this.m.x, this.m.y, MAZE_ART.ciccio, 0).setDepth(DEPTH.ciccio);
    this.reset();
  }

  reset(): void {
    Object.assign(this.m, { x: START.ciccio.x, y: START.ciccio.y, dir: 'left', moving: true });
    this.chompMs = 0;
    this.sprite.setVisible(true).setScale(1).setAngle(0).setAlpha(1);
    this.draw();
  }

  /** Turn if legal, then move `speed` px/s for `dtMs`. */
  move(want: Dir4 | null, speed: number, dtMs: number): void {
    tryTurn(this.m, want, MAZE.open);
    stepPlayer(this.m, (speed * dtMs) / 1000, MAZE.open);
    if (this.m.moving) this.chompMs += dtMs;
  }

  /** Mouth cycle closed → half → open → half while moving, half-open when stopped. */
  draw(): void {
    const seq = [0, 1, 2, 1];
    const k = this.m.moving ? seq[Math.floor(this.chompMs / 60) % 4] : 1;
    this.face(this.m.dir, k);
    this.sprite.setPosition(this.m.x, this.m.y);
  }

  /** Shows mouth stage k (0..2) facing `dir` (left mirrors right). */
  face(dir: Dir4, k: number): void {
    const base = dir === 'up' ? CICCIO_FRAMES.up : dir === 'down' ? CICCIO_FRAMES.down : CICCIO_FRAMES.right;
    this.sprite.setFrame(base[k]).setFlipX(dir === 'left');
  }

  get tile(): TilePos {
    return { c: tileOf(this.m.x), r: tileOf(this.m.y) };
  }
}

/* ---------------------------------------------------------------- ghosts */

export type GhostState = 'house' | 'leaving' | 'active' | 'eyes' | 'entering';

export interface GhostWorld {
  /** chase / scatter target for this ghost right now */
  target(g: Ghost): TilePos;
  rand(): number;
  /** few dots left: the pickle speeds up (arcade "Elroy") */
  elroy: boolean;
  onHome(g: Ghost): void;
}

export class Ghost {
  readonly m: Mover;
  state: GhostState;
  frightened = false;
  readonly sprite: Phaser.GameObjects.Sprite;

  constructor(
    scene: Phaser.Scene,
    readonly name: GhostName,
  ) {
    const s = START[name];
    this.m = { x: s.x, y: s.y, dir: 'left', moving: true };
    this.state = name === 'pickle' ? 'active' : 'house';
    this.sprite = scene.add.sprite(s.x, s.y, MAZE_ART.ghost[name], 0).setDepth(DEPTH.ghosts);
    this.reset();
  }

  reset(): void {
    const s = START[this.name];
    Object.assign(this.m, { x: s.x, y: s.y, dir: this.name === 'pickle' ? 'left' : this.name === 'chili' ? 'down' : 'up', moving: true });
    this.state = this.name === 'pickle' ? 'active' : 'house';
    this.frightened = false;
    this.sprite.setVisible(true).setAlpha(1);
  }

  get tile(): TilePos {
    return { c: tileOf(this.m.x), r: tileOf(this.m.y) };
  }

  /** Can touch Ciccio (corridor ghosts and ghosts coming out of the door). */
  get solid(): boolean {
    return this.state === 'active' || this.state === 'leaving';
  }

  release(): void {
    if (this.state === 'house') this.state = 'leaving';
  }

  /** Mode switch / fright start: roaming ghosts turn around at once. */
  reverse(): void {
    if (this.state === 'active') this.m.dir = OPPOSITE[this.m.dir];
  }

  eaten(): void {
    this.state = 'eyes';
    this.frightened = false;
  }

  speed(w: GhostWorld): number {
    if (this.state === 'eyes') return SPEED.eyes;
    if (this.state === 'entering') return SPEED.enter;
    if (this.state !== 'active') return SPEED.house;
    const t = this.tile;
    if (TUNNEL_ROWS.includes(t.r) && (t.c <= 4 || t.c >= 23)) return SPEED.tunnel;
    if (this.frightened) return SPEED.fright;
    return this.name === 'pickle' && w.elroy ? SPEED.elroy : SPEED.ghost;
  }

  update(dtMs: number, w: GhostWorld): void {
    const d = (this.speed(w) * dtMs) / 1000;
    const m = this.m;
    switch (this.state) {
      case 'house': {
        m.y += (m.dir === 'up' ? -d : d);
        if (m.y <= HOUSE.bobTop) [m.y, m.dir] = [HOUSE.bobTop, 'down'];
        if (m.y >= HOUSE.bobBottom) [m.y, m.dir] = [HOUSE.bobBottom, 'up'];
        break;
      }
      case 'leaving': {
        if (Math.abs(m.x - HOUSE.doorX) > 0.01) {
          m.dir = m.x < HOUSE.doorX ? 'right' : 'left';
          m.x = m.x < HOUSE.doorX ? Math.min(HOUSE.doorX, m.x + d) : Math.max(HOUSE.doorX, m.x - d);
        } else {
          m.dir = 'up';
          m.y = Math.max(HOUSE.exitY, m.y - d);
          if (m.y <= HOUSE.exitY) {
            this.state = 'active';
            m.dir = 'left';
          }
        }
        break;
      }
      case 'active':
        stepGhost(m, d, (c, r, dir) =>
          this.frightened ? chooseRandom(c, r, dir, MAZE.open, w.rand) : chooseToward(c, r, dir, w.target(this), MAZE.open),
        );
        break;
      case 'eyes':
        stepGhost(m, d, (c, r, dir) => chooseToward(c, r, dir, HOUSE.homeTile, MAZE.open));
        if (Math.abs(m.y - HOUSE.exitY) < 0.01 && Math.abs(m.x - HOUSE.doorX) <= 4) {
          m.x = HOUSE.doorX;
          m.dir = 'down';
          this.state = 'entering';
        }
        break;
      case 'entering':
        m.y = Math.min(HOUSE.floorY, m.y + d);
        if (m.y >= HOUSE.floorY) {
          this.state = 'leaving';
          w.onHome(this);
        }
        break;
    }
  }

  draw(timeMs: number, frightMs: number): void {
    const s = this.sprite;
    s.setPosition(this.m.x, this.m.y);
    const wiggle = Math.floor(timeMs / 130) % 2;
    if (this.state === 'eyes' || this.state === 'entering') {
      s.setTexture(MAZE_ART.eyes, EYES_FRAME[this.m.dir]).setDepth(DEPTH.eyes);
      return;
    }
    s.setDepth(DEPTH.ghosts);
    if (this.frightened) {
      const frames = frightFlashWhite(frightMs) ? GHOST_FRAMES.flash : GHOST_FRAMES.scared;
      s.setTexture(MAZE_ART.ghost[this.name], frames[wiggle]);
      return;
    }
    s.setTexture(MAZE_ART.ghost[this.name], GHOST_FRAMES.dirBase[this.m.dir] + wiggle);
  }
}
