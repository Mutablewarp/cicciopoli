/**
 * Level geometry in Phaser: the autotiled tilemap (solid ground / blocks, one-way
 * platforms), world bounds, terrain queries for AI, and static decorations.
 */
import Phaser from 'phaser';
import { T, TILE } from '../art/keys';
import { TILESET_MARGIN, TILESET_SPACING } from '../art/register';
import { autotile, PLAT_TILES, SOLID_TILES } from './levels/autotile';
import type { ParsedLevel } from './levels/types';
import { DEPTH } from './depths';
import { addGlow } from './fxArt';
import type { ThemeConfig } from './themes';

const PLAT_SET = new Set(PLAT_TILES);
/** Highest ledge lip (px above the feet) that a sideways push climbs onto. */
const CORNER_STEP = 6;

/** Decorative ground rows drawn below the level (the camera may sink there in landscape). */
const EXTRA_ROWS = 4;
const FILL_DOWN: Readonly<Record<number, number>> = {
  [T.GROUND_FILL_L]: T.GROUND_FILL_L,
  [T.GROUND_FILL_R]: T.GROUND_FILL_R,
  [T.GROUND_FILL_SINGLE]: T.GROUND_FILL_SINGLE,
  [T.GROUND_FILL_M]: T.GROUND_FILL_DEEP,
  [T.GROUND_FILL_M_ALT]: T.GROUND_FILL_DEEP,
  [T.GROUND_FILL_DEEP]: T.GROUND_FILL_DEEP,
};

/** Autotiled level plus EXTRA_ROWS continuing every column that reaches the bottom. */
function withExtraRows(data: number[][]): number[][] {
  const last = data[data.length - 1] ?? [];
  const extra = last.map((i) => FILL_DOWN[i] ?? -1);
  return [...data, ...Array.from({ length: EXTRA_ROWS }, () => [...extra])];
}

type Collidable = Phaser.Types.Physics.Arcade.GameObjectWithBody | Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody | Phaser.Tilemaps.Tile;

function bodyOf(o: Collidable): Phaser.Physics.Arcade.Body | null {
  if (o instanceof Phaser.Physics.Arcade.Body) return o;
  if (o instanceof Phaser.Tilemaps.Tile || o instanceof Phaser.Physics.Arcade.StaticBody) return null;
  return o.body instanceof Phaser.Physics.Arcade.Body ? o.body : null;
}

export class World {
  readonly width: number;
  readonly height: number;
  readonly map: Phaser.Tilemaps.Tilemap;
  readonly layer: Phaser.Tilemaps.TilemapLayer;

  constructor(
    private readonly scene: Phaser.Scene,
    readonly level: ParsedLevel,
    theme: ThemeConfig,
  ) {
    this.width = level.cols * TILE;
    this.height = level.rows * TILE;
    this.map = scene.make.tilemap({ data: withExtraRows(autotile(level.terrain)), tileWidth: TILE, tileHeight: TILE });
    const tiles = this.map.addTilesetImage(theme.tileset, theme.tileset, TILE, TILE, TILESET_MARGIN, TILESET_SPACING);
    if (!tiles) throw new Error(`tileset ${theme.tileset} missing`);
    const layer = this.map.createLayer(0, tiles, 0, 0);
    if (!layer) throw new Error('tilemap layer could not be created');
    this.layer = layer.setDepth(DEPTH.map);
    this.layer.setCollision([...SOLID_TILES]);
    this.layer.forEachTile((t: Phaser.Tilemaps.Tile) => {
      if (t.y >= level.rows) t.setCollision(false, false, false, false);
      else if (PLAT_SET.has(t.index)) t.setCollision(false, false, true, false);
    });
    scene.physics.world.setBounds(0, -this.height, this.width, this.height * 3);
    scene.physics.world.setBoundsCollision(true, true, false, false);
    this.placeDecor(theme);
  }

  /**
   * Collider process callback for every body vs the tilemap.
   * - Feet that dipped into a tile top this step (they were above it the step before) are
   *   resolved here as a landing, never as a wall: Arcade would otherwise separate on X first
   *   when running onto a step and leave the body snagged on the corner.
   * - One-way platforms only ever catch bodies that way; from below / the side they are air.
   */
  readonly tileProcess = (obj: Collidable, other: Collidable): boolean => {
    if (!(other instanceof Phaser.Tilemaps.Tile)) return true;
    const body = bodyOf(obj);
    if (!body) return true;
    const top = other.pixelY;
    const dip = body.bottom - top;
    const wasAbove = body.prev.y + body.height <= top + 0.5;
    const over = body.right > other.pixelX && body.left < other.pixelX + other.width;
    const landing = over && dip > 0 && wasAbove && body.velocity.y >= 0 && (other.collideUp || PLAT_SET.has(other.index));
    if (landing || (dip > 0 && !wasAbove && this.cornerStep(body, other, dip))) {
      body.position.y -= dip;
      body.updateCenter();
      body.velocity.y = 0;
      body.blocked.down = true;
      body.blocked.none = false;
      return false;
    }
    return !PLAT_SET.has(other.index);
  };

  /**
   * Corner forgiveness (QA L2-08): pushing sideways into a solid tile whose top is only a few
   * px above the feet, with room overhead, steps up onto it instead of stopping dead.
   */
  private cornerStep(body: Phaser.Physics.Arcade.Body, tile: Phaser.Tilemaps.Tile, dip: number): boolean {
    if (dip > CORNER_STEP || !tile.collideUp || body.velocity.y < -30) return false;
    const left = tile.pixelX;
    const right = left + tile.width;
    const into = body.velocity.x > 0 ? body.right > left && body.left < left : body.velocity.x < 0 && body.left < right && body.right > right;
    if (!into) return false;
    for (let k = 1; k <= Math.ceil(body.height / TILE); k++) {
      if (this.isSolidAt(left + 1, tile.pixelY - (k - 1) * TILE - 1) && this.level.terrain[tile.y - k]?.[tile.x] !== 'plat') return false;
    }
    return true;
  }

  /** Ground, block or platform at a world point (outside the map sides counts as wall). */
  isSolidAt(x: number, y: number): boolean {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);
    if (col < 0 || col >= this.level.cols) return true;
    if (row < 0 || row >= this.level.rows) return false;
    return this.level.terrain[row][col] !== 'air';
  }

  /** World y of the walkable surface under a cell's bottom edge. */
  feetY(row: number): number {
    return (row + 1) * TILE;
  }

  cellCenterX(col: number): number {
    return col * TILE + TILE / 2;
  }

  private placeDecor(theme: ThemeConfig): void {
    for (const e of this.level.entities) {
      if (e.spec.type !== 'decor') continue;
      const def = theme.decor[e.spec.kind];
      if (!def || !this.scene.textures.exists(def.key)) continue;
      const s = this.scene.add.sprite(this.cellCenterX(e.col), this.feetY(e.row) + def.sink, def.key, 0);
      s.setOrigin(0.5, 1).setDepth(DEPTH.decor);
      if (def.anim && this.scene.anims.exists(def.anim)) s.play({ key: def.anim, startFrame: (e.col * 7) % 4 });
      if (def.glowDy !== undefined) addGlow(this.scene, s.x, s.y - def.glowDy, { depth: DEPTH.glow, alpha: 0.75, pulse: 0.25 });
    }
  }
}
