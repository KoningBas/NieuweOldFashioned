// Recipe rows behind a cocktail. The packing generator multiplies `amount` by
// the planned number of cocktails, then divides by `pack_size` to land on
// bottles or crates instead of millilitres.

import { useEffect, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { SkeletonBlock } from './Skeleton';
import { CELL_INPUT_CLS } from './Form';
import { IconPlus, IconTrash } from './icons';
import { CATEGORY_LABELS, CATEGORY_ORDER, PERISHABILITY_LABELS, PERISHABILITY_ORDER } from '../../shared/lib/packing';
import type { CocktailIngredient, PackingCategory, Perishability } from '../../shared/types/db';

const AMOUNT_UNITS: CocktailIngredient['unit'][] = ['ml', 'cl', 'g', 'st'];

export function IngredientEditor({ cocktailId }: { cocktailId: string }) {
  const [rows, setRows] = useState<CocktailIngredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.from('cocktail_ingredients').select('*').eq('cocktail_id', cocktailId).order('sort_order')
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError('Ingrediënten niet beschikbaar. Voer migratie 0005_packing.sql uit.');
        else setRows(data ?? []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [cocktailId]);

  function patch(id: string, values: Partial<CocktailIngredient>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
  }

  async function persist(row: CocktailIngredient) {
    const { error: err } = await supabase.from('cocktail_ingredients').update({
      name: row.name, amount: row.amount, unit: row.unit, category: row.category,
      perishability: row.perishability, pack_size: row.pack_size, pack_unit: row.pack_unit,
    }).eq('id', row.id);
    if (err) setError(`Opslaan mislukt: ${err.message}`);
  }

  /** Free text saves when you leave the field, so typing stays quiet. */
  function save(id: string) {
    const row = rows.find((r) => r.id === id);
    if (row) void persist(row);
  }

  /** A dropdown choice is final the moment it is made; waiting for blur would
   *  lose the change when the user closes the panel straight after. */
  function commit(id: string, values: Partial<CocktailIngredient>) {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const merged = { ...current, ...values };
    setRows((prev) => prev.map((r) => (r.id === id ? merged : r)));
    void persist(merged);
  }

  async function addRow() {
    const sort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { data, error: err } = await supabase.from('cocktail_ingredients').insert({
      cocktail_id: cocktailId, name: '', amount: 0, unit: 'ml',
      category: 'sterke_drank', perishability: 'houdbaar', sort_order: sort,
    }).select().single();
    if (err || !data) { setError(`Toevoegen mislukt: ${err?.message ?? 'onbekende fout'}`); return; }
    setRows((prev) => [...prev, data]);
  }

  async function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    const { error: err } = await supabase.from('cocktail_ingredients').delete().eq('id', id);
    if (err) setError(`Verwijderen mislukt: ${err.message}`);
  }

  if (loading) return <SkeletonBlock className="h-24" />;
  if (error && rows.length === 0) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-sm text-muted">
        Hoeveelheid per cocktail. Vul de inkoopverpakking in als je groter inkoopt dan je schenkt:
        30 ml uit een fles van 700 ml wordt dan automatisch omgerekend naar hele flessen.
      </p>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nog geen ingrediënten. Zonder recept telt deze cocktail niet mee in de paklijst.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full min-w-[52rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-medium">Ingrediënt</th>
                <th className="w-24 px-2 py-2.5 text-right font-medium">Per stuk</th>
                <th className="w-20 px-2 py-2.5 font-medium">Eenheid</th>
                <th className="w-48 px-2 py-2.5 font-medium">Categorie</th>
                <th className="w-40 px-2 py-2.5 font-medium">Houdbaarheid</th>
                <th className="w-24 px-2 py-2.5 text-right font-medium">Verpakking</th>
                <th className="w-24 px-2 py-2.5 font-medium">Inkoop</th>
                <th className="w-12 px-2 py-2.5"><span className="sr-only">Verwijderen</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                  <td className="px-2 py-1">
                    <input aria-label="Naam" value={row.name} onChange={(e) => patch(row.id, { name: e.target.value })} onBlur={() => save(row.id)} className={CELL_INPUT_CLS} placeholder="Bourbon" />
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label="Hoeveelheid per cocktail" type="number" step="0.01" inputMode="decimal" value={row.amount} onChange={(e) => patch(row.id, { amount: Number(e.target.value) })} onBlur={() => save(row.id)} className={`${CELL_INPUT_CLS} text-right`} />
                  </td>
                  <td className="px-2 py-1">
                    <select aria-label="Eenheid" value={row.unit} onChange={(e) => commit(row.id, { unit: e.target.value as CocktailIngredient['unit'] })} className={CELL_INPUT_CLS}>
                      {AMOUNT_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select aria-label="Categorie" value={row.category} onChange={(e) => commit(row.id, { category: e.target.value as PackingCategory })} className={CELL_INPUT_CLS}>
                      {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <select aria-label="Houdbaarheid" value={row.perishability} onChange={(e) => commit(row.id, { perishability: e.target.value as Perishability })} className={CELL_INPUT_CLS}>
                      {PERISHABILITY_ORDER.map((p) => <option key={p} value={p}>{PERISHABILITY_LABELS[p]}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label="Verpakkingsinhoud" type="number" step="0.01" inputMode="decimal" value={row.pack_size ?? ''} placeholder="–" onChange={(e) => patch(row.id, { pack_size: e.target.value === '' ? null : Number(e.target.value) })} onBlur={() => save(row.id)} className={`${CELL_INPUT_CLS} text-right`} />
                  </td>
                  <td className="px-2 py-1">
                    <input aria-label="Inkoopeenheid" value={row.pack_unit ?? ''} placeholder="–" onChange={(e) => patch(row.id, { pack_unit: e.target.value || null })} onBlur={() => save(row.id)} className={CELL_INPUT_CLS} />
                  </td>
                  <td className="px-2 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      aria-label={`Verwijder ${row.name || 'ingrediënt'}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                    >
                      <IconTrash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconPlus size={16} aria-hidden="true" />
          Ingrediënt toevoegen
        </button>
      </div>
    </div>
  );
}
