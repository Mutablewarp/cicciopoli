import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { TRAY } from './config';
import { Tray } from './tray';

interface Icon {
  x: number;
  y: number;
  destroyed: boolean;
  setDepth(): Icon;
  destroy(): void;
}

interface Tween {
  target: Icon;
  from: { x: number; y: number };
  to: { x: number; y: number };
  ms: number;
  t: number;
}

/** Just enough of a scene: images and linear tweens that can be advanced by hand. */
function fakeScene() {
  const icons: Icon[] = [];
  let tweens: Tween[] = [];
  const scene = {
    add: {
      image: (x: number, y: number): Icon => {
        const icon: Icon = { x, y, destroyed: false, setDepth: () => icon, destroy: () => void (icon.destroyed = true) };
        icons.push(icon);
        return icon;
      },
    },
    tweens: {
      add: (c: { targets: Icon; x: number; y: number; duration: number }): void => {
        tweens.push({ target: c.targets, from: { x: c.targets.x, y: c.targets.y }, to: { x: c.x, y: c.y }, ms: c.duration, t: 0 });
      },
      killTweensOf: (o: Icon): void => {
        tweens = tweens.filter((w) => w.target !== o);
      },
    },
  };
  const advance = (ms: number): void => {
    for (const w of tweens) {
      w.t = Math.min(w.ms, w.t + ms);
      const k = w.t / w.ms;
      w.target.x = w.from.x + (w.to.x - w.from.x) * k;
      w.target.y = w.from.y + (w.to.y - w.from.y) * k;
    }
    tweens = tweens.filter((w) => w.t < w.ms);
  };
  const row = (): number[] => icons.filter((i) => !i.destroyed).map((i) => i.x).sort((a, b) => a - b);
  return { scene: scene as unknown as Phaser.Scene, advance, row };
}

const slots = (n: number): number[] => Array.from({ length: n }, (_, k) => TRAY.x0 + k * TRAY.step);

describe('food tray', () => {
  it('lines caught foods up one per slot', () => {
    const { scene, advance, row } = fakeScene();
    const tray = new Tray(scene);
    for (let i = 0; i < 4; i++) tray.add(i, 100, 120);
    advance(500);
    expect(row()).toEqual(slots(4));
  });

  it('keeps one icon per slot when a full tray takes several catches inside one flight', () => {
    const { scene, advance, row } = fakeScene();
    const tray = new Tray(scene);
    for (let i = 0; i < TRAY.max; i++) tray.add(i, 100, 120);
    advance(500);
    // a FULMINE chain: four foods at once, then two more mid-flight (the case that stacked icons)
    for (let i = 0; i < 4; i++) tray.add(i, 90 + i * 8, 150);
    advance(100);
    tray.add(1, 100, 180);
    advance(40);
    tray.add(2, 110, 200);
    advance(600);
    expect(row()).toEqual(slots(TRAY.max));
  });

  it('drops the oldest icon when full', () => {
    const { scene, advance, row } = fakeScene();
    const tray = new Tray(scene);
    for (let i = 0; i < TRAY.max + 3; i++) tray.add(i, 100, 120);
    advance(500);
    expect(row()).toHaveLength(TRAY.max);
  });
});
