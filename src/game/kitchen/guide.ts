/**
 * The tutorial's pointing hand (white glove, fingertip on the next thing to tap) and the AIUTI
 * pulse (a soft gold glow round the next useful bin / station). World px, over both views; the DOM
 * action button gets the hand pointing down at it from above.
 */
import type Phaser from 'phaser';
import type { ViewportInfo } from '../../contracts';
import { KITCHEN, KITCHEN_ANIMS } from '../../art/kitchen/keys';
import { POINTER_TIP } from '../../art/kitchen/station/fx';
import { KITCHEN_COLORS, KITCHEN_FX } from './config';
import type { Rect } from './framing';

const HAND = { w: 20, h: 22, bobPx: 2, bobMs: 600 } as const;
/** side: the fingertip on the rect's middle, `dy` under its top (`fromMid` over its middle in a tall place, whose pan sits in
 * its middle): the hand lies right of it inside the rect (over its own pan / can, off the label tape under it and off the
 * neighbouring places a big thumb could hit instead) */
const SIDE = { dy: 13, fromMid: 18 } as const;
const GLOW_PAD = 2;
const GLOW_R = 4;

export interface GuideShow {
  /** where, world px; null hides everything */
  rect: Rect | null;
  hand: boolean;
  pulse: boolean;
  /** up = fingertip on the centre of the rect, hand below it; side = fingertip on the rect's middle, the
   * hand lying right of it inside the rect, never over the label under a pan or a can nor over the next
   * place; down / left = fingertip on the rect's top-left point, pointing at the DOM action button under
   * it / left of it */
  dir: 'up' | 'side' | 'down' | 'left';
}

export class Guide {
  private readonly glow: Phaser.GameObjects.Graphics;
  private readonly hand: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene) {
    this.glow = scene.add.graphics().setDepth(40);
    this.hand = scene.add.sprite(0, 0, KITCHEN.pointer, 0).setDepth(41).setVisible(false);
    if (scene.anims.exists(KITCHEN_ANIMS.pointer[0])) this.hand.play(KITCHEN_ANIMS.pointer[0]);
  }

  update(s: GuideShow, timeMs: number, calm: boolean): void {
    const g = this.glow;
    g.clear();
    const r = s.rect;
    this.hand.setVisible(!!r && s.hand);
    if (!r) return;
    if (s.pulse) {
      const beat = calm ? 0.6 : 0.5 + 0.5 * Math.sin((timeMs / KITCHEN_FX.pulseMs) * Math.PI * 2);
      g.fillStyle(KITCHEN_COLORS.pulse, 0.12 * beat);
      g.fillRoundedRect(r.x - GLOW_PAD, r.y - GLOW_PAD, r.w + 2 * GLOW_PAD, r.h + 2 * GLOW_PAD, GLOW_R);
      g.lineStyle(1, KITCHEN_COLORS.pulse, KITCHEN_FX.pulseAlpha * (0.4 + 0.6 * beat));
      g.strokeRoundedRect(r.x - GLOW_PAD, r.y - GLOW_PAD, r.w + 2 * GLOW_PAD, r.h + 2 * GLOW_PAD, GLOW_R);
    }
    if (!s.hand) return;
    const bob = calm ? 0 : Math.round(Math.abs(Math.sin((timeMs / HAND.bobMs) * Math.PI)) * HAND.bobPx);
    const h = this.hand.setFlipY(s.dir === 'down').setAngle(s.dir === 'left' ? -90 : 0);
    if (s.dir === 'side') {
      h.setOrigin(POINTER_TIP.x / HAND.w, POINTER_TIP.y / HAND.h).setAngle(-90).setPosition(Math.round(r.x + r.w / 2 + bob), Math.round(r.y + Math.max(SIDE.dy, r.h / 2 - SIDE.fromMid)));
    } else if (s.dir === 'down') h.setOrigin(POINTER_TIP.x / HAND.w, 1).setPosition(Math.round(r.x), Math.round(r.y) - bob);
    else if (s.dir === 'left') h.setOrigin(POINTER_TIP.x / HAND.w, POINTER_TIP.y / HAND.h).setPosition(Math.round(r.x) + bob, Math.round(r.y));
    else h.setOrigin(POINTER_TIP.x / HAND.w, POINTER_TIP.y / HAND.h).setPosition(Math.round(r.x + r.w / 2), Math.round(r.y + r.h / 2) + bob);
  }

  hide(): void {
    this.glow.clear();
    this.hand.setVisible(false);
  }
}

/**
 * Where the tutorial hand points at the DOM action button from the canvas (CSS px of the game host):
 * right of the landscape ticket column, or just over the bottom zone (its hint line covers the button's top).
 */
export function actionTip(host: HTMLElement, vp: ViewportInfo): { at: Rect; dir: 'down' | 'left' } | null {
  const btn = document.querySelector<HTMLElement>('.cc-kact');
  if (!btn) return null;
  const b = btn.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  if (b.width <= 0) return null;
  const left = vp.insetLeft ?? 0;
  if (left > 0 && b.right - h.left <= left + 2) return { at: { x: left + 2, y: b.top - h.top + b.height / 2, w: 0, h: 0 }, dir: 'left' };
  return { at: { x: b.left - h.left + b.width / 2, y: vp.cssH - vp.insetBottom - 2, w: 0, h: 0 }, dir: 'down' };
}
