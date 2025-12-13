import { useAuth } from './auth/AuthContext';

export function App() {
  const { user, status } = useAuth();

  return (
    <main className="placeholder">
      <h1>Finance</h1>
      {status === 'loading' && <p>Loading…</p>}
      {status === 'authenticated' && <p>Signed in as {user?.name}.</p>}
      {status === 'anonymous' && <p>Track accounts, spending and budgets in one place.</p>}
    </main>
  );
}
