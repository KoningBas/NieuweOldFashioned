import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { logActivity } from '../../lib/activity';
import { SkeletonBlock } from '../../components/Skeleton';
import { IconPlus, IconTrash } from '../../components/icons';
import {
  buildPackingItems, CATEGORY_LABELS, CATEGORY_ORDER,
  PERISHABILITY_LABELS, PERISHABILITY_ORDER,
} from '../../../shared/lib/packing';
import type {
  CocktailIngredient, CocktailMenuItem, PackingCategory, PackingList, PackingListItem,
  Perishability, QuoteRequest,
} from '../../../shared/types/db';

type SortMode = 'categorie' | 'houdbaarheid';

interface Props {
  request: QuoteRequest;
}

export function PackingTab({ request }: Props) {
  const [list, setList] = useState<PackingList | null>(null);
  const [items, setItems] = useState<PackingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('categorie');
  const [busy, setBusy] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Cocktail picker state (pre-generation)
  const [cocktails, setCocktails] = useState<CocktailMenuItem[]>([]);
  const [planned, setPlanned] = useState<Record<string, number>>({});

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: pl, error } = await supabase.from('packing_lists').select('*').eq('request_id', request.id).maybeSingle();
      if (!alive) return;
      if (error) { setUnavailable(true); setLoading(false); return; }
      if (pl) {
        setList(pl);
        const { data: pli } = await supabase.from('packing_list_items').select('*').eq('list_id', pl.id).order('sort_order');
        if (alive) setItems(pli ?? []);
      } else {
        const [cockRes, plannedRes] = await Promise.all([
          supabase.from('cocktail_menu').select('*').eq('is_active', true).order('name'),
          supabase.from('request_cocktails').select('*').eq('request_id', request.id),
        ]);
        if (!alive) return;
        setCocktails(cockRes.data ?? []);
        setPlanned(Object.fromEntries((plannedRes.data ?? []).map((rc) => [rc.cocktail_id, rc.planned_count])));
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [request.id]);

  const plannedTotal = useMemo(() => Object.values(planned).reduce((s, n) => s + (n || 0), 0), [planned]);
  const checkedCount = items.filter((i) => i.is_checked).length;

  async function generate() {
    setBusy(true);
    try {
      // First generation persists the picker choice; a regenerate reuses the
      // cocktail counts already stored for this request.
      let chosen: [string, number][];
      if (!list) {
        await supabase.from('request_cocktails').delete().eq('request_id', request.id);
        chosen = Object.entries(planned).filter(([, n]) => n > 0);
        if (chosen.length) {
          await supabase.from('request_cocktails').insert(
            chosen.map(([cocktail_id, planned_count]) => ({ request_id: request.id, cocktail_id, planned_count })),
          );
        }
      } else {
        const { data: rc } = await supabase.from('request_cocktails').select('*').eq('request_id', request.id);
        chosen = (rc ?? []).map((row) => [row.cocktail_id, row.planned_count]);
      }

      const [tplRes, ingRes] = await Promise.all([
        supabase.from('packing_templates').select('id, packing_template_items(*)').eq('package_id', request.package_id).limit(1).maybeSingle(),
        supabase.from('cocktail_ingredients').select('*').in('cocktail_id', chosen.map(([id]) => id)),
      ]);

      const templateItems = (tplRes.data?.packing_template_items ?? []) as never[];
      const ingredients = (ingRes.data ?? []) as CocktailIngredient[];
      const drafts = buildPackingItems(
        templateItems,
        chosen.map(([cocktail_id, planned_count]) => ({ cocktail_id, planned_count })),
        ingredients,
        request.guest_count,
        request.cocktail_count,
      );

      let currentList = list;
      if (currentList) {
        await supabase.from('packing_list_items').delete().eq('list_id', currentList.id);
        await supabase.from('packing_lists').update({ generated_at: new Date().toISOString() }).eq('id', currentList.id);
      } else {
        const { data: pl, error } = await supabase.from('packing_lists')
          .insert({ request_id: request.id, generated_at: new Date().toISOString() })
          .select().single();
        if (error || !pl) throw error;
        currentList = pl;
      }

      const { data: inserted, error: itemErr } = await supabase.from('packing_list_items')
        .insert(drafts.map((d) => ({ ...d, list_id: currentList!.id })))
        .select();
      if (itemErr) throw itemErr;

      setList(currentList);
      setItems((inserted ?? []).sort((a, b) => a.sort_order - b.sort_order));
      setConfirmRegenerate(false);
      await logActivity(request.id, 'system', `Paklijst gegenereerd (${drafts.length} regels)`);
    } catch (e) {
      console.error('Failed to generate packing list', e);
      setUnavailable(true);
    } finally {
      setBusy(false);
    }
  }

  async function toggleItem(item: PackingListItem) {
    // Optimistic and immediate — this happens with one hand on a crate.
    const next = !item.is_checked;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: next } : i)));
    const { error } = await supabase.from('packing_list_items').update({ is_checked: next }).eq('id', item.id);
    if (error) {
      console.error('Failed to toggle item', error);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_checked: !next } : i)));
    }
  }

  async function addItem() {
    if (!list) return;
    const sort = items.length ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from('packing_list_items').insert({
      list_id: list.id, name: '', category: 'barmateriaal', perishability: 'houdbaar',
      quantity: 1, unit: 'st', origin: 'manual', sort_order: sort,
    }).select().single();
    if (!error && data) setItems((prev) => [...prev, data]);
  }

  function patchItem(id: string, patch: Partial<PackingListItem>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function saveItem(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const { error } = await supabase.from('packing_list_items').update({
      name: item.name, quantity: item.quantity, unit: item.unit,
      category: item.category, perishability: item.perishability,
    }).eq('id', id);
    if (error) console.error('Failed to save item', error);
  }

  async function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
    const { error } = await supabase.from('packing_list_items').delete().eq('id', id);
    if (error) console.error('Failed to delete item', error);
  }

  if (loading) return <SkeletonBlock className="h-40" />;

  if (unavailable) {
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        Paklijsten niet beschikbaar. Voer migratie <code className="font-mono">0005_packing.sql</code> uit in de Supabase SQL-editor.
      </p>
    );
  }

  // --- Pre-generation: pick cocktails, then generate --------------------
  if (!list) {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-white/5 bg-surface-elevated p-6">
          <h2 className="mb-1 text-lg font-medium text-white">Welke cocktails schenk je?</h2>
          <p className="mb-5 text-sm text-muted">
            De boodschappenlijst telt de ingrediënten van je keuze op. Aanvraag: {request.cocktail_count} cocktails, {request.guest_count} gasten.
          </p>
          {cocktails.length === 0 ? (
            <p className="text-muted">Geen actieve cocktails op de kaart.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-white/5">
              {cocktails.map((c) => (
                <li key={c.id} className="flex min-h-[3.5rem] items-center gap-4 py-2">
                  <label htmlFor={`plan-${c.id}`} className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] text-white">{c.name}</span>
                    <span className="block truncate text-sm text-muted">{c.category}</span>
                  </label>
                  <input
                    id={`plan-${c.id}`}
                    type="number" min="0" step="10" inputMode="numeric"
                    value={planned[c.id] ?? ''}
                    placeholder="0"
                    onChange={(e) => setPlanned((p) => ({ ...p, [c.id]: Math.max(0, Number(e.target.value)) }))}
                    className="h-11 w-24 rounded-lg border border-white/10 bg-surface px-3 text-right text-[0.9375rem] text-white transition-colors focus:border-gold/50 focus:outline-none"
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
            <span className={`text-sm ${plannedTotal === request.cocktail_count ? 'text-ok' : 'text-muted'}`}>
              Gepland: {plannedTotal} van {request.cocktail_count} cocktails
            </span>
            <button
              onClick={generate}
              disabled={busy}
              className="h-12 rounded-lg bg-gold px-6 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              {busy ? 'Genereren…' : 'Paklijst genereren'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- The checklist itself ---------------------------------------------
  const groups = sortMode === 'categorie'
    ? CATEGORY_ORDER.map((c) => ({ key: c as string, label: CATEGORY_LABELS[c], rows: items.filter((i) => i.category === c) }))
    : PERISHABILITY_ORDER.map((p) => ({ key: p as string, label: PERISHABILITY_LABELS[p], rows: items.filter((i) => i.perishability === p) }));

  return (
    <div className="flex flex-col gap-5">
      {/* Progress — sticky so it stays visible while checking off */}
      <div className="sticky top-0 z-20 -mx-1 rounded-xl border border-white/10 bg-surface-elevated/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[0.9375rem] font-medium text-white">{checkedCount} van {items.length} ingepakt</span>
          <div className="h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={checkedCount} aria-valuemin={0} aria-valuemax={items.length} aria-label="Inpakvoortgang">
            <div
              className="h-full rounded-full bg-gold transition-transform duration-200 origin-left"
              style={{ transform: `scaleX(${items.length ? checkedCount / items.length : 0})` }}
            />
          </div>
          <div className="inline-flex gap-1 rounded-lg border border-white/10 p-0.5" role="tablist" aria-label="Sorteer paklijst">
            {(['categorie', 'houdbaarheid'] as SortMode[]).map((m) => (
              <button
                key={m}
                role="tab"
                aria-selected={sortMode === m}
                onClick={() => setSortMode(m)}
                className={`h-9 rounded-md px-3 text-sm capitalize transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 ${
                  sortMode === m ? 'bg-gold font-medium text-surface' : 'text-muted hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {groups.filter((g) => g.rows.length > 0).map((group) => (
        <section key={group.key} aria-label={group.label}>
          <h3 className="mb-2 flex items-baseline gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
            {group.label}
            <span className="font-normal normal-case tracking-normal">({group.rows.filter((r) => r.is_checked).length}/{group.rows.length})</span>
          </h3>
          <ul className="overflow-hidden rounded-xl border border-white/5 bg-surface-elevated">
            {group.rows.map((item) => (
              <li key={item.id} className="group flex min-h-[3.5rem] items-center gap-1 border-b border-white/5 last:border-b-0">
                {/* Full-width tap area for the check */}
                <button
                  onClick={() => toggleItem(item)}
                  role="checkbox"
                  aria-checked={item.is_checked}
                  aria-label={`${item.name || 'Naamloos artikel'}, ${item.quantity} ${item.unit}`}
                  className="flex min-h-[3.5rem] min-w-0 flex-1 items-center gap-3.5 px-4 text-left transition-colors duration-150 hover:bg-white/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold-light"
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors duration-150 ${
                    item.is_checked ? 'border-gold bg-gold text-surface' : 'border-white/25'
                  }`}>
                    {item.is_checked && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[0.9375rem] transition-colors duration-150 ${item.is_checked ? 'text-muted line-through' : 'text-white'}`}>
                    {item.name || <em className="text-muted">naamloos</em>}
                  </span>
                  <span className={`shrink-0 text-[0.9375rem] ${item.is_checked ? 'text-muted' : 'text-white/85'}`}>
                    {item.quantity} {item.unit}
                  </span>
                </button>
                <details className="relative shrink-0">
                  <summary
                    aria-label={`Bewerk ${item.name || 'artikel'}`}
                    className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light [&::-webkit-details-marker]:hidden"
                  >
                    ⋯
                  </summary>
                  <div className="absolute right-2 z-30 mt-1 w-64 rounded-xl border border-white/10 bg-surface-raised p-3 shadow-[0_20px_45px_-18px_rgba(0,0,0,0.7)]">
                    <label className="mb-2 block text-xs text-muted">
                      Naam
                      <input
                        value={item.name}
                        onChange={(e) => patchItem(item.id, { name: e.target.value })}
                        onBlur={() => saveItem(item.id)}
                        className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                      />
                    </label>
                    <div className="flex gap-2">
                      <label className="block flex-1 text-xs text-muted">
                        Aantal
                        <input
                          type="number" min="0" step="0.5" value={item.quantity}
                          onChange={(e) => patchItem(item.id, { quantity: Number(e.target.value) })}
                          onBlur={() => saveItem(item.id)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-right text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                        />
                      </label>
                      <label className="block flex-1 text-xs text-muted">
                        Eenheid
                        <input
                          value={item.unit}
                          onChange={(e) => patchItem(item.id, { unit: e.target.value })}
                          onBlur={() => saveItem(item.id)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2.5 text-[0.9375rem] text-white focus:border-gold/50 focus:outline-none"
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <label className="block flex-1 text-xs text-muted">
                        Categorie
                        <select
                          value={item.category}
                          onChange={(e) => { patchItem(item.id, { category: e.target.value as PackingCategory }); }}
                          onBlur={() => saveItem(item.id)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2 text-sm text-white focus:border-gold/50 focus:outline-none"
                        >
                          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                        </select>
                      </label>
                      <label className="block flex-1 text-xs text-muted">
                        Houdbaarheid
                        <select
                          value={item.perishability}
                          onChange={(e) => { patchItem(item.id, { perishability: e.target.value as Perishability }); }}
                          onBlur={() => saveItem(item.id)}
                          className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-surface px-2 text-sm text-white focus:border-gold/50 focus:outline-none"
                        >
                          {PERISHABILITY_ORDER.map((p) => <option key={p} value={p}>{PERISHABILITY_LABELS[p]}</option>)}
                        </select>
                      </label>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-danger/30 text-sm text-danger transition-colors duration-150 hover:bg-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                    >
                      <IconTrash size={14} /> Verwijder regel
                    </button>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={addItem}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconPlus size={16} /> Regel toevoegen
        </button>
        <div className="ml-auto">
          {confirmRegenerate ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="text-sm text-danger">Handmatige regels en vinkjes gaan verloren.</span>
              <button onClick={generate} disabled={busy} className="h-11 rounded-lg border border-danger/40 bg-danger/15 px-4 text-sm font-medium text-danger transition-colors duration-150 hover:bg-danger/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2">
                {busy ? 'Bezig…' : 'Ja, opnieuw genereren'}
              </button>
              <button onClick={() => setConfirmRegenerate(false)} className="h-11 rounded-lg px-3 text-sm text-muted transition-colors duration-150 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2">
                Annuleer
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmRegenerate(true)}
              className="h-11 rounded-lg px-4 text-sm text-muted transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Opnieuw genereren
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
