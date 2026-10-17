/**
 * Alette Crunchy flight (level 2) as a MovementMode, pure math like the platformer motor.
 * On the ground Ciccio walks exactly as usual; jump takes off. In the air there is no
 * gravity: vy approaches a target (hold jump = rise, release = glide down, down = dive).
 */
import { FLIGHT, type FlightParams, MOVE, type MoveParams } from '../../config/tuning';
import { approach, type MotorEvents, type MotorInput, type MotorState, type MovementMode, stepPlatformer } from './motor';

/** Vertical speed the flyer is steering toward for this input. */
export function flightTargetVy(inp: MotorInput, f: FlightParams = FLIGHT): number {
  if (inp.downHeld) return f.diveVy;
  return inp.jumpHeld ? f.riseVy : f.glideVy;
}

/** One fixed step of flight. Mutates `s`. */
export function stepFlight(s: MotorState, inp: MotorInput, onGround: boolean, dt: number, f: FlightParams, p: MoveParams): MotorEvents {
  s.buffer = inp.jumpPressed ? p.jumpBufferMs / 1000 : Math.max(0, s.buffer - dt);
  if (onGround && s.buffer <= 0) {
    // walking: the platformer rules (gravity keeps the feet pressed on the ground)
    stepPlatformer(s, { ...inp, jumpPressed: false }, true, dt, p);
    return { jumped: false };
  }
  const takeoff = onGround;
  s.onGround = false;
  s.coyote = 0;
  s.jumpT = -1;
  if (takeoff) {
    s.buffer = 0;
    s.vy = f.takeoffVy * s.jumpMul;
  }
  s.vx = approach(s.vx, inp.axis * f.speedX, inp.axis === 0 ? p.airDrag : f.accelX, dt);
  s.vy = approach(s.vy, flightTargetVy(inp, f), f.approach, dt);
  return { jumped: takeoff };
}

export class FlightMode implements MovementMode {
  readonly id = 'flight';
  readonly ceilingY: number;

  constructor(
    private readonly f: FlightParams = FLIGHT,
    private readonly p: MoveParams = MOVE,
  ) {
    this.ceilingY = f.ceilingY;
  }

  step(s: MotorState, inp: MotorInput, onGround: boolean, dt: number): MotorEvents {
    return stepFlight(s, inp, onGround, dt, this.f, this.p);
  }
}
