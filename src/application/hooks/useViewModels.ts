import { useMemo } from 'react';
import { getBike } from '@/data';
import { computeDyno } from '../services/dynoService';
import { useConfigStore } from '../stores/configStore';
import { usePresetStore } from '../stores/presetStore';
import { useSimStore } from '../stores/simStore';
import { useUiStore } from '../stores/uiStore';
import { dashboardModel } from '../viewModels/dashboard';
import { toChassisRows, toEngineRows, toSummary, type LabelledRun } from '../viewModels/dynoCharts';
import { speedoMaxFor, toGaugeScale, toTelemetryView, toTimerView } from '../viewModels/telemetry';
import { buildSimConfig, useSimConfig, useStockSimConfig } from './useSimConfig';

export function useTelemetry() {
  const sim = useSimStore((s) => s.snapshot?.sim);
  return useMemo(() => (sim ? toTelemetryView(sim) : null), [sim]);
}

export function useTimerView() {
  const timer = useSimStore((s) => s.snapshot?.timer);
  return useMemo(() => (timer ? toTimerView(timer) : null), [timer]);
}

/** Dyno runs for stock, current setup and (optionally) a saved preset. */
export function useDynoRuns(): LabelledRun[] {
  const stockConfig = useStockSimConfig();
  const currentConfig = useSimConfig();
  const compareId = useUiStore((s) => s.comparePresetId);
  const presets = usePresetStore((s) => s.presets);

  return useMemo(() => {
    const runs: LabelledRun[] = [
      { key: 'stock', label: '原廠', result: computeDyno(stockConfig) },
      { key: 'current', label: '目前改裝', result: computeDyno(currentConfig) },
    ];
    const preset = presets.find((p) => p.id === compareId);
    if (preset) {
      const config = buildSimConfig(getBike(preset.bikeId), preset.selection);
      runs.push({ key: 'compare', label: preset.name, result: computeDyno(config) });
    }
    return runs;
  }, [stockConfig, currentConfig, compareId, presets]);
}

export function useDynoCharts() {
  const runs = useDynoRuns();
  return useMemo(
    () => ({
      engineRows: toEngineRows(runs),
      chassisRows: toChassisRows(runs),
      summaries: runs.map(toSummary),
      series: runs.map(({ key, label }) => ({ key, label })),
    }),
    [runs],
  );
}

/** Dial ranges: tach from the (tuned) rev limit, speedo from the simulated top speed. */
export function useGaugeScale() {
  const config = useSimConfig();
  const runs = useDynoRuns();
  return useMemo(() => {
    const top = Math.max(...runs.map((r) => r.result.chassis.times.topSpeedKmh));
    return { ...toGaugeScale(config), speedMaxKmh: speedoMaxFor(top) };
  }, [config, runs]);
}

export function useBikeId() {
  return useConfigStore((s) => s.bikeId);
}

/** The current bike's instrument cluster, redline from the (tuned) rev limit. */
export function useDashboardModel() {
  const config = useSimConfig();
  return useMemo(() => dashboardModel(config.bike, config.tune.ecu.revLimitRpm), [config]);
}
