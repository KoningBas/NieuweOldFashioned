export function Footer() {
  return (
    <footer className="w-full border-t border-white/8 bg-surface">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 px-4 py-12 lg:px-8">

        {/* Col 1: Logo + address + socials */}
        <div className="flex flex-col gap-5">
          <span className="font-heading text-2xl text-white tracking-[-0.01em]">The Old Fashioned</span>
          <p className="font-body text-base leading-relaxed text-prose">
            Premium cocktailbar in het centrum van Rijssen.<br />Grotestraat 12, 7461 KG Rijssen.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/theoldfashioned.rijssen/"
              className="text-white transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 rounded"
              aria-label="Instagram"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
            </a>
            <a
              href="https://www.facebook.com/theoldfashioned.rijssen/"
              className="text-white transition-colors hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2 rounded"
              aria-label="Facebook"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>
            </a>
          </div>
        </div>

        {/* Col 2: Navigatie */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading text-lg text-white">Navigatie</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            <li><a href="/" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Home</a></li>
            <li><a href="/locatie/" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Cocktails op Locatie</a></li>
            <li><a href="#zo-werkt-het" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Zo werkt een workshop</a></li>
            <li><a href="#arrangementen" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Bites &amp; Streetfood</a></li>
            <li><a href="#reserveren" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Reserveren</a></li>
          </ul>
        </div>

        {/* Col 3: Contact */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading text-lg text-white">Contact</h3>
          <a
            href="mailto:Theqingzakelijk@gmail.com?subject=Workshop%20reserveren"
            className="font-body text-base no-underline text-gold transition-colors hover:text-gold-light"
          >
            Theqingzakelijk@gmail.com
          </a>
          <p className="font-body text-lg leading-relaxed text-prose">
            Reserveer je workshop via het{' '}
            <a href="#reserveren" className="no-underline text-gold transition-colors hover:text-gold-light">
              reserveringsformulier
            </a>
            , tot drie dagen van tevoren. We reageren doorgaans binnen 24 uur.
          </p>
          <p className="font-body text-lg leading-relaxed text-prose">
            Volg ons op Instagram &amp; Facebook voor sfeerbeelden en updates.
          </p>
        </div>

      </div>

      {/* Footer bar */}
      <div className="px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1200px] mx-auto border-t border-white/8">
        <p className="font-body text-base text-center sm:text-left text-prose">
          &copy; {new Date().getFullYear()} The Old Fashioned. Alle rechten voorbehouden.
        </p>
      </div>
    </footer>
  );
}
