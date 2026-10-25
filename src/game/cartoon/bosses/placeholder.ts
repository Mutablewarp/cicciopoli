/**
 * Stand-in boss (OWNER: integrator) so the core engine runs before the boss lanes land, and when a boss
 * module fails: a big ink-outlined disc that bobs and lobs balls at the player (every 4th one pink).
 */
import type Phaser from 'phaser';
import type { CartoonBossId, MusicName } from '../../../contracts';
import { ARENA, type BossDef, type BossRuntime, type BossWorld, type Box } from '../api';
import { anim, image, inked, sheet, unloadPrefix, worldSprite } from '../draw/canvas';

const R = 46;

export function placeholderBoss(id: CartoonBossId, name: string, intro: string, tagline: string, color: string, music: MusicName): BossDef {
  const pre = `ct-${id}-`;
  const body = `${pre}body`;
  const ball = `${pre}ball`;
  const bg = `${pre}bg`;
  return {
    id,
    name,
    intro,
    tagline,
    music,
    hp: 600,
    phases: [0.5],
    load(scene: Phaser.Scene, k: number): void {
      sheet(scene, body, R * 2 + 8, R * 2 + 8, 2, k, (ctx, f) => {
        ctx.beginPath();
        ctx.arc(R + 4, R + 4, R, 0, Math.PI * 2);
        inked(ctx, f ? '#fff4d8' : color, 3);
        ctx.fillStyle = '#1c1511';
        for (const ex of [R - 10, R + 18]) {
          ctx.beginPath();
          ctx.ellipse(ex, R - 4, 6, 10, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      anim(scene, `${pre}flash`, body, [1, 0], 20, 0);
      sheet(scene, ball, 16, 16, 2, k, (ctx, f) => {
        ctx.beginPath();
        ctx.arc(8, 8, 6, 0, Math.PI * 2);
        inked(ctx, f ? '#ff7fb0' : '#e8a040', 1.6);
      });
      image(scene, bg, ARENA.w, ARENA.h, k, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, ARENA.h);
        g.addColorStop(0, '#cfe3e8');
        g.addColorStop(1, '#e8d3a4');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ARENA.w, ARENA.h);
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(0, ARENA.floorY, ARENA.w, ARENA.h - ARENA.floorY);
      });
    },
    buildArena(scene: Phaser.Scene, k: number): Phaser.GameObjects.GameObject[] {
      return [worldSprite(scene, ARENA.w / 2, ARENA.h / 2, bg, k).setDepth(-10)];
    },
    create(world: BossWorld): BossRuntime {
      const x = ARENA.w - 110;
      const sprite = worldSprite(world.scene, x, 180, body, world.k, 0);
      let t = 0;
      let next = 1200;
      let n = 0;
      let ko = false;
      let koMs = 0;
      const box = (): Box => ({ x: sprite.x - R, y: sprite.y - R, w: R * 2, h: R * 2 });
      return {
        hurtBoxes: () => (ko ? [] : [box()]),
        bodyBoxes: () => (ko ? [] : [box()]),
        update(dt: number): void {
          t += dt;
          if (ko) {
            koMs += dt;
            sprite.setAngle(sprite.angle + dt * 0.4).setAlpha(Math.max(0, 1 - koMs / 1500));
            return;
          }
          sprite.y = 180 + Math.sin(t / 700) * 60;
          if (t < next) return;
          next = t + 1400;
          const dx = world.player.x - sprite.x;
          world.spawnHazard({ x: sprite.x - R, y: sprite.y, vx: Math.max(-260, dx * 0.9), vy: -260, ay: 520, r: 6, texture: ball, frame: n % 4 === 3 ? 1 : 0, pink: n % 4 === 3 });
          n++;
        },
        onPhase(): void {
          world.shake(4, 300);
        },
        onHit(): void {
          sprite.play(`${pre}flash`);
        },
        onKnockout(): void {
          ko = true;
        },
        get done(): boolean {
          return ko && koMs >= 1500;
        },
        destroy(): void {
          sprite.destroy();
        },
      };
    },
    unload(scene: Phaser.Scene): void {
      unloadPrefix(scene, pre);
    },
  };
}
