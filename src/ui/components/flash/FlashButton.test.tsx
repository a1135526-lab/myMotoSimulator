import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore, useFlashStore, type CircuitView } from '@/application';
import { FlashButton } from './FlashButton';
import { FlashOverlay } from './FlashOverlay';

const racing = () =>
  useCircuitStore.setState({ view: { phase: 'racing' } as unknown as CircuitView });

describe('FlashButton', () => {
  beforeEach(() => {
    useFlashStore.setState({ night: true, used: 0, flashedAt: null, dazzledAt: null });
    racing();
  });

  it('is only there on night circuits', () => {
    useFlashStore.setState({ night: false });
    render(<FlashButton />);
    expect(screen.queryByTestId('flash-button')).not.toBeInTheDocument();
  });

  it('counts down three flashes, then stops', () => {
    render(<FlashButton />);
    const button = screen.getByTestId('flash-button');
    expect(button).toHaveTextContent('剩 3');
    for (let i = 0; i < 3; i++) fireEvent.click(button);
    expect(button).toHaveTextContent('剩 0');
    expect(button).toBeDisabled();
  });

  it('a flash from behind whites the screen out a moment', () => {
    render(<FlashOverlay />);
    expect(screen.queryByTestId('flash-dazzle')).not.toBeInTheDocument();
    act(() => useFlashStore.getState().dazzle());
    expect(screen.getByTestId('flash-dazzle')).toBeInTheDocument();
  });
});
