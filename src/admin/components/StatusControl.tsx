import { useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { logActivity } from '../lib/activity';
import { invalidateNavCounts } from '../layout/navCounts';
import { allowedTransitions, normalizeStatus, STATUS_LABELS } from '../../shared/lib/workflow';
import type { QuoteRequest, QuoteStatus } from '../../shared/types/db';
import { Badge } from './Badge';

interface Props {
  request: QuoteRequest;
  onChanged: (status: QuoteStatus) => void;
  /** Bumped after a system log entry so the timeline can reload. */
  onLogged?: () => void;
}

/** Current status as a badge plus a select limited to allowed transitions.
 *  Every change writes a system line to the timeline. */
export function StatusControl({ request, onChanged, onLogged }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = normalizeStatus(request.status);
  const targets = allowedTransitions(request.status);

  async function change(to: QuoteStatus) {
    setSaving(true);
    setError(null);
    const { error: dbError } = await supabase.from('quote_requests').update({ status: to }).eq('id', request.id);
    setSaving(false);
    if (dbError) {
      console.error('Failed to update status', dbError);
      setError('Status opslaan mislukt.');
      return;
    }
    onChanged(to);
    invalidateNavCounts();
    const logged = await logActivity(
      request.id, 'system',
      `Status gewijzigd: ${STATUS_LABELS[current]} → ${STATUS_LABELS[normalizeStatus(to)]}`,
    );
    if (logged) onLogged?.();
  }

  return (
    <div className="flex items-center gap-3">
      <Badge status={request.status} />
      <label className="relative">
        <span className="sr-only">Status wijzigen</span>
        <select
          value=""
          disabled={saving}
          onChange={(e) => { if (e.target.value) change(e.target.value as QuoteStatus); }}
          className="h-11 appearance-none rounded-lg border border-white/15 bg-surface-elevated pl-3 pr-9 text-[0.9375rem] text-white transition-colors hover:border-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 disabled:opacity-50"
        >
          <option value="" disabled>Wijzig status…</option>
          {targets.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">▾</span>
      </label>
      {error && <span role="alert" className="text-sm text-danger">{error}</span>}
    </div>
  );
}
