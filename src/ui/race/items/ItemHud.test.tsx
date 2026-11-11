import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useItemStore, type ItemView } from '@/application';
import { ItemHud } from './ItemHud';
import { ItemStatsCard } from './ItemStatsCard';

const view = (patch: Partial<ItemView> = {}): ItemView => ({
  held: null,
  rolling: false,
  charges: 0,
  shieldLeftS: null,
  skateLeftS: null,
  boosting: false,
  hit: false,
  chased: false,
  smoked: false,
  boxes: [],
  traps: [],
  shots: [],
  smokes: [],
  ...patch,
});

describe('ItemHud', () => {
  it('shows what you hold, with the key to use it', () => {
    render(<ItemHud items={view({ held: 'triple-boost', charges: 2 })} />);
    expect(screen.getByTestId('item-slot')).toHaveTextContent('三段加速 ×2');
    expect(screen.getByTestId('item-slot')).toHaveTextContent('Z');
  });

  it('an empty slot points you at the boxes; a spinner while it rolls', () => {
    const { rerender } = render(<ItemHud items={view()} />);
    expect(screen.getByTestId('item-slot')).toHaveTextContent('騎過道具箱');
    rerender(<ItemHud items={view({ held: 'oil', rolling: true })} />);
    expect(screen.getByTestId('item-slot')).toHaveAttribute('data-item', 'rolling');
  });

  it('warns of a paper plane, counts down the skateboard, and says when you were hit', () => {
    render(<ItemHud items={view({ chased: true, skateLeftS: 6.2 })} />);
    expect(screen.getByTestId('item-chased')).toBeInTheDocument();
    expect(screen.getByTestId('skate-left')).toHaveTextContent('7');
    act(() => useItemStore.getState().show('被水球打中！', 'bad'));
    expect(screen.getByTestId('item-toast')).toHaveTextContent('被水球打中！');
  });

  it('the results card adds up your items', () => {
    act(() =>
      useItemStore.setState({ stats: { used: 4, landed: 2, taken: 1, picks: { nitro: 3 } } }),
    );
    render(<ItemStatsCard />);
    const card = screen.getByTestId('item-stats');
    expect(card).toHaveTextContent('4 次');
    expect(card).toHaveTextContent('氮氣噴射');
  });
});
