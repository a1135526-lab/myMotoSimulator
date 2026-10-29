import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChassisChartRow } from '@/application';
import {
  AXIS_TICK,
  GRID_STROKE,
  SERIES_COLOR,
  TOOLTIP_STYLE,
  type SeriesInfo,
} from './seriesStyle';

interface ChassisChartProps {
  rows: readonly ChassisChartRow[];
  series: readonly SeriesInfo[];
  /** Live road speed, drawn as a marker while riding. */
  liveSpeedKmh?: number;
}

/**
 * Rear-wheel power (solid, left) and engine rpm (dashed, right) vs road
 * speed — the usual Taiwanese scooter dyno sheet layout.
 */
export function ChassisChart({ rows, series, liveSpeedKmh }: ChassisChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={[...rows]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis
          dataKey="speedKmh"
          type="number"
          domain={[0, 'dataMax']}
          tick={AXIS_TICK}
          label={{
            value: 'km/h',
            position: 'insideBottomRight',
            offset: -4,
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <YAxis
          yAxisId="ps"
          tick={AXIS_TICK}
          width={36}
          label={{
            value: '後輪 ps',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <YAxis
          yAxisId="rpm"
          orientation="right"
          tick={AXIS_TICK}
          width={44}
          tickFormatter={(v: number) => `${v / 1000}k`}
          label={{
            value: 'rpm',
            angle: 90,
            position: 'insideRight',
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v) => `${v} km/h`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {liveSpeedKmh !== undefined && liveSpeedKmh > 1 && (
          <ReferenceLine
            yAxisId="ps"
            x={Math.round(liveSpeedKmh)}
            stroke="var(--accent)"
            strokeDasharray="2 2"
          />
        )}
        {series.map(({ key, label }) => [
          <Line
            key={`${key}-ps`}
            yAxisId="ps"
            dataKey={`${key}Ps`}
            name={`${label} 後輪馬力`}
            stroke={SERIES_COLOR[key]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />,
          <Line
            key={`${key}-rpm`}
            yAxisId="rpm"
            dataKey={`${key}Rpm`}
            name={`${label} 轉速`}
            stroke={SERIES_COLOR[key]}
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
          />,
        ])}
      </LineChart>
    </ResponsiveContainer>
  );
}
