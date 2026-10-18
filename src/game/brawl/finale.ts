/**
 * Level 5 goal cinematic. On reaching the flag the controls are gone: the hero walks to the
 * pole, grabs the flag, rips it off (the pole swaps to the torn sprite, the cloth is in his
 * fist, 'rip' + shake + starburst), throws it (the cloth tumbles in an arc off the right of
 * the screen while the camera drifts after it), roars and poses. Then the usual victory flow
 * (flow.ts). Everything runs on scene timers and tweens, so pause, resize and shutdown are
 * safe, and Flow.win() only ever starts it once. The timeline itself is a pure schedule.
 */
import type Phaser from 'phaser';
import { HULK as HULK_ART, HULK_ANIMS } from '../../art/keys';
import { FINALE } from '../../config/tuning';
import { shakeWorld } from '../camera';
import { DEPTH } from '../depths';
import type { HeroPose } from '../player/attachments';
import type { LevelRun } from '../run';

export type FinalePhase = 'walk' | 'reach' | 'grip' | 'rip' | 'wind' | 'release' | 'follow' | 'roar' | 'pose' | 'done';

export interface FinaleBeat {
  /** ms from the start of the cinematic */
  at: number;
  phase: FinalePhase;
}

/** Start time of every phase for a walk of `walkMs`; 'done' marks the end. */
export function finaleSchedule(walkMs: number): FinaleBeat[] {
  const F = FINALE;
  const lengths: ReadonlyArray<readonly [FinalePhase, number]> = [
    ['walk', walkMs], ['reach', F.reachMs], ['grip', F.gripMs], ['rip', F.ripMs], ['wind', F.windMs],
    ['release', F.releaseMs], ['follow', F.followMs], ['roar', F.roarMs], ['pose', F.poseMs],
  ];
  const out: FinaleBeat[] = [];
  let at = 0;
  for (const [phase, ms] of lengths) {
    out.push({ at, phase });
    at += ms;
  }
  out.push({ at, phase: 'done' });
  return out;
}

/** The flag cloth's centre relative to the pole base (px right, px up), where it hangs before the tear. */
const CLOTH_AT = { dx: 10, dy: 51 };
/** The cloth snaps from the pole into the fist in this many ms. */
const SNAP_MS = 80;
/**
 * The starburst pops right of the pole top, clear of the hero's head: he stands left of the
 * pole with his face at the same height, and a burst centred on the pole hid half of it.
 */
const BURST_AT = { dx: 24, dy: 54, scale: 1.1 };

export class RipFinale {
  private cloth: Phaser.GameObjects.Sprite | null = null;

  constructor(private readonly r: LevelRun) {}

  /** Starts the cinematic; `onDone` runs when the hero has finished posing. */
  play(onDone: () => void): void {
    const { r } = this;
    const s = r.view.sprite;
    r.player.facing = 1;
    s.anims.stop();
    s.setScale(1).setVisible(true);
    // stand where the gripping fist lands on the pole
    s.setFrame(HULK_ART.grab[1]);
    const standX = s.x + (r.goal.poleX - this.hand().x - 2);
    const walkMs = Math.max(120, (Math.abs(standX - s.x) / FINALE.walkSpeed) * 1000);
    s.setFlipX(standX < s.x);
    if (r.scene.anims.exists(HULK_ANIMS.run)) s.play(HULK_ANIMS.run);
    else s.setFrame(HULK_ART.run[0]);
    r.scene.tweens.add({ targets: s, x: standX, y: r.goal.surfaceY, duration: walkMs });
    for (const beat of finaleSchedule(walkMs)) {
      if (beat.phase === 'walk') continue;
      r.scene.time.delayedCall(beat.at, () => (beat.phase === 'done' ? onDone() : this.enter(beat.phase)));
    }
  }

  /** World position of the fist in the sprite's current frame (hero facing right). */
  private hand(): { x: number; y: number } {
    const { r } = this;
    const pose: HeroPose = { sprite: r.view.sprite, facing: 1, scale: 1, sqX: 1, sqY: 1, shown: true };
    return r.view.attachments.anchorWorld(pose, 'hand');
  }

