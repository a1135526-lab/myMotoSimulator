import { afterEach, describe, expect, it } from 'vitest';
import { useRankedStore } from './rankedStore';
import { useUiStore } from '../../stores/uiStore';

afterEach(() => useRankedStore.getState().cancel());

describe('rankedStore (offline)', () => {
  it('cannot queue without the online service', async () => {
    await useRankedStore.getState().queue('scooter', '測試');
    expect(useRankedStore.getState().phase).toBe('idle');
  });

  it('leaving race mode drops an AI match', () => {
    useUiStore.setState({ mode: 'race' });
    useRankedStore.setState({
      phase: 'ai',
      match: {
        id: 'm1',
        kind: 'ai',
        group: 'manual',
        circuitId: 'practice-park',
        laps: 2,
        size: 1,
      },
    });
    useUiStore.setState({ mode: 'home' });
    expect(useRankedStore.getState().phase).toBe('idle');
    expect(useRankedStore.getState().match).toBeNull();
  });
});
