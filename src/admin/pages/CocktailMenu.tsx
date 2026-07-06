import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
import type { CocktailMenuItem } from '../../shared/types/db';

type FormState = Omit<CocktailMenuItem, 'id' | 'created_at'>;

const EMPTY_FORM: FormState = { name: '', description: '', category: '', is_featured: false, is_active: true };

export function CocktailMenu() {
  const [cocktails, setCocktails] = useState<CocktailMenuItem[]>([]);
  const [editing, setEditing] = useState<CocktailMenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  async function load() {
    const { data, error } = await supabase.from('cocktail_menu').select('*').order('created_at', { ascending: true });
    if (error) { console.error('Failed to load cocktail menu', error); return; }
    setCocktails(data ?? []);
  }

  useEffect(() => { load(); }, []);

  function openEdit(item: CocktailMenuItem) {
    setEditing(item);
    setForm({ name: item.name, description: item.description, category: item.category, is_featured: item.is_featured, is_active: item.is_active });
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
      ? await supabase.from('cocktail_menu').update(form).eq('id', editing.id)
      : await supabase.from('cocktail_menu').insert(form);
    if (error) { console.error('Failed to save cocktail', error); return; }
    close();
    load();
  }

  async function toggle(item: CocktailMenuItem, field: 'is_active' | 'is_featured') {
    const { error } = await supabase.from('cocktail_menu').update({ [field]: !item[field] }).eq('id', item.id);
    if (error) { console.error('Failed to toggle cocktail field', error); return; }
    load();
  }

  return (
    <AdminLayout title="Cocktailkaart">
      <button onClick={openCreate} className="mb-6 rounded-full px-6 py-3 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
        Nieuwe cocktail
      </button>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cocktails.map((item) => (
          <div key={item.id} className="rounded-xl bg-surface-elevated border border-white/5 p-6">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-heading text-lg">{item.name}</h3>
              <button onClick={() => openEdit(item)} className="text-sm text-gold-light hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 rounded">Bewerken</button>
            </div>
            <span className="uppercase tracking-widest text-xs text-muted">{item.category}</span>
            <p className="text-muted text-sm my-3">{item.description}</p>
            <div className="flex gap-2">
              <button onClick={() => toggle(item, 'is_active')} className={`rounded-full px-3 py-1 text-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${item.is_active ? 'border-emerald-500/40 text-emerald-300' : 'border-white/15 text-muted'}`}>
                {item.is_active ? 'Actief' : 'Inactief'}
              </button>
              <button onClick={() => toggle(item, 'is_featured')} className={`rounded-full px-3 py-1 text-xs border focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${item.is_featured ? 'border-gold/40 text-gold-light' : 'border-white/15 text-muted'}`}>
                {item.is_featured ? 'Uitgelicht' : 'Niet uitgelicht'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer open={editing !== null || creating} title={editing ? 'Cocktail bewerken' : 'Nieuwe cocktail'} onClose={close}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <label className="block">
            <span className="block text-sm text-muted mb-2">Naam</span>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-2">Omschrijving</span>
            <textarea rows={3} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="block">
            <span className="block text-sm text-muted mb-2">Categorie</span>
            <input required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full rounded-lg bg-surface border border-white/15 px-4 py-2.5 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light" />
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
            <span className="text-sm">Actief</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
            <span className="text-sm">Uitgelicht</span>
          </label>
          <button type="submit" className="rounded-full px-6 py-3 bg-gradient-to-b from-gold-light to-primary-dark text-surface font-medium hover:-translate-y-0.5 active:translate-y-0 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
            Opslaan
          </button>
        </form>
      </Drawer>
    </AdminLayout>
  );
}
