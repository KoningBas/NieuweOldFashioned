import { useEffect, useState } from 'react';

const NAV_LINKS = [
  { href: '/#bar', label: 'De Bar', active: false },
  { href: '/#workshops', label: 'Workshops', active: false },
  { href: '/locatie/', label: 'Op Locatie', active: true },
  { href: '/#bartending', label: 'Bartending', active: false },
  { href: '/#locatie', label: 'Locatie', active: false },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        id="site-header"
        className={`sticky top-0 z-50 flex h-[80px] w-full justify-center ease-out -mb-[80px] sm:-mb-[88px] ${scrolled ? 'scrolled' : ''}`}
      >
        <div
          className="nav-inner max-w-[1600px] w-full grid items-center px-3 sm:px-6"
          style={{
            gridTemplateColumns: 'auto 1fr auto',
            transition: 'background 300ms ease-out, backdrop-filter 300ms ease-out, border-radius 300ms ease-out, border-color 300ms ease-out',
          }}
        >
          {/* LEFT: hamburger (mobile) + logo (desktop) */}
          <div className="flex items-center gap-3">
            <button
              id="hamburger"
              className={`nav-btn xl:hidden rounded-md p-1.5 text-white flex flex-col justify-center items-center gap-[5px] w-[34px] h-[34px] ${open ? 'open' : ''}`}
              aria-label={open ? 'Menu sluiten' : 'Menu openen'}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="hb-bar hb-top" />
              <span className="hb-bar hb-mid" />
              <span className="hb-bar hb-bot" />
            </button>
            <a href="/" className="hidden xl:flex items-center h-10">
              <span className="font-heading text-xl text-white" style={{ letterSpacing: '-0.01em' }}>The Old Fashioned</span>
            </a>
          </div>

          {/* CENTER: mobile logo + desktop nav links */}
          <nav className="flex items-center justify-center">
            <a href="/" className="xl:hidden flex items-center h-9 overflow-hidden">
              <span className="font-heading text-base sm:text-lg text-white whitespace-nowrap" style={{ letterSpacing: '-0.01em' }}>The Old Fashioned</span>
            </a>
            <ul className="hidden xl:flex items-center gap-1 list-none p-0 m-0">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className={`nav-btn rounded-md px-3 py-1.5 text-base font-body no-underline ${link.active ? 'text-gold-light' : 'text-white'}`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* RIGHT: CTA */}
          <div className="flex items-center justify-end">
            <a href="#offerte" className="btn-primary rounded-full px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base font-body font-semibold no-underline whitespace-nowrap">
              Boek Workshop
            </a>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      <div
        id="mobile-backdrop"
        className={`fixed inset-0 z-30 bg-black/50 xl:hidden ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile menu overlay */}
      <div id="mobile-menu" className={`fixed inset-0 z-40 bg-black/95 backdrop-blur-sm flex flex-col pt-20 px-6 xl:hidden ${open ? 'open' : ''}`}>
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className={`block py-3 text-xl font-heading no-underline border-b border-zinc-800 ${link.active ? 'text-gold-light' : 'text-white'}`}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <a href="#offerte" onClick={() => setOpen(false)} className="btn-primary mt-8 rounded-full px-8 py-4 text-center font-heading text-xl no-underline">
          Boek Workshop
        </a>
      </div>
    </>
  );
}
