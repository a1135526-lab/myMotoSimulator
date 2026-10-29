import {
  advance,
  buildModel,
  createInitialState,
  IDLE_TIMER,
  NEUTRAL_INPUT,
  shiftGear,
  startEngine,
  toggleTimer,
  updateTimer,
  type SimConfig,
  type SimModel,
  type SimState,
  type StepperState,
  type TimerState,
} from '@/domain';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';

export interface SimSnapshot {
  readonly sim: SimState;
  readonly timer: TimerState;
}

export type SnapshotListener = (snapshot: SimSnapshot) => void;

/**
 * Owns the running simulation outside React. The render loop calls
 * `tick(elapsed)`; the controller advances physics at the fixed timestep,
 * feeds every step to the performance timer, and publishes one snapshot.
 */
export class SimulationController {
  readonly input = new CompositeInputSource();
  readonly touch = new TouchInputSource();
  private model: SimModel;
  private stepper: StepperState;
  private timer: TimerState = IDLE_TIMER;

  constructor(
    config: SimConfig,
    private readonly publish: SnapshotListener,
  ) {
    this.model = buildModel(config);
    this.stepper = this.initialStepper();
    this.input.add(this.touch);
  }

  /** Swap parts without stopping: physics continues from the current state. */
  setConfig(config: SimConfig): void {
    this.model = buildModel(config);
  }

  tick(elapsedS: number): void {
    const { stepper, states } = advance(this.model, this.stepper, this.input.read(), elapsedS);
    this.stepper = stepper;
    for (const s of states) this.timer = updateTimer(this.timer, s);
    if (states.length > 0) this.emit();
  }

  /** Back to standstill at idle. An armed/running timer re-arms for the next launch. */
  reset(): void {
    this.stepper = this.initialStepper();
    if (this.timer.phase !== 'idle') this.timer = toggleTimer(IDLE_TIMER);
    this.emit();
  }

  toggleTimer(): void {
    this.timer = toggleTimer(this.timer);
    this.emit();
  }

  /** Manual bikes: sequential shift. No-op on scooters. */
  shift(direction: 1 | -1): void {
    this.updateSim((sim) => shiftGear(this.model, sim, direction));
  }

  /** Starter button; refused in gear unless the clutch is pulled in. */
  startEngine(): void {
    this.updateSim((sim) => startEngine(this.model, sim));
  }

  handleAction = (action: InputAction): void => {
    switch (action) {
      case 'reset':
        return this.reset();
      case 'toggleTimer':
        return this.toggleTimer();
      case 'shiftUp':
        return this.shift(1);
      case 'shiftDown':
        return this.shift(-1);
      case 'startEngine':
        return this.startEngine();
      case 'toggleCamera':
        return;
    }
  };

  private updateSim(fn: (sim: SimState) => SimState): void {
    const sim = fn(this.stepper.sim);
    if (sim === this.stepper.sim) return;
    this.stepper = { ...this.stepper, sim };
    this.emit();
  }

  snapshot(): SimSnapshot {
    return { sim: this.stepper.sim, timer: this.timer };
  }

  dispose(): void {
    this.input.dispose();
  }

  private initialStepper(): StepperState {
    return { sim: createInitialState(this.model), input: NEUTRAL_INPUT, accumulatorS: 0 };
  }

  private emit(): void {
    this.publish(this.snapshot());
  }
}
