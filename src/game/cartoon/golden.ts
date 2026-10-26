/**
 * The GOLDEN TICKET finale after the seventh knockout: the Ciccio's wrapper drops in and wiggles, cracks
 * along its tear line (gold light and paper scraps burst out), the top half peels back and flies off while
 * the bottom half drops, the golden ticket rises out of it and fills the arena (YOU ARE SO GOLDEN), a shine
 * sweeps across it, confetti rains and Ciccio dances below. A tap skips it (after a short beat); calm =
 * fewer confetti and scraps, no wiggle, slower rays.
 */
import type Phaser from 'phaser';
import type { SfxName } from '../../contracts';
import { ARENA, HERO_ANIMS, HERO_FRAME, type Box } from './api';
import { DEPTH } from './depths';
import { TICKET, WRAP, loadGoldenArt, type GoldenKeys } from './goldenArt';
import { CT_FLOW } from '../../config/cartoon';

const CX = ARENA.w / 2;
const TICKET_Y = 150;
const SCALE = 1.5;
/** beats (ms): the tear starts at `tear`; crack, peel and rise are counted from it */
const T = { wrapIn: 650, tear: 1500, crack: 260, peel: 1050, riseAt: 420, rise: 900, shineFrom: 3000, shineEvery: 1800, shineMs: 900 } as const;
const WRAP_SCALE = 1.15;
const SHOW_PAD = 6;
/** What the camera shows of the finale as big as it fits (a phone held upright): the risen ticket, the wrapper it
 * comes out of and Ciccio dancing under it, down to the arena bottom (world units). */
export const GOLDEN_SHOW: Box = {
  x: CX - (TICKET.w * SCALE) / 2 - SHOW_PAD,
  y: TICKET_Y - (TICKET.h * SCALE) / 2 - SHOW_PAD,
  w: TICKET.w * SCALE + 2 * SHOW_PAD,
  h: ARENA.h - (TICKET_Y - (TICKET.h * SCALE) / 2 - SHOW_PAD),
};
const CONFETTI_COLORS = [0xffd257, 0xfff3d0, 0xe2401f, 0xff7fb0, 0x2a2f4d, 0xf2a93b] as const;
const SCRAP_COLORS = [0x4a1f0f, 0x6a2f18, 0xffe38a, 0xb8862a] as const;

interface Bit {
  o: Phaser.GameObjects.Rectangle;
  vx: number;
  vy: number;
  spin: number;
  phase: number;
}

export class GoldenFinale {
  private readonly objs: Phaser.GameObjects.GameObject[] = [];
  private readonly keys: GoldenKeys;
  private readonly bits: Bit[] = [];
  private readonly wrap: Phaser.GameObjects.Image[];
  private readonly ticket: Phaser.GameObjects.Image;
  private readonly shine: Phaser.GameObjects.Image;
  private readonly rays: Phaser.GameObjects.Graphics;
  private readonly hero: Phaser.GameObjects.Sprite;
  private readonly maskShape: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private t = 0;
  private torn = false;
  private risen = false;
  private done = false;

