import { useEffect, useId, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
import { Disclosure } from '../components/Disclosure';
import { PackingTemplateEditor } from '../components/PackingTemplateEditor';
import { SkeletonRows } from '../components/Skeleton';
import { Field, INPUT_CLS } from '../components/Form';
import { IconPlus } from '../components/icons';
import { formatEuro } from '../../shared/lib/format';
import type { PriceUnit, ServicePackage } from '../../shared/types/db';

type FormState = Omit<ServicePackage, 'id' | 'created_at'>;

const EMPTY_FORM: FormState = {
  package_name: '', description: '', price: 0, price_unit: 'per_cocktail', min_quantity: 1, category: '', is_featured: false, is_active: true,
};

export function ServicePackages() {
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [editing, setEditing] = useState<ServicePackage | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const descId = useId();
  const catId = useId();
  const unitId = useId();
  const priceId = useId();
  const minId = useId();

  async function load() {
    const { data, error: err } = await supabase.from('service_packages').select('*').order('created_at', { ascending: true });
    if (err) { setError('Pakketten konden niet geladen worden.'); setLoading(false); return; }
    setPackages(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(pkg: ServicePackage) {
    setEditing(pkg);
    setForm({ package_name: pkg.package_name, description: pkg.description, price: pkg.price, price_unit: pkg.price_unit, min_quantity: pkg.min_quantity, category: pkg.category, is_featured: pkg.is_featured, is_active: pkg.is_active });
  }

  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error: err } = editing
      ? await supabase.from('service_packages').update(form).eq('id', editing.id)
      : await supabase.from('service_packages').insert(form);
    if (err) { setError(`Opslaan mislukt: ${err.message}`); return; }
    close();
    load();
  }

  return (
    <AdminLayout title="Pakketten">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="mr-auto max-w-prose text-sm text-muted">
          Klap een pakket open voor zijn paklijstsjabloon: wat er standaard mee moet, en hoe dat meeschaalt met
          gasten en cocktails.
        </p>
        <button
          onClick={() => { setCreating(true); setForm(EMPTY_FORM); }}
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconPlus size={16} aria-hidden="true" />
          Nieuw pakket
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

      {loading ? (
        <SkeletonRows rows={3} />
      ) : packages.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
          Nog geen pakketten.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
          {packages.map((pkg) => (
            <li key={pkg.id} className="border-b border-white/5 last:border-b-0">
              <Disclosure
                summary={
                  <>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">{pkg.package_name}</span>
                      {!pkg.is_active && <Tag tone="muted">Inactief</Tag>}
                      {pkg.is_featured && <Tag tone="gold">Uitgelicht</Tag>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">
                      {formatEuro(pkg.price)} {pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon'} · min. {pkg.min_quantity}
                    </span>
                  </>
                }
                actions={
                  <button
                    onClick={() => openEdit(pkg)}
                    className="h-11 shrink-0 rounded-lg px-3 text-[0.9375rem] text-gold-light transition-colors duration-150 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                  >
                    Bewerken
                  </button>
                }
              >
                <PackingTemplateEditor packageId={pkg.id} packageName={pkg.package_name} />
              </Disclosure>
            </li>
          ))}
        </ul>
      )}

      <Drawer open={editing !== null || creating} title={editing ? 'Pakket bewerken' : 'Nieuw pakket'} onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field label="Naam" htmlFor={nameId}>
            <input id={nameId} required value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} className={INPUT_CLS} />
          </Field>
          <Field label="Omschrijving" htmlFor={descId}>
            <textarea id={descId} rows={3} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${INPUT_CLS} h-auto py-2.5`} />
          </Field>
          <Field label="Categorie" htmlFor={catId}>
            <input id={catId} required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={INPUT_CLS} />
          </Field>
          <Field label="Prijseenheid" htmlFor={unitId}>
            <select id={unitId} value={form.price_unit} onChange={(e) => setForm((f) => ({ ...f, price_unit: e.target.value as PriceUnit }))} className={INPUT_CLS}>
              <option value="per_cocktail">Per cocktail</option>
              <option value="per_person">Per persoon</option>
            </select>
          </Field>
          <Field label="Prijs (€)" htmlFor={priceId}>
            <input id={priceId} type="number" step="0.01" inputMode="decimal" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className={INPUT_CLS} />
          </Field>
          <Field label="Minimale afname" htmlFor={minId}>
            <input id={minId} type="number" inputMode="numeric" required value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: Number(e.target.value) }))} className={INPUT_CLS} />
          </Field>
          <label className="flex min-h-[2.75rem] items-center gap-3">
            <input type="checkbox" className="h-4 w-4 accent-gold" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            <span className="text-[0.9375rem]">Actief</span>
          </label>
          <label className="flex min-h-[2.75rem] items-center gap-3">
            <input type="checkbox" className="h-4 w-4 accent-gold" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
            <span className="text-[0.9375rem]">Uitgelicht</span>
          </label>
          <button type="submit" className="h-11 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
            Opslaan
          </button>
        </form>
      </Drawer>
    </AdminLayout>
  );
}

function Tag({ tone, children }: { tone: 'gold' | 'muted'; children: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs ${
      tone === 'gold' ? 'border-gold/40 text-gold-light' : 'border-white/15 text-muted'
    }`}>
      {children}
    </span>
  );
}
