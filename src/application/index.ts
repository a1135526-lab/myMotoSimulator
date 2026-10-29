/** Public surface of the application layer — the only module the UI imports. */
export { SimulationProvider } from './hooks/SimulationProvider';
export { useSimulationController } from './hooks/simulationContext';
export { useCurrentBike, useSimConfig } from './hooks/useSimConfig';
export {
  useBikeId,
  useDynoCharts,
  useGaugeScale,
  useTelemetry,
  useTimerView,
} from './hooks/useViewModels';
export {
  CATEGORY_LABELS,
  KIND_LABELS,
  LICENSE_LABELS,
  ROLLER_LIMITS,
  useBikeCatalog,
  usePartCategories,
  type BikeGroup,
  type CategoryOptions,
  type KindCatalog,
  type PartOption,
} from './hooks/useCatalog';
export { useBikeSpecSheet, type SpecSection } from './hooks/useSpecSheet';
export { useConfigStore, type ResettableGroup } from './stores/configStore';
export { usePresetStore } from './stores/presetStore';
export { useUiStore, type DynoView } from './stores/uiStore';
export type { TouchControl } from './input/TouchInputSource';
export type { Preset } from './services/presetService';
export { isStock, type SelectableCategory } from './tuning/selection';
export type {
  ChassisChartRow,
  DynoSummary,
  EngineChartRow,
  SeriesKey,
} from './viewModels/dynoCharts';
export type { GaugeScale, TelemetryView, TimerView } from './viewModels/telemetry';
