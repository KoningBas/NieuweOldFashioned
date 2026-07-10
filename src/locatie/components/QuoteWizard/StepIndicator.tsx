const LABELS = ['Pakket', 'Aantallen', 'Datum & locatie', 'Contact', 'Overzicht'];

export function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 md:gap-3 mb-6 md:mb-12">
      {LABELS.map((label, i) => {
        const step = i + 1;
        const active = step === current;
        const done = step < current;
        return (
          <div key={label} className="flex items-center gap-1.5 md:gap-3 flex-1">
            <div
              className={`h-[26px] w-[26px] md:w-11 md:h-11 rounded-full flex items-center justify-center text-[13px] md:text-lg font-medium shrink-0 transition-colors duration-300 ${
                active ? 'bg-gold text-surface' : done ? 'bg-gold-light/30 text-gold-light border border-gold-light/50' : 'bg-white/5 text-prose border border-white/10'
              }`}
            >
              {step}
            </div>
            <span className={`hidden md:inline text-lg ${active ? 'text-white' : 'text-prose'}`}>{label}</span>
            {step < LABELS.length && <div className="flex-1 h-px bg-white/10" />}
          </div>
        );
      })}
    </div>
  );
}
