import {
  advanceRace,
  buildModel,
  createRace,
  shiftPlayer,
  SKILLS,
  startCountdown,
  startPlayerEngine,
  type RaceModels,
  type RaceSettings,
  type RaceState,
  type RiderSkill,
  type SimConfig,
} from '@/domain';
import { CompositeInputSource, type InputAction } from '../input/InputSource';
import { TouchInputSource } from '../input/TouchInputSource';

export interface RaceSnapshot {
  readonly race: RaceState;
  readonly models: RaceModels;
}

export interface RaceConfig {
  readonly player: SimConfig;
  readonly opponent: SimConfig;
  readonly opponentSkill: RiderSkill;
  readonly settings: RaceSettings;
}

/** Stage delay before the first amber: random so the green can't be anticipated. */
export const STAGE_DELAY_RANGE_S: readonly [number, number] = [1.0, 2.5];

/**
 * Owns a running drag race outside React, like SimulationController does for
 * the free-ride simulator. Randomness (stage delay, opponent reaction jitter)
 * is injected so tests are deterministic.
 */
export class RaceController {
  readonly input = new CompositeInputSource();
  readonly touch = new TouchInputSource();
  private models!: RaceModels;
  private race!: RaceState;
  private config: RaceConfig;

  constructor(
    config: RaceConfig,
    private readonly publish: (snapshot: RaceSnapshot) => void,
    private readonly random: () => number = Math.random,
  ) {
    this.config = config;
    this.input.add(this.touch);
    this.restage();
  }

  /** New bikes / distance / opponent: rebuild and go back to the line. */
  configure(config: RaceConfig): void {
    this.config = config;
    this.restage();
  }

  restage(): void {
    const { player, opponent, opponentSkill, settings } = this.config;
    this.models = { player: buildModel(player), opponent: buildModel(opponent) };
    const skill = SKILLS[opponentSkill];
    const [lo, hi] = STAGE_DELAY_RANGE_S;
    this.race = createRace(this.models, {
      settings,
      opponentSkill: skill,
      opponentReactionS: Math.max(
        0.1,
        skill.reactionS + (this.random() * 2 - 1) * skill.reactionJitterS,
      ),
      stageDelayS: lo + this.random() * (hi - lo),
    });
    this.emit();
  }

  tick(elapsedS: number): void {
    this.race = advanceRace(this.models, this.race, this.input.read(), elapsedS);
    this.emit();
  }

  /** Space: start the tree when staged; after a race, go back to the line. */
  go(): void {
    if (this.race.phase === 'staged') {
      this.race = startCountdown(this.race);
      this.emit();
    } else if (this.race.phase === 'finished') {
      this.restage();
    }
  }

  shift(direction: 1 | -1): void {
    this.update(shiftPlayer(this.models, this.race, direction));
  }

  startEngine(): void {
    this.update(startPlayerEngine(this.models, this.race));
  }

  handleAction = (action: InputAction): void => {
    switch (action) {
      case 'toggleTimer':
        return this.go();
      case 'reset':
        return this.restage();
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

  snapshot(): RaceSnapshot {
    return { race: this.race, models: this.models };
  }

  dispose(): void {
    this.input.dispose();
  }

  private update(race: RaceState): void {
    if (race === this.race) return;
    this.race = race;
    this.emit();
  }

  private emit(): void {
    this.publish(this.snapshot());
  }
}
