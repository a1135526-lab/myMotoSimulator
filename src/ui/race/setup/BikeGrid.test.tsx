import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BikeGrid } from './BikeGrid';

const sections = () => screen.getAllByRole('region').map((s) => s.getAttribute('aria-label'));

describe('BikeGrid', () => {
  it('lists every bike in displacement-band sections, smallest first', () => {
    render(<BikeGrid selectedId="sym-jet-sl-125" onSelect={() => undefined} testIdPrefix="b" />);
    expect(sections()).toEqual([
      '125 cc 以下',
      '126–249 cc・白牌',
      '250–550 cc・黃牌',
      '551 cc 以上・紅牌',
    ]);
    const small = screen.getByRole('region', { name: '125 cc 以下' });
    expect(within(small).getByTestId('b-kymco-many-110')).toBeInTheDocument();
    expect(within(small).queryByTestId('b-yamaha-nmax-155')).not.toBeInTheDocument();
  });

  it('filters by body style and by displacement together', () => {
    render(<BikeGrid selectedId="sym-jet-sl-125" onSelect={() => undefined} testIdPrefix="b" />);
    fireEvent.click(screen.getByTestId('style-maxi-scooter'));
    expect(screen.getByTestId('b-yamaha-tmax-560')).toBeInTheDocument();
    expect(screen.queryByTestId('b-sym-jet-sl-125')).not.toBeInTheDocument();
    expect(screen.queryByTestId('b-yamaha-mt-09')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('band-to249'));
    expect(sections()).toEqual(['126–249 cc・白牌']);
    expect(screen.getByTestId('b-yamaha-nmax-155')).toBeInTheDocument();
    expect(screen.queryByTestId('b-yamaha-tmax-560')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('style-naked'));
    fireEvent.click(screen.getByTestId('band-upTo125'));
    expect(screen.getByText('沒有符合條件的車款，換個篩選試試。')).toBeInTheDocument();
  });

  it('shows body style and plate on the card and selects on click', () => {
    const onSelect = vi.fn();
    render(<BikeGrid selectedId="sym-jet-sl-125" onSelect={onSelect} testIdPrefix="b" />);
    fireEvent.click(screen.getByTestId('style-manual'));
    const card = screen.getByTestId('b-kawasaki-ninja-zx-25r');
    expect(card).toHaveTextContent('仿賽跑車・白牌');
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith('kawasaki-ninja-zx-25r');
  });
});
