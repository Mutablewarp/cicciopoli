import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { Flash, FLASH } from './flash';

/** The bits of a Phaser sprite the flash touches: tint calls and a preFX list it can enable / disable. */
function fakeSprite(webgl = true) {
  const f = {
    active: true,
    tint: 0 as number,
    tintFill: false,
    bright: [] as number[],
    preFX: webgl
      ? {
          enabled: false,
          list: [] as unknown[],
          addColorMatrix() {
            this.enabled = true;
            const m = { brightness: (v: number) => (f.bright.push(v), m) };
            this.list.push(m);
            return m;
          },
          enable() {
            this.enabled = true;
          },
          disable() {
            this.enabled = false;
          },
        }
      : null,
    setTint(c: number) {
      f.tint = c;
      return f;
    },
    setTintFill() {
      f.tintFill = true;
      return f;
    },
    clearTint() {
      f.tint = 0;
      return f;
    },
  };
  return f;
}
type Fake = ReturnType<typeof fakeSprite>;
const asSprites = (l: Fake[]) => l as unknown as Phaser.GameObjects.Sprite[];

describe('BOSS-C hit flash', () => {
  it('brightens only the hittable parts, never a flat silhouette, then turns the FX off', () => {
    const body = fakeSprite();
    const bottle = fakeSprite();
    const flash = new Flash(() => asSprites([body, bottle]), () => asSprites([body]));
    flash.hit();
    flash.update(16);
    expect(body.preFX?.enabled).toBe(true);
    expect(body.bright).toEqual([FLASH.hitBright]);
    expect(bottle.preFX?.enabled).toBe(false);
    expect(body.tintFill || bottle.tintFill).toBe(false);
    flash.update(FLASH.hitMs);
    expect(body.preFX?.enabled).toBe(false);
  });

  it('rate-limits steady fire and reuses one colour matrix', () => {
    const body = fakeSprite();
    const flash = new Flash(() => asSprites([body]));
    flash.hit();
    flash.update(FLASH.hitMs + 1);
    flash.hit(); // still cooling down: no new pulse
    flash.update(1);
    expect(body.preFX?.enabled).toBe(false);
    flash.update(FLASH.coolMs);
    flash.hit();
    flash.update(1);
    expect(body.preFX?.enabled).toBe(true);
    expect(body.preFX?.list.length).toBe(1);
  });

  it('blinks the wind-up tint and survives the canvas renderer (no preFX)', () => {
    const arm = fakeSprite(false);
    const flash = new Flash(() => asSprites([arm]));
    flash.tele(FLASH.blinkMs * 3, asSprites([arm]));
    flash.hit();
    flash.update(1);
    expect(arm.tint).toBe(FLASH.teleTint);
    flash.update(FLASH.blinkMs);
    expect(arm.tint).toBe(0);
  });
});
