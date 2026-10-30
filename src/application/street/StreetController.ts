import {
  advanceStreet,
  buildModel,
  createStreetRide,
  resetStreetRider,
  shiftStreetRider,
  startStreetEngine,
  type CityMap,
  type SimConfig,
  type SimModel,
  type StreetSettings,
  type StreetState,
} from '@/domain';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';

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

  constructor(
    config: StreetConfig,
    private readonly publish: (snapshot: StreetSnapshot) => void,
    private readonly onToggleCamera: () => void = () => undefined,
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
    this.state = advanceStreet(
      this.config.map,
      this.model,
      this.state,
      this.input.read(),
      elapsedS,
    );
    this.emit();
  }

  handleAction = (action: InputAction): void => {
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
