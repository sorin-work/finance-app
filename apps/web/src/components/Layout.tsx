import { useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth, useUser } from '../auth/AuthContext';
import {
  ChartIcon,
  CloseIcon,
  DashboardIcon,
  ListIcon,
  LogoutIcon,
  MenuIcon,
  PieIcon,
  RepeatIcon,
  SettingsIcon,
  TargetIcon,
  WalletIcon,
} from './icons';
import { ThemeToggle } from './ThemeToggle';

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
  { to: '/recurring', label: 'Recurring', icon: RepeatIcon },
  { to: '/goals', label: 'Goals', icon: TargetIcon },
  { to: '/reports', label: 'Reports', icon: ChartIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Layout() {
  const user = useUser();
  const { logout } = useAuth();
  const location = useLocation();
  // On small screens the sidebar is a drop-down menu that closes on navigation.
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const menuOpen = menuFor === location.pathname;

  return (
    <div className="shell">
      <header className="topbar">
        <div className="sidebar__brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <span>Finance</span>
        </div>
        <button
          className="icon-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="sidebar"
          onClick={() => setMenuFor(menuOpen ? null : location.pathname)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      <aside id="sidebar" className={`sidebar${menuOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand sidebar__brand--desktop">
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
          <ThemeToggle />
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
