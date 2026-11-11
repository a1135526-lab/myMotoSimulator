import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type ReactElement,
} from 'react';
import {
  MAX_BUTTON_SCALE,
  MIN_BUTTON_SCALE,
  useControlLayoutStore,
  type ButtonSpot,
  type ControlLayoutKind,
  type OverlayButton,
} from '@/application';
import styles from './controls.module.css';

/** Default spot of a button centre: px in from a bottom corner, at size 1. */
interface Anchor {
  readonly corner: 'left' | 'right';
  readonly dx: number;
  readonly dy: number;
}

/**
 * Thumbs on the picture: steering (or the brake, on a drag strip) under the
 * left thumb, throttle under the right; the rest in a row just above them.
 */
function defaultAnchor(id: OverlayButton, kind: ControlLayoutKind, manual: boolean): Anchor {
  const left = (dx: number, dy: number): Anchor => ({ corner: 'left', dx, dy });
  const right = (dx: number, dy: number): Anchor => ({ corner: 'right', dx, dy });
  switch (id) {
    case 'steerLeft':
      return left(50, 48);
    case 'steerRight':
      return left(134, 48);
    case 'brake':
      return kind === 'drag' ? left(50, 48) : right(146, 48);
    case 'throttle':
      return right(54, 62);
    case 'clutch':
      return left(44, 120);
    case 'reverse':
      return left(manual ? 116 : 44, 120);
    case 'shiftUp':
      return right(42, 150);
    case 'shiftDown':
      return right(110, 150);
    case 'start':
      return right(174, 150);
    case 'reset':
      return manual ? right(234, 150) : right(40, 146);
    case 'item':
      return right(150, 128);
  }
}

interface Box {
  readonly width: number;
  readonly height: number;
}

function defaultSpot(anchor: Anchor, box: Box, scale: number): ButtonSpot {
  const dx = (anchor.dx * scale) / box.width;
  return { x: anchor.corner === 'left' ? dx : 1 - dx, y: 1 - (anchor.dy * scale) / box.height };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const SCALE_STEP = 0.1;

interface OverlayControlsProps {
  /** The buttons this mode shows, already wired to their actions. */
  readonly buttons: Partial<Record<OverlayButton, ReactElement>>;
  readonly kind: ControlLayoutKind;
  readonly manual: boolean;
}

/**
 * See-through buttons over the 3D picture, each where the rider left it.
 * In edit mode they don't ride: they drag to a new spot instead.
 */
export function OverlayControls({ buttons, kind, manual }: OverlayControlsProps) {
  const spots = useControlLayoutStore((s) => s.spots[kind]);
  const scale = useControlLayoutStore((s) => s.scale);
  const editing = useControlLayoutStore((s) => s.editing);
  const moveButton = useControlLayoutStore((s) => s.moveButton);
  const setEditing = useControlLayoutStore((s) => s.setEditing);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Box | null>(null);
  const [drag, setDrag] = useState<{ id: OverlayButton; spot: ButtonSpot } | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Leaving full screen (phone turned upright) also leaves edit mode.
  useEffect(() => () => setEditing(false), [setEditing]);

  const spotFor = (id: OverlayButton): ButtonSpot | null => {
    if (drag?.id === id) return drag.spot;
    const saved = spots[id];
    if (saved) return saved;
    return box ? defaultSpot(defaultAnchor(id, kind, manual), box, scale) : null;
  };

  const toSpot = (e: PointerEvent<HTMLElement>): ButtonSpot | null => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  };

  const dragHandlers = (id: OverlayButton) =>
    editing
      ? {
          onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            const spot = toSpot(e);
            if (spot) setDrag({ id, spot });
          },
          onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
            if (drag?.id !== id) return;
            const spot = toSpot(e);
            if (spot) setDrag({ id, spot });
          },
          onPointerUp: () => {
            if (drag?.id === id) moveButton(kind, id, drag.spot);
            setDrag(null);
          },
          onPointerCancel: () => setDrag(null),
        }
      : {};

  return (
    <div
      className={styles.safeBox}
      ref={boxRef}
      data-editing={editing || undefined}
      style={{ '--button-scale': scale } as CSSProperties}
    >
      {(Object.keys(buttons) as OverlayButton[]).map((id) => {
        const spot = spotFor(id);
        if (!spot) return null;
        return (
          <div
            key={id}
            className={styles.spot}
            style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
            data-button={id}
            data-dragging={drag?.id === id || undefined}
            {...dragHandlers(id)}
          >
            {buttons[id]}
          </div>
        );
      })}
    </div>
  );
}

/** Shown while editing: size, back to defaults, done. Outside the touch-blocking panel so taps click. */
export function LayoutEditPanel({ kind }: { readonly kind: ControlLayoutKind }) {
  const editing = useControlLayoutStore((s) => s.editing);
  const scale = useControlLayoutStore((s) => s.scale);
  const setScale = useControlLayoutStore((s) => s.setScale);
  const resetLayout = useControlLayoutStore((s) => s.resetLayout);
  const setEditing = useControlLayoutStore((s) => s.setEditing);
  if (!editing) return null;
  return (
    <div
      className={styles.editPanel}
      role="dialog"
      aria-label="調整按鈕位置"
      data-testid="layout-editor"
    >
      <span>拖曳按鈕到想要的位置</span>
      <span className={styles.editScale}>
        大小
        <button
          type="button"
          onClick={() => setScale(scale - SCALE_STEP)}
          disabled={scale <= MIN_BUTTON_SCALE + 1e-6}
          aria-label="按鈕縮小"
        >
          −
        </button>
        <output>{Math.round(scale * 100)}%</output>
        <button
          type="button"
          onClick={() => setScale(scale + SCALE_STEP)}
          disabled={scale >= MAX_BUTTON_SCALE - 1e-6}
          aria-label="按鈕放大"
        >
          ＋
        </button>
      </span>
      <button type="button" onClick={() => resetLayout(kind)} data-testid="layout-reset">
        重設
      </button>
      <button
        type="button"
        className={styles.editDone}
        onClick={() => setEditing(false)}
        data-testid="layout-done"
      >
        完成
      </button>
    </div>
  );
}
