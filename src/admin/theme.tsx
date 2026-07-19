import { useState } from 'react';
import { IconMoon, IconSun } from './components/icons';

type Theme = 'dark' | 'light';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

/** The bootstrap script in admin/index.html sets the attribute before first
 *  paint; this hook only flips it afterwards and remembers the choice. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('admin-theme', next);
    setTheme(next);
  }

  return { theme, toggle };
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema';
  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted transition-colors duration-200 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${className}`}
    >
      {theme === 'dark' ? <IconSun size={20} /> : <IconMoon size={20} />}
    </button>
  );
}
