import { describe, expect, it } from 'vitest';
import { airDensityAt, DEFAULT_TRACK_ID, getTrack, TRACKS } from './index';

describe('tracks', () => {
  it('has the default track and unique ids', () => {
    expect(getTrack(DEFAULT_TRACK_ID).distanceM).toBe(402);
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    expect(() => getTrack('nope')).toThrow(/Unknown track/);
  });

  it('thins the air with altitude (ISA)', () => {
    expect(airDensityAt(0)).toBeCloseTo(1.225, 3);
    expect(airDensityAt(1200)).toBeCloseTo(1.09, 3);
    expect(getTrack('mountain-climb').environment.airDensity).toBeLessThan(
      getTrack('central-speedway').environment.airDensity,
    );
  });

  it('the wet strip has much less grip; only the custom track lets you pick distance', () => {
    expect(getTrack('wet-strip').environment.tractionG).toBe(0.6);
    expect(TRACKS.filter((t) => t.distanceM === null).map((t) => t.id)).toEqual(['custom']);
  });
});
