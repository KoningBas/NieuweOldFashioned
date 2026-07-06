interface Props {
  fullName: string;
  email: string;
  phone: string;
  specialRequests: string;
  onFullNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSpecialRequestsChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function Step4Contact({
  fullName, email, phone, specialRequests,
  onFullNameChange, onEmailChange, onPhoneChange, onSpecialRequestsChange, onNext, onBack,
}: Props) {
  const canProceed = fullName.trim() !== '' && /\S+@\S+\.\S+/.test(email.trim()) && phone.trim() !== '';

  return (
    <div>
      <h3 className="font-heading text-2xl mb-6">Jouw gegevens</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <label className="block">
          <span className="block text-sm uppercase tracking-widest text-muted mb-3">Naam</span>
          <input type="text" value={fullName} onChange={(e) => onFullNameChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
        <label className="block">
          <span className="block text-sm uppercase tracking-widest text-muted mb-3">E-mailadres</span>
          <input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
      </div>

      <label className="block mb-6">
        <span className="block text-sm uppercase tracking-widest text-muted mb-3">Telefoonnummer</span>
        <input type="tel" value={phone} onChange={(e) => onPhoneChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
      </label>

      <label className="block mb-10">
        <span className="block text-sm uppercase tracking-widest text-muted mb-3">Bijzonderheden (optioneel)</span>
        <textarea rows={4} value={specialRequests} onChange={(e) => onSpecialRequestsChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-5 py-3.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
      </label>

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-8 py-4 border border-white/20 text-white hover:border-gold-light hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canProceed} onClick={onNext} className="rounded-full px-8 py-4 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Bekijk offerte
        </button>
      </div>
    </div>
  );
}
