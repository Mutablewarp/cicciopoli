/**
 * Flat pieces of the dining room (ref/level7_pov_order.png): the orange neon script on the right brick
 * wall, the street window on the left (pale facade with balconies, palms and banana leaves), the
 * plaster wall on the right with its black tile wainscot, the CICCIOPOLY poster under its picture
 * light (Ciccio as the board-game tycoon: top hat, round glasses, tuxedo, red bow tie, money bag, on a
 * pile of gold coins, on red-orange under a sky-blue title band), the small La Lumia menu board and the
 * frontal brick with pothos that also fills the screen beyond the room (./room buildRoomFill).
 */
import { Mask, paintMask } from '../../hills/mask';
import { Raster, hash2 } from '../../hills/raster';
import { bayer, mix } from '../../pixel';
import { rectR } from '../../rampage/draw';
import { drawText, textWidth } from '../../rush/font';
import { KC } from './palette';
import { type Box, type Rect, on, proj, walls } from './roomKit';
import { leaf } from './roomProps';

/** Frontal brick, 16x4 bricks in running bond, phase (ox, oy); tones repeat every 64 px both ways. */
export function brickFront(r: Raster, a: Rect, ox = 0, oy = 0): void {
  for (let y = a.y; y < a.y + a.h; y++) {
    const yy = y + oy;
    const row = Math.floor(yy / 4);
    for (let x = a.x; x < a.x + a.w; x++) {
      const bx = x + ox + (row % 2) * 8;
      const mortar = ((yy % 4) + 4) % 4 === 3 || ((bx % 16) + 16) % 16 === 15;
      const tone = hash2((((Math.floor(bx / 16) % 4) + 4) % 4), (((row % 16) + 16) % 16), 9);
      const c: string = tone < 0.25 ? KC.brickShade : tone > 0.8 ? KC.brick : on(x, y, 0.5) ? KC.brickShade : KC.brick;
      r.set(x, y, mortar ? (hash2(x, y, 3) < 0.4 ? KC.mortarShade : KC.brickDark) : c);
    }
  }
}

/**
 * Orange neon script on a side wall: two lines of looping cursive (a prolate cycloid) projected on the
 * wall between depths d0 and d1, the hot core, the orange tube, a dithered red glow on the brick.
 */
export function wallNeon(r: Raster, b: Box, side: -1 | 1, d0: number, d1: number, y0: number, y1: number): void {
  const X = side < 0 ? walls(b).xl : walls(b).xr;
  const tube = new Raster(r.w, r.h);
  const lines = [[0, 0.55, 2.2], [0.2, 1, 3.2]] as const;
  lines.forEach(([u0, u1, loops], li) => {
    const n = 220;
    const yMid = y0 + ((li + 0.5) * (y1 - y0)) / 2;
    const amp = (y1 - y0) / 6;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * loops * Math.PI * 2;
      const u = u0 + ((u1 - u0) * i) / n - (Math.sin(t) * 0.035) * (u1 - u0);
      const Y = yMid - Math.cos(t) * amp + (li === 0 && i < n / 8 ? -amp * (1 - (8 * i) / n) : 0);
      const [x, y] = proj(b, X, Y, (d0 + (d1 - d0) * u) / b.f);
      tube.set(Math.round(x), Math.round(y), KC.neonTube);
    }
  });
  for (let y = 1; y < r.h - 1; y++) {
    for (let x = 1; x < r.w - 1; x++) {
      if (tube.get(x, y) !== 0) {
        r.set(x, y, tube.get(x - 1, y) !== 0 || tube.get(x, y - 1) !== 0 ? KC.neonCore : KC.neonTube);
        continue;
      }
      let d = 9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (tube.get(x + dx, y + dy) !== 0) d = Math.min(d, Math.hypot(dx, dy));
      if (d < 1.1) r.set(x, y, KC.neonEdge);
      else if (d < 3.5 && on(x, y, 0.4 - d / 9)) r.set(x, y, KC.neonGlow);
    }
  }
}

