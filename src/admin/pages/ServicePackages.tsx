import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
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

  async function load() {
    const { data, error } = await supabase.from('service_packages').select('*').order('created_at', { ascending: true });
    if (error) { console.error('Failed to load service packages', error); return; }
    setPackages(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openEdit(pkg: ServicePackage) {
    setEditing(pkg);
    setForm({ package_name: pkg.package_name, description: pkg.description, price: pkg.price, price_unit: pkg.price_unit, min_quantity: pkg.min_quantity, category: pkg.category, is_featured: pkg.is_featured, is_active: pkg.is_active });
  }

  function openCreate() {
    setCreating(true);
    setForm(EMPTY_FORM);
  }

  function close() {
    setEditing(null);
    setCreating(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error } = editing
      ? await supabase.from('service_packages').update(form).eq('id', editing.id)
      : await supabase.from('service_packages').insert(form);
    if (error) { console.error('Failed to save service package', error); return; }
    close();
    load();
  }

  async function toggle(pkg: ServicePackage, field: 'is_active' | 'is_featured') {
    const { error } = await supabase.from('service_packages').update({ [field]: !pkg[field] }).eq('id', pkg.id);
    if (error) { console.error('Failed to toggle service package field', error); return; }
    load();
  }

  return (
    <AdminLayout title="Servicepakketten">
      <button onClick={openCreate} className="mb-6 rounded-full px-6 py-3 text-base bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
        Nieuw pakket
      </button>

      {loading ? (
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted text-lg">Laden...</div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {packages.map((pkg) => (
          <div key={pkg.id} className="rounded-xl bg-surface-elevated border border-white/5 p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-heading text-xl">{pkg.package_name}</h3>
              <button onClick={() => openEdit(pkg)} className="text-base text-gold-light hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 rounded">Bewerken</button>
            </div>
            <p className="text-muted text-base mb-4">{pkg.description}</p>
            <div className="text-gold-light text-lg mb-4">&euro;{pkg.price} {pkg.price_unit === 'per_cocktail' ? 'per cocktail' : 'per persoon'} &middot; min. {pkg.min_quantity}</div>
            <div className="flex gap-2">
              <button onClick={() => toggle(pkg, 'is_active')} className={`rounded-full px-3 py-1.5 text-sm border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${pkg.is_active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/15 text-muted'}`}>
                {pkg.is_active ? 'Actief' : 'Inactief'}
              </button>
              <button onClick={() => toggle(pkg, 'is_featured')} className={`rounded-full px-3 py-1.5 text-sm border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${pkg.is_featured ? 'border-gold/40 text-gold-light' : 'border-white/15 text-muted'}`}>
                {pkg.is_featured ? 'Uitgelicht' : 'Niet uitgelicht'}
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      <Drawer open={editing !== null || creating} title={editing ? 'Pakket bewerken' : 'Nieuw pakket'} onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="block">
            <span className="block text-base text-muted mb-2">Naam</span>
            <input required value={form.package_name} onChange={(e) => setForm((f) => ({ ...f, package_name: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-base text-muted mb-2">Omschrijving</span>
            <textarea rows={3} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-base text-muted mb-2">Categorie</span>
            <input required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-base text-muted mb-2">Prijseenheid</span>
            <select value={form.price_unit} onChange={(e) => setForm((f) => ({ ...f, price_unit: e.target.value as PriceUnit }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light">
              <option value="per_cocktail">Per cocktail</option>
              <option value="per_person">Per persoon</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-base text-muted mb-2">Prijs (&euro;)</span>
            <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-base text-muted mb-2">Minimale afname</span>
            <input type="number" required value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: Number(e.target.value) }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            <span className="text-base">Actief</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
            <span className="text-base">Uitgelicht</span>
          </label>
          <button type="submit" className="rounded-full px-6 py-3 text-base bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
            Opslaan
          </button>
        </form>
      </Drawer>
    </AdminLayout>
  );
}