  private show(frame: number): void {
    const s = this.r.view.sprite;
    s.anims.stop();
    s.setFlipX(false).setFrame(frame);
  }

  private enter(phase: FinalePhase): void {
    const { r } = this;
    switch (phase) {
      case 'reach':
        this.show(HULK_ART.grab[0]);
        break;
      case 'grip':
        this.show(HULK_ART.grab[1]);
        r.scene.tweens.add({ targets: r.goal.pole, x: r.goal.pole.x + 1, duration: 40, yoyo: true, repeat: 3 });
        break;
      case 'rip':
        this.show(HULK_ART.grab[2]);
        this.rip();
        break;
      case 'wind':
        this.show(HULK_ART.throw[0]);
        this.holdCloth(DEPTH.behindHero); // the throwing arm is wound up behind his back
        break;
      case 'release':
        this.show(HULK_ART.throw[1]);
        this.holdCloth(DEPTH.attach + 1);
        this.throwCloth();
        break;
      case 'follow':
        this.show(HULK_ART.throw[2]);
        break;
      case 'roar':
        r.view.sprite.play(HULK_ANIMS.roar);
        r.svc.audio.sfx('roar');
        shakeWorld(r.scene.cameras.main, 320, 5);
        r.juice.dust(r.view.sprite.x - 14, r.goal.surfaceY, 1);
        r.juice.dust(r.view.sprite.x + 14, r.goal.surfaceY, 1);
        break;
      case 'pose':
        r.view.sprite.play(HULK_ANIMS.victory);
        break;
      default:
        break;
    }
  }

  /** The flag is torn off: torn pole, the cloth tears from where it hung into the fist, bang. */
  private rip(): void {
    const { r } = this;
    const ripped = r.theme.ripFinale;
    if (!ripped) return;
    const { goal } = r;
    goal.swapPole(ripped.pole);
    const hand = this.hand();
    const x = Math.round(goal.poleX + CLOTH_AT.dx);
    const y = Math.round(goal.surfaceY - 1 - CLOTH_AT.dy);
    const cloth = r.scene.add.sprite(x, y, ripped.cloth, 0).setDepth(DEPTH.attach + 1);
    if (r.scene.anims.exists(ripped.clothAnim)) cloth.play(ripped.clothAnim);
    r.scene.tweens.add({ targets: cloth, x: Math.round(hand.x), y: Math.round(hand.y), duration: SNAP_MS, ease: 'Quad.easeIn' });
    this.cloth = cloth;
    r.svc.audio.sfx('rip');
    shakeWorld(r.scene.cameras.main, 240, 4);
    const bx = goal.poleX + BURST_AT.dx;
    const by = goal.surfaceY - BURST_AT.dy;
    r.juice.burst(bx, by, BURST_AT.scale);
    r.juice.rubble(bx, by, 4, 0.8);
  }

  private holdCloth(depth: number): void {
    if (!this.cloth) return;
    const hand = this.hand();
    this.cloth.setPosition(Math.round(hand.x), Math.round(hand.y)).setDepth(depth);
  }

  /** Releases the cloth: a tumbling arc off the right of the screen, the camera drifting after it. */
  private throwCloth(): void {
    const { r, cloth } = this;
    if (!cloth) return;
    const x0 = cloth.x;
    const y0 = cloth.y;
    const view = r.rig.view();
    const share = FINALE.cameraShare;
    // far enough that it is still off screen once the camera has drifted toward it
    const reach = (view.w / 2 + 48 + 16) / (1 - share);
    const endX = Math.max(x0 + 160, r.player.x + reach);
    const t = { v: 0 };
    const base = r.heroTarget();
    r.focus = () => ({ ...base, x: base.x + (cloth.x - base.x) * share });
    r.scene.tweens.add({
      targets: t,
      v: 1,
      duration: FINALE.flightMs,
      onUpdate: () => {
        cloth.setPosition(x0 + (endX - x0) * t.v, y0 - 90 * 4 * t.v * (1 - t.v) + 30 * t.v);
        cloth.setAngle(t.v * 720);
      },
      onComplete: () => {
        cloth.destroy();
        this.cloth = null;
        r.focus = null;
      },
    });
  }
}
