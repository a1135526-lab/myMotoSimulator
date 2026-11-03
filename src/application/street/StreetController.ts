import {
  advanceStreet,
  buildModel,
  clearStreetDestination,
  createStreetRide,
  resetStreetRider,
  setStreetDestination,
  shiftStreetRider,
  startStreetEngine,
  startStreetMission,
  type CityMap,
  type Destination,
  type MissionRun,
  type SimConfig,
  type SimModel,
  type StreetSettings,
  type StreetState,
} from '@/domain';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';
import type { StreetMission } from './missions';

export interface StreetConfig {
  readonly player: SimConfig;
  readonly map: CityMap;
  readonly settings: StreetSettings;
}

export interface StreetSnapshot {
  readonly state: StreetState;
  readonly model: SimModel;
  readonly map: CityMap;
}

/** Owns a free ride outside React; mirrors CircuitController. */
export class StreetController {
  readonly input = new CompositeInputSource();
  readonly touch = new TouchInputSource();
  private model!: SimModel;
  private state!: StreetState;
  private config: StreetConfig;
  /** While the big map is open the ride is frozen. */
  private paused = false;
  /** The current mission's arrival has been handed to onMissionDone. */
  private missionReported = false;

  constructor(
    config: StreetConfig,
    private readonly publish: (snapshot: StreetSnapshot) => void,
    private readonly onToggleCamera: () => void = () => undefined,
    private readonly onToggleMap: () => void = () => undefined,
    /** Once per mission run, on arrival at the landmark. */
    private readonly onMissionDone: (run: MissionRun) => void = () => undefined,
  ) {
    this.config = config;
    this.input.add(this.touch);
    this.restart();
  }

  configure(config: StreetConfig): void {
    this.config = config;
    this.restart();
  }

  restart(): void {
    this.model = buildModel(this.config.player);
    this.state = createStreetRide(this.config.map, this.model, this.config.settings);
    this.emit();
  }

  tick(elapsedS: number): void {
    if (this.paused) return;
    this.state = advanceStreet(
      this.config.map,
      this.model,
      this.state,
      this.input.read(),
      elapsedS,
    );
    const run = this.state.mission;
    if (run && run.finishedAtS !== null && !this.missionReported) {
      this.missionReported = true;
      this.onMissionDone(run);
    }
    this.emit();
  }

  /** Back to the station, sat-nav set, clock running. False if there's no way there. */
  startMission(mission: StreetMission): boolean {
    const { map, settings } = this.config;
    const state = startStreetMission(map, this.model, settings, mission.id, mission.destination);
    if (!state) return false;
    this.missionReported = false;
    this.update(state);
    return true;
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  /** Plan a route; false if there's no way there. */
  setDestination(destination: Destination): boolean {
    this.update(setStreetDestination(this.config.map, this.state, destination));
    return this.state.nav !== null;
  }

  clearDestination(): void {
    this.update(clearStreetDestination(this.state));
  }

  handleAction = (action: InputAction): void => {
    if (action === 'toggleMap') return this.onToggleMap();
    // Riding controls do nothing on a frozen ride.
    if (this.paused && action !== 'toggleCamera') return;
    switch (action) {
      case 'reset':
        return this.update(resetStreetRider(this.config.map, this.model, this.state));
      case 'shiftUp':
        return this.update(shiftStreetRider(this.model, this.state, 1));
      case 'shiftDown':
        return this.update(shiftStreetRider(this.model, this.state, -1));
      case 'startEngine':
        return this.update(startStreetEngine(this.model, this.state));
      case 'toggleCamera':
        return this.onToggleCamera();
      case 'toggleTimer':
        return;
    }
  };

  snapshot(): StreetSnapshot {
    return { state: this.state, model: this.model, map: this.config.map };
  }

  dispose(): void {
    this.input.dispose();
  }

  private update(state: StreetState): void {
    if (state === this.state) return;
    this.state = state;
    this.emit();
  }

  private emit(): void {
    this.publish(this.snapshot());
  }
}
