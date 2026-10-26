import { describe, expect, it } from 'vitest';
import { FX } from './config';
import { feverSub } from './logic/strings';
import type { RushEvent } from './logic/types';
import { Reactor, type ReactCtx } from './react';

/** A Reactor on stubs: the banners and labels it shows, and a clock that runs its scene timers. */
function rig(): { r: Reactor; banners: [string, string | undefined, number][]; labels: string[]; at: (t: number) => void } {
  const banners: [string, string | undefined, number][] = [];
  const labels: string[] = [];
  const timers: { at: number; fn: () => void }[] = [];
  let now = 0;
  const none = (): void => undefined;
  const ctx = {
    ui: { banner: (t: string, o?: { sub?: string }) => banners.push([t, o?.sub, now]) },
    audio: { sfx: none, intensity: none },
    truck: { pos: { x: 60, y: 0, lift: 0, top: -32 } },
    fx: { burst: none, once: none },
    overlay: { label: (_dy: number, s: string) => labels.push(s), flash: none },
    settings: () => ({}),
    later: (ms: number, fn: () => void) => timers.push({ at: now + ms, fn }),
    pulse: none,
    side: () => false,
  } as unknown as ReactCtx;
  const r = new Reactor(ctx);
  const at = (t: number): void => {
    now = t;
    for (const k of timers.filter((x) => x.at <= t)) {
      timers.splice(timers.indexOf(k), 1);
      k.fn();
    }
  };
  return { r, banners, labels, at };
}

const ZONE: RushEvent = { type: 'zoneChange', zone: 'stadio', index: 1, title: 'ZONA STADIO', sub: 'Viale del Fante' };
const FEVER: RushEvent = { type: 'feverStart', ms: 6000, title: 'CICCIO FEVER!', sub: feverSub(6000) };

describe('CICCIO FEVER banner', () => {
  it('waits behind a zone banner, then shows with the seconds left', () => {
    const { r, banners, labels, at } = rig();
    r.handle([ZONE], 0);
    at(1000);
    r.handle([FEVER], 1000);
    expect(banners.map((b) => b[0])).toEqual(['ZONA STADIO']);
    at(2200);
    expect(banners[1]).toEqual(['CICCIO FEVER!', feverSub(6000 - 1200), 2200]);
    expect(labels).toEqual([]);
  });

  it('shows at once on a free screen; behind a long queue a label by the truck tells it', () => {
    const free = rig();
    free.r.handle([FEVER], 0);
    expect(free.banners).toEqual([['CICCIO FEVER!', feverSub(6000), 0]]);
    const busy = rig();
    busy.r.handle([ZONE], 0);
    busy.r.handle([{ ...ZONE, index: 2 }], 0);
    busy.r.handle([FEVER], 100);
    expect(2 * 2200 - 100).toBeGreaterThan(FX.feverBannerWaitMs);
    expect(busy.labels).toEqual(['CICCIO FEVER!']);
    busy.at(10_000);
    expect(busy.banners.filter((b) => b[0] === 'CICCIO FEVER!')).toEqual([]);
  });

  it('a hit before its turn drops the queued banner', () => {
    const { r, banners, at } = rig();
    r.handle([ZONE], 0);
    r.handle([FEVER], 500);
    r.handle([{ type: 'feverEnd', reason: 'hit' }], 900);
    at(5000);
    expect(banners.map((b) => b[0])).toEqual(['ZONA STADIO']);
  });
});
