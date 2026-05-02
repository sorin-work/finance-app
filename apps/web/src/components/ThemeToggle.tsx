import { useTheme, type Theme } from '../hooks/useTheme';

const NEXT: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<Theme, string> = {
  system: 'Theme: system',
  light: 'Theme: light',
  dark: 'Theme: dark',
};
const ICON: Record<Theme, string> = { system: '◐', light: '☀', dark: '☾' };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="nav-link nav-link--button theme-toggle"
      onClick={() => setTheme(NEXT[theme])}
      title="Switch between system, light and dark"
    >
      <span aria-hidden="true" style={{ width: 18, textAlign: 'center' }}>
        {ICON[theme]}
      </span>
      {LABEL[theme]}
    </button>
  );
}
