/**
 * Flight juice (level 2): wing flap speed follows the climb, a light-blue jet trail puffs
 * from behind Ciccio's feet while climbing (drawn behind him, never over him) and the
 * 'flap' sfx repeats while he climbs.
 */
import type Phaser from 'phaser';
import { FLIGHT } from '../../config/tuning';
import type { GameAudio } from '../../contracts';
import { DEPTH } from '../depths';
import { FX_ART } from '../fxArt';
import type { Player } from './Player';
import type { PlayerView } from './PlayerView';

/** Climbing faster than this (px/s upward) counts as flapping hard. */
const CLIMB_VY = -20;
/** The fly pose trails the shoes this far behind the body centre / above the feet line. */
const SHOES_BACK = 19;
const SHOES_UP = 9;

export class FlightFx {
  private readonly trail: Phaser.GameObjects.Particles.ParticleEmitter;
  private trailMs = 0;
  private flapMs = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly audio: GameAudio,
  ) {
    this.trail = scene.add.particles(0, 0, FX_ART.trail, {
      frame: [0, 0, 0, 1, 2],
      lifespan: { min: 220, max: 380 },
      speedX: { min: 25, max: 60 },
      speedY: { min: -8, max: 20 },
      alpha: { start: 1, end: 0 },
      emitting: false,
    }).setDepth(DEPTH.trail);
  }

  update(p: Player, view: PlayerView, wings: boolean, dtMs: number): void {
    if (!wings || p.mode.id !== 'flight') return;
    const climbing = !p.onGround && p.vy < CLIMB_VY && !p.frozen;
    const wingSprite = view.attachments.get('wings');
    if (wingSprite) wingSprite.anims.timeScale = p.onGround ? 0.45 : climbing ? 2.3 : p.vy > 100 ? 0.3 : 0.8;
    if (!climbing) {
      this.flapMs = Math.min(this.flapMs, 90); // the next climb flaps almost at once
      return;
    }
    this.flapMs -= dtMs;
    if (this.flapMs <= 0) {
      this.flapMs = FLIGHT.flapMs;
      this.audio.sfx('flap');
    }
    this.trailMs -= dtMs;
    if (this.trailMs > 0) return;
    this.trailMs = FLIGHT.trailMs;
    const back = -p.facing;
    // two puffs, one per shoe, so the jet reads as a stream rather than dots
    for (const dy of [-2, 2]) {
      const pt = this.trail.emitParticleAt(Math.round(p.x + back * SHOES_BACK), Math.round(p.bottom - SHOES_UP + dy), 1);
      if (pt) pt.velocityX *= back;
    }
  }
}
