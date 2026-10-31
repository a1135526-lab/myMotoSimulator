import { describe, expect, it, vi } from 'vitest';
import { CompositeInputSource } from './InputSource';
import { KeyboardInputSource } from './KeyboardInputSource';
import { TouchInputSource } from './TouchInputSource';

const key = (type: 'keydown' | 'keyup', code: string, init: KeyboardEventInit = {}) =>
  new KeyboardEvent(type, { code, cancelable: true, ...init });

describe('KeyboardInputSource', () => {
  it('tracks held throttle/brake keys and releases on blur', () => {
    const target = new EventTarget();
    const kb = new KeyboardInputSource(target, vi.fn());
    target.dispatchEvent(key('keydown', 'ArrowUp'));
    expect(kb.read()).toMatchObject({
      throttlePressed: true,
      brakePressed: false,
      clutchPressed: false,
    });
    target.dispatchEvent(key('keydown', 'ArrowDown'));
    expect(kb.read().brakePressed).toBe(true);
    target.dispatchEvent(key('keyup', 'ArrowUp'));
    expect(kb.read().throttlePressed).toBe(false);
    target.dispatchEvent(new Event('blur'));
    expect(kb.read()).toMatchObject({
      throttlePressed: false,
      brakePressed: false,
      clutchPressed: false,
    });
  });

  it('fires reset and timer actions once per press', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    new KeyboardInputSource(target, onAction);
    target.dispatchEvent(key('keydown', 'KeyR'));
    target.dispatchEvent(key('keydown', 'Space'));
    target.dispatchEvent(key('keydown', 'Space', { repeat: true }));
    expect(onAction.mock.calls).toEqual([['reset'], ['toggleTimer']]);
  });

  it('prevents page scroll on arrows', () => {
    const target = new EventTarget();
    new KeyboardInputSource(target, vi.fn());
    const event = key('keydown', 'ArrowUp');
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores keys typed into form fields', () => {
    const input = document.createElement('input');
    document.body.append(input);
    const kb = new KeyboardInputSource(window, vi.fn());
    input.dispatchEvent(key('keydown', 'ArrowUp', { bubbles: true }));
    expect(kb.read().throttlePressed).toBe(false);
    kb.dispose();
    input.remove();
  });

  it('stops listening after dispose', () => {
    const target = new EventTarget();
    const kb = new KeyboardInputSource(target, vi.fn());
    kb.dispose();
    target.dispatchEvent(key('keydown', 'ArrowUp'));
    expect(kb.read().throttlePressed).toBe(false);
  });
});

describe('TouchInputSource + CompositeInputSource', () => {
  it('ORs sources together and removes them cleanly', () => {
    const composite = new CompositeInputSource();
    const a = new TouchInputSource();
    const b = new TouchInputSource();
    composite.add(a);
    const removeB = composite.add(b);

    b.press('throttle');
    a.press('brake');
    expect(composite.read()).toMatchObject({
      throttlePressed: true,
      brakePressed: true,
      clutchPressed: false,
    });

    removeB();
    expect(composite.read()).toMatchObject({
      throttlePressed: false,
      brakePressed: true,
      clutchPressed: false,
    });
    a.release('brake');
    expect(composite.read().brakePressed).toBe(false);
    composite.dispose();
  });
});

describe('KeyboardInputSource (manual controls)', () => {
  it('holds the clutch on Shift and maps shift/start keys to actions', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    const kb = new KeyboardInputSource(target, onAction);
    target.dispatchEvent(key('keydown', 'ShiftLeft'));
    expect(kb.read().clutchPressed).toBe(true);
    target.dispatchEvent(key('keyup', 'ShiftLeft'));
    expect(kb.read().clutchPressed).toBe(false);
    for (const code of ['ArrowRight', 'KeyE', 'ArrowLeft', 'KeyQ', 'Enter']) {
      target.dispatchEvent(key('keydown', code));
    }
    expect(onAction.mock.calls.flat()).toEqual([
      'shiftUp',
      'shiftUp',
      'shiftDown',
      'shiftDown',
      'startEngine',
    ]);
  });

  it('lets focused buttons keep Enter', () => {
    const button = document.createElement('button');
    document.body.append(button);
    const onAction = vi.fn();
    const kb = new KeyboardInputSource(window, onAction);
    button.dispatchEvent(key('keydown', 'Enter', { bubbles: true }));
    expect(onAction).not.toHaveBeenCalled();
    kb.dispose();
    button.remove();
  });

  it('touch clutch presses and releases', () => {
    const touch = new TouchInputSource();
    touch.press('clutch');
    expect(touch.read().clutchPressed).toBe(true);
    touch.release('clutch');
    expect(touch.read().clutchPressed).toBe(false);
  });
});

describe('KeyboardInputSource (circuit layout)', () => {
  it('←/→ and A/D steer; E/Q shift; V toggles the camera', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    const kb = new KeyboardInputSource(target, onAction, 'circuit');
    target.dispatchEvent(key('keydown', 'ArrowLeft'));
    expect(kb.read().steerLeftPressed).toBe(true);
    target.dispatchEvent(key('keyup', 'ArrowLeft'));
    target.dispatchEvent(key('keydown', 'KeyD'));
    expect(kb.read().steerRightPressed).toBe(true);
    for (const code of ['KeyE', 'KeyQ', 'KeyV', 'ArrowRight']) {
      target.dispatchEvent(key('keydown', code));
    }
    // ArrowRight steers here, so it is not a shift.
    expect(onAction.mock.calls.flat()).toEqual(['shiftUp', 'shiftDown', 'toggleCamera']);
  });

  it('the standard layout still shifts on the arrows and never steers', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    const kb = new KeyboardInputSource(target, onAction);
    target.dispatchEvent(key('keydown', 'ArrowLeft'));
    expect(kb.read().steerLeftPressed).toBe(false);
    expect(onAction).toHaveBeenCalledWith('shiftDown');
  });

  it('the street layout holds X to reverse and M opens the map', () => {
    const target = new EventTarget();
    const onAction = vi.fn();
    const kb = new KeyboardInputSource(target, onAction, 'street');
    target.dispatchEvent(key('keydown', 'KeyX'));
    expect(kb.read().reversePressed).toBe(true);
    target.dispatchEvent(key('keyup', 'KeyX'));
    expect(kb.read().reversePressed).toBe(false);
    target.dispatchEvent(key('keydown', 'KeyM'));
    expect(onAction).toHaveBeenCalledWith('toggleMap');
  });

  it('only the street layout reverses', () => {
    const target = new EventTarget();
    const kb = new KeyboardInputSource(target, vi.fn(), 'circuit');
    target.dispatchEvent(key('keydown', 'KeyX'));
    expect(kb.read().reversePressed).toBe(false);
  });

  it('touch steering buttons', () => {
    const touch = new TouchInputSource();
    touch.press('steerRight');
    expect(touch.read().steerRightPressed).toBe(true);
    touch.press('reverse');
    expect(touch.read().reversePressed).toBe(true);
  });
});
