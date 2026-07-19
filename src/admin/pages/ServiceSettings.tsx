import { useEffect, useId, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { SkeletonRows } from '../components/Skeleton';
import { Field, Fieldset, INPUT_CLS } from '../components/Form';
import type { ServiceSettings as Settings } from '../../shared/types/db';

/** Everything the form may write. `id` and `created_at` stay out of the update
 *  so a stray column never travels back to the database. */
const EDITABLE = [
  'business_name', 'business_email', 'business_phone', 'business_address',
  'kvk_number', 'vat_number', 'iban',
  'vat_rate', 'quote_valid_days', 'invoice_due_days',
  'cocktail_price', 'min_cocktails', 'workshop_price_per_person',
  'travel_fee_near', 'travel_fee_far', 'travel_near_km_limit',
  'booking_notice_hours', 'max_guests', 'nudge_new_days', 'nudge_quote_days',
] as const satisfies readonly (keyof Settings)[];

type EditableKey = (typeof EDITABLE)[number];

type InputKind = 'text' | 'email' | 'tel' | 'number';

export function ServiceSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('service_settings').select('*').limit(1).single().then(({ data, error: err }) => {
      if (err) { setError('Instellingen konden niet geladen worden.'); setLoading(false); return; }
      setSettings(data);
      setLoading(false);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);

    const patch = Object.fromEntries(EDITABLE.map((k) => [k, settings[k]]));
    const { error: err } = await supabase.from('service_settings').update(patch).eq('id', settings.id);
    setSaving(false);

    if (err) {
      setError(
        err.message.includes('column')
          ? 'Opslaan mislukt: de nieuwe kolommen bestaan nog niet. Voer migratie 0003_workflow_foundation.sql uit.'
          : `Opslaan mislukt: ${err.message}`,
      );
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function set(key: EditableKey, value: string | number) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  if (loading) {
    return <AdminLayout title="Instellingen"><SkeletonRows rows={3} height="h-56" /></AdminLayout>;
  }
  if (!settings) {
    return (
      <AdminLayout title="Instellingen">
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          {error ?? 'Geen instellingen gevonden.'}
        </p>
      </AdminLayout>
    );
  }

  const s = settings;

  return (
    <AdminLayout title="Instellingen">
      <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-6 pb-4">
        <Fieldset legend="Bedrijfsgegevens" description="Deze regels staan bovenaan elke offerte en factuur.">
          <Input label="Bedrijfsnaam" value={s.business_name} onChange={(v) => set('business_name', v)} />
          <Input label="E-mailadres" kind="email" value={s.business_email} onChange={(v) => set('business_email', v)} />
          <Input label="Telefoonnummer" kind="tel" value={s.business_phone} onChange={(v) => set('business_phone', v)} />
          <Input label="Adres" value={s.business_address} onChange={(v) => set('business_address', v)} />
        </Fieldset>

        <Fieldset legend="Facturatie" description="Verplicht op een Nederlandse factuur, plus de termijnen die documenten vooraf invullen.">
          <Input label="KVK-nummer" value={s.kvk_number ?? ''} onChange={(v) => set('kvk_number', v)} />
          <Input label="Btw-nummer" value={s.vat_number ?? ''} onChange={(v) => set('vat_number', v)} hint="Formaat NL123456789B01" />
          <Input label="IBAN" value={s.iban ?? ''} onChange={(v) => set('iban', v)} />
          <Input label="Btw-tarief (%)" kind="number" step="0.01" value={s.vat_rate} onChange={(v) => set('vat_rate', Number(v))} />
          <Input label="Offerte geldig (dagen)" kind="number" value={s.quote_valid_days} onChange={(v) => set('quote_valid_days', Number(v))} />
          <Input label="Betaaltermijn factuur (dagen)" kind="number" value={s.invoice_due_days} onChange={(v) => set('invoice_due_days', Number(v))} />
        </Fieldset>

        <Fieldset legend="Prijzen" description="De offerte-wizard op de site rekent hiermee de indicatie uit.">
          <Input label="Prijs per cocktail (€)" kind="number" step="0.01" value={s.cocktail_price} onChange={(v) => set('cocktail_price', Number(v))} />
          <Input label="Minimum aantal cocktails" kind="number" value={s.min_cocktails} onChange={(v) => set('min_cocktails', Number(v))} />
          <Input label="Workshopprijs per persoon (€)" kind="number" step="0.01" value={s.workshop_price_per_person} onChange={(v) => set('workshop_price_per_person', Number(v))} />
          <Input label="Voorrijkosten dichtbij (€)" kind="number" step="0.01" value={s.travel_fee_near} onChange={(v) => set('travel_fee_near', Number(v))} />
          <Input label="Voorrijkosten veraf (€)" kind="number" step="0.01" value={s.travel_fee_far} onChange={(v) => set('travel_fee_far', Number(v))} />
          <Input label="Grens dichtbij (km)" kind="number" value={s.travel_near_km_limit} onChange={(v) => set('travel_near_km_limit', Number(v))} />
        </Fieldset>

        <Fieldset legend="Aanvragen en signalen" description="Vanaf hoeveel dagen het overzicht een aanvraag als blijven liggen markeert.">
          <Input label="Minimale aanvraagtermijn (uur)" kind="number" value={s.booking_notice_hours} onChange={(v) => set('booking_notice_hours', Number(v))} />
          <Input label="Maximaal aantal gasten" kind="number" value={s.max_guests} onChange={(v) => set('max_guests', Number(v))} />
          <Input label="Aanvraag onbeantwoord na (dagen)" kind="number" value={s.nudge_new_days} onChange={(v) => set('nudge_new_days', Number(v))} />
          <Input label="Offerte zonder reactie na (dagen)" kind="number" value={s.nudge_quote_days} onChange={(v) => set('nudge_quote_days', Number(v))} />
        </Fieldset>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
        )}

        {/* The form is long; the save button follows you down it. */}
        <div className="sticky bottom-0 flex items-center gap-4 rounded-xl border border-white/10 bg-surface-elevated/95 px-4 py-3 backdrop-blur">
          <button
            type="submit"
            disabled={saving}
            className="h-11 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            {saving ? 'Opslaan...' : 'Opslaan'}
          </button>
          <span role="status" className={`text-sm text-ok transition-opacity duration-200 ${saved ? 'opacity-100' : 'opacity-0'}`}>
            Opgeslagen
          </span>
        </div>
      </form>
    </AdminLayout>
  );
}

function Input({
  label, value, onChange, kind = 'text', step, hint,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  kind?: InputKind;
  step?: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input
        id={id}
        type={kind}
        step={step}
        inputMode={kind === 'number' ? 'decimal' : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLS}
      />
    </Field>
  );
}
