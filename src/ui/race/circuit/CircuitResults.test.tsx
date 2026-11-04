import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CircuitView } from '@/application';
import { CircuitResults } from './CircuitResults';
import { SPLASH_MS } from './FinishSplash';

const rider = (name: string, position: number, finishTimeS: number | null, isPlayer = false) => ({
  name,
  position,
  finishTimeS,
  bestLapS: finishTimeS && finishTimeS / 2,
  isPlayer,
  dnf: finishTimeS === null,
});

const view = (me: number, phase = 'finished') =>
  ({
    phase,
    laps: 2,
    raceTimeS: 90,
    riders: [rider('你', me, 90 + me, true), rider('電腦 1', me === 1 ? 2 : 1, 91)],
  }) as unknown as CircuitView;

afterEach(() => vi.useRealTimers());

describe('CircuitResults', () => {
  it('a win: VICTORY first, then the results on their own', () => {
    vi.useFakeTimers();
    render(
      <CircuitResults
        view={view(1)}
        circuitId="hill-town"
        onRematch={vi.fn()}
        onGarage={vi.fn()}
      />,
    );
    expect(screen.getByTestId('finish-splash')).toHaveTextContent('VICTORY');
    expect(screen.queryByTestId('circuit-result')).toBeNull();
    act(() => vi.advanceTimersByTime(SPLASH_MS));
    expect(screen.getByTestId('circuit-result')).toHaveTextContent('VICTORY 冠軍！');
  });

  it('second place shows the place; a tap skips to the results', () => {
    render(
      <CircuitResults
        view={view(2)}
        circuitId="hill-town"
        onRematch={vi.fn()}
        onGarage={vi.fn()}
        extra={<p>對手</p>}
      />,
    );
    expect(screen.getByTestId('finish-splash')).toHaveTextContent('第 2 名');
    fireEvent.click(screen.getByTestId('finish-splash'));
    expect(screen.getByTestId('circuit-result')).toHaveTextContent('第 2 名');
    expect(screen.getByText('對手')).toBeInTheDocument();
  });

  it('shows up at your own flag while the others still race; rematch waits for the end', () => {
    const racing = {
      ...view(1, 'racing'),
      finishCountdownS: 12.2,
      riders: [rider('你', 1, 91, true), { ...rider('電腦 1', 2, null), dnf: false }],
    } as unknown as CircuitView;
    render(
      <CircuitResults view={racing} circuitId="hill-town" onRematch={vi.fn()} onGarage={vi.fn()} />,
    );
    fireEvent.click(screen.getByTestId('finish-splash'));
    expect(screen.getByTestId('results-waiting')).toHaveTextContent('剩 13 秒');
    expect(screen.getByTestId('circuit-result')).toHaveTextContent('比賽中');
    expect(screen.getByRole('button', { name: /再比一場/ })).toBeDisabled();
  });
});
