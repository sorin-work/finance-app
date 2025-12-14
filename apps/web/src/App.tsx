import { Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth/AuthContext';
import { GuestOnly, RequireAuth } from './auth/guards';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function Home() {
  const { user, logout } = useAuth();
  return (
    <main className="placeholder">
      <h1>Hi, {user?.name}</h1>
      <p>Your dashboard is on its way.</p>
      <button className="button" onClick={() => void logout()}>
        Sign out
      </button>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <LoginPage />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <RegisterPage />
          </GuestOnly>
        }
      />
      <Route
        path="/"
        element={
          <RequireAuth>
            <Home />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
