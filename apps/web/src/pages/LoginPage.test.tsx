import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthContext';
import { GuestOnly } from '../auth/guards';
import { mockFetch, renderWithProviders } from '../test/render';
import { LoginPage } from './LoginPage';

const user = {
  id: 'u1',
  email: 'ana@example.com',
  name: 'Ana',
  currency: 'EUR',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderLogin() {
  return renderWithProviders(
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={
            <GuestOnly>
              <LoginPage />
            </GuestOnly>
          }
        />
        <Route path="/" element={<p>Dashboard</p>} />
      </Routes>
    </AuthProvider>,
    { route: '/login' },
  );
}

describe('LoginPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the error returned by the API', async () => {
    mockFetch({
      'GET /api/auth/me': () => ({ status: 401, body: { error: { message: 'Unauthorized' } } }),
      'POST /api/auth/login': () => ({
        status: 401,
        body: { error: { code: 'invalid_credentials', message: 'Invalid email or password' } },
      }),
    });
    renderLogin();

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('signs in and goes to the dashboard', async () => {
    const fetchMock = mockFetch({
      'GET /api/auth/me': () => ({ status: 401 }),
      'POST /api/auth/login': () => ({ status: 200, body: { user } }),
    });
    renderLogin();

    await userEvent.type(await screen.findByLabelText('Email'), 'ana@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'correct horse');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
    const loginCall = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/auth/login'));
    expect(JSON.parse(String(loginCall?.[1]?.body))).toEqual({
      email: 'ana@example.com',
      password: 'correct horse',
    });
  });

  it('sends signed-in users straight to the app', async () => {
    mockFetch({ 'GET /api/auth/me': () => ({ status: 200, body: { user } }) });
    renderLogin();
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });
});
