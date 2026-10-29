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
    expect(kb.read()).toEqual({ throttlePressed: true, brakePressed: false, clutchPressed: false });
    target.dispatchEvent(key('keydown', 'ArrowDown'));
    expect(kb.read().brakePressed).toBe(true);
    target.dispatchEvent(key('keyup', 'ArrowUp'));
    expect(kb.read().throttlePressed).toBe(false);
    target.dispatchEvent(new Event('blur'));
    expect(kb.read()).toEqual({
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
    expect(composite.read()).toEqual({
      throttlePressed: true,
      brakePressed: true,
      clutchPressed: false,
    });

    removeB();
    expect(composite.read()).toEqual({
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
