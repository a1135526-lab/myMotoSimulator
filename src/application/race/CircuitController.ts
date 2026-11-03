import {
  advanceCircuitRace,
  buildCircuit,
  buildModel,
  CIRCUIT_SKILLS,
  createCircuitRace,
  resetPlayer,
  retireCircuitPlayer,
  riderSkill,
  shiftCircuitPlayer,
  startCircuitPlayerEngine,
  startLights,
  type CircuitGeometry,
  type CircuitRaceState,
  type CircuitSettings,
  type CircuitSkill,
  type GhostLap,
  type RiderSkill,
  type SimConfig,
  type SimModel,
} from '@/domain';
import type { CircuitSpec } from '@/data';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';
import { LapRecorder, type CompletedLap } from './lapRecorder';

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
  readonly autoClutch: boolean;
  /** Best lap so far on this circuit, to race against. */
  readonly ghost: GhostLap | null;
  /** Exact AI pace (ranked races), instead of the `skill` presets. */
  readonly aiSkill?: CircuitSkill;
}

export interface CircuitSnapshot {
  readonly race: CircuitRaceState;
  readonly geo: CircuitGeometry;
  readonly models: readonly SimModel[];
  readonly names: readonly string[];
  readonly ghost: GhostLap | null;
}

/** Every lap the player completes, with whether it was clean and its line. */
export type LapListener = (lap: CompletedLap) => void;

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
  private recorder = new LapRecorder();
  /** Racing in a friend room: Space / the start button don't start the lights. */
  private roomMode = false;
  /** A friend room's finish window has closed on you: end your race unfinished. */
  private outOfTime: (race: CircuitRaceState) => boolean = () => false;
  private ghost: GhostLap | null = null;

  constructor(
    config: CircuitConfig,
    private readonly publish: (snapshot: CircuitSnapshot) => void,
    private readonly onToggleCamera: () => void = () => undefined,
    private readonly random: () => number = Math.random,
    private readonly onLap: LapListener = () => undefined,
  ) {
    this.config = config;
    this.ghost = config.ghost;
    this.input.add(this.touch);
    this.restage();
  }

  /** New settings (or circuit): the ghost comes from them too. */
  configure(config: CircuitConfig): void {
    this.config = config;
    this.ghost = config.ghost;
    this.restage();
  }

  setRoomMode(on: boolean): void {
    this.roomMode = on;
  }

  setOutOfTime(check: (race: CircuitRaceState) => boolean): void {
    this.outOfTime = check;
  }

  /** A friend-room start: fresh grid, lights on, the same hold as everyone else. */
  startRoomRace(holdS: number): void {
    this.restage(holdS);
    this.update(startLights(this.race));
  }

  /** "Brand Model" of the player's bike. */
  private get bikeLabel(): string {
    const bike = this.config.player.bike;
    return `${bike.brand} ${bike.model}`;
  }

  /** Back to the grid; `holdS` fixes the hold after the fifth red (else random). */
  restage(holdS?: number): void {
    const { circuit, player, opponents, skill, laps, assist, brakeAssist, autoShift, autoClutch } =
      this.config;
    this.geo = buildCircuit(circuit.controlPoints, circuit.widthM / 2);
    this.models = [player, ...opponents].map(buildModel);
    const settings: CircuitSettings = {
      laps,
      assist,
      brakeAssist,
      autoShift,
      autoClutch,
      limits: { halfWidth: circuit.widthM / 2, runoffM: circuit.runoffM, gripG: circuit.gripG },
    };
    const [lo, hi] = LIGHTS_HOLD_RANGE_S;
    this.race = createCircuitRace(this.geo, this.models, {
      settings,
      aiSkills: opponents.map((_, i) =>
        riderSkill(this.config.aiSkill ?? CIRCUIT_SKILLS[skill], i),
      ),
      holdS: holdS ?? lo + this.random() * (hi - lo),
    });
    // A rematch keeps the ghost, including a best set in the last race.
    this.recorder = new LapRecorder();
    this.emit();
  }

  tick(elapsedS: number): void {
    this.race = advanceCircuitRace(this.geo, this.models, this.race, this.input.read(), elapsedS);
    if (this.race.riders[0]?.finishedAtS === null && this.outOfTime(this.race)) {
      this.race = retireCircuitPlayer(this.race);
    }
    const lap = this.recorder.observe(this.geo, this.race);
    if (lap) this.lapCompleted(lap);
    this.emit();
  }

  /** A faster clean lap becomes the ghost straight away, for the next lap. */
  private lapCompleted(lap: CompletedLap): void {
    if (lap.clean && (!this.ghost || lap.lapS < this.ghost.lapS)) {
      const manual = this.config.player.bike.kind === 'manual';
      this.ghost = { lapS: lap.lapS, samples: lap.samples, bike: this.bikeLabel, manual };
    }
    this.onLap(lap);
  }

  /** Space: start the lights from the grid; after the race, back to the grid. */
  go(): void {
    // In a friend room only the host starts the race, for everyone at once.
    if (this.roomMode) return;
    if (this.race.phase === 'grid') this.update(startLights(this.race));
    else if (this.race.phase === 'finished') this.restage();
  }

  handleAction = (action: InputAction): void => {
    switch (action) {
      case 'toggleTimer':
        return this.go();
      case 'reset':
        this.recorder.markDirty();
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
    return {
      race: this.race,
      geo: this.geo,
      models: this.models,
      names: this.config.names,
      ghost: this.ghost,
    };
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
