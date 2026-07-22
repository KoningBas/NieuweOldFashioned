// Which cocktails get poured at this job, and how many of each. The wizard on
// the Op Locatie page will fill this in later; until then it is typed here.
// The shopping preview runs the same aggregation the packing list uses, so the
// numbers you see before generating are the numbers you get after.

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../shared/lib/supabase';
import { SkeletonBlock } from '../../components/Skeleton';
import { useAutosave } from '../../lib/saveState';
import {
  aggregateIngredients, CATEGORY_LABELS, formatAmount, ORDER_CATEGORY_ORDER,
} from '../../../shared/lib/packing';
import type {
  CocktailIngredient, CocktailMenuItem, PackingCategory, QuoteRequest,
} from '../../../shared/types/db';

interface Props {
  request: QuoteRequest;
  /** Lifts the new stamp so the Paklijst tab can tell it has fallen behind. */
  onCocktailsChanged: (stampedAt: string) => void;
}

export function CocktailsTab({ request, onCocktailsChanged }: Props) {
  const [cocktails, setCocktails] = useState<CocktailMenuItem[]>([]);
  const [ingredients, setIngredients] = useState<CocktailIngredient[]>([]);
  const [planned, setPlanned] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  // The whole choice is one value: rows are replaced wholesale, so there is no
  // per-row write to schedule.
  const { reset } = useAutosave({
    key: 'cocktailkeuze',
    value: planned,
    enabled: !loading && !unavailable,
    save: async (next) => {
      const rows = Object.entries(next)
        .filter(([, n]) => n > 0)
        .map(([cocktail_id, planned_count]) => ({ request_id: request.id, cocktail_id, planned_count }));
      const stampedAt = new Date().toISOString();

      const { error: delErr } = await supabase.from('request_cocktails').delete().eq('request_id', request.id);
      if (delErr) return `Opslaan mislukt: ${delErr.message}`;
      if (rows.length) {
        const { error: insErr } = await supabase.from('request_cocktails').insert(rows);
        if (insErr) return `Opslaan mislukt: ${insErr.message}`;
      }

      // The choice itself is saved by now. A failing stamp only costs the
      // "packing list is behind" warning, so it must not read as a lost edit.
      const { error: stampErr } = await supabase
        .from('quote_requests').update({ cocktails_updated_at: stampedAt }).eq('id', request.id);
      if (stampErr) console.error('Failed to stamp request (run migration 0008)', stampErr);
      else onCocktailsChanged(stampedAt);
      return null;
    },
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const [menuRes, chosenRes] = await Promise.all([
        supabase.from('cocktail_menu').select('*').eq('is_active', true).order('name'),
        supabase.from('request_cocktails').select('*').eq('request_id', request.id),
      ]);
      if (!alive) return;
      if (chosenRes.error) { setUnavailable(true); setLoading(false); return; }

      const menu = menuRes.data ?? [];
      const chosenCounts = Object.fromEntries((chosenRes.data ?? []).map((rc) => [rc.cocktail_id, rc.planned_count]));
      setCocktails(menu);
      reset(chosenCounts);
      setPlanned(chosenCounts);

      if (menu.length) {
        const { data: ing } = await supabase
          .from('cocktail_ingredients').select('*').in('cocktail_id', menu.map((c) => c.id));
        if (alive) setIngredients(ing ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [request.id, reset]);

  const chosen = useMemo(
    () => Object.entries(planned).filter(([, n]) => n > 0).map(([cocktail_id, planned_count]) => ({ cocktail_id, planned_count })),
    [planned],
  );
  const plannedTotal = chosen.reduce((sum, c) => sum + c.planned_count, 0);
  const difference = plannedTotal - request.cocktail_count;

  // Glaswerk drops out here: it rides along in the van from the base kit, so it
  // belongs on the packing list but never on a shopping list.
  const shopping = useMemo(
    () => aggregateIngredients(chosen, ingredients).filter((row) => row.category !== 'glaswerk'),
    [chosen, ingredients],
  );
  const shoppingGroups = useMemo(
    () => ORDER_CATEGORY_ORDER
      .map((category) => ({ category, rows: shopping.filter((s) => s.category === category) }))
      .filter((g) => g.rows.length > 0),
    [shopping],
  );

  function setCount(id: string, value: number) {
    setPlanned((prev) => ({ ...prev, [id]: Math.max(0, Math.round(value)) }));
  }

  /** Spreads the requested total over everything already given a number, or
   *  over the whole menu when nothing is chosen yet. */
  function spreadEvenly() {
    const targets = chosen.length ? chosen.map((c) => c.cocktail_id) : cocktails.map((c) => c.id);
    if (!targets.length) return;
    const each = Math.floor(request.cocktail_count / targets.length);
    const remainder = request.cocktail_count - each * targets.length;
    const next = { ...planned };
    for (const id of targets) next[id] = 0;
    targets.forEach((id, index) => { next[id] = each + (index < remainder ? 1 : 0); });
    setPlanned(next);
  }

  if (loading) return <SkeletonBlock className="h-64" />;

  if (unavailable) {
    return (
      <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
        Cocktailkeuze niet beschikbaar. Voer migratie <code className="font-mono">0005_packing.sql</code> uit in de Supabase SQL-editor.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="cocktail-keuze" className="rounded-xl border border-white/5 bg-surface-elevated p-6">
        <h2 id="cocktail-keuze" className="mb-5 text-lg font-medium text-white">Welke cocktails schenk je?</h2>
        <p className="mb-5 max-w-prose text-sm leading-relaxed text-muted">
          Deze aanvraag gaat over {request.cocktail_count} cocktails voor {request.guest_count} gasten.
          Verdeel dat aantal over de kaart; de boodschappenlijst hieronder rekent live mee.
        </p>

        {cocktails.length === 0 ? (
          <p className="text-muted">Geen actieve cocktails op de kaart. Zet er eerst een aan bij Cocktailkaart.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/5">
            {cocktails.map((c) => {
              const count = planned[c.id] ?? 0;
              return (
                <li key={c.id} className="flex min-h-[3.5rem] items-center gap-4 py-2">
                  <label htmlFor={`plan-${c.id}`} className="min-w-0 flex-1">
                    <span className={`block truncate text-[0.9375rem] transition-colors duration-150 ${count > 0 ? 'text-white' : 'text-white/70'}`}>
                      {c.name}
                    </span>
                    <span className="block truncate text-sm text-muted">{c.category}</span>
                  </label>
                  <input
                    id={`plan-${c.id}`}
                    type="number" min="0" step="10" inputMode="numeric"
                    value={planned[c.id] ?? ''}
                    placeholder="0"
                    onChange={(e) => setCount(c.id, e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`h-11 w-24 rounded-lg border bg-surface px-3 text-right text-[0.9375rem] text-white transition-colors duration-150 focus:border-gold/50 focus:outline-none ${
                      count > 0 ? 'border-gold/40' : 'border-white/10'
                    }`}
                  />
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
          <span className={`text-sm ${difference === 0 ? 'text-ok' : 'text-muted'}`}>
            Gepland: {plannedTotal} van {request.cocktail_count} cocktails
            {difference !== 0 && ` · ${Math.abs(difference)} ${difference > 0 ? 'te veel' : 'te weinig'}`}
          </span>
          {cocktails.length > 0 && (
            <button
              type="button"
              onClick={spreadEvenly}
              className="h-11 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
            >
              Verdeel gelijk
            </button>
          )}
        </div>
      </section>

      <section aria-labelledby="cocktail-inkoop" className="rounded-xl border border-white/5 bg-surface-elevated p-6">
        <h2 id="cocktail-inkoop" className="text-lg font-medium text-white">Wat je hiervoor inkoopt</h2>
        <p className="mb-5 mt-1 max-w-prose text-sm leading-relaxed text-muted">
          Alleen de ingrediënten. Bar, glaswerk en materiaal komen uit de basisuitrusting en het pakketsjabloon
          en staan straks in de paklijst. Tussen haakjes staat wat de recepten er werkelijk uit schenken.
        </p>

        {shopping.length === 0 ? (
          <p className="text-muted">
            {plannedTotal === 0
              ? 'Vul hierboven aantallen in, dan verschijnt hier je boodschappenlijst.'
              : 'Bij deze cocktails zijn nog geen ingrediënten vastgelegd. Vul ze aan bij Cocktailkaart.'}
          </p>
        ) : (
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {shoppingGroups.map((group) => (
              <div key={group.category}>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted">
                  {CATEGORY_LABELS[group.category as PackingCategory]}
                </h3>
                <ul className="flex flex-col divide-y divide-white/5">
                  {group.rows.map((row) => (
                    <li key={`${row.name}-${row.unit}`} className="flex items-baseline justify-between gap-4 py-2">
                      <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-white/85">{row.name}</span>
                      <span className="shrink-0 text-right text-[0.9375rem] tabular-nums text-white">
                        {formatAmount(row.quantity)} {row.unit}
                        {/* Own line on a phone so the ingredient name keeps its width. */}
                        {row.base_amount !== null && row.base_unit && (
                          <span className="block text-muted sm:inline"> ({formatAmount(row.base_amount)} {row.base_unit})</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
