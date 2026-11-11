import { beforeEach, describe, expect, it } from 'vitest';
import { NO_ITEM_STATS, useItemStore } from '../stores/itemStore';
import { itemFeedback } from './itemFeedback';

const cue = () => useItemStore.getState().cue?.kind ?? null;

describe('item feedback', () => {
  beforeEach(() => useItemStore.setState({ cue: null, toast: null, stats: NO_ITEM_STATS }));

  it('your pick-ups and uses each have a sound, and are counted', () => {
    itemFeedback([{ seq: 1, type: 'pick', rider: 0, item: 'nitro' }]);
    expect(cue()).toBe('pick');
    itemFeedback([{ seq: 2, type: 'use', rider: 0, item: 'nitro' }]);
    expect(cue()).toBe('boost');
    itemFeedback([{ seq: 3, type: 'use', rider: 0, item: 'oil' }]);
    expect(cue()).toBe('drop');
    expect(useItemStore.getState().stats).toMatchObject({ used: 2, picks: { nitro: 1 } });
  });

  it('an AI picking something up is silent', () => {
    itemFeedback([{ seq: 1, type: 'pick', rider: 2, item: 'oil' }]);
    expect(cue()).toBeNull();
  });

  it('getting hit, blocking it, and hitting someone sound different', () => {
    const hit = { seq: 1, type: 'hit', rider: 0, item: 'oil', by: 1, objectId: 'x' } as const;
    itemFeedback([{ ...hit, landed: 'hit' }]);
    expect(cue()).toBe('hit');
    expect(useItemStore.getState().toast?.text).toContain('機油');
    itemFeedback([{ ...hit, seq: 2, landed: 'blocked' }]);
    expect(cue()).toBe('block');
    itemFeedback([{ ...hit, seq: 3, rider: 1, by: 0, landed: 'hit' }]);
    expect(cue()).toBe('landed');
    expect(useItemStore.getState().stats).toMatchObject({ taken: 1, landed: 1 });
  });

  it('a repeat of the same sound plays again', () => {
    itemFeedback([{ seq: 1, type: 'pick', rider: 0, item: 'oil' }]);
    const first = useItemStore.getState().cue;
    itemFeedback([{ seq: 2, type: 'pick', rider: 0, item: 'cone' }]);
    expect(useItemStore.getState().cue).not.toBe(first);
  });
});
