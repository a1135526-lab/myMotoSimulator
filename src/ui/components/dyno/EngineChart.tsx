import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { EngineChartRow } from '@/application';
import {
  AXIS_TICK,
  GRID_STROKE,
  SERIES_COLOR,
  TOOLTIP_STYLE,
  type SeriesInfo,
} from './seriesStyle';

interface EngineChartProps {
  rows: readonly EngineChartRow[];
  series: readonly SeriesInfo[];
}

/** Crank power (solid, left axis) and torque (dashed, right axis) vs rpm. */
export function EngineChart({ rows, series }: EngineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={[...rows]} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
        <XAxis
          dataKey="rpm"
          type="number"
          domain={['dataMin', 'dataMax']}
          tick={AXIS_TICK}
          tickFormatter={(v: number) => `${v / 1000}k`}
          label={{
            value: 'rpm',
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
            value: 'ps',
            angle: -90,
            position: 'insideLeft',
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <YAxis
          yAxisId="kgfm"
          orientation="right"
          tick={AXIS_TICK}
          width={40}
          domain={[0, 'auto']}
          label={{
            value: 'kgf·m',
            angle: 90,
            position: 'insideRight',
            fill: 'var(--text-muted)',
            fontSize: 11,
          }}
        />
        <Tooltip {...TOOLTIP_STYLE} labelFormatter={(v) => `${v} rpm`} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map(({ key, label }) => [
          <Line
            key={`${key}-ps`}
            yAxisId="ps"
            dataKey={`${key}Ps`}
            name={`${label} 馬力`}
            stroke={SERIES_COLOR[key]}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />,
          <Line
            key={`${key}-kgfm`}
            yAxisId="kgfm"
            dataKey={`${key}Kgfm`}
            name={`${label} 扭力`}
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
