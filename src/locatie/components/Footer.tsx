export function Footer() {
  return (
    <footer className="bg-surface-elevated border-t border-white/5 pt-16 pb-10 px-6 md:px-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <div className="font-heading text-xl mb-3">The Old Fashioned</div>
          <p className="text-muted leading-relaxed">Premium cocktailbar in het centrum van Rijssen.<br />Grotestraat 12, 7461 KG Rijssen.</p>
        </div>
        <div>
          <div className="uppercase tracking-widest text-sm text-muted mb-4">Navigatie</div>
          <ul className="space-y-2">
            <li><a href="/" className="hover:text-gold-light transition-colors">Home</a></li>
            <li><a href="/locatie/" className="hover:text-gold-light transition-colors">Cocktails op Locatie</a></li>
            <li><a href="#offerte" className="hover:text-gold-light transition-colors">Offerte aanvragen</a></li>
          </ul>
        </div>
        <div>
          <div className="uppercase tracking-widest text-sm text-muted mb-4">Contact</div>
          <p className="text-muted">Theqingzakelijk@gmail.com</p>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 text-muted text-sm">
        &copy; {new Date().getFullYear()} The Old Fashioned
      </div>
    </footer>
  );
}
