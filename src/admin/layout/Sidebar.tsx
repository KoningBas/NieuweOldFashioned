import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { ThemeToggle } from '../theme';
import { fetchNavCounts, type NavCounts } from './navCounts';
import {
  IconCalendar, IconChecklist, IconClock, IconGlass, IconInbox, IconLogout,
  IconMenu, IconOverview, IconPackage, IconReceipt, IconSettings, IconX,
} from '../components/icons';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  end?: boolean;
  count?: (c: NavCounts) => number;
}

const WERK: NavItem[] = [
  { to: '/', label: 'Overzicht', icon: IconOverview, end: true },
  { to: '/aanvragen', label: 'Aanvragen', icon: IconInbox, count: (c) => c.newRequests },
  { to: '/agenda', label: 'Agenda', icon: IconCalendar },
  { to: '/paklijsten', label: 'Paklijsten', icon: IconChecklist },
  { to: '/facturen', label: 'Facturen', icon: IconReceipt, count: (c) => c.overdueInvoices },
];

const BEHEER: NavItem[] = [
  { to: '/packages', label: 'Pakketten', icon: IconPackage },
  { to: '/cocktails', label: 'Cocktailkaart', icon: IconGlass },
  { to: '/openingstijden', label: 'Openingstijden', icon: IconClock },
  { to: '/settings', label: 'Instellingen', icon: IconSettings },
];

export function useNavCounts(): NavCounts {
  const [counts, setCounts] = useState<NavCounts>({ newRequests: 0, overdueInvoices: 0 });
  useEffect(() => {
    let alive = true;
    fetchNavCounts().then((c) => { if (alive) setCounts(c); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return counts;
}

function NavEntry({ item, counts, onNavigate }: { item: NavItem; counts: NavCounts; onNavigate?: () => void }) {
  const n = item.count ? item.count(counts) : 0;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9375rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
          isActive ? 'bg-gold/15 text-gold-light' : 'text-muted hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <item.icon size={18} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {n > 0 && (
        <span className="rounded-full bg-gold px-2 py-0.5 text-xs font-semibold text-surface" aria-label={`${n} openstaand`}>
          {n}
        </span>
      )}
    </NavLink>
  );
}

function GroupLabel({ children }: { children: string }) {
  return <div className="px-3 pb-2 pt-6 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-muted/80">{children}</div>;
}

/** Desktop sidebar. Hidden below md; MobileNav takes over there. */
export function Sidebar() {
  const { signOut } = useAuth();
  const counts = useNavCounts();

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-white/5 bg-surface-elevated p-4 md:flex">
      <div className="font-heading text-xl px-3 pt-2">The Old Fashioned</div>

      <nav className="flex flex-1 flex-col" aria-label="Hoofdnavigatie">
        <GroupLabel>Werk</GroupLabel>
        {WERK.map((item) => <NavEntry key={item.to} item={item} counts={counts} />)}
        <GroupLabel>Beheer</GroupLabel>
        {BEHEER.map((item) => <NavEntry key={item.to} item={item} counts={counts} />)}
      </nav>

      <div className="flex items-center gap-1 border-t border-white/5 pt-3">
        <ThemeToggle />
        <button
          onClick={() => signOut()}
          className="flex h-11 flex-1 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-muted transition-colors duration-200 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconLogout size={18} />
          Uitloggen
        </button>
      </div>
    </aside>
  );
}

/** Phone navigation: bottom bar with the daily-work screens, the rest behind
 *  "Meer". Targets are 44px+; labels always visible under the icons. */
export function MobileNav() {
  const { signOut } = useAuth();
  const counts = useNavCounts();
  const [moreOpen, setMoreOpen] = useState(false);
  const tabs = WERK.slice(0, 4);

  return (
    <>
      <nav
        aria-label="Hoofdnavigatie"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-elevated/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid grid-cols-5">
          {tabs.map((item) => {
            const n = item.count ? item.count(counts) : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.6875rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light ${
                    isActive ? 'text-gold-light' : 'text-muted'
                  }`
                }
              >
                <item.icon size={20} />
                {item.label}
                {n > 0 && (
                  <span className="absolute right-[calc(50%-1.375rem)] top-1.5 min-w-[1.125rem] rounded-full bg-gold px-1 text-center text-[0.625rem] font-semibold leading-[1.125rem] text-surface">
                    {n}
                  </span>
                )}
              </NavLink>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            className="flex min-h-[3.5rem] flex-col items-center justify-center gap-1 text-[0.6875rem] text-muted transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
          >
            <IconMenu size={20} />
            Meer
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Meer navigatie">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-white/10 bg-surface-elevated p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between px-3">
              <span className="font-heading text-lg">Meer</span>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Sluiten"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
              >
                <IconX size={20} />
              </button>
            </div>
            <NavEntry item={WERK[4]} counts={counts} onNavigate={() => setMoreOpen(false)} />
            <GroupLabel>Beheer</GroupLabel>
            {BEHEER.map((item) => <NavEntry key={item.to} item={item} counts={counts} onNavigate={() => setMoreOpen(false)} />)}
            <div className="mt-3 flex items-center gap-1 border-t border-white/5 pt-3">
              <ThemeToggle />
              <button
                onClick={() => signOut()}
                className="flex h-11 flex-1 items-center gap-3 rounded-lg px-3 text-[0.9375rem] text-muted hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light"
              >
                <IconLogout size={18} />
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
