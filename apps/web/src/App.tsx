import { Navigate, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import { Layout } from './components/Layout';
import { PageHeader } from './components/PageHeader';
import { AccountsPage } from './pages/AccountsPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function ComingSoon({ title }: { title: string }) {
  return <PageHeader title={title} description="Coming soon." />;
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
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<ComingSoon title="Dashboard" />} />
        <Route path="transactions" element={<ComingSoon title="Transactions" />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="settings" element={<ComingSoon title="Settings" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