  constructor(
    private readonly scene: Phaser.Scene,
    k: number,
    heroK: number,
    logoKey: string | null,
    private readonly calm: boolean,
    private readonly sfx: (n: SfxName) => void,
    /** the ticket is out and the finale's own Ciccio dances (the round's one leaves) */
    private readonly onReveal: () => void,
    private readonly onDone: () => void,
  ) {
    this.keys = loadGoldenArt(scene, k, logoKey);
    const add = <O extends Phaser.GameObjects.GameObject>(o: O, d: number): O => {
      (o as unknown as Phaser.GameObjects.Components.Depth).setDepth(DEPTH.finale + d * 0.01);
      this.objs.push(o);
      return o;
    };
    const dim = add(scene.add.rectangle(CX, ARENA.h / 2, ARENA.w, ARENA.h, 0x140a04, 0), 0);
    scene.tweens.add({ targets: dim, fillAlpha: 0.8, duration: 400 });
    this.rays = add(scene.add.graphics({ x: CX, y: TICKET_Y }), 1).setAlpha(0);
    for (let i = 0; i < 24; i++) {
      const a0 = (i / 24) * Math.PI * 2;
      const a1 = a0 + Math.PI / 24;
      this.rays.fillStyle(i % 2 ? 0xffe9a0 : 0xf2b631, 0.5);
      this.rays.fillTriangle(0, 0, Math.cos(a0) * 520, Math.sin(a0) * 520, Math.cos(a1) * 520, Math.sin(a1) * 520);
    }
    this.ticket = add(scene.add.image(CX, ARENA.h / 2 + 20, this.keys.ticket), 2).setScale(0.55 / this.keys.ticketK).setVisible(false);
    this.maskShape = scene.make.graphics({ x: 0, y: 0 }, false);
    this.maskShape.fillStyle(0xffffff, 1).fillRoundedRect(CX - (TICKET.w * SCALE) / 2 + 4, TICKET_Y - (TICKET.h * SCALE) / 2 + 4, TICKET.w * SCALE - 8, TICKET.h * SCALE - 8, 12);
    this.shine = add(scene.add.image(-200, TICKET_Y, this.keys.shine), 3).setDisplaySize(70, TICKET.h * SCALE * 1.6).setAngle(18).setBlendMode('ADD').setAlpha(0.8);
    this.shine.setMask(this.maskShape.createGeometryMask());
    // gold light leaking out of the tear line, between the ticket and the wrapper halves
    this.glow = add(scene.add.rectangle(CX, ARENA.h / 2 + (WRAP.tearY - WRAP.h / 2) * WRAP_SCALE, WRAP.w * WRAP_SCALE * 0.96, 3, 0xffe9a0, 0), 3).setBlendMode('ADD');
    this.wrap = [this.keys.wrapTop, this.keys.wrapBottom].map((key) => add(scene.add.image(CX, ARENA.h / 2, key), 4).setScale(0));
    scene.tweens.add({ targets: this.wrap, scale: WRAP_SCALE / k, duration: T.wrapIn, ease: 'Back.Out' });
    this.hero = add(scene.add.sprite(CX, ARENA.h - 18, '__DEFAULT'), 5)
      .setOrigin(0.5, HERO_FRAME.footY / HERO_FRAME.h)
      .setScale(1.25 / heroK)
      .setVisible(false);
    if (scene.anims.exists(HERO_ANIMS.victory)) this.hero.play(HERO_ANIMS.victory);
  }

  /** RRRIP: the wrapper cracks along its tear line, light and scraps burst out, the halves peel away. */
  private tear(): void {
    this.torn = true;
    const sc = this.scene;
    const [top, bottom] = this.wrap;
    top.setAngle(0);
    bottom.setAngle(0);
    sc.tweens.add({ targets: top, y: top.y - 9, angle: -3, duration: T.crack, ease: 'Back.Out' });
    sc.tweens.add({ targets: bottom, y: bottom.y + 9, angle: 2, duration: T.crack, ease: 'Back.Out' });
    sc.tweens.add({ targets: this.glow, fillAlpha: 0.95, scaleY: 7, duration: T.crack, yoyo: true, hold: T.riseAt - T.crack });
    // the top half folds back (scaleY) as it flies up and away; the bottom half drops
    sc.tweens.add({ targets: top, y: top.y - 250, angle: -34, scaleY: (WRAP_SCALE * 0.35) / this.keys.wrapK, alpha: 0, delay: T.crack, duration: T.peel, ease: 'Quad.In' });
    sc.tweens.add({ targets: bottom, y: bottom.y + 230, angle: 12, alpha: 0, delay: T.crack + 120, duration: T.peel - 120, ease: 'Quad.In' });
    this.ticket.setVisible(true);
    this.shake(4, T.crack);
    this.sfx('ticket');
    const glowY = this.glow.y;
    const n = this.calm ? 10 : 28;
    for (let i = 0; i < n; i++) this.bit(CX + (Math.random() - 0.5) * WRAP.w * WRAP_SCALE * 0.9, glowY, SCRAP_COLORS, 60 + Math.random() * 160, 4);
  }

