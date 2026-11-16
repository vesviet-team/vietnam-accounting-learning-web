// Register UI in Settings → AccountSection (P1: open the registration path
// in production). Login stays on the OAuth authorize redirect flow — there is
// no JSON /auth/login endpoint by design.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

const { loginMock } = vi.hoisted(() => ({ loginMock: vi.fn(async () => undefined) }));
vi.mock('@/services/auth/auth-service', () => ({
  authService: {
    getUser: () => null,
    isAuthenticated: () => false,
    onAuthChange: () => () => undefined,
    login: loginMock,
    logout: loginMock,
  },
}));
vi.mock('@/services/sync/sync-service', () => ({
  syncService: {
    getStatus: () => ({ status: 'idle', lastSyncAt: null }),
    onStatusChange: () => () => undefined,
  },
}));

const { registerAccountMock } = vi.hoisted(() => ({ registerAccountMock: vi.fn() }));
vi.mock('@/services/auth/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/auth/api')>();
  return { ...actual, registerAccount: registerAccountMock };
});

import { AccountSection } from '@/components/settings/AccountSection';
import { RegisterError } from '@/services/auth/api';

function openRegisterForm() {
  render(<AccountSection />);
  fireEvent.click(screen.getByRole('button', { name: /Đăng ký/ }));
  return screen.getByTestId('register-form');
}

function fillForm(email: string, password: string, displayName = '') {
  fireEvent.change(screen.getByTestId('register-email'), { target: { value: email } });
  if (displayName) fireEvent.change(screen.getByTestId('register-display-name'), { target: { value: displayName } });
  fireEvent.change(screen.getByTestId('register-password'), { target: { value: password } });
}

async function submitForm() {
  // Submit the form directly to ensure onSubmit fires with current state
  await act(async () => {
    fireEvent.submit(screen.getByTestId('register-form'));
  });
}

describe('AccountSection — registration form (P1)', () => {
  beforeEach(() => {
    loginMock.mockClear();
    registerAccountMock.mockReset();
  });

  it('shows login + register buttons when logged out; register opens the form', () => {
    render(<AccountSection />);
    expect(screen.getByRole('button', { name: /Đăng nhập/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký/ }));
    expect(screen.getByTestId('register-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('register-cancel'));
    expect(screen.queryByTestId('register-form')).not.toBeInTheDocument();
  });

  it('rejects an invalid email client-side without calling the API', async () => {
    openRegisterForm();
    fillForm('not-an-email', 'password123');
    await submitForm();
    await waitFor(() => expect(screen.getByTestId('register-error')).toHaveTextContent(/email không hợp lệ/i));
    expect(registerAccountMock).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 8 chars (server policy mirror)', async () => {
    openRegisterForm();
    fillForm('a@b.vn', 'short');
    await submitForm();
    expect(await screen.findByTestId('register-error')).toHaveTextContent(/ít nhất 8 ký tự/i);
    expect(registerAccountMock).not.toHaveBeenCalled();
  });

  it('shows the Vietnamese email-taken message on 409 from the server', async () => {
    registerAccountMock.mockRejectedValue(
      new RegisterError(409, 'email_taken', 'email already registered'),
    );
    openRegisterForm();
    fillForm('a@b.vn', 'password123');
    await submitForm();
    expect(await screen.findByTestId('register-error')).toHaveTextContent(/đã được đăng ký/i);
  });

  it('shows the rate-limit message on 429 from the server', async () => {
    registerAccountMock.mockRejectedValue(new RegisterError(429, 'slow_down', ''));
    openRegisterForm();
    fillForm('a@b.vn', 'password123');
    await submitForm();
    expect(await screen.findByTestId('register-error')).toHaveTextContent(/quá nhiều lần/i);
  });

  it('on success shows a message and starts the standard login flow', async () => {
    registerAccountMock.mockResolvedValue({ id: 'u1', email: 'a@b.vn', display_name: '' });
    openRegisterForm();
    fillForm('a@b.vn', 'password123', 'An');
    await submitForm();
    await waitFor(() => expect(loginMock).toHaveBeenCalledTimes(1));
    expect(registerAccountMock).toHaveBeenCalledWith('a@b.vn', 'password123', 'An');
    expect(screen.getByText(/Đã tạo tài khoản thành công/i)).toBeInTheDocument();
  });
});
