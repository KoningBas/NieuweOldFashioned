import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { logActivity } from '../../lib/activity';
import { SkeletonRows } from '../../components/Skeleton';
import { IconChat, IconMail, IconNote, IconPhone } from '../../components/icons';
import type { ActivityKind, QuoteActivity } from '../../../shared/types/db';

const QUICK: { kind: Exclude<ActivityKind, 'system'>; label: string; icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }> }[] = [
  { kind: 'call', label: 'Gebeld', icon: IconPhone },
  { kind: 'email', label: 'Gemaild', icon: IconMail },
  { kind: 'whatsapp', label: 'WhatsApp', icon: IconChat },
  { kind: 'note', label: 'Notitie', icon: IconNote },
];

const KIND_LABELS: Record<ActivityKind, string> = {
  system: 'Systeem', call: 'Gebeld', email: 'Gemaild', whatsapp: 'WhatsApp', note: 'Notitie',
};

const NL_STAMP = new Intl.DateTimeFormat('nl-NL', {
  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export function TimelineTab({ requestId, reloadKey }: { requestId: string; reloadKey: number }) {
  const [entries, setEntries] = useState<QuoteActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [composerKind, setComposerKind] = useState<Exclude<ActivityKind, 'system'> | null>(null);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data, error } = await supabase
        .from('quote_activity').select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: false });
      if (!alive) return;
      if (error) { setUnavailable(true); setLoading(false); return; }
      setEntries(data ?? []);
      setUnavailable(false);
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [requestId, reloadKey]);

  async function save() {
    if (!composerKind) return;
    const text = body.trim();
    // A bare "Gebeld" without note is a valid log line; notes need content.
    if (composerKind === 'note' && !text) return;
    setSaving(true);
    const ok = await logActivity(requestId, composerKind, text);
    setSaving(false);
    if (!ok) { setUnavailable(true); return; }
    // Optimistic append; the DB row's real id arrives on next load.
    setEntries((prev) => [{
      id: `tmp-${Date.now()}`, request_id: requestId, kind: composerKind, body: text,
      created_at: new Date().toISOString(),
    }, ...prev]);
    setComposerKind(null);
    setBody('');
  }

  if (loading) return <SkeletonRows rows={3} height="h-14" />;

  return (
    <div className="flex flex-col gap-6">
      {unavailable && (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          Tijdlijn niet beschikbaar. Voer migratie <code className="font-mono">0003_workflow_foundation.sql</code> uit in de Supabase SQL-editor.
        </p>
      )}

      {/* Quick log buttons */}
      <div className="flex flex-wrap gap-2">
        {QUICK.map(({ kind, label, icon: Ico }) => (
          <button
            key={kind}
            onClick={() => { setComposerKind(composerKind === kind ? null : kind); setBody(''); }}
            aria-pressed={composerKind === kind}
            className={`inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-[0.9375rem] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
              composerKind === kind
                ? 'border-gold/50 bg-gold/15 text-gold-light'
                : 'border-white/10 bg-surface-elevated text-white/85 hover:border-white/25'
            }`}
          >
            <Ico size={16} /> {label}
          </button>
        ))}
      </div>

      {/* Inline composer — no dialog */}
      {composerKind && (
        <div className="rounded-xl border border-gold/30 bg-surface-elevated p-4">
          <label className="mb-2 block text-sm text-muted" htmlFor="timeline-body">
            {composerKind === 'note' ? 'Notitie' : `${KIND_LABELS[composerKind]} — wat is er besproken?`}
          </label>
          <textarea
            id="timeline-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            autoFocus
            placeholder={composerKind === 'note' ? 'Schrijf een notitie…' : 'Optionele toelichting…'}
            className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2.5 text-[0.9375rem] text-white placeholder:text-muted focus:border-gold/50 focus:outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={save}
              disabled={saving || (composerKind === 'note' && !body.trim())}
              className="h-11 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              {saving ? 'Opslaan…' : 'Vastleggen'}
            </button>
            <button
              onClick={() => setComposerKind(null)}
              className="h-11 rounded-lg px-4 text-[0.9375rem] text-muted transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {/* The timeline itself */}
      {entries.length === 0 && !unavailable ? (
        <p className="rounded-xl border border-white/5 bg-surface-elevated p-8 text-center text-muted">
          Nog geen contactmomenten. Gebruik de knoppen hierboven om een belletje, mailtje of notitie vast te leggen.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry) => {
            const system = entry.kind === 'system';
            const Ico = QUICK.find((q) => q.kind === entry.kind)?.icon ?? IconNote;
            return (
              <li key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                {/* rail */}
                <span className="absolute left-[0.9375rem] top-8 bottom-0 w-px bg-white/10 last:hidden" aria-hidden="true" />
                <span className={`z-10 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  system ? 'border-white/10 bg-surface text-muted' : 'border-gold/40 bg-gold/10 text-gold-light'
                }`}>
                  {system ? <span className="h-1.5 w-1.5 rounded-full bg-muted" aria-hidden="true" /> : <Ico size={14} />}
                </span>
                <div className="min-w-0 flex-1 pt-1">
                  <div className={`text-[0.9375rem] ${system ? 'text-muted' : 'text-white'}`}>
                    {!system && <span className="font-medium">{KIND_LABELS[entry.kind]}</span>}
                    {!system && entry.body && <span className="text-muted"> — </span>}
                    {entry.body && <span className={system ? '' : 'text-white/85'}>{entry.body}</span>}
                  </div>
                  <div className="mt-0.5 text-sm text-muted/80">{NL_STAMP.format(new Date(entry.created_at))}</div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
