import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadCityMap } from '@/application';
import type { CityMap } from '@/domain';
import { MapSidePanel } from './MapSidePanel';

let map: CityMap;
beforeAll(async () => {
  map = await loadCityMap();
}, 30000);

const panel = (patch: Partial<Parameters<typeof MapSidePanel>[0]> = {}) => {
  const props = {
    map,
    from: map.spawn,
    nav: null,
    error: null,
    category: null,
    onCategory: vi.fn(),
    onPick: vi.fn(),
    onFocus: vi.fn(),
    onStart: vi.fn(),
    onClear: vi.fn(),
    ...patch,
  };
  render(<MapSidePanel {...props} />);
  return props;
};

describe('MapSidePanel', () => {
  it('searches real landmarks and road names, and picks a destination', () => {
    const props = panel();
    fireEvent.change(screen.getByTestId('map-search'), { target: { value: '右昌國民中學' } });
    const results = screen.getByTestId('map-results');
    const hit = within(results).getByText('高雄市立右昌國民中學');
    fireEvent.click(hit);
    expect(props.onPick).toHaveBeenCalledWith(
      expect.objectContaining({ name: '高雄市立右昌國民中學', kindLabel: '學校' }),
    );

    fireEvent.change(screen.getByTestId('map-search'), { target: { value: '德民路' } });
    expect(within(screen.getByTestId('map-results')).getByText('德民路')).toBeInTheDocument();
  });

  it('lists a category nearest first', () => {
    const props = panel({ category: 'mrt' });
    const items = within(screen.getByTestId('map-results')).getAllByRole('button');
    expect(items.length).toBe(5);
    expect(items[0]).toHaveTextContent('捷運站');
    fireEvent.click(screen.getByTestId('map-cat-mrt'));
    expect(props.onCategory).toHaveBeenCalledWith(null);
  });

  it('shows the planned route with start and clear', () => {
    const props = panel({
      nav: {
        label: '楠梓',
        destination: { x: 0, z: 0 },
        route: { legs: [], points: [], cum: [], lengthM: 1200, maneuvers: [], end: { x: 0, z: 0 } },
        next: { kind: 'left', text: '左轉', distanceM: 100, x: 0, z: 0 },
        remainingM: 1200,
        etaS: 150,
        arrived: false,
      },
    });
    expect(screen.getByTestId('map-route')).toHaveTextContent('1.2 km · 約 3 分鐘');
    fireEvent.click(screen.getByTestId('map-start'));
    fireEvent.click(screen.getByTestId('map-clear'));
    expect(props.onStart).toHaveBeenCalled();
    expect(props.onClear).toHaveBeenCalled();
  });
});
