import { useState } from 'react';

export function Hero() {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <section
      className="relative flex w-full justify-center max-w-none"
      style={{ height: 'min(66.67vw, 100svh)', minHeight: '760px' }}
    >
      <div className="relative flex w-full items-center justify-center overflow-hidden" style={{ height: '100%' }}>
        {/* Background image */}
        {!imageFailed && (
          <img
            src="/OldImages/AbgarLocatie.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImageFailed(true)}
          />
        )}
        {/* Dark overlay gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(13,13,13,0.35) 0%, rgba(13,13,13,0.85) 100%)' }}
        />
        {/* Center darkening — improves text legibility without flattening the photo */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 50%, rgba(13,13,13,0.72) 0%, transparent 100%)' }}
        />
        {/* Warm amber glow at bottom */}
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(200,146,42,0.18) 0%, transparent 60%)' }}
        />
      </div>

      {/* Text overlay */}
      <div className="pointer-events-none absolute inset-0 flex max-w-4xl mx-auto flex-col gap-4 px-6 sm:px-8 items-center text-center justify-end lg:justify-center pt-32 lg:pt-0 pb-16 lg:pb-0 z-30">
        <p
          className="font-body text-base sm:text-lg text-gold-light uppercase tracking-[0.28em]"
          style={{ textShadow: '0 1px 12px rgba(0,0,0,0.95), 0 4px 24px rgba(0,0,0,0.7)' }}
        >
          Vanaf 4 personen
        </p>
        <h1
          className="font-heading text-5xl sm:text-6xl lg:text-7xl leading-tight text-white text-balance"
          style={{
            letterSpacing: '-0.02em',
            textShadow: '0 2px 6px rgba(0,0,0,0.95), 0 8px 48px rgba(0,0,0,0.85), 0 20px 80px rgba(0,0,0,0.6)',
          }}
        >
          {/* Zachte afbreking: op smalle schermen breekt het woord netjes na "Cocktail". */}
          {'Cocktail­workshops'}
        </h1>
        <p
          className="font-body text-base sm:text-lg leading-relaxed mt-1 max-w-xl text-balance"
          style={{
            color: 'rgba(255,255,255,0.92)',
            textShadow: '0 1px 8px rgba(0,0,0,0.95), 0 4px 24px rgba(0,0,0,0.75), 0 12px 48px rgba(0,0,0,0.5)',
          }}
        >
          Shaker in je hand, bartender ernaast. Je maakt twee cocktails, leert je tools kennen en drinkt wat je zelf schudt. In onze bar in Rijssen of bij jou op locatie.
        </p>
        <div className="flex flex-wrap gap-3 pt-4 justify-center pointer-events-auto">
          <a
            href="#reserveren"
            className="btn-primary rounded-md px-8 py-4 text-base sm:text-lg font-body no-underline w-full sm:w-auto text-center"
          >
            Reserveer een workshop
          </a>
          <a
            href="#arrangementen"
            className="btn-ghost rounded-md px-8 py-4 text-base sm:text-lg font-body no-underline w-full sm:w-auto text-center"
          >
            Bekijk de arrangementen
          </a>
        </div>
      </div>
    </section>
  );
}
