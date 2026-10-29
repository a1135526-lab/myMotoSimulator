import type { ControlCommand } from '@/domain';
import type { ActionListener, InputAction, InputSource } from './InputSource';

/** Held controls. */
const THROTTLE_KEYS = new Set(['ArrowUp', 'KeyW']);
const BRAKE_KEYS = new Set(['ArrowDown', 'KeyS']);
const CLUTCH_KEYS = new Set(['ShiftLeft', 'ShiftRight', 'KeyC']);
const HELD_KEYS = new Set([...THROTTLE_KEYS, ...BRAKE_KEYS, ...CLUTCH_KEYS]);

/** One-shot actions; the browser default is suppressed for these codes. */
const ACTION_KEYS: ReadonlyMap<string, InputAction> = new Map([
  ['KeyR', 'reset'],
  ['Space', 'toggleTimer'],
  ['ArrowRight', 'shiftUp'],
  ['KeyE', 'shiftUp'],
  ['ArrowLeft', 'shiftDown'],
  ['KeyQ', 'shiftDown'],
  ['Enter', 'startEngine'],
]);

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
 * ↑ / W throttle, ↓ / S brake, Shift / C clutch (hold),
 * → / E upshift, ← / Q downshift, Enter start engine,
 * R reset, Space start/stop timer.
 * All keys are released when the window loses focus so the bike never
 * "sticks" at full throttle.
 */
export class KeyboardInputSource implements InputSource {
  private readonly held = new Set<string>();

  constructor(
    private readonly target: Pick<Window, 'addEventListener' | 'removeEventListener'>,
    private readonly onAction: ActionListener,
  ) {
    target.addEventListener('keydown', this.handleDown);
    target.addEventListener('keyup', this.handleUp);
    target.addEventListener('blur', this.releaseAll);
  }

  read(): ControlCommand {
    const has = (keys: Set<string>) => [...keys].some((k) => this.held.has(k));
    return {
      throttlePressed: has(THROTTLE_KEYS),
      brakePressed: has(BRAKE_KEYS),
      clutchPressed: has(CLUTCH_KEYS),
    };
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
    if (HELD_KEYS.has(e.code)) {
      e.preventDefault();
      this.held.add(e.code);
      return;
    }
    const action = ACTION_KEYS.get(e.code);
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
