/**
 * Falling pickups: lightning capsules and the foods made by the lightning. Caught foods
 * line up in the tray along the bottom of the field (the level's collectibles).
 */
import Phaser from 'phaser';
import { FOOD_COUNT, SPACE, SPACE_ANIMS } from '../../art/space/keys';
import { DROP, FIELD, TRAY } from './config';
import { Z } from './fx';
import type { Rect } from './shields';

interface Food {
  sprite: Phaser.GameObjects.Image;
  baseX: number;
  t: number;
}

export class Pickups {
  capsules: Phaser.GameObjects.Sprite[] = [];
  foods: Food[] = [];
  caught = 0;
  private tray: Phaser.GameObjects.Image[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  dropCapsule(x: number, y: number): void {
    const s = this.scene.add.sprite(Math.round(x), Math.round(y), SPACE.capsule, 0).setDepth(Z.pickups);
    s.play(SPACE_ANIMS.capsule);
    this.capsules.push(s);
  }

  /** A transformed enemy: random food that pops in (scale bounce) and then drifts down. */
  spawnFood(x: number, y: number): void {
    const frame = Phaser.Math.Between(0, FOOD_COUNT - 1);
    const s = this.scene.add.image(Math.round(x), Math.round(y), SPACE.food, frame).setDepth(Z.pickups).setScale(0.4);
    this.scene.tweens.add({ targets: s, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.foods.push({ sprite: s, baseX: x, t: Math.random() * Math.PI * 2 });
  }

  update(dt: number, catcher: Rect | null, onCapsule: (x: number, y: number) => void, onFood: (x: number, y: number, frame: number) => void): void {
    const sec = dt / 1000;
    // cull once off the visible view, which can reach below the field (tall portrait screens)
    const cullY = Math.max(FIELD.h, this.scene.cameras.main.worldView.bottom) + 12;
    for (const c of this.capsules) c.y += DROP.capsuleFall * sec;
    for (const f of this.foods) {
      f.t += sec * 2.4;
      f.sprite.y += DROP.foodFall * sec;
      f.sprite.x = Math.round(f.baseX + Math.sin(f.t) * DROP.foodSway);
    }
    this.capsules = this.capsules.filter((c) => {
      if (catcher && inside(c.x, c.y, catcher)) {
        onCapsule(c.x, c.y);
        c.destroy();
        return false;
      }
      return c.y < cullY ? true : (c.destroy(), false);
    });
    this.foods = this.foods.filter((f) => {
      const s = f.sprite;
      if (catcher && inside(s.x, s.y, catcher)) {
        onFood(s.x, s.y, Number(s.frame.name));
        this.toTray(Number(s.frame.name), s.x, s.y);
        s.destroy();
        return false;
      }
      return s.y < cullY ? true : (s.destroy(), false);
    });
  }

  /** Ending: everything still falling spirals into the black hole. */
  suckInto(x: number, y: number): void {
    const all: Phaser.GameObjects.Components.Transform[] = [...this.capsules, ...this.foods.map((f) => f.sprite)];
    for (const o of all) {
      this.scene.tweens.add({ targets: o, x, y, scale: 0, angle: 540, duration: 900, ease: 'Cubic.easeIn' });
    }
    this.capsules = [];
    this.foods = [];
  }

  private toTray(frame: number, x: number, y: number): void {
    this.caught++;
    const i = this.tray.length;
    if (i >= TRAY.max) {
      // full tray: the oldest icon drops out and the row shifts left
      this.tray.shift()?.destroy();
      this.tray.forEach((t, k) => t.setX(TRAY.x0 + k * TRAY.step));
    }
    const slot = Math.min(i, TRAY.max - 1);
    const icon = this.scene.add.image(x, y, SPACE.food, frame).setDepth(Z.tray);
    this.scene.tweens.add({ targets: icon, x: TRAY.x0 + slot * TRAY.step, y: TRAY.y, duration: 380, ease: 'Quad.easeOut' });
    this.tray.push(icon);
  }
}

function inside(x: number, y: number, r: Rect): boolean {
  return x > r.x - 5 && x < r.x + r.w + 5 && y > r.y - 5 && y < r.y + r.h + 5;
}
