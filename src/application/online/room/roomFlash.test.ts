import { beforeEach, describe, expect, it } from 'vitest';
import type { CircuitView } from '../../viewModels/circuit';
import { useCircuitStore } from '../../stores/circuitStore';
import { flashesLeft, MAX_FLASHES, useFlashStore } from '../../stores/flashStore';
import { dazzles, FLASH_RANGE_M } from './roomFlash';
import { parseMessage } from './roomTypes';

const phase = (p: CircuitView['phase']) =>
  useCircuitStore.setState({ view: { phase: p } as unknown as CircuitView });

describe('headlight flash', () => {
  beforeEach(() => {
    phase('grid');
    useFlashStore.setState({ night: true, used: 0, flashedAt: null, dazzledAt: null });
  });

  it('three a race, only while racing, only at night', () => {
    expect(useFlashStore.getState().flash()).toBe(false); // still on the grid
    phase('lights');
    phase('racing');
    for (let i = 0; i < MAX_FLASHES; i++) expect(useFlashStore.getState().flash()).toBe(true);
    expect(useFlashStore.getState().flash()).toBe(false);
    expect(flashesLeft(useFlashStore.getState())).toBe(0);

    // The next race hands out three more.
    phase('finished');
    phase('lights');
    expect(flashesLeft(useFlashStore.getState())).toBe(MAX_FLASHES);

    phase('racing');
    useFlashStore.getState().setNight(false);
    expect(useFlashStore.getState().flash()).toBe(false);
  });

  it('dazzles a rider just ahead in the beam, not beside, behind or far off', () => {
    const from = { x: 0, z: 0, heading: 0 }; // riding toward +x
    expect(dazzles(from, { x: 30, z: 5 })).toBe(true);
    expect(dazzles(from, { x: FLASH_RANGE_M + 5, z: 0 })).toBe(false);
    expect(dazzles(from, { x: 5, z: 20 })).toBe(false);
    expect(dazzles(from, { x: -20, z: 0 })).toBe(false);
  });

  it('flash messages are checked like the rest', () => {
    expect(parseMessage({ type: 'flash', id: 'a', raceId: 2 })).toEqual({
      type: 'flash',
      id: 'a',
      raceId: 2,
    });
    expect(parseMessage({ type: 'flash', id: '', raceId: 2 })).toBeNull();
    expect(parseMessage({ type: 'flash', id: 'a' })).toBeNull();
  });
});
