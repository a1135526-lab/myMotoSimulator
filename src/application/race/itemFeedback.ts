import { ITEM_INFO, type ItemEvent, type ItemId } from '@/domain';
import { useFlashStore } from '../stores/flashStore';
import { useItemStore, type ItemCue } from '../stores/itemStore';

/** The player's side of what happened with items: a line on the HUD, a white-out. */
/** The sound for using each item. */
const USE_CUE: Readonly<Record<ItemId, ItemCue>> = {
  nitro: 'boost',
  'triple-boost': 'boost',
  oil: 'drop',
  tacks: 'drop',
  cone: 'drop',
  smoke: 'drop',
  'water-balloon': 'shoot',
  homing: 'shoot',
  shield: 'shield',
  flash: 'flash',
  skateboard: 'skate',
};

export function itemFeedback(events: readonly ItemEvent[]): void {
  const { show, count, play } = useItemStore.getState();
  for (const e of events) {
    tally(e, count);
    const cue = cueFor(e);
    if (cue) play(cue);
    switch (e.type) {
      case 'hit':
        if (e.rider !== 0) {
          if (e.by === 0 && e.landed === 'hit') show(`打中了！${ITEM_INFO[e.item].name}`, 'good');
          break;
        }
        if (e.landed === 'blocked') show('🛡️ 護盾擋下了！', 'good');
        else show(`被${ITEM_INFO[e.item].name}打中！`, 'bad');
        break;
      case 'skate':
        if (e.target === 0) {
          show(e.landed === 'blocked' ? '🛡️ 護盾擋下了滑板車！' : '🛹 你被變成滑板車了！', 'bad');
        } else if (e.by === 0) {
          show('🛹 第一名變成滑板車了！', 'good');
        }
        break;
      case 'dazzle':
        if (e.rider === 0) useFlashStore.getState().dazzle();
        break;
      default:
        break;
    }
  }
}

/** Your numbers for the results card. */
function tally(e: ItemEvent, count: ReturnType<typeof useItemStore.getState>['count']): void {
  if (e.type === 'pick' && e.rider === 0) {
    count((s) => ({ ...s, picks: { ...s.picks, [e.item]: (s.picks[e.item] ?? 0) + 1 } }));
  } else if (e.type === 'use' && e.rider === 0) {
    count((s) => ({ ...s, used: s.used + 1 }));
  } else if (e.type === 'hit' && e.landed === 'hit') {
    if (e.rider === 0) count((s) => ({ ...s, taken: s.taken + 1 }));
    else if (e.by === 0) count((s) => ({ ...s, landed: s.landed + 1 }));
  } else if (e.type === 'skate' && e.landed === 'hit') {
    if (e.target === 0) count((s) => ({ ...s, taken: s.taken + 1 }));
    else if (e.by === 0) count((s) => ({ ...s, landed: s.landed + 1 }));
  }
}

/** What you hear: your own picks and uses, and what lands on you or by you. */
function cueFor(e: ItemEvent): ItemCue | null {
  switch (e.type) {
    case 'pick':
      return e.rider === 0 ? 'pick' : null;
    case 'use':
      return e.rider === 0 ? USE_CUE[e.item] : null;
    case 'hit':
      if (e.rider === 0) return e.landed === 'blocked' ? 'block' : 'hit';
      return e.by === 0 && e.landed === 'hit' ? 'landed' : null;
    case 'skate':
      if (e.target === 0) return e.landed === 'blocked' ? 'block' : 'skated';
      return null;
    default:
      return null;
  }
}