/** The street window: white frame, a pale facade with balconies, palms and banana leaves, the sill. */
export function streetWindow(r: Raster, a: Rect): void {
  for (let y = a.y; y < a.y + a.h; y++) {
    const t = (y - a.y) / a.h;
    for (let x = a.x; x < a.x + a.w; x++) {
      let c: string = on(x, y, 0.3) ? KC.glassLight : KC.glass;
      if (x < a.x + a.w * 0.62 && t > 0.06) {
        // the facade: a balcony slab every 13 px, dark windows behind the white rails
        const fy = (y - a.y) % 13;
        c = fy < 2 ? KC.white : fy === 2 ? KC.facadeShade : fy < 7 && (x - a.x) % 12 > 3 && (x - a.x) % 12 < 9 ? KC.steelDark : KC.facade;
        if (fy > 2 && fy < 6 && (x - a.x) % 3 === 0) c = KC.white;
      }
      r.set(x, y, c);
    }
  }
  // garden greenery outside: banana and palm leaves rising from the bottom, dimmer than the room's plants
  for (let i = 0; i < Math.round((a.w * a.h) / 60); i++) {
    const x = a.x + Math.floor(hash2(i, 1, 41) * a.w) - 4;
    const y = a.y + Math.floor(a.h * (0.55 + hash2(i, 2, 41) ** 0.5 * 0.45)) - 4;
    leaf(r, x, y, hash2(i, 3, 41) < 0.3 ? 'l' : 'm', 400 + i, hash2(i, 4, 41) < 0.5, hash2(i, 5, 41) < 0.6);
  }
  // reflections on the glass
  for (let y = a.y; y < a.y + a.h; y++) {
    for (let x = a.x; x < a.x + a.w; x++) if ((x + y) % 2 === 0 && hash2(x, y, 43) < 0.2) r.set(x, y, mix(KC.glassLight, KC.glass, 0.5));
  }
  rectR(r, a.x - 2, a.y - 2, a.w + 4, 2, KC.doorFrame);
  rectR(r, a.x - 2, a.y, 2, a.h, KC.doorFrame);
  rectR(r, a.x + a.w, a.y, 2, a.h, KC.doorFrame);
  rectR(r, a.x + Math.floor(a.w / 2) - 1, a.y, 2, a.h, KC.doorFrame);
  rectR(r, a.x - 3, a.y + a.h, a.w + 6, 2, KC.plasterLight);
  rectR(r, a.x - 3, a.y + a.h + 2, a.w + 6, 1, KC.plasterDark);
}

/** Plaster wall with a black tile wainscot from `wy` down. */
export function plasterWall(r: Raster, a: Rect, wy: number): void {
  for (let y = a.y; y < a.y + a.h; y++) {
    for (let x = a.x; x < a.x + a.w; x++) {
      const n = hash2(x, y, 13);
      let c: string = n < 0.05 ? KC.plasterLight : n > 0.96 ? KC.plasterShade : on(x, y, 0.2) ? KC.plasterShade : KC.plaster;
      if (y >= wy) c = (y - wy) % 4 === 3 || (x + (Math.floor((y - wy) / 4) % 2) * 4) % 8 === 7 ? KC.blackHi : KC.blackLight;
      r.set(x, y, c);
    }
  }
  rectR(r, a.x, wy, a.w, 1, KC.blackHi);
}

/** Picture light over the poster: a black arm and bar, a warm wash fading down. */
export function pictureLight(r: Raster, cx: number, y: number, w: number): void {
  for (let dy = 2; dy < 12; dy++) {
    for (let x = cx - w / 2; x < cx + w / 2; x++) if (on(Math.round(x), y + dy, 0.4 - dy / 30)) r.set(Math.round(x), y + dy, KC.bulb);
  }
  rectR(r, Math.round(cx - w / 2), y, w, 2, KC.iron);
  rectR(r, Math.round(cx - w / 2), y + 2, w, 1, KC.bulbWarm);
  rectR(r, Math.round(cx + w / 2) - 2, y - 4, 1, 4, KC.iron);
}

/** Small La Lumia menu board: white header bars over item lines with prices, two columns. */
export function menuBoard(r: Raster, a: Rect): void {
  rectR(r, a.x - 1, a.y - 1, a.w + 2, a.h + 2, KC.iron);
  rectR(r, a.x, a.y, a.w, a.h, KC.board);
  const colW = Math.floor((a.w - 3) / 2);
  for (let c = 0; c < 2; c++) {
    const x = a.x + 2 + c * (colW + 1);
    for (let y = a.y + 2, blk = 0; y < a.y + a.h - 3; blk++) {
      rectR(r, x, y, colW - 2 - (blk % 2) * 3, 2, KC.boardText);
      y += 4;
      for (let k = 0; k < 3 && y < a.y + a.h - 2; k++, y += 2) {
        const name = 3 + Math.floor(hash2(c, y, 4) * (colW - 8));
        rectR(r, x, y, name, 1, KC.boardLine);
        rectR(r, x + colW - 3, y, 2, 1, KC.boardText);
      }
      y += 1;
    }
  }
}

