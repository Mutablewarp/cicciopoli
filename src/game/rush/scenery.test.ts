import { describe, expect, it } from 'vitest';
import { ROAD_W, RUSH_ZONES } from '../../art/rush/keys';
import { STOREFRONT, STRIP_H } from '../../art/rush/street';
import { RUSH_ROAD } from '../../config/rush';
import { LANDMARK } from './config';
import { mulColor } from './ambience';
import { signPlateX, storefrontTop } from './landmarks';

describe('storefront landmarks', () => {
  it('sit on a strip period, wholly past rMin, at the first period that does', () => {
    for (const zone of RUSH_ZONES) {
      const { y, len } = STOREFRONT[zone];
      for (const rMin of [-300, -1, 0, 1, 150, 255, 256, 4517.5]) {
        const top = storefrontTop(zone, rMin);
        expect(Math.abs(top % STRIP_H), `${zone} ${rMin}`).toBe(0);
        expect(top - (y + len - 1), `${zone} ${rMin}`).toBeGreaterThanOrEqual(rMin);
        expect(top - STRIP_H - (y + len - 1), `${zone} ${rMin}`).toBeLessThan(rMin);
      }
    }
  });

  it('the Ciccio\'s La Lumia is in sight from the first frame, ahead of the truck', () => {
    const top = storefrontTop('centro', LANDMARK.laLumiaAheadPx);
    expect(top - STOREFRONT.centro.y).toBeLessThanOrEqual(RUSH_ROAD.viewAheadPx.min);
  });

  it('side view: the sign plate covers every row of the art\'s blade sign the screen shows, and stays whole', () => {
    const h = 28;
    const blade = [ROAD_W + 5, ROAD_W + LANDMARK.bladeFarPx]; // rows [from, to)
    for (let edge = ROAD_W + 10; edge <= ROAD_W + 120; edge++) {
      const x = signPlateX(h, edge);
      expect(x, `${edge}`).toBeGreaterThanOrEqual(ROAD_W - LANDMARK.plateInPx);
      const seen = Math.min(blade[1], edge);
      if (seen > blade[0]) {
        expect(x, `${edge}`).toBeLessThanOrEqual(blade[0]);
        expect(x + h, `${edge}`).toBeGreaterThanOrEqual(seen);
      }
      if (edge >= ROAD_W - LANDMARK.plateInPx + h) expect(x + h, `${edge}`).toBeLessThanOrEqual(edge);
    }
  });
});

describe('light grade', () => {
  it('multiplies channel by channel', () => {
    expect(mulColor(0xffffff, 0xfff0dc)).toBe(0xfff0dc);
    expect(mulColor(0x8c8c96, 0xffffff)).toBe(0x8c8c96);
    expect(mulColor(0x808080, 0x804020)).toBe(0x402010);
    expect(mulColor(0x123456, 0x000000)).toBe(0);
  });
});
