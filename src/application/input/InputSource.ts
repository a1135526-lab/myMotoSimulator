import type { ControlCommand } from '@/domain';

/** One-shot actions triggered by the rider (not held). */
export type InputAction = 'reset' | 'toggleTimer' | 'shiftUp' | 'shiftDown' | 'startEngine';
export type ActionListener = (action: InputAction) => void;

/**
 * Any device that can drive the simulator: keyboard, on-screen touch
 * buttons, a gamepad later. The controller polls `read()` every frame.
 */
export interface InputSource {
  read(): ControlCommand;
  dispose(): void;
}

export const RELEASED: ControlCommand = {
  throttlePressed: false,
  brakePressed: false,
  clutchPressed: false,
};

/** OR-combines several sources so keyboard and touch work together. */
export class CompositeInputSource implements InputSource {
  private readonly sources = new Set<InputSource>();

  add(source: InputSource): () => void {
    this.sources.add(source);
    return () => {
      this.sources.delete(source);
      source.dispose();
    };
  }

  read(): ControlCommand {
    let throttlePressed = false;
    let brakePressed = false;
    let clutchPressed = false;
    for (const source of this.sources) {
      const c = source.read();
      throttlePressed ||= c.throttlePressed;
      brakePressed ||= c.brakePressed;
      clutchPressed ||= c.clutchPressed;
    }
    return { throttlePressed, brakePressed, clutchPressed };
  }

  dispose(): void {
    for (const source of this.sources) source.dispose();
    this.sources.clear();
  }
}
