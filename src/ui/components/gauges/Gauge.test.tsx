import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Speedometer } from './Speedometer';
import { Tachometer } from './Tachometer';

describe('gauges', () => {
  it('tachometer shows the rpm readout and tick labels in thousands', () => {
    render(
      <Tachometer
        rpm={7520}
        maxRpm={11000}
        redlineRpm={9500}
        revLimiter={false}
        gearLabel={null}
        engineRunning
      />,
    );
    expect(screen.getByTestId('tachometer-readout')).toHaveTextContent('7,520');
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.queryByText('斷油')).not.toBeInTheDocument();
  });

  it('tachometer flags the rev limiter', () => {
    render(
      <Tachometer
        rpm={9600}
        maxRpm={11000}
        redlineRpm={9500}
        revLimiter
        gearLabel={null}
        engineRunning
      />,
    );
    expect(screen.getByText('斷油')).toBeInTheDocument();
  });

  it('speedometer floors to whole km/h and exposes an accessible label', () => {
    render(<Speedometer speedKmh={87.9} maxKmh={140} />);
    expect(screen.getByTestId('speedometer-readout')).toHaveTextContent('87');
    expect(screen.getByRole('img', { name: /SPEED 87 km\/h/ })).toBeInTheDocument();
  });
});
