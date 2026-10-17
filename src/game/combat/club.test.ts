import { describe, expect, it } from 'vitest';
import { CLUB } from '../../config/tuning';
import { clampTipAngle } from '../player/attachments';
import { clubHitbox, overlaps } from './club';

describe('club hitbox', () => {
  const src = { left: 100, right: 116, centerY: 190, facing: 1 as const };

  it('reaches 30 px in front of the body and ±22 px vertically', () => {
    const box = clubHitbox(src);
    expect(box).toEqual({ left: 116, right: 116 + CLUB.reach, top: 190 - CLUB.vRange, bottom: 190 + CLUB.vRange });
    const left = clubHitbox({ ...src, facing: -1 });
    expect(left.right).toBe(100);
    expect(left.left).toBe(100 - CLUB.reach);
  });

  it('hits what is in front, not behind', () => {
    const box = clubHitbox(src);
    expect(overlaps(box, { left: 140, right: 154, top: 180, bottom: 208 })).toBe(true);
    expect(overlaps(box, { left: 80, right: 96, top: 180, bottom: 208 })).toBe(false);
    expect(overlaps(box, { left: 120, right: 130, top: 100, bottom: 160 })).toBe(false);
  });
});

describe('held club angle clamp', () => {
  const tip = [15.5, -16.5] as const;

  it('keeps an upright club unchanged', () => {
    expect(clampTipAngle(0.3, 180, tip, 1, 207)).toBe(0.3);
  });

  it('lifts a follow-through that would push the head into the ground', () => {
    const a = clampTipAngle(1.9, 190, tip, 1, 207);
    expect(a).toBeLessThan(1.9);
    expect(190 + tip[0] * Math.sin(a) + tip[1] * Math.cos(a)).toBeLessThanOrEqual(207);
  });

  it('turns a raised club forward so its head never rises above the eyes', () => {
    const a = clampTipAngle(-0.4, 180, tip, 1, 207, 172);
    expect(a).toBeGreaterThan(-0.4);
    expect(180 + tip[0] * Math.sin(a) + tip[1] * Math.cos(a)).toBeGreaterThanOrEqual(172);
  });
});
