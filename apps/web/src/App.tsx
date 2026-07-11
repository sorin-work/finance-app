import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { GuestOnly, RequireAuth } from './auth/guards';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

// Pages behind the login are split into their own chunks; the charting
// library in particular is only downloaded when a page with charts opens.
function page<T extends string>(name: T, load: () => Promise<Record<T, ComponentType>>) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const DashboardPage = page('DashboardPage', () => import('./pages/DashboardPage'));
const TransactionsPage = page('TransactionsPage', () => import('./pages/TransactionsPage'));
const AccountsPage = page('AccountsPage', () => import('./pages/AccountsPage'));
const BudgetsPage = page('BudgetsPage', () => import('./pages/BudgetsPage'));
const RecurringPage = page('RecurringPage', () => import('./pages/RecurringPage'));
const GoalsPage = page('GoalsPage', () => import('./pages/GoalsPage'));
const ReportsPage = page('ReportsPage', () => import('./pages/ReportsPage'));
const SettingsPage = page('SettingsPage', () => import('./pages/SettingsPage'));

function Loading({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="page-loading" aria-busy="true">
          <span className="spinner" aria-label="Loading" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

const ROUTES: { path?: string; Page: ComponentType }[] = [
  { Page: DashboardPage },
  { path: 'transactions', Page: TransactionsPage },
  { path: 'accounts', Page: AccountsPage },
  { path: 'budgets', Page: BudgetsPage },
  { path: 'recurring', Page: RecurringPage },
  { path: 'goals', Page: GoalsPage },
  { path: 'reports', Page: ReportsPage },
  { path: 'settings', Page: SettingsPage },
];

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
        {ROUTES.map(({ path, Page }) => (
          <Route
            key={path ?? 'index'}
            index={path === undefined}
            path={path}
            element={
              <Loading>
                <Page />
              </Loading>
            }
          />
        ))}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
