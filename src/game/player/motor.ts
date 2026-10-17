/**
 * Ciccio's movement as pure math (no Phaser): the scene feeds input + ground contact
 * once per fixed physics step and copies vx / vy back to the Arcade body.
 * Movement "modes" make flight (level 2) a drop-in alternative to platforming.
 */
import type { MoveParams } from '../../config/tuning';

export interface MotorInput {
  axis: -1 | 0 | 1;
  /** jump went down since the previous step (latched edge) */
  jumpPressed: boolean;
  jumpHeld: boolean;
  downHeld: boolean;
}

export const NO_INPUT: MotorInput = { axis: 0, jumpPressed: false, jumpHeld: false, downHeld: false };

export interface MotorState {
  vx: number;
  vy: number;
  onGround: boolean;
  /** seconds left to still jump after leaving the ground */
  coyote: number;
  /** seconds left on a buffered jump press */
  buffer: number;
  /** seconds since the current jump started (−1 = not in a cuttable jump) */
  jumpT: number;
  /** jump was released during the current jump: cut as soon as the min hold has passed */
  released: boolean;
  /** jump speed multiplier (Brie) */
  jumpMul: number;
}

export interface MotorEvents {
  jumped: boolean;
}

/** A way of moving. Platforming is the default; level 2 adds flight. */
export interface MovementMode {
  readonly id: string;
  /** highest world y the body top may reach (flight); undefined = no ceiling */
  readonly ceilingY?: number;
  step(s: MotorState, inp: MotorInput, onGround: boolean, dt: number): MotorEvents;
}

export function createMotor(): MotorState {
  return { vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0, jumpT: -1, released: false, jumpMul: 1 };
}

/** Moves `v` toward `target` by at most `rate * dt`. */
export function approach(v: number, target: number, rate: number, dt: number): number {
  const d = rate * dt;
  if (v < target) return Math.min(target, v + d);
  return Math.max(target, v - d);
}

function horizontal(s: MotorState, axis: -1 | 0 | 1, p: MoveParams, dt: number): void {
  const target = axis * p.runMax;
  if (s.onGround) {
    if (axis === 0) s.vx = approach(s.vx, 0, p.groundDecel, dt);
    else if (s.vx !== 0 && Math.sign(s.vx) !== axis) s.vx = approach(s.vx, target, p.turnAccel, dt);
    else s.vx = approach(s.vx, target, p.groundAccel, dt);
    return;
  }
  s.vx = approach(s.vx, target, axis === 0 ? p.airDrag : p.airAccel, dt);
}

function timers(s: MotorState, inp: MotorInput, p: MoveParams, dt: number): void {
  s.coyote = s.onGround ? p.coyoteMs / 1000 : Math.max(0, s.coyote - dt);
  s.buffer = inp.jumpPressed ? p.jumpBufferMs / 1000 : Math.max(0, s.buffer - dt);
}

function tryJump(s: MotorState, p: MoveParams): boolean {
  if (s.buffer <= 0 || (!s.onGround && s.coyote <= 0)) return false;
  s.vy = -p.jumpV0 * s.jumpMul;
  s.buffer = 0;
  s.coyote = 0;
  s.onGround = false;
  s.jumpT = 0;
  s.released = false;
  return true;
}

/** Variable height: an early release cuts vy, but never before the minimum hold. */
function jumpCut(s: MotorState, inp: MotorInput, p: MoveParams, dt: number): void {
  if (s.jumpT < 0) return;
  s.jumpT += dt;
  if (!inp.jumpHeld) s.released = true;
  if (s.vy >= 0) {
    s.jumpT = -1;
    return;
  }
  if (s.released && s.jumpT * 1000 >= p.jumpMinHoldMs) {
    s.vy = Math.max(s.vy, -p.jumpCutVy);
    s.jumpT = -1;
  }
}

/** One fixed step of platformer movement. Mutates `s`. */
export function stepPlatformer(s: MotorState, inp: MotorInput, onGround: boolean, dt: number, p: MoveParams): MotorEvents {
  s.onGround = onGround;
  if (onGround && s.vy > 0) s.vy = 0;
  timers(s, inp, p, dt);
  horizontal(s, inp.axis, p, dt);
  const jumped = tryJump(s, p);
  jumpCut(s, inp, p, dt);
  s.vy = Math.min(p.maxFall, s.vy + p.gravity * dt);
  return { jumped };
}

/** Stomp / spring bounce: a fixed upward kick that cannot be cut. */
export function bounce(s: MotorState, held: boolean, p: MoveParams): void {
  s.vy = -(held ? p.stompBounceHeld : p.stompBounce);
  s.onGround = false;
  s.coyote = 0;
  s.jumpT = -1;
}

export class PlatformerMode implements MovementMode {
  readonly id = 'platformer';
  constructor(private readonly params: MoveParams) {}

  step(s: MotorState, inp: MotorInput, onGround: boolean, dt: number): MotorEvents {
    return stepPlatformer(s, inp, onGround, dt, this.params);
  }
}
