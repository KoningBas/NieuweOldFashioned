import { useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError('Onjuiste inloggegevens. Probeer het opnieuw.');
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl bg-surface-elevated border border-white/5 p-10 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]">
        <h1 className="font-heading text-3xl mb-8 text-center">The Old Fashioned &mdash; Beheer</h1>

        <label className="block mb-5">
          <span className="block text-base uppercase tracking-widest text-muted mb-2">E-mailadres</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>
        <label className="block mb-8">
          <span className="block text-base uppercase tracking-widest text-muted mb-2">Wachtwoord</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-3 text-base text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
        </label>

        {error && <p className="text-red-300/90 mb-6 text-base" role="alert">{error}</p>}

        <button type="submit" disabled={submitting} className="w-full rounded-full px-6 py-3.5 text-base bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
          {submitting ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  );
}