  /** The ticket rises out of the open wrapper, the rays come up, Ciccio dances, confetti bursts. */
  private rise(): void {
    this.risen = true;
    const sc = this.scene;
    sc.tweens.add({ targets: this.ticket, y: TICKET_Y, scale: SCALE / this.keys.ticketK, duration: T.rise, ease: 'Back.Out' });
    sc.tweens.add({ targets: this.rays, alpha: 1, duration: 600 });
    const flash = sc.add.rectangle(CX, ARENA.h / 2, ARENA.w, ARENA.h, 0xfffbe8, 0.35).setDepth(DEPTH.finale + 0.09);
    this.objs.push(flash);
    sc.tweens.add({ targets: flash, alpha: 0, duration: 420 });
    this.hero.setVisible(true);
    this.onReveal();
    const n = this.calm ? 24 : 80;
    for (let i = 0; i < n; i++) this.confetto(true);
  }

  /** The wrapper halves shiver sideways as it cracks (calm: still). */
  private shake(amp: number, ms: number): void {
    if (this.calm) return;
    for (const o of this.wrap) this.scene.tweens.add({ targets: o, x: CX + amp, duration: ms / 6, yoyo: true, repeat: 2, ease: 'Sine.InOut', onComplete: () => o.setX(CX) });
  }

  private confetto(burst: boolean): void {
    const at = burst ? { x: CX, y: TICKET_Y } : { x: Math.random() * ARENA.w, y: -8 };
    this.bit(at.x, at.y, CONFETTI_COLORS, burst ? 120 + Math.random() * 220 : 0, 3);
  }

  /** One spinning paper bit: a burst (speed > 0) or a gentle fall from the top. */
  private bit(x: number, y: number, colors: readonly number[], speed: number, size: number): void {
    const c = colors[this.bits.length % colors.length];
    const o = this.scene.add.rectangle(x, y, size, size * 1.6, c).setDepth(DEPTH.finale + 0.06);
    this.objs.push(o);
    const a = Math.random() * Math.PI * 2;
    this.bits.push({ o, vx: Math.cos(a) * speed, vy: speed > 0 ? Math.sin(a) * speed - 120 : 40 + Math.random() * 60, spin: (Math.random() - 0.5) * 12, phase: Math.random() * 6 });
  }

  update(dtMs: number): void {
    if (this.done) return;
    this.t += dtMs;
    const dt = dtMs / 1000;
    if (!this.torn && !this.calm && this.t > T.wrapIn) {
      const w = Math.sin(this.t / 45) * 4 * Math.min(1, (this.t - T.wrapIn) / 600);
      this.wrap.forEach((o) => o.setAngle(w));
    }
    if (!this.torn && this.t >= T.tear) this.tear();
    if (this.torn && !this.risen && this.t >= T.tear + T.riseAt) this.rise();
    this.rays.rotation += dt * (this.calm ? 0.05 : 0.25);
    if (this.risen) {
      const beat = this.t / 300;
      this.hero.y = ARENA.h - 18 - Math.abs(Math.sin(beat * Math.PI)) * (this.calm ? 2 : 8);
      this.hero.setFlipX(Math.floor(beat / 2) % 2 === 1);
      if (!this.calm && Math.random() < 0.5) this.confetto(false);
    }
    const st = this.t - T.shineFrom;
    if (st > 0) {
      const p = (st % T.shineEvery) / T.shineMs;
      this.shine.x = p <= 1 ? CX - 300 + p * 600 : -200;
    }
    for (const b of this.bits) {
      b.vy = Math.min(b.vy + 260 * dt, 140);
      b.vx *= 1 - Math.min(1, 2.2 * dt);
      b.phase += dt * 4;
      b.o.x += (b.vx + Math.sin(b.phase) * 30) * dt;
      b.o.y += b.vy * dt;
      b.o.rotation += b.spin * dt;
      b.o.scaleX = Math.cos(b.phase * 1.7);
    }
    for (let i = this.bits.length - 1; i >= 0; i--) {
      if (this.bits[i].o.y < ARENA.h + 10) continue;
      this.bits[i].o.destroy();
      this.bits.splice(i, 1);
    }
    if (this.t >= CT_FLOW.goldenMs) this.finish();
  }

  /** A tap: ends the finale once the ticket has had its moment. */
  skip(): void {
    if (this.t >= CT_FLOW.goldenSkipAfterMs + T.tear) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    this.onDone();
  }

  destroy(): void {
    for (const o of this.objs) {
      this.scene.tweens.killTweensOf(o);
      o.destroy();
    }
    this.objs.length = 0;
    this.bits.length = 0;
    this.maskShape.destroy();
  }
}
