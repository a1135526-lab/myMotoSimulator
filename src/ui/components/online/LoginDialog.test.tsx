import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/application';
import { LoginDialog } from './LoginDialog';

afterEach(() => useAuthStore.setState({ loginOpen: false }));

describe('LoginDialog', () => {
  it('offers Google or a game account; registering checks the two passwords match', async () => {
    const { container } = render(<LoginDialog />);
    expect(container).toBeEmptyDOMElement();
    act(() => useAuthStore.setState({ loginOpen: true }));
    expect(screen.getByTestId('login-google')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('login-tab-register'));
    fireEvent.change(screen.getByTestId('login-account'), { target: { value: 'rider_01' } });
    fireEvent.change(screen.getByTestId('login-password'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByTestId('login-confirm'), { target: { value: 'secret2' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('兩次輸入的密碼不一樣')).toBeInTheDocument();
    fireEvent.change(screen.getByTestId('login-confirm'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByTestId('login-submit'));
    expect(await screen.findByText('這個版本沒有連線功能')).toBeInTheDocument();
  });
});
