import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CircuitRiderView, CircuitView } from '@/application';
import { CircuitHud } from './CircuitHud';

const rider = (patch: Partial<CircuitRiderView>): CircuitRiderView => ({
  name: '你',
  isPlayer: true,
  manual: true,
  cylinders: 2,
  x: 0,
  z: 0,
  heading: 0,
  lean: 0,
  slip: 0,
  drift: 0,
  speedKmh: 120,
  rpm: 9000,
  redlineRpm: 12000,
  throttle: 1,
  engineRunning: true,
  revLimiter: false,
  progressM: 100,
  position: 2,
  crashed: false,
  finishTimeS: null,
  bestLapS: null,
  ...patch,
});

const view = (patch: Partial<CircuitView> = {}, driftPct = 0): CircuitView => ({
  phase: 'racing',
  lightsLit: 0,
  raceTimeS: 20,
  laps: 3,
  geo: {
    length: 8,
    step: 2,
    halfWidth: 6,
    samples: [0, 1, 2, 3].map((i) => ({ s: i * 2, x: i, z: i % 2, heading: 0, curvature: 0 })),
  },
  runoffM: 20,
  riders: [rider({}), rider({ name: 'Ninja #1', isPlayer: false, position: 1, progressM: 160 })],
  player: {
    lap: 2,
    currentLapS: 12.5,
    lastLapS: 51.2,
    bestLapS: 50.8,
    gearLabel: '4',
    leanDeg: -35,
    throttlePct: 100,
    brakePct: 0,
    clutchLeverPct: 0,
    offTrack: false,
    driftPct,
    gapAheadM: 60,
  },
  ...patch,
});

describe('CircuitHud', () => {
  it('shows position, lap, speed, gear, lean side and the timing tower', () => {
    render(<CircuitHud view={view()} camera="third" />);
    expect(screen.getByTestId('race-position')).toHaveTextContent('P2/2');
    expect(screen.getByTestId('race-lap')).toHaveTextContent('LAP 2/3');
    expect(screen.getByTestId('circuit-speed')).toHaveTextContent('120');
    expect(screen.getByTestId('circuit-gear')).toHaveTextContent('4');
    expect(screen.getByLabelText('壓車角 35 度')).toHaveTextContent('R35°');
    expect(screen.getByText(/\+0\.400/)).toBeInTheDocument(); // last lap vs best
    expect(screen.getByRole('list', { name: '即時名次' }).children).toHaveLength(2);
  });

  it('flashes GO right after the lights go out, then hides it', () => {
    const { rerender } = render(<CircuitHud view={view({ raceTimeS: 0.5 })} camera="third" />);
    expect(screen.getByText('GO!')).toBeInTheDocument();
    rerender(<CircuitHud view={view({ raceTimeS: 3 })} camera="third" />);
    expect(screen.queryByText('GO!')).not.toBeInTheDocument();
  });

  it('runs the gantry during the lights', () => {
    render(
      <CircuitHud view={view({ phase: 'lights', lightsLit: 3, raceTimeS: -2 })} camera="first" />,
    );
    expect(screen.getByTestId('start-lights')).toHaveAttribute('data-lit', '3');
  });

  it('lights up the drift meter while sliding', () => {
    const { rerender } = render(<CircuitHud view={view()} camera="third" />);
    const calm = screen.getByTestId('drift-meter').className;
    rerender(<CircuitHud view={view({}, 80)} camera="third" />);
    expect(screen.getByTestId('drift-meter').className).not.toBe(calm);
  });
});
