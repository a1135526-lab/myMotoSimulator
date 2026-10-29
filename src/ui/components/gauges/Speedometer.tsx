import { Gauge } from './Gauge';

interface SpeedometerProps {
  speedKmh: number;
  maxKmh: number;
}

/** Wider tick spacing on fast bikes so labels don't crowd the dial. */
const stepsFor = (maxKmh: number) =>
  maxKmh > 200 ? { major: 40, minor: 20 } : { major: 20, minor: 10 };

export function Speedometer({ speedKmh, maxKmh }: SpeedometerProps) {
  const { major, minor } = stepsFor(maxKmh);
  return (
    <Gauge
      testId="speedometer"
      value={speedKmh}
      max={maxKmh}
      majorStep={major}
      minorStep={minor}
      label="SPEED"
      unit="km/h"
      readout={Math.floor(speedKmh).toString()}
    />
  );
}
