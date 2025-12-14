import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

function FullPageSpinner() {
  return (
    <div className="full-page-center" aria-busy="true">
      <span className="spinner" aria-label="Loading" />
    </div>
  );
}

/** Renders children only for signed-in users; everyone else goes to /login. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children;
}

/** Login and sign-up pages: signed-in users are sent to the app instead. */
export function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  if (status === 'loading') return <FullPageSpinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return children;
}
