import { RELEASED, type InputCommand, type InputSource } from './InputSource';

export type TouchControl = 'throttle' | 'brake' | 'clutch' | 'steerLeft' | 'steerRight' | 'reverse';

const FIELD: Record<TouchControl, keyof InputCommand> = {
  throttle: 'throttlePressed',
  brake: 'brakePressed',
  clutch: 'clutchPressed',
  steerLeft: 'steerLeftPressed',
  steerRight: 'steerRightPressed',
  reverse: 'reversePressed',
};

/** Backs the on-screen buttons; UI calls press/release from pointer events. */
export class TouchInputSource implements InputSource {
  private state: InputCommand = RELEASED;

  press(control: TouchControl): void {
    this.state = { ...this.state, [FIELD[control]]: true };
  }

  release(control: TouchControl): void {
    this.state = { ...this.state, [FIELD[control]]: false };
  }

  read(): InputCommand {
    return this.state;
  }

  dispose(): void {
    this.state = RELEASED;
  }
}
