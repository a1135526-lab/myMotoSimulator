/** Public surface of the application layer — the only module the UI imports. */
export { SimulationProvider } from './hooks/SimulationProvider';
export { useSimulationController } from './hooks/simulationContext';
export { useCurrentBike, useSimConfig } from './hooks/useSimConfig';
export {
  useBikeId,
  useDashboardModel,
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
export { RaceProvider } from './hooks/RaceProvider';
export { useRaceController } from './hooks/raceContext';
export {
  DISTANCE_PRESETS_M,
  RACE_STEP_LABELS,
  RACE_STEPS,
  useRaceStore,
  type RaceStep,
} from './stores/raceStore';
export {
  useActiveTrack,
  useBikeCards,
  useGarageEstimate,
  useMatchupEstimate,
  useTracks,
  type BikeCardView,
} from './hooks/useRaceSetup';
export { selectionForLevel } from './race/opponentSetup';
export {
  SKILL_LABELS,
  TUNE_LEVEL_LABELS,
  type OpponentSetup,
  type TuneLevel,
} from './race/opponentSetup';
export type { RaceView, RacerView } from './viewModels/race';
export type { DashboardModel, DashboardReadings } from './viewModels/dashboard';
export type { AppMode } from './stores/uiStore';
export { readRaceSound, readSimulatorSound, type SoundFrame } from './viewModels/sound';
export { CircuitProvider } from './hooks/CircuitProvider';
export { useCircuitController } from './hooks/circuitContext';
export { useCircuitStore, type CameraMode } from './stores/circuitStore';
export { readCircuitSound } from './viewModels/sound';
export type { CircuitView, CircuitRiderView, CircuitPlayerView } from './viewModels/circuit';
export { MAX_CIRCUIT_OPPONENTS, MAX_LAPS, type Discipline } from './stores/raceStore';
export { useActiveCircuit, useCircuits, useVenue, type Estimate } from './hooks/useRaceSetup';
export { circuitGeometry } from './services/lapService';
/** Fastest believable reaction to a start light, s (shown in race rules). */
export { MIN_HUMAN_REACTION_S } from '@/domain';
