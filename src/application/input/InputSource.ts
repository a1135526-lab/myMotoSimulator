import type { StreetCommand } from '@/domain';

/**
 * Everything a device can hold down; steering is only used on circuits and
 * in the city, reverse only in the city.
 */
export type InputCommand = StreetCommand;

/** One-shot actions triggered by the rider (not held). */
export type InputAction =
  'reset' | 'toggleTimer' | 'shiftUp' | 'shiftDown' | 'startEngine' | 'toggleCamera' | 'toggleMap';
export type ActionListener = (action: InputAction) => void;

/**
 * Any device that can drive the simulator: keyboard, on-screen touch
 * buttons, a gamepad later. The controller polls `read()` every frame.
 */
export interface InputSource {
  read(): InputCommand;
  dispose(): void;
}

export const RELEASED: InputCommand = {
  throttlePressed: false,
  brakePressed: false,
  clutchPressed: false,
  steerLeftPressed: false,
  steerRightPressed: false,
  reversePressed: false,
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

  read(): InputCommand {
    const out = { ...RELEASED };
    for (const source of this.sources) {
      const c = source.read();
      for (const key of Object.keys(out) as (keyof InputCommand)[]) out[key] ||= c[key];
    }
    return out;
  }

  dispose(): void {
    for (const source of this.sources) source.dispose();
    this.sources.clear();
  }
}
