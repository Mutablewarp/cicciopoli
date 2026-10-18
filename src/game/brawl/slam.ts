/**
 * SPACCA as a scripted movement mode (pure math, no Phaser): a hop from the ground (or
 * straight on when already airborne), a beat of hang time with the fists overhead, then a
 * dive at fixed speed that ends the moment the feet meet something. No steering meanwhile.
 */
import { HULK } from '../../config/tuning';
import { approach, type MotorEvents, type MotorInput, type MotorState, type MovementMode } from '../player/motor';

export type SlamPhase = 'hop' | 'hang' | 'dive' | 'impact';

/** Sideways speed bled off during the hop, px/s². */
const HOP_DRAG = 1800;

export class SlamMode implements MovementMode {
  readonly id = 'slam';
  phase: SlamPhase;
  private hangMs = 0;
  private launched = false;

  constructor(fromGround: boolean) {
    this.phase = fromGround ? 'hop' : 'hang';
  }

  step(s: MotorState, _inp: MotorInput, onGround: boolean, dt: number): MotorEvents {
    const c = HULK.slam;
    s.onGround = onGround;
    s.jumpT = -1;
    s.buffer = 0;
    s.coyote = 0;
    switch (this.phase) {
      case 'hop':
        if (!this.launched) {
          this.launched = true;
          s.vy = -c.hopVy;
          s.onGround = false;
        } else s.vy = Math.min(HULK.move.maxFall, s.vy + HULK.move.gravity * dt);
        s.vx = approach(s.vx, 0, HOP_DRAG, dt);
        if (s.vy >= 0) this.phase = 'hang';
        break;
      case 'hang':
        s.vx = 0;
        s.vy = 0;
        this.hangMs += dt * 1000;
        if (this.hangMs >= c.hangMs) this.phase = 'dive';
        break;
      case 'dive':
        s.vx = 0;
        s.vy = onGround ? 0 : c.diveVy;
        if (onGround) this.phase = 'impact';
        break;
      case 'impact':
        s.vx = 0;
        s.vy = 0;
        break;
    }
    return { jumped: false };
  }
}
