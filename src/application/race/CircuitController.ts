import {
  advanceCircuitRace,
  buildCircuit,
  buildModel,
  CIRCUIT_SKILLS,
  createCircuitRace,
  resetPlayer,
  riderSkill,
  shiftCircuitPlayer,
  startCircuitPlayerEngine,
  startLights,
  type CircuitGeometry,
  type CircuitRaceState,
  type CircuitSettings,
  type RiderSkill,
  type SimConfig,
  type SimModel,
} from '@/domain';
import type { CircuitSpec } from '@/data';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';

export interface CircuitConfig {
  readonly circuit: CircuitSpec;
  readonly player: SimConfig;
  readonly opponents: readonly SimConfig[];
  readonly names: readonly string[];
  readonly skill: RiderSkill;
  readonly laps: number;
  readonly assist: boolean;
  readonly brakeAssist: boolean;
  readonly autoShift: boolean;
}

export interface CircuitSnapshot {
  readonly race: CircuitRaceState;
  readonly geo: CircuitGeometry;
  readonly models: readonly SimModel[];
  readonly names: readonly string[];
}

/** Random hold after the fifth red light, s (MotoGP: 0.2–3 s). */
export const LIGHTS_HOLD_RANGE_S: readonly [number, number] = [0.4, 2.5];

/** Owns a running circuit race outside React; mirrors RaceController. */
export class CircuitController {
  readonly input = new CompositeInputSource();
  readonly touch = new TouchInputSource();
  private geo!: CircuitGeometry;
  private models!: SimModel[];
  private race!: CircuitRaceState;
  private config: CircuitConfig;

  constructor(
    config: CircuitConfig,
    private readonly publish: (snapshot: CircuitSnapshot) => void,
    private readonly onToggleCamera: () => void = () => undefined,
    private readonly random: () => number = Math.random,
  ) {
    this.config = config;
    this.input.add(this.touch);
    this.restage();
  }

  configure(config: CircuitConfig): void {
    this.config = config;
    this.restage();
  }

  restage(): void {
    const { circuit, player, opponents, skill, laps, assist, brakeAssist, autoShift } = this.config;
    this.geo = buildCircuit(circuit.controlPoints, circuit.widthM / 2);
    this.models = [player, ...opponents].map(buildModel);
    const settings: CircuitSettings = {
      laps,
      assist,
      brakeAssist,
      autoShift,
      limits: { halfWidth: circuit.widthM / 2, runoffM: circuit.runoffM, gripG: circuit.gripG },
    };
    const [lo, hi] = LIGHTS_HOLD_RANGE_S;
    this.race = createCircuitRace(this.geo, this.models, {
      settings,
      aiSkills: opponents.map((_, i) => riderSkill(CIRCUIT_SKILLS[skill], i)),
      holdS: lo + this.random() * (hi - lo),
    });
    this.emit();
  }

  tick(elapsedS: number): void {
    this.race = advanceCircuitRace(this.geo, this.models, this.race, this.input.read(), elapsedS);
    this.emit();
  }

  /** Space: start the lights from the grid; after the race, back to the grid. */
  go(): void {
    if (this.race.phase === 'grid') this.update(startLights(this.race));
    else if (this.race.phase === 'finished') this.restage();
  }

  handleAction = (action: InputAction): void => {
    switch (action) {
      case 'toggleTimer':
        return this.go();
      case 'reset':
        return this.update(resetPlayer(this.geo, this.models, this.race));
      case 'shiftUp':
        return this.update(shiftCircuitPlayer(this.models, this.race, 1));
      case 'shiftDown':
        return this.update(shiftCircuitPlayer(this.models, this.race, -1));
      case 'startEngine':
        return this.update(startCircuitPlayerEngine(this.models, this.race));
      case 'toggleCamera':
        return this.onToggleCamera();
    }
  };

  snapshot(): CircuitSnapshot {
    return { race: this.race, geo: this.geo, models: this.models, names: this.config.names };
  }

  dispose(): void {
    this.input.dispose();
  }

  private update(race: CircuitRaceState): void {
    if (race === this.race) return;
    this.race = race;
    this.emit();
  }

  private emit(): void {
    this.publish(this.snapshot());
  }
}
