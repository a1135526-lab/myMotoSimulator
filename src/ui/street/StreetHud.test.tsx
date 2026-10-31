import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadCityMap, type NavView, type StreetView } from '@/application';
import type { CityMap } from '@/domain';
import { NavCard } from './NavCard';
import { StreetHud } from './StreetHud';

let map: CityMap;
beforeAll(async () => {
  map = await loadCityMap();
}, 30000);

const view = (
  rider: Partial<StreetView['rider']> = {},
  nav: NavView | null = null,
): StreetView => ({
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
    reversing: false,
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
  place: { road: '建楠路', village: '惠楠里', suburb: '楠梓區' },
  cityName: '高雄市楠梓區',
  attribution: '地圖資料 © OpenStreetMap 貢獻者（ODbL）',
  nav,
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

const navView = (patch: Partial<NavView> = {}): NavView => ({
  label: '高雄市立右昌國民中學',
  destination: { x: 0, z: 0 },
  route: { legs: [], points: [], cum: [], lengthM: 6200, maneuvers: [], end: { x: 0, z: 0 } },
  next: { kind: 'right', text: '右轉 德民路', distanceM: 340, x: 0, z: 0 },
  remainingM: 6170,
  etaS: 740,
  arrived: false,
  ...patch,
});

describe('StreetHud', () => {
  it('shows where you are, the trip, the bike dash and the minimap', () => {
    render(<StreetHud view={view()} map={map} camera="third" />);
    expect(screen.getByTestId('street-district')).toHaveTextContent('惠楠里');
    expect(screen.getByTestId('street-road')).toHaveTextContent('建楠路');
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

  it('opens the big map from the minimap and flips it north-up', () => {
    const open = vi.fn();
    const north = vi.fn();
    render(
      <StreetHud view={view()} map={map} camera="third" onOpenMap={open} onToggleNorth={north} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '打開大地圖' }));
    fireEvent.click(screen.getByTestId('minimap-north'));
    expect(open).toHaveBeenCalled();
    expect(north).toHaveBeenCalled();
  });
});

describe('NavCard', () => {
  it('shows the next turn, distance, what is left and the ETA', () => {
    const cancel = vi.fn();
    render(<NavCard nav={navView()} onCancel={cancel} />);
    expect(screen.getByTestId('nav-distance')).toHaveTextContent('340 m');
    expect(screen.getByTestId('nav-text')).toHaveTextContent('右轉 德民路');
    expect(screen.getByTestId('nav-remaining')).toHaveTextContent('剩 6.2 km · 約 12 分鐘');
    fireEvent.click(screen.getByTestId('nav-cancel'));
    expect(cancel).toHaveBeenCalled();
  });

  it('says when you have arrived', () => {
    render(<NavCard nav={navView({ arrived: true })} onCancel={() => undefined} />);
    expect(screen.getByTestId('nav-text')).toHaveTextContent('已抵達 高雄市立右昌國民中學');
    expect(screen.getByTestId('nav-cancel')).toHaveTextContent('完成');
  });

  it('appears in the HUD while navigating', () => {
    render(<StreetHud view={view({}, navView())} map={map} camera="third" />);
    expect(screen.getByTestId('nav-card')).toBeInTheDocument();
  });
});
