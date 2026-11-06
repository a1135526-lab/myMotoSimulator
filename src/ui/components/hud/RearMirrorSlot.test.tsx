import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useUiStore } from '@/application';
import { MirrorButton, RearMirrorSlot } from './RearMirrorSlot';

describe('rear-view mirror', () => {
  afterEach(() => useUiStore.setState({ mirrorHeld: false }));

  it('is off until held, and closes when let go', () => {
    render(
      <>
        <MirrorButton />
        <RearMirrorSlot />
      </>,
    );
    expect(screen.queryByTestId('rear-mirror')).toBeNull();
    fireEvent.pointerDown(screen.getByTestId('mirror-button'));
    expect(screen.getByTestId('rear-mirror')).toBeInTheDocument();
    fireEvent.pointerUp(screen.getByTestId('mirror-button'));
    expect(screen.queryByTestId('rear-mirror')).toBeNull();
  });
});
