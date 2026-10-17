import { describe, expect, it } from 'vitest';
import { MOVE } from '../../config/tuning';
import { bounce, createMotor, type MotorInput, NO_INPUT, stepPlatformer } from './motor';

const DT = 1 / 60;

function input(over: Partial<MotorInput>): MotorInput {
  return { ...NO_INPUT, ...over };
}

/** Simulates a jump from flat ground; returns peak height (px) and airtime (s). */
function simulateJump(holdSteps: number, axis: -1 | 0 | 1 = 0): { height: number; air: number; dx: number } {
  const s = createMotor();
  s.vx = axis * MOVE.runMax;
  let y = 0;
  let x = 0;
  let peak = 0;
  let onGround = true;
  let t = 0;
  for (let i = 0; i < 400; i++) {
    const held = i < holdSteps;
    stepPlatformer(s, input({ axis, jumpPressed: i === 0, jumpHeld: held }), onGround, DT, MOVE);
    x += s.vx * DT;
    y += s.vy * DT;
    t += DT;
    peak = Math.min(peak, y);
    onGround = y >= 0;
    if (onGround) {
      y = 0;
      if (i > 2) break;
    }
  }
  return { height: -peak, air: t, dx: x };
}

describe('platformer motor', () => {
  it('full jump reaches about 5 tiles and travels about 7 tiles at full speed', () => {
    const j = simulateJump(1000, 1);
    expect(j.height).toBeGreaterThan(72);
    expect(j.height).toBeLessThan(82);
    expect(j.dx / 16).toBeGreaterThan(6.5);
    expect(j.dx / 16).toBeLessThan(7.6);
  });

  it('a short tap still hops about 2.2 tiles (cut waits for the minimum hold)', () => {
    const tap = simulateJump(1);
    expect(tap.height / 16).toBeGreaterThan(1.9);
    expect(tap.height / 16).toBeLessThan(2.5);
    expect(tap.height).toBeLessThan(simulateJump(1000).height - 30);
  });

  it('accelerates to run speed and stops quickly without sliding', () => {
    const s = createMotor();
    for (let i = 0; i < 12; i++) stepPlatformer(s, input({ axis: 1 }), true, DT, MOVE);
    expect(s.vx).toBe(MOVE.runMax);
    let steps = 0;
    while (s.vx > 0 && steps < 60) {
      stepPlatformer(s, NO_INPUT, true, DT, MOVE);
      steps++;
    }
    expect(steps).toBeLessThanOrEqual(4);
  });

  it('turns faster than it accelerates from rest', () => {
    const s = createMotor();
    s.vx = MOVE.runMax;
    stepPlatformer(s, input({ axis: -1 }), true, DT, MOVE);
    expect(MOVE.runMax - s.vx).toBeCloseTo(MOVE.turnAccel * DT, 5);
  });

  it('allows a coyote jump shortly after leaving the ground, not later', () => {
    const s = createMotor();
    stepPlatformer(s, NO_INPUT, true, DT, MOVE);
    for (let i = 0; i < 5; i++) stepPlatformer(s, NO_INPUT, false, DT, MOVE);
    expect(stepPlatformer(s, input({ jumpPressed: true, jumpHeld: true }), false, DT, MOVE).jumped).toBe(true);

    const late = createMotor();
    stepPlatformer(late, NO_INPUT, true, DT, MOVE);
    for (let i = 0; i < 9; i++) stepPlatformer(late, NO_INPUT, false, DT, MOVE);
    expect(stepPlatformer(late, input({ jumpPressed: true, jumpHeld: true }), false, DT, MOVE).jumped).toBe(false);
  });

  it('buffers a jump pressed just before landing', () => {
    const s = createMotor();
    s.vy = 200;
    stepPlatformer(s, input({ jumpPressed: true, jumpHeld: true }), false, DT, MOVE);
    for (let i = 0; i < 5; i++) stepPlatformer(s, input({ jumpHeld: true }), false, DT, MOVE);
    expect(stepPlatformer(s, input({ jumpHeld: true }), true, DT, MOVE).jumped).toBe(true);
    expect(s.vy).toBeLessThan(-MOVE.jumpV0 + 30);
  });

  it('never exceeds the max fall speed', () => {
    const s = createMotor();
    for (let i = 0; i < 120; i++) stepPlatformer(s, NO_INPUT, false, DT, MOVE);
    expect(s.vy).toBe(MOVE.maxFall);
  });

  it('stomp bounce is higher with jump held and cannot be cut', () => {
    const s = createMotor();
    bounce(s, false, MOVE);
    expect(s.vy).toBe(-MOVE.stompBounce);
    bounce(s, true, MOVE);
    expect(s.vy).toBe(-MOVE.stompBounceHeld);
    stepPlatformer(s, NO_INPUT, false, DT, MOVE);
    expect(s.vy).toBeLessThan(-MOVE.stompBounceHeld + 20);
  });

  it('Brie jump multiplier raises the jump by about 12%', () => {
    const s = createMotor();
    s.jumpMul = 1.06;
    let y = 0;
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      stepPlatformer(s, input({ jumpPressed: i === 0, jumpHeld: true }), i === 0, DT, MOVE);
      y += s.vy * DT;
      peak = Math.min(peak, y);
    }
    const ratio = -peak / simulateJump(1000).height;
    expect(ratio).toBeGreaterThan(1.1);
    expect(ratio).toBeLessThan(1.15);
  });
});
