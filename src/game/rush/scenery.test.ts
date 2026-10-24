import { describe, expect, it } from 'vitest';
import { RUSH_ZONES } from '../../art/rush/keys';
import { STOREFRONT, STRIP_H } from '../../art/rush/street';
import { RUSH_ROAD } from '../../config/rush';
import { LANDMARK } from './config';
import { storefrontTop } from './scenery';

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
});
