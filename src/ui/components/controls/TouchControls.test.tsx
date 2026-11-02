import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TouchControls } from './TouchControls';

const setup = () => {
  const props = {
    onPress: vi.fn(),
    onRelease: vi.fn(),
    onReset: vi.fn(),
    onShift: vi.fn(),
    onStart: vi.fn(),
  };
  render(<TouchControls manual steering reverse {...props} />);
  const button = (name: string) => screen.getByRole('button', { name });
  return { props, button };
};

type PointerKind = 'pointerDown' | 'pointerUp' | 'pointerCancel';

/** jsdom has no PointerEvent, so pointerId / pointerType are set by hand. */
const pointer = (kind: PointerKind, el: HTMLElement, pointerId: number, pointerType = 'touch') => {
  const event = createEvent[kind](el);
  Object.defineProperties(event, {
    pointerId: { value: pointerId },
    pointerType: { value: pointerType },
  });
  fireEvent(el, event);
};

describe('TouchControls', () => {
  it('holds a control until the last finger on it lifts', () => {
    const { props, button } = setup();
    pointer('pointerDown', button('油門'), 1);
    pointer('pointerDown', button('油門'), 2);
    expect(props.onPress).toHaveBeenCalledTimes(1);
    pointer('pointerUp', button('油門'), 1);
    expect(props.onRelease).not.toHaveBeenCalled();
    pointer('pointerCancel', button('油門'), 2);
    expect(props.onRelease).toHaveBeenCalledWith('throttle');
  });

  it('several controls at once: hold the clutch, tap a shift', () => {
    const { props, button } = setup();
    pointer('pointerDown', button('離合'), 1);
    pointer('pointerDown', button('升檔'), 2);
    pointer('pointerUp', button('升檔'), 2);
    fireEvent.click(button('升檔')); // the browser's echo of the tap
    expect(props.onPress).toHaveBeenCalledWith('clutch');
    expect(props.onShift).toHaveBeenCalledTimes(1);
    expect(props.onShift).toHaveBeenCalledWith(1);
    expect(props.onRelease).not.toHaveBeenCalled();
  });

  it('mouse and keyboard still use click', () => {
    const { props, button } = setup();
    pointer('pointerDown', button('發動'), 1, 'mouse');
    expect(props.onStart).not.toHaveBeenCalled();
    fireEvent.click(button('發動'));
    expect(props.onStart).toHaveBeenCalledTimes(1);
  });

  it('marks held buttons so they light up without :active', () => {
    const { button } = setup();
    pointer('pointerDown', button('倒車'), 1);
    expect(button('倒車')).toHaveAttribute('data-pressed');
    pointer('pointerUp', button('倒車'), 1);
    expect(button('倒車')).not.toHaveAttribute('data-pressed');
  });

  it('cancels native touches so iOS cannot turn a hold into a scroll or pinch', () => {
    const { button } = setup();
    const start = createEvent.touchStart(button('油門'), { cancelable: true });
    fireEvent(button('油門'), start);
    expect(start.defaultPrevented).toBe(true);
  });
});
