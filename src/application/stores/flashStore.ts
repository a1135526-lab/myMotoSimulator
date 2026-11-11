import { create } from 'zustand';
import { useCircuitStore } from './circuitStore';

/** Headlight flashes allowed per race. */
export const MAX_FLASHES = 3;

interface FlashState {
  /** Flashing is only for circuits raced at night. */
  readonly night: boolean;
  /** Flashes used this race. */
  readonly used: number;
  /** When you last flashed (performance.now ms), for your own beam on screen. */
  readonly flashedAt: number | null;
  /** When someone behind flashed you (performance.now ms): your screen goes white a moment. */
  readonly dazzledAt: number | null;
  setNight(night: boolean): void;
  /** Flash the headlight; false when it can't (day circuit, not racing, none left). */
  flash(): boolean;
  dazzle(): void;
}

const now = () => performance.now();

export const useFlashStore = create<FlashState>()((set, get) => ({
  night: false,
  used: 0,
  flashedAt: null,
  dazzledAt: null,
  setNight: (night) => set({ night }),
  flash: () => {
    const { night, used } = get();
    const racing = useCircuitStore.getState().view?.phase === 'racing';
    if (!night || !racing || used >= MAX_FLASHES) return false;
    set({ used: used + 1, flashedAt: now() });
    return true;
  },
  dazzle: () => set({ dazzledAt: now() }),
}));

export const flashesLeft = (s: Pick<FlashState, 'used'>): number => MAX_FLASHES - s.used;

// Every race starts with the lights: a fresh three flashes, nobody dazzled.
useCircuitStore.subscribe((s, prev) => {
  if (s.view?.phase === 'lights' && prev.view?.phase !== 'lights') {
    useFlashStore.setState({ used: 0, flashedAt: null, dazzledAt: null });
  }
});
