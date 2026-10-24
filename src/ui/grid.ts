/** Character grid for the pixel thumbnails and scenes (title cards, level 6 street). */
import { pixelSvg } from './dom';

export class Grid {
  readonly rows: string[][];
  constructor(
    fill: string,
    readonly w = 32,
    readonly h = 18,
  ) {
    this.rows = Array.from({ length: h }, () => Array<string>(w).fill(fill));
  }
  put(x: number, y: number, c: string): void {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) this.rows[y][x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.put(i, j, c);
  }
  /** Paints a sprite; '.' is transparent. */
  stamp(x: number, y: number, art: readonly string[]): void {
    art.forEach((row, j) => [...row].forEach((c, i) => c !== '.' && this.put(x + i, y + j, c)));
  }
  svg(pal: Readonly<Record<string, string>>): string {
    // slice: the art fills cards of any aspect, cropping evenly around the centre (a landscape card shows
    // ~20 of the 32 columns: key props stay in columns 6-26, see thumbs.test.ts)
    return pixelSvg(this.rows.map((r) => r.join('')), pal).replace('<svg ', '<svg preserveAspectRatio="xMidYMid slice" ');
  }
}
