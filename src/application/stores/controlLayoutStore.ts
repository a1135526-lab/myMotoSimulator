import { create } from 'zustand';

/** Every button the full-screen (phone on its side) controls can show. */
export const OVERLAY_BUTTONS = [
  'steerLeft',
  'steerRight',
  'brake',
  'throttle',
  'clutch',
  'reverse',
  'reset',
  'start',
  'shiftDown',
  'shiftUp',
  'item',
] as const;
export type OverlayButton = (typeof OVERLAY_BUTTONS)[number];

/**
 * The drag strip has no steering, so its brake lives under the left thumb;
 * circuit and street share a layout.
 */
export type ControlLayoutKind = 'drag' | 'steer';

/** A button's centre, as a share (0–1) of the screen area clear of notches. */
export interface ButtonSpot {
  readonly x: number;
  readonly y: number;
}

export type ButtonSpots = Partial<Record<OverlayButton, ButtonSpot>>;

export const MIN_BUTTON_SCALE = 0.7;
export const MAX_BUTTON_SCALE = 1.5;

interface ControlLayoutState {
  /** Where the rider moved buttons to; anything missing sits in its default spot. */
  readonly spots: Readonly<Record<ControlLayoutKind, ButtonSpots>>;
  /** Size of every button, 1 = default. */
  readonly scale: number;
  /** Dragging buttons around instead of riding with them. */
  readonly editing: boolean;
  moveButton(kind: ControlLayoutKind, id: OverlayButton, spot: ButtonSpot): void;
  setScale(scale: number): void;
  resetLayout(kind: ControlLayoutKind): void;
  setEditing(editing: boolean): void;
}

const KEY = 'scooter-dyno:control-layout';
const EMPTY: Record<ControlLayoutKind, ButtonSpots> = { drag: {}, steer: {} };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const clampScale = (s: number) => Math.min(MAX_BUTTON_SCALE, Math.max(MIN_BUTTON_SCALE, s));

/** Only well-formed spots for known buttons survive; anything else is dropped. */
function cleanSpots(raw: unknown): ButtonSpots {
  if (!raw || typeof raw !== 'object') return {};
  const out: ButtonSpots = {};
  for (const id of OVERLAY_BUTTONS) {
    const s = (raw as Record<string, unknown>)[id];
    if (!s || typeof s !== 'object') continue;
    const { x, y } = s as { x?: unknown; y?: unknown };
    if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) {
      out[id] = { x: clamp01(x), y: clamp01(y) };
    }
  }
  return out;
}

/** Per-viewer convenience only; storage may be blocked, so every access is guarded. */
function load(): Pick<ControlLayoutState, 'spots' | 'scale'> {
  try {
    const raw = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? 'null') as {
      spots?: Record<string, unknown>;
      scale?: unknown;
    } | null;
    return {
      spots: { drag: cleanSpots(raw?.spots?.drag), steer: cleanSpots(raw?.spots?.steer) },
      scale: typeof raw?.scale === 'number' ? clampScale(raw.scale) : 1,
    };
  } catch {
    return { spots: EMPTY, scale: 1 };
  }
}

function save(state: Pick<ControlLayoutState, 'spots' | 'scale'>): void {
  try {
    globalThis.localStorage?.setItem(
      KEY,
      JSON.stringify({ spots: state.spots, scale: state.scale }),
    );
  } catch {
    // Not persisted; the layout still applies for this visit.
  }
}

export const useControlLayoutStore = create<ControlLayoutState>()((set, get) => {
  const persist = (patch: Partial<Pick<ControlLayoutState, 'spots' | 'scale'>>) => {
    set(patch);
    save(get());
  };
  return {
    ...load(),
    editing: false,
    moveButton: (kind, id, spot) =>
      persist({
        spots: {
          ...get().spots,
          [kind]: { ...get().spots[kind], [id]: { x: clamp01(spot.x), y: clamp01(spot.y) } },
        },
      }),
    setScale: (scale) => persist({ scale: clampScale(scale) }),
    resetLayout: (kind) => persist({ spots: { ...get().spots, [kind]: {} }, scale: 1 }),
    setEditing: (editing) => set({ editing }),
  };
});
