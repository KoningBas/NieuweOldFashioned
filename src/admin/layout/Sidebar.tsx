import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const LINKS = [
  { to: '/', label: 'Overzicht', end: true },
  { to: '/quotes', label: 'Offertes' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/packages', label: 'Pakketten' },
  { to: '/cocktails', label: 'Cocktailkaart' },
  { to: '/openingstijden', label: 'Openingstijden' },
  { to: '/blocked-dates', label: 'Geblokkeerde data' },
  { to: '/settings', label: 'Instellingen' },
];

export function Sidebar() {
  const { signOut } = useAuth();

  return (
    <aside className="w-64 shrink-0 bg-surface-elevated border-r border-white/5 min-h-screen p-6 flex flex-col">
      <div className="font-heading text-xl mb-10 px-2">The Old Fashioned</div>
      <nav className="flex flex-col gap-1 flex-1">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-lg px-4 py-3 text-base transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                isActive ? 'bg-gold/15 text-gold-light' : 'text-muted hover:bg-white/5 hover:text-white'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={() => signOut()}
        className="rounded-lg px-4 py-3 text-base text-muted hover:bg-white/5 hover:text-white text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
      >
        Uitloggen
      </button>
    </aside>
  );
}
