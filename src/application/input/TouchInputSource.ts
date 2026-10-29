import type { ControlCommand } from '@/domain';
import { RELEASED, type InputSource } from './InputSource';

export type TouchControl = 'throttle' | 'brake' | 'clutch';

const FIELD: Record<TouchControl, keyof ControlCommand> = {
  throttle: 'throttlePressed',
  brake: 'brakePressed',
  clutch: 'clutchPressed',
};

/** Backs the on-screen buttons; UI calls press/release from pointer events. */
export class TouchInputSource implements InputSource {
  private state: ControlCommand = RELEASED;

  press(control: TouchControl): void {
    this.state = { ...this.state, [FIELD[control]]: true };
  }

  release(control: TouchControl): void {
    this.state = { ...this.state, [FIELD[control]]: false };
  }

  read(): ControlCommand {
    return this.state;
  }

  dispose(): void {
    this.state = RELEASED;
  }
}
