import {
  RELEASED,
  type ActionListener,
  type InputAction,
  type InputCommand,
  type InputSource,
} from './InputSource';

/**
 * Key layouts.
 *  standard (simulator / drag race):
 *    ↑/W throttle, ↓/S brake, Shift/C clutch, →/E up, ←/Q down,
 *    Enter start, R reset, Space start/timer.
 *  circuit (road racing): ←/→ and A/D steer, so shifting moves to E/Q only;
 *    V switches first / third person.
 *  street (free ride): the circuit keys plus X (hold) to reverse and M for
 *    the big map.
 */
export type KeyLayout = 'standard' | 'circuit' | 'street';

type Held = keyof InputCommand;

interface LayoutSpec {
  readonly held: ReadonlyMap<string, Held>;
  readonly actions: ReadonlyMap<string, InputAction>;
}

const COMMON_HELD: [string, Held][] = [
  ['ArrowUp', 'throttlePressed'],
  ['KeyW', 'throttlePressed'],
  ['ArrowDown', 'brakePressed'],
  ['KeyS', 'brakePressed'],
  ['ShiftLeft', 'clutchPressed'],
  ['ShiftRight', 'clutchPressed'],
  ['KeyC', 'clutchPressed'],
];

const COMMON_ACTIONS: [string, InputAction][] = [
  ['KeyR', 'reset'],
  ['Space', 'toggleTimer'],
  ['KeyE', 'shiftUp'],
  ['KeyQ', 'shiftDown'],
  ['Enter', 'startEngine'],
];

const CIRCUIT_HELD = new Map<string, Held>([
  ...COMMON_HELD,
  ['ArrowLeft', 'steerLeftPressed'],
  ['KeyA', 'steerLeftPressed'],
  ['ArrowRight', 'steerRightPressed'],
  ['KeyD', 'steerRightPressed'],
]);
const CIRCUIT_ACTIONS: [string, InputAction][] = [...COMMON_ACTIONS, ['KeyV', 'toggleCamera']];

const LAYOUTS: Readonly<Record<KeyLayout, LayoutSpec>> = {
  standard: {
    held: new Map(COMMON_HELD),
    actions: new Map([...COMMON_ACTIONS, ['ArrowRight', 'shiftUp'], ['ArrowLeft', 'shiftDown']]),
  },
  circuit: { held: CIRCUIT_HELD, actions: new Map(CIRCUIT_ACTIONS) },
  // The city adds X to paddle backwards and M for the big map.
  street: {
    held: new Map([...CIRCUIT_HELD, ['KeyX', 'reversePressed']]),
    actions: new Map([...CIRCUIT_ACTIONS, ['KeyM', 'toggleMap']]),
  },
};

/** Form controls keep their own arrow/space behaviour. */
const isEditable = (target: EventTarget | null): boolean => {
  if (!target || typeof target !== 'object' || !('tagName' in target)) return false;
  const tag = String(target.tagName).toUpperCase();
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
};

/** Buttons keep Enter / Space so keyboard users can still activate them. */
const isButton = (target: EventTarget | null): boolean =>
  !!target &&
  typeof target === 'object' &&
  'tagName' in target &&
  String(target.tagName).toUpperCase() === 'BUTTON';

/**
 * Keyboard input. All keys are released when the window loses focus so the
 * bike never "sticks" at full throttle.
 */
export class KeyboardInputSource implements InputSource {
  private readonly held = new Set<string>();
  private readonly layout: LayoutSpec;

  constructor(
    private readonly target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
    private readonly onAction: ActionListener,
    layout: KeyLayout = 'standard',
  ) {
    this.layout = LAYOUTS[layout];
    target.addEventListener('keydown', this.handleDown);
    target.addEventListener('keyup', this.handleUp);
    target.addEventListener('blur', this.releaseAll);
  }

  read(): InputCommand {
    const out = { ...RELEASED };
    for (const code of this.held) {
      const field = this.layout.held.get(code);
      if (field) out[field] = true;
    }
    return out;
  }

  dispose(): void {
    this.target.removeEventListener('keydown', this.handleDown);
    this.target.removeEventListener('keyup', this.handleUp);
    this.target.removeEventListener('blur', this.releaseAll);
    this.held.clear();
  }

  private readonly handleDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (isEditable(e.target)) return;
    if (this.layout.held.has(e.code)) {
      e.preventDefault();
      this.held.add(e.code);
      return;
    }
    const action = this.layout.actions.get(e.code);
    if (!action) return;
    if ((e.code === 'Enter' || e.code === 'Space') && isButton(e.target)) return;
    e.preventDefault();
    if (!e.repeat) this.onAction(action);
  };

  private readonly handleUp = (event: Event): void => {
    this.held.delete((event as KeyboardEvent).code);
  };

  private readonly releaseAll = (): void => this.held.clear();
}
