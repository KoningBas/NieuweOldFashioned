import { useEffect, useRef, useState } from 'react';

export type NavPage = 'bar' | 'workshops' | 'locatie';

/** `short` is used below 640px, where the wordmark and the button would otherwise collide. */
type Cta = { href: string; label: string; short: string };

const LINKS: { href: string; label: string; page: NavPage }[] = [
  { href: '/', label: 'De Bar', page: 'bar' },
  { href: '/workshops/', label: 'Workshops', page: 'workshops' },
  { href: '/locatie/', label: 'Op Locatie', page: 'locatie' },
];

const DESKTOP_BREAKPOINT = 768;

/**
 * The homepage (index.html) carries a hand-written copy of this markup and CSS,
 * because it is a static HTML page and cannot import React. Change one, change both.
 */
export function Nav({ active, cta }: { active: NavPage; cta?: Cta }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const hamburger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const close = () => setOpen(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      close();
      hamburger.current?.focus();
    };
    const onResize = () => {
      if (window.innerWidth >= DESKTOP_BREAKPOINT) close();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <>
      <style>{NAV_CSS}</style>

      <header
        id="site-header"
        className={`sticky top-0 z-50 flex h-[80px] w-full justify-center -mb-[80px] sm:-mb-[88px] ${scrolled ? 'scrolled' : ''} ${open ? 'menu-open' : ''}`}
      >
        <div className="nav-inner relative max-w-[1600px] w-full grid items-center px-3 sm:px-6">
          {/* LEFT — hamburger on mobile, wordmark on desktop */}
          <div className="flex items-center">
            <button
              ref={hamburger}
              id="hamburger"
              type="button"
              className={`nav-btn md:hidden rounded-md text-white flex flex-col justify-center items-center gap-[5px] w-[38px] h-[38px] ${open ? 'open' : ''}`}
              aria-label={open ? 'Menu sluiten' : 'Menu openen'}
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="hb-bar hb-top" />
              <span className="hb-bar hb-mid" />
              <span className="hb-bar hb-bot" />
            </button>
            <a href="/" className="wordmark hidden md:flex items-center h-10 no-underline">
              <span className="font-heading text-xl text-white">The Old Fashioned</span>
            </a>
          </div>

          {/* CENTER — wordmark on mobile, links on desktop */}
          <nav aria-label="Hoofdnavigatie" className="flex items-center justify-center">
            <a href="/" className="wordmark wordmark-mobile flex md:hidden items-center h-9 no-underline">
              <span className="font-heading text-[0.95rem] sm:text-lg text-white whitespace-nowrap">The Old Fashioned</span>
            </a>
            <ul className="hidden md:flex items-center gap-1 list-none p-0 m-0">
              {LINKS.map((link) => {
                const isActive = link.page === active;
                return (
                  <li key={link.page}>
                    <a
                      href={link.href}
                      aria-current={isActive ? 'page' : undefined}
                      className={`nav-btn nav-link rounded-md px-3 py-1.5 text-base font-body no-underline ${isActive ? 'is-active text-gold-light' : 'text-white'}`}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* RIGHT — page CTA (the homepage has none) */}
          <div className="flex items-center justify-end">
            {cta && (
              <a
                href={cta.href}
                className="btn-primary nav-cta rounded-full px-3 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base font-body font-semibold no-underline whitespace-nowrap"
              >
                <span className="sm:hidden">{cta.short}</span>
                <span className="hidden sm:inline">{cta.label}</span>
              </a>
            )}
          </div>
        </div>
      </header>

      <div
        id="mobile-backdrop"
        className={`fixed inset-0 z-30 md:hidden ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      <div id="mobile-menu" className={`md:hidden ${open ? 'open' : ''}`}>
        <ul className="list-none p-0 m-0">
          {LINKS.map((link, i) => {
            const isActive = link.page === active;
            return (
              <li key={link.page} className="menu-row" style={{ '--i': i } as React.CSSProperties}>
                <a
                  href={link.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                  className={`menu-link font-heading ${isActive ? 'is-active' : ''}`}
                >
                  <span className="menu-label">{link.label}</span>
                </a>
              </li>
            );
          })}
        </ul>

        {cta && (
          <a
            href={cta.href}
            onClick={() => setOpen(false)}
            className="btn-primary menu-cta rounded-full px-6 py-3.5 text-center font-body font-semibold text-base no-underline"
            style={{ '--i': LINKS.length } as React.CSSProperties}
          >
            {cta.label}
          </a>
        )}

        <a
          href="/#locatie"
          onClick={() => setOpen(false)}
          className="menu-foot no-underline"
          style={{ '--i': LINKS.length + 1 } as React.CSSProperties}
        >
          <span>Grotestraat 12, Rijssen</span>
          <span className="menu-foot-sep" aria-hidden="true">·</span>
          <span className="menu-foot-link">Openingstijden</span>
        </a>
      </div>
    </>
  );
}

const NAV_CSS = `
  /* ---------- shell ---------- */
  .nav-inner {
    grid-template-columns: auto 1fr auto;
    transition: background 300ms ease-out, backdrop-filter 300ms ease-out,
                border-radius 300ms ease-out, border-color 300ms ease-out;
    border: 1px solid transparent;
  }
  /* From tablet up the side columns are equal, so the links sit on the true
     centre of the viewport even on the homepage, where the right column is empty. */
  @media (min-width: 768px) {
    .nav-inner { grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); }
  }
  header.scrolled .nav-inner,
  header.menu-open .nav-inner {
    background: rgba(13, 13, 13, 0.88);
    backdrop-filter: blur(12px);
    border-radius: 12px;
    border-color: rgba(255, 255, 255, 0.08);
  }

  .wordmark { letter-spacing: -0.01em; }
  .wordmark:focus-visible { outline: 2px solid rgba(255,255,255,0.6); outline-offset: 4px; border-radius: 4px; }
  /* Centre the mobile wordmark on the viewport, not on the space left over by
     the hamburger and the CTA, which differ in width. Display stays with the
     Tailwind classes: this stylesheet is injected after Tailwind's, so a
     display declaration here would outrank md:hidden and leak onto desktop. */
  .wordmark-mobile {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  /* On a 320px phone the wordmark and the CTA fight for the same pixels. */
  @media (max-width: 359px) {
    .wordmark-mobile .font-heading { font-size: 0.78rem; }
    .nav-cta { padding-left: 10px; padding-right: 10px; font-size: 0.76rem; }
  }

  /* ---------- desktop links ---------- */
  .nav-btn {
    position: relative;
    overflow: hidden;
    isolation: isolate;
    transition: color 0.2s ease;
  }
  .nav-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.1);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.2s ease;
    z-index: -1;
  }
  /* Touch devices report a hover that never leaves; guard so a tap doesn't
     strand the wipe behind the hamburger. */
  @media (hover: hover) {
    .nav-btn:hover::before { transform: scaleX(1); }
  }
  .nav-btn:active { opacity: 0.8; }
  .nav-btn:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.6); outline-offset: 2px; }

  .nav-link::after {
    content: '';
    position: absolute;
    left: 12px;
    right: 12px;
    bottom: 3px;
    height: 2px;
    border-radius: 2px;
    background: linear-gradient(90deg, rgba(232,184,109,0) 0%, #E8B86D 22%, #E8B86D 78%, rgba(232,184,109,0) 100%);
    transform: scaleX(0);
    transform-origin: center;
    transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
  }
  .nav-link.is-active::after { transform: scaleX(1); }
  @media (hover: hover) {
    .nav-link:hover::after { transform: scaleX(1); opacity: 0.4; }
    .nav-link.is-active:hover::after { opacity: 1; }
  }

  /* ---------- hamburger ---------- */
  .hb-bar {
    display: block;
    width: 22px;
    height: 2.2px;
    background: #fff;
    border-radius: 1px;
    transform-origin: center;
    transition: transform 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms ease;
  }
  #hamburger.open .hb-top { transform: translateY(7.2px) rotate(45deg); }
  #hamburger.open .hb-mid { opacity: 0; transform: scaleX(0.4); }
  #hamburger.open .hb-bot { transform: translateY(-7.2px) rotate(-45deg); }

  /* ---------- mobile panel ---------- */
  #mobile-backdrop {
    background: rgba(0, 0, 0, 0.55);
    opacity: 0;
    pointer-events: none;
    transition: opacity 260ms ease;
  }
  #mobile-backdrop.open { opacity: 1; pointer-events: auto; }

  #mobile-menu {
    position: fixed;
    z-index: 40;
    top: 74px;
    left: 12px;
    right: 12px;
    padding: 8px 18px 18px;
    border-radius: 14px;
    background: rgba(13, 13, 13, 0.94);
    backdrop-filter: blur(16px) saturate(115%);
    border: 1px solid rgba(255, 255, 255, 0.09);
    box-shadow:
      0 26px 60px -22px rgba(0, 0, 0, 0.92),
      0 10px 34px -16px rgba(200, 146, 42, 0.18),
      inset 0 1px 0 rgba(255, 255, 255, 0.05);
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: opacity 200ms ease, transform 300ms cubic-bezier(0.22, 1, 0.36, 1),
                visibility 0s linear 300ms;
  }
  #mobile-menu.open {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
    transition: opacity 200ms ease, transform 340ms cubic-bezier(0.22, 1, 0.36, 1),
                visibility 0s linear 0s;
  }

  .menu-row + .menu-row .menu-link { border-top: 1px solid rgba(255, 255, 255, 0.07); }

  .menu-link {
    display: block;
    padding: 15px 2px;
    font-size: 1.25rem;
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: #fff;
    text-decoration: none;
    transition: color 180ms ease;
  }
  .menu-link:hover { color: #E8B86D; }
  .menu-link:active { opacity: 0.75; }
  .menu-link:focus-visible { outline: 2px solid #C8922A; outline-offset: 2px; border-radius: 4px; }
  .menu-link.is-active { color: #E8B86D; }
  .menu-label { display: inline-block; padding-bottom: 3px; }
  .menu-link.is-active .menu-label { border-bottom: 2px solid #E8B86D; }

  .menu-cta { display: block; margin-top: 16px; }

  .menu-foot {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 0.9rem;
    color: #C4B7A6;
    transition: color 180ms ease;
  }
  .menu-foot:hover { color: #fff; }
  .menu-foot:focus-visible { outline: 2px solid #C8922A; outline-offset: 3px; border-radius: 4px; }
  .menu-foot-sep { color: rgba(255, 255, 255, 0.3); }
  .menu-foot-link { color: #C8922A; }
  .menu-foot:hover .menu-foot-link { color: #E8B86D; }

  /* Panel contents settle in behind the panel itself. */
  #mobile-menu .menu-row,
  #mobile-menu .menu-cta,
  #mobile-menu .menu-foot {
    opacity: 0;
    transform: translateY(-6px);
  }
  #mobile-menu.open .menu-row,
  #mobile-menu.open .menu-cta,
  #mobile-menu.open .menu-foot {
    opacity: 1;
    transform: translateY(0);
    transition: opacity 260ms ease, transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
    transition-delay: calc(60ms + var(--i, 0) * 45ms);
  }

  @media (prefers-reduced-motion: reduce) {
    .nav-inner, .nav-btn, .nav-btn::before, .nav-link::after, .hb-bar,
    #mobile-backdrop, #mobile-menu,
    #mobile-menu.open .menu-row, #mobile-menu.open .menu-cta, #mobile-menu.open .menu-foot {
      transition-duration: 1ms !important;
      transition-delay: 0s !important;
    }
    #mobile-menu, #mobile-menu.open { transform: none; }
    #mobile-menu .menu-row, #mobile-menu .menu-cta, #mobile-menu .menu-foot { transform: none; }
  }
`;
