import { useState } from 'react';

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
        <a href="/" className="font-heading text-xl tracking-tight text-white hover:text-gold-light transition-transform duration-300 ease-out hover:-translate-y-0.5">
          The Old Fashioned
        </a>

        <nav className="hidden md:flex items-center gap-8 text-sm uppercase tracking-widest text-muted">
          <a href="/#bar" className="hover:text-gold-light transition-colors duration-300">De Bar</a>
          <a href="/#workshops" className="hover:text-gold-light transition-colors duration-300">Workshops</a>
          <a href="/locatie/" className="text-gold-light">Op Locatie</a>
          <a
            href="#offerte"
            className="ml-2 rounded-full px-6 py-2.5 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium shadow-[0_4px_20px_-4px_rgba(200,146,42,0.5)] hover:shadow-[0_6px_28px_-4px_rgba(200,146,42,0.7)] hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            Vraag een offerte aan
          </a>
        </nav>

        <button
          className="md:hidden text-white p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light rounded"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu openen"
          aria-expanded={open}
        >
          <div className="w-6 h-px bg-white mb-1.5" />
          <div className="w-6 h-px bg-white mb-1.5" />
          <div className="w-6 h-px bg-white" />
        </button>
      </div>

      {open && (
        <div className="md:hidden bg-surface-elevated border-t border-white/5 px-6 py-6 flex flex-col gap-5 text-muted uppercase tracking-widest text-sm">
          <a href="/#bar" className="hover:text-gold-light">De Bar</a>
          <a href="/#workshops" className="hover:text-gold-light">Workshops</a>
          <a href="/locatie/" className="text-gold-light">Op Locatie</a>
          <a href="#offerte" className="text-surface bg-gold rounded-full px-6 py-3 text-center font-medium">Vraag een offerte aan</a>
        </div>
      )}
    </header>
  );
}
