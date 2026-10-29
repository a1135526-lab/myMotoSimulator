import { nmToKgfm, wattsToPs } from '@/domain';
import type { DynoComputation } from '../services/dynoService';

export type SeriesKey = 'stock' | 'current' | 'compare';

/** One rpm row of the engine chart; missing keys mean that series has no data there. */
export type EngineChartRow = { readonly rpm: number } & Partial<
  Record<`${SeriesKey}Ps` | `${SeriesKey}Kgfm`, number>
>;

/** One km/h row of the chassis chart. */
export type ChassisChartRow = { readonly speedKmh: number } & Partial<
  Record<`${SeriesKey}Ps` | `${SeriesKey}Rpm`, number>
>;

export interface DynoSummary {
  readonly key: SeriesKey;
  readonly label: string;
  readonly peakPs: number;
  readonly peakPsRpm: number;
  readonly peakKgfm: number;
  readonly peakKgfmRpm: number;
  readonly peakWheelPs: number;
  readonly topSpeedKmh: number;
  readonly zeroTo60S: number | undefined;
  readonly zeroTo100mS: number | undefined;
  readonly zeroTo400mS: number | undefined;
}

export interface LabelledRun {
  readonly key: SeriesKey;
  readonly label: string;
  readonly result: DynoComputation;
}

const round = (value: number, digits = 2) => Number(value.toFixed(digits));

export function toEngineRows(runs: readonly LabelledRun[]): EngineChartRow[] {
  const rows = new Map<number, Record<string, number>>();
  for (const { key, result } of runs) {
    for (const p of result.engine.points) {
      const row = rows.get(p.rpm) ?? { rpm: p.rpm };
      row[`${key}Ps`] = round(wattsToPs(p.powerW));
      row[`${key}Kgfm`] = round(nmToKgfm(p.torqueNm), 3);
      rows.set(p.rpm, row);
    }
  }
  return [...rows.values()].sort((a, b) => (a.rpm ?? 0) - (b.rpm ?? 0)) as EngineChartRow[];
}

export function toChassisRows(runs: readonly LabelledRun[]): ChassisChartRow[] {
  const rows = new Map<number, Record<string, number>>();
  for (const { key, result } of runs) {
    for (const p of result.chassis.points) {
      const row = rows.get(p.speedKmh) ?? { speedKmh: p.speedKmh };
      row[`${key}Ps`] = round(wattsToPs(p.wheelPowerW));
      row[`${key}Rpm`] = Math.round(p.engineRpm);
      rows.set(p.speedKmh, row);
    }
  }
  return [...rows.values()].sort(
    (a, b) => (a.speedKmh ?? 0) - (b.speedKmh ?? 0),
  ) as ChassisChartRow[];
}

export function toSummary({ key, label, result }: LabelledRun): DynoSummary {
  const { engine, chassis } = result;
  return {
    key,
    label,
    peakPs: wattsToPs(engine.peakPower.powerW),
    peakPsRpm: engine.peakPower.rpm,
    peakKgfm: nmToKgfm(engine.peakTorque.torqueNm),
    peakKgfmRpm: engine.peakTorque.rpm,
    peakWheelPs: wattsToPs(chassis.peakWheelPowerW),
    topSpeedKmh: chassis.times.topSpeedKmh,
    zeroTo60S: chassis.times.zeroTo60S,
    zeroTo100mS: chassis.times.zeroTo100mS,
    zeroTo400mS: chassis.times.zeroTo400mS,
  };
}