/** CICCIOPOLY poster in a black frame. */
export function poster(r: Raster, a: Rect): void {
  rectR(r, a.x, a.y, a.w, a.h, KC.posterFrame);
  for (let y = a.y + 2; y < a.y + a.h - 2; y++) {
    const t = (y - a.y) / a.h;
    for (let x = a.x + 2; x < a.x + a.w - 2; x++) {
      r.set(x, y, t > 0.7 && (t - 0.7) * 3 > bayer(x, y) ? KC.posterShade : t < 0.35 && t * 2.5 < bayer(x, y) ? KC.posterLight : KC.poster);
    }
  }
  rectR(r, a.x + 2, a.y + 2, a.w - 4, 8, KC.posterSky);
  const cx = a.x + Math.floor(a.w / 2);
  drawText(r, 'CICCIOPOLY', cx - Math.floor(textWidth('CICCIOPOLY') / 2), a.y + 4, KC.ink);
  const base = a.y + a.h - 4;
  // pile of gold coins
  const m = new Mask(r.w, r.h);
  m.ellipse(cx, base - 2, Math.floor(a.w / 2) - 4, 4, 1);
  m.ellipse(cx - 6, base - 6, 5, 3, 1);
  m.ellipse(cx + 7, base - 5, 5, 3, 1);
  // tuxedo body, white shirt front, arms, money bag
  const top = base - 26;
  m.poly([[cx - 6, top + 9], [cx + 6, top + 9], [cx + 8, top + 21], [cx - 8, top + 21]], 2);
  m.rect(cx - 5, top + 21, 3, 3, 2);
  m.rect(cx + 2, top + 21, 3, 3, 2);
  m.poly([[cx - 6, top + 10], [cx - 11, top + 15], [cx - 9, top + 17], [cx - 5, top + 13]], 2);
  m.poly([[cx + 6, top + 10], [cx + 11, top + 13], [cx + 10, top + 15], [cx + 5, top + 13]], 2);
  m.ellipse(cx + 12, top + 15, 3, 3, 4);
  m.ellipse(cx, top + 4, 5, 5, 3); // head
  paintMask(m, r, {
    1: { light: '#fff0a0', base: KC.coin, shade: '#c08a10', dark: '#7a5208' },
    2: { light: '#3a3a44', base: KC.ink, shade: KC.ink },
    3: { light: KC.white, base: '#f6eee2', shade: '#d8ccbc' },
    4: { light: '#fff0a0', base: KC.coin, shade: '#c08a10' },
  }, { shadeDepth: 1 });
  rectR(r, cx - 1, top + 9, 3, 9, KC.white);
  rectR(r, cx - 2, top + 9, 5, 2, KC.red); // bow tie
  r.set(cx, top + 9, '#ff7a6a');
  rectR(r, cx - 5, top - 1, 11, 2, KC.ink); // hair
  rectR(r, cx - 5, top + 1, 2, 3, KC.ink);
  rectR(r, cx + 4, top + 1, 2, 3, KC.ink);
  rectR(r, cx - 4, top + 3, 3, 3, KC.ink); // round glasses
  rectR(r, cx + 2, top + 3, 3, 3, KC.ink);
  rectR(r, cx - 1, top + 4, 3, 1, KC.ink);
  rectR(r, cx - 2, top + 7, 5, 1, '#8a2a20'); // smile
  rectR(r, cx - 7, top - 2, 15, 2, KC.ink); // top hat
  rectR(r, cx - 4, top - 9, 9, 7, KC.ink);
  rectR(r, cx - 4, top - 4, 9, 1, KC.red);
  rectR(r, cx - 4, top - 9, 1, 5, '#3a3a44');
  rectR(r, cx + 11, top + 14, 2, 1, KC.goldDeep); // € mark on the bag
}
