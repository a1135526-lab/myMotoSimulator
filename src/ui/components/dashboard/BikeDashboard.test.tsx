import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DashboardModel, DashboardReadings } from '@/application';
import { BikeDashboard } from './BikeDashboard';

const model = (patch: Partial<DashboardModel> = {}): DashboardModel => ({
  layout: 'lcd-bar',
  lcd: 'negative',
  accent: '#3aa0ff',
  tachMaxRpm: 12000,
  redlineRpm: 11000,
  speedMaxKmh: 180,
  brand: 'Yamaha',
  manual: true,
  ...patch,
});

const readings: DashboardReadings = {
  speedKmh: 87.6,
  rpm: 7400,
  gearLabel: '3',
  engineRunning: true,
  revLimiter: false,
  tripKm: 0.4,
};

describe('BikeDashboard', () => {
  it.each(['lcd-bar', 'round-lcd', 'analog-lcd', 'twin-analog', 'tft'] as const)(
    '%s shows speed and gear',
    (layout) => {
      render(
        <BikeDashboard
          model={model({ layout })}
          readings={readings}
          speedTestId="speed"
          gearTestId="gear"
        />,
      );
      const dash = screen.getByTestId('dashboard');
      expect(dash).toHaveAttribute('data-layout', layout);
      expect(dash).toHaveAttribute('data-rpm', '7400');
      expect(screen.getByTestId('speed')).toHaveTextContent('87');
      expect(screen.getByTestId('gear')).toHaveTextContent('3');
      expect(screen.getByRole('img', { name: /時速 87 公里/ })).toBeInTheDocument();
    },
  );

  it('scooters have no gear readout', () => {
    render(
      <BikeDashboard
        model={model({ manual: false })}
        readings={{ ...readings, gearLabel: null }}
        gearTestId="gear"
      />,
    );
    expect(screen.queryByTestId('gear')).not.toBeInTheDocument();
  });
});
