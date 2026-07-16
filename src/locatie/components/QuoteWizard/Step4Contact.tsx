interface Props {
  fullName: string;
  email: string;
  phone: string;
  specialRequests: string;
  onFullNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onSpecialRequestsChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  ready: boolean;
  submitError: string | null;
}

export function Step4Contact({
  fullName, email, phone, specialRequests,
  onFullNameChange, onEmailChange, onPhoneChange, onSpecialRequestsChange,
  onSubmit, onBack, submitting, ready, submitError,
}: Props) {
  const fieldsValid = fullName.trim() !== '' && /\S+@\S+\.\S+/.test(email.trim()) && phone.trim() !== '';
  const canSubmit = fieldsValid && ready && !submitting;

  return (
    <div>
      <h3 className="font-heading text-base md:text-3xl mb-4 md:mb-6">Jouw gegevens</h3>

      <div className="grid grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-6">
        <label className="block">
          <span className="block text-sm md:text-lg text-white mb-2 md:mb-3">Naam</span>
          <input type="text" value={fullName} autoComplete="name" onChange={(e) => onFullNameChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
        <label className="block">
          <span className="block text-sm md:text-lg text-white mb-2 md:mb-3">E-mailadres</span>
          <input type="email" value={email} autoComplete="email" onChange={(e) => onEmailChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
      </div>

      <label className="block mb-4 md:mb-6">
        <span className="block text-sm md:text-lg text-white mb-2 md:mb-3">Telefoonnummer</span>
        <input type="tel" value={phone} autoComplete="tel" onChange={(e) => onPhoneChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
      </label>

      <label className="block mb-5 md:mb-10">
        <span className="block text-sm md:text-lg text-white mb-2 md:mb-3">Bijzonderheden (optioneel)</span>
        <textarea rows={2} value={specialRequests} onChange={(e) => onSpecialRequestsChange(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base md:px-5 md:py-3.5 md:text-lg md:min-h-[8rem] text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
      </label>

      {submitError && <p role="alert" className="text-red-300/90 mb-5 md:mb-6">{submitError}</p>}

      <div className="flex gap-4">
        <button type="button" onClick={onBack} className="rounded-full px-6 py-2.5 text-base border border-white/20 text-white hover:border-gold-light active:opacity-90 transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          Terug
        </button>
        <button type="button" disabled={!canSubmit} onClick={onSubmit} className="btn-primary rounded-full px-6 py-2.5 text-base font-body font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          {submitting ? 'Versturen...' : 'Verstuur aanvraag'}
        </button>
      </div>
    </div>
  );
}
