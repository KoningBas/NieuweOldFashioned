import { useEffect, useId, useState, type FormEvent } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { AdminLayout } from '../layout/AdminLayout';
import { Drawer } from '../components/Drawer';
import { Disclosure } from '../components/Disclosure';
import { IngredientEditor } from '../components/IngredientEditor';
import { SkeletonRows } from '../components/Skeleton';
import { Field, INPUT_CLS } from '../components/Form';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SaveBar } from '../components/SaveBar';
import { SaveStatusProvider } from '../lib/saveState';
import { deleteCocktail, setActive, usageSentence } from '../lib/deletion';
import { IconPlus, IconTrash } from '../components/icons';
import type { CocktailMenuItem } from '../../shared/types/db';

type FormState = Omit<CocktailMenuItem, 'id' | 'created_at'>;

const EMPTY_FORM: FormState = { name: '', description: '', category: '', is_featured: false, is_active: true };

interface Removal {
  item: CocktailMenuItem;
  blocked: number | null;
}

export function CocktailMenu() {
  const [cocktails, setCocktails] = useState<CocktailMenuItem[]>([]);
  const [editing, setEditing] = useState<CocktailMenuItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<FormState>(EMPTY_FORM);
  const [discarding, setDiscarding] = useState(false);
  const [removal, setRemoval] = useState<Removal | null>(null);
  const [removing, setRemoving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const descId = useId();
  const catId = useId();

  async function load() {
    const { data, error: err } = await supabase.from('cocktail_menu').select('*').order('name');
    if (err) { setError('Cocktailkaart kon niet geladen worden.'); setLoading(false); return; }
    setCocktails(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function openForm(item: CocktailMenuItem | null) {
    const next: FormState = item
      ? { name: item.name, description: item.description, category: item.category, is_featured: item.is_featured, is_active: item.is_active }
      : EMPTY_FORM;
    setEditing(item);
    setCreating(item === null);
    setForm(next);
    setBaseline(next);
  }

  const drawerOpen = editing !== null || creating;
  const drawerDirty = drawerOpen && JSON.stringify(form) !== JSON.stringify(baseline);

  function close() {
    setEditing(null);
    setCreating(false);
    setDiscarding(false);
  }

  function requestClose() {
    if (drawerDirty) setDiscarding(true);
    else close();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const { error: err } = editing
      ? await supabase.from('cocktail_menu').update(form).eq('id', editing.id)
      : await supabase.from('cocktail_menu').insert(form);
    if (err) { setError(`Opslaan mislukt: ${err.message}`); return; }
    close();
    load();
  }

  async function confirmRemoval() {
    if (!removal) return;
    setRemoving(true);
    setError(null);

    if (removal.blocked !== null) {
      const message = await setActive('cocktail_menu', removal.item.id, false);
      setRemoving(false);
      if (message) { setError(message); return; }
      setRemoval(null);
      load();
      return;
    }

    const outcome = await deleteCocktail(removal.item.id);
    setRemoving(false);
    if (outcome.kind === 'in-use') { setRemoval({ ...removal, blocked: outcome.count }); return; }
    if (outcome.kind === 'failed') { setError(outcome.message); setRemoval(null); return; }
    setRemoval(null);
    load();
  }

  return (
    <SaveStatusProvider>
      <AdminLayout title="Cocktailkaart">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <p className="mr-auto max-w-prose text-sm text-muted">
            Klap een cocktail open om het recept vast te leggen. De paklijst rekent daarmee uit hoeveel je moet inkopen.
          </p>
          <button
            onClick={() => openForm(null)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
          >
            <IconPlus size={16} aria-hidden="true" />
            Nieuwe cocktail
          </button>
        </div>

        {error && <p role="alert" className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}

        {loading ? (
          <SkeletonRows rows={5} />
        ) : cocktails.length === 0 ? (
          <div className="rounded-xl border border-white/5 bg-surface-elevated p-10 text-center text-muted">
            Nog geen cocktails op de kaart.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
            {cocktails.map((item) => (
              <li key={item.id} className="border-b border-white/5 last:border-b-0">
                <Disclosure
                  summary={
                    <>
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{item.name}</span>
                        {!item.is_active && <Tag tone="muted">Inactief</Tag>}
                        {item.is_featured && <Tag tone="gold">Uitgelicht</Tag>}
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted">
                        {item.category}{item.description ? ` · ${item.description}` : ''}
                      </span>
                    </>
                  }
                  actions={
                    <>
                      <button
                        onClick={() => openForm(item)}
                        className="h-11 shrink-0 rounded-lg px-3 text-[0.9375rem] text-gold-light transition-colors duration-150 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => setRemoval({ item, blocked: null })}
                        aria-label={`Verwijder cocktail ${item.name}`}
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                      >
                        <IconTrash size={16} />
                      </button>
                    </>
                  }
                >
                  <IngredientEditor cocktailId={item.id} />
                </Disclosure>
              </li>
            ))}
          </ul>
        )}

        <SaveBar />

        <Drawer open={drawerOpen} title={editing ? 'Cocktail bewerken' : 'Nieuwe cocktail'} onClose={requestClose}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <Field label="Naam" htmlFor={nameId}>
              <input id={nameId} required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={INPUT_CLS} />
            </Field>
            <Field label="Omschrijving" htmlFor={descId}>
              <textarea id={descId} rows={3} required value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={`${INPUT_CLS} h-auto py-2.5`} />
            </Field>
            <Field label="Categorie" htmlFor={catId}>
              <input id={catId} required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className={INPUT_CLS} />
            </Field>
            <label className="flex min-h-[2.75rem] items-center gap-3">
              <input type="checkbox" className="h-4 w-4 accent-gold" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              <span className="text-[0.9375rem]">Actief op de kaart</span>
            </label>
            <label className="flex min-h-[2.75rem] items-center gap-3">
              <input type="checkbox" className="h-4 w-4 accent-gold" checked={form.is_featured} onChange={(e) => setForm((f) => ({ ...f, is_featured: e.target.checked }))} />
              <span className="text-[0.9375rem]">Uitgelicht</span>
            </label>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="submit" className="h-11 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
                Opslaan
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="h-11 rounded-lg border border-white/15 px-5 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
              >
                Annuleren
              </button>
              {drawerDirty && <span className="text-sm text-muted">Nog niet opgeslagen</span>}
            </div>
          </form>
        </Drawer>

        <ConfirmDialog
          open={discarding}
          title="Wijzigingen weggooien?"
          confirmLabel="Weggooien"
          onConfirm={close}
          onCancel={() => setDiscarding(false)}
        >
          Je hebt deze cocktail aangepast zonder op te slaan. Sluiten gooit die wijzigingen weg.
        </ConfirmDialog>

        <ConfirmDialog
          open={removal !== null}
          title={removal?.blocked ? 'Deze cocktail kan niet weg' : 'Cocktail verwijderen?'}
          confirmLabel={removal?.blocked ? 'Op inactief zetten' : 'Verwijderen'}
          tone={removal?.blocked ? 'neutral' : 'danger'}
          busy={removing}
          onConfirm={confirmRemoval}
          onCancel={() => { if (!removing) setRemoval(null); }}
        >
          {removal?.blocked
            ? usageSentence('cocktail_menu', removal.item.name, removal.blocked)
            : `“${removal?.item.name}” verdwijnt van de kaart, samen met zijn recept. Dit kan niet ongedaan gemaakt worden.`}
        </ConfirmDialog>
      </AdminLayout>
    </SaveStatusProvider>
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
