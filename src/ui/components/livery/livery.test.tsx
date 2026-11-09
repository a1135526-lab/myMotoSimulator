import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLiveryStore } from '@/application';
import { LiveryButton } from './LiveryDialog';

describe('livery settings', () => {
  it('a preset or a colour picker changes your colours', () => {
    render(<LiveryButton />);
    fireEvent.click(screen.getByTestId('open-livery'));
    fireEvent.click(screen.getByRole('button', { name: /賽道藍/ }));
    expect(useLiveryStore.getState().livery.body).toBe('#1e5bd8');
    fireEvent.change(screen.getByTestId('livery-helmet'), { target: { value: '#00ff00' } });
    expect(useLiveryStore.getState().livery.helmet).toBe('#00ff00');
  });
});
