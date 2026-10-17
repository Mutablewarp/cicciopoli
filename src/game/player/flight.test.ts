import { describe, expect, it } from 'vitest';
import { FLIGHT } from '../../config/tuning';
import { FlightMode } from './flight';
import { createMotor, type MotorInput, NO_INPUT } from './motor';

const DT = 1 / 60;
const run = (steps: number, inp: MotorInput, onGround = false, mode = new FlightMode(), s = createMotor()) => {
  let jumped = false;
  for (let i = 0; i < steps; i++) jumped = mode.step(s, i === 0 ? inp : { ...inp, jumpPressed: false }, onGround && i === 0, DT).jumped || jumped;
  return { s, jumped };
};

describe('flight mode', () => {
  it('takes off from the ground with a jump press', () => {
    const { s, jumped } = run(1, { ...NO_INPUT, jumpPressed: true, jumpHeld: true }, true);
    expect(jumped).toBe(true);
    expect(s.vy).toBeLessThan(FLIGHT.riseVy);
    expect(s.onGround).toBe(false);
  });

  it('walks like the platformer while grounded without jumping', () => {
    const s = createMotor();
    const mode = new FlightMode();
    for (let i = 0; i < 30; i++) mode.step(s, { ...NO_INPUT, axis: 1 }, true, DT);
    expect(s.vx).toBeGreaterThan(100);
    expect(s.vy).toBeGreaterThan(0); // pressed onto the ground, so contact holds
    expect(s.vy).toBeLessThan(30);
  });

  it('holding jump settles on the climb speed, releasing glides, down dives', () => {
    const held = run(120, { ...NO_INPUT, jumpHeld: true });
    expect(held.s.vy).toBeCloseTo(FLIGHT.riseVy, 5);
    const glide = run(120, NO_INPUT, false, new FlightMode(), held.s);
    expect(glide.s.vy).toBeCloseTo(FLIGHT.glideVy, 5);
    const dive = run(120, { ...NO_INPUT, downHeld: true }, false, new FlightMode(), glide.s);
    expect(dive.s.vy).toBeCloseTo(FLIGHT.diveVy, 5);
  });

  it('vertical speed changes smoothly (bounded by the approach rate)', () => {
    const s = createMotor();
    s.vy = FLIGHT.riseVy;
    new FlightMode().step(s, { ...NO_INPUT, downHeld: true }, false, DT);
    expect(s.vy - FLIGHT.riseVy).toBeCloseTo(FLIGHT.approach * DT, 5);
  });

  it('flies horizontally at the flight speed', () => {
    const { s } = run(90, { ...NO_INPUT, axis: -1 });
    expect(s.vx).toBeCloseTo(-FLIGHT.speedX, 5);
  });

  it('declares the flight ceiling', () => {
    expect(new FlightMode().ceilingY).toBe(FLIGHT.ceilingY);
  });
});
