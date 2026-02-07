import type { ComponentType, SVGProps } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth, useUser } from '../auth/AuthContext';
import { DashboardIcon, ListIcon, LogoutIcon, PieIcon, SettingsIcon, WalletIcon } from './icons';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/transactions', label: 'Transactions', icon: ListIcon },
  { to: '/accounts', label: 'Accounts', icon: WalletIcon },
  { to: '/budgets', label: 'Budgets', icon: PieIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Layout() {
  const user = useUser();
  const { logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>Finance</span>
        </div>

        <nav className="sidebar__nav" aria-label="Main">
          {NAV.map(({ to, label, icon: IconComponent }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
            >
              <IconComponent />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="sidebar__user-text">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </span>
          </div>
          <button className="nav-link nav-link--button" onClick={() => void logout()}>
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
