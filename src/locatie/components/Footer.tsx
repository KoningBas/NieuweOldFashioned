import { SocialLinks } from '../../shared/components/SocialLinks';
import { ADRES, EMAIL, TELEFOON, TELEFOON_WEERGAVE, mailtoHref } from '../../shared/lib/contact';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/8 bg-surface">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-10 px-4 py-12 lg:px-8">

        {/* Col 1: Logo + address + socials */}
        <div className="flex flex-col gap-5">
          <span className="font-heading text-2xl text-white tracking-[-0.01em]">The Old Fashioned</span>
          <p className="font-body text-base leading-relaxed text-prose">
            Premium cocktailbar in het centrum van Rijssen.<br />{ADRES.straat}, {ADRES.postcode} {ADRES.plaats}.
          </p>
          <SocialLinks />
        </div>

        {/* Col 2: Navigatie */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading text-lg text-white">Navigatie</h3>
          <ul className="list-none p-0 m-0 flex flex-col gap-2">
            <li><a href="/" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Home</a></li>
            <li><a href="/locatie/" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Cocktails op Locatie</a></li>
            <li><a href="#onze-aanpak" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Zo werken wij</a></li>
            <li><a href="#cocktailkaart" className="font-body text-base no-underline text-muted transition-colors hover:text-white">De cocktailkaart</a></li>
            <li><a href="#offerte" className="font-body text-base no-underline text-muted transition-colors hover:text-white">Offerte aanvragen</a></li>
          </ul>
        </div>

        {/* Col 3: Contact */}
        <div className="flex flex-col gap-4">
          <h3 className="font-heading text-lg text-white">Contact</h3>
          <a
            href={mailtoHref()}
            className="font-body text-base no-underline text-gold transition-colors hover:text-gold-light"
          >
            {EMAIL}
          </a>
          <a
            href={`tel:${TELEFOON}`}
            className="font-body text-base no-underline text-gold transition-colors hover:text-gold-light"
          >
            {TELEFOON_WEERGAVE}
          </a>
          <p className="font-body text-lg leading-relaxed text-prose">
            Vraag vrijblijvend een offerte aan &mdash; we reageren doorgaans binnen 24 uur.
          </p>
          <p className="font-body text-lg leading-relaxed text-prose">
            Volg ons op Instagram, Facebook &amp; TikTok voor sfeerbeelden en updates.
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
