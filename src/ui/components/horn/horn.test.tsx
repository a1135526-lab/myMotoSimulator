import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useHornStore } from '@/application';
import { HornButton } from './HornButton';
import { HornSettingsButton } from './HornSettingsDialog';

const CLIP = 'data:audio/webm;base64,AAAA';

describe('horn', () => {
  afterEach(() => {
    useHornStore.getState().setClip(null);
    useHornStore.getState().setPreset('standard');
    useHornStore.setState({ held: false });
  });

  it('sounds while the button is held', () => {
    render(<HornButton />);
    fireEvent.pointerDown(screen.getByTestId('horn-button'));
    expect(useHornStore.getState().held).toBe(true);
    fireEvent.pointerUp(screen.getByTestId('horn-button'));
    expect(useHornStore.getState().held).toBe(false);
  });

  it('settings: standard by default; custom only once something is recorded', () => {
    render(<HornSettingsButton />);
    fireEvent.click(screen.getByTestId('open-horn-settings'));
    expect(screen.getByTestId('horn-standard')).toBeChecked();
    expect(screen.getByTestId('horn-custom')).toBeDisabled();
    fireEvent.click(screen.getByTestId('horn-truck'));
    expect(useHornStore.getState().preset).toBe('truck');
  });

  it('a recording becomes the horn, and deleting it goes back to standard', () => {
    const store = useHornStore.getState();
    expect(store.setClip(CLIP)).toBe(true);
    expect(useHornStore.getState().preset).toBe('custom');
    expect(globalThis.localStorage.getItem('scooter-dyno:horn-clip')).toBe(CLIP);
    store.setClip(null);
    expect(useHornStore.getState().preset).toBe('standard');
    expect(store.setClip('not audio')).toBe(false);
  });
});
