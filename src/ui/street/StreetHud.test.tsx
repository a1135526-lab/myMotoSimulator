import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cityMap, type StreetView } from '@/application';
import { StreetHud } from './StreetHud';

const map = cityMap();

const view = (rider: Partial<StreetView['rider']> = {}): StreetView => ({
  clockS: 12,
  rider: {
    x: map.spawn.x,
    z: map.spawn.z,
    heading: map.spawn.heading,
    lean: 0.4,
    slip: 0,
    drift: 0,
    speedKmh: 63.4,
    rpm: 7200,
    throttle: 1,
    brake: 0,
    gearLabel: null,
    engineRunning: true,
    revLimiter: false,
    crashed: false,
    offRoad: false,
    manual: false,
    cylinders: 1,
    distanceM: 1530,
    ...rider,
  },
  cars: [
    {
      id: 0,
      kind: 'sedan',
      paint: 0.2,
      x: map.spawn.x,
      z: map.spawn.z - 40,
      heading: 0,
      speedKmh: 40,
    },
  ],
  district: '市中心',
  cityName: '測試市',
  tripKm: 1.53,
  topSpeedKmh: 88,
  dash: {
    layout: 'tick-ring',
    lcd: 'negative',
    accent: '#d6ff3c',
    tachMaxRpm: 12000,
    redlineRpm: 9500,
    speedMaxKmh: 140,
    brand: 'SYM',
    manual: false,
  },
});

describe('StreetHud', () => {
  it('shows where you are, the trip, the bike dash and the minimap', () => {
    render(<StreetHud view={view()} map={map} camera="third" />);
    expect(screen.getByTestId('street-district')).toHaveTextContent('市中心');
    expect(screen.getByTestId('street-trip')).toHaveTextContent('1.53 km');
    expect(screen.getByTestId('street-speed')).toHaveTextContent('63');
    expect(screen.getByTestId('dashboard')).toHaveAttribute('data-layout', 'tick-ring');
    expect(screen.getByLabelText('小地圖')).toBeInTheDocument();
    expect(screen.getByText('L23°')).toBeInTheDocument();
    expect(screen.queryByTestId('street-alert')).not.toBeInTheDocument();
  });

  it('warns about a crash and riding on the pavement', () => {
    const { rerender } = render(
      <StreetHud view={view({ crashed: true })} map={map} camera="third" />,
    );
    expect(screen.getByTestId('street-alert')).toHaveTextContent('摔車');
    rerender(<StreetHud view={view({ offRoad: true })} map={map} camera="first" />);
    expect(screen.getByTestId('street-alert')).toHaveTextContent('人行道');
  });
});
