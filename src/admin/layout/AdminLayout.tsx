import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MobileNav, Sidebar } from './Sidebar';
import { IconChevronLeft } from '../components/icons';

interface Props {
  title: string;
  children: ReactNode;
  /** Right side of the header: page-level actions (status control, buttons). */
  actions?: ReactNode;
  /** Back link above the title, e.g. { to: '/aanvragen', label: 'Aanvragen' }. */
  back?: { to: string; label: string };
}

export function AdminLayout({ title, children, actions, back }: Props) {
  return (
    <div className="md:flex">
      <Sidebar />
      <MobileNav />
      <div className="min-h-screen min-w-0 flex-1">
        <header className="border-b border-white/5 px-5 py-5 md:px-10 md:py-7">
          {back && (
            <Link
              to={back.to}
              className="mb-1 inline-flex items-center gap-1 rounded text-sm text-muted transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              <IconChevronLeft size={16} />
              {back.label}
            </Link>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <h1 className="font-heading text-2xl md:text-3xl">{title}</h1>
            {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </header>
        {/* Bottom padding clears the mobile tab bar. */}
        <main className="p-5 pb-28 md:p-10 md:pb-10">{children}</main>
      </div>
    </div>
  );
}
