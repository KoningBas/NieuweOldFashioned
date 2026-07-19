// The packing template behind a package. Rows carry a scaling rule rather than
// a number, so one template serves a party of twelve and one of two hundred.
// The preview column runs the real generator maths, because "×1,5 per gast"
// only means something once you see it land on 120 glazen.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../shared/lib/supabase';
import { SkeletonBlock } from './Skeleton';
import { CELL_INPUT_CLS, INPUT_CLS } from './Form';
import { UndoToast } from './UndoToast';
import { useRowSaver } from '../lib/saveState';
import { useUndoable } from '../lib/undo';
import { IconPlus, IconTrash } from './icons';
import {
  CATEGORY_LABELS, CATEGORY_ORDER, PERISHABILITY_LABELS, PERISHABILITY_ORDER, scaleTemplateItem,
} from '../../shared/lib/packing';
import type {
  PackingCategory, PackingTemplate, PackingTemplateItem, Perishability, ScaleBasis,
} from '../../shared/types/db';

const SCALE_LABELS: Record<ScaleBasis, string> = {
  fixed: 'Vast aantal',
  per_guest: 'Per gast',
  per_cocktail: 'Per cocktail',
};

const SCALE_ORDER: ScaleBasis[] = ['fixed', 'per_guest', 'per_cocktail'];

interface Props {
  /** Null addresses the base kit: the one template every on-location job uses. */
  packageId: string | null;
  packageName: string;
}

export function PackingTemplateEditor({ packageId, packageName }: Props) {
  const isBase = packageId === null;

  const [template, setTemplate] = useState<PackingTemplate | null>(null);
  const [rows, setRows] = useState<PackingTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Preview inputs — a typical job for this package, not stored anywhere.
  const [guests, setGuests] = useState(80);
  const [cocktails, setCocktails] = useState(200);

  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const undo = useUndoable();

  const saver = useRowSaver({
    key: `sjabloon-${packageId ?? 'basis'}`,
    save: async (id) => {
      const row = rowsRef.current.find((r) => r.id === id);
      if (!row) return null;
      const { error: err } = await supabase.from('packing_template_items').update({
        name: row.name, category: row.category, perishability: row.perishability,
        unit: row.unit, scale_basis: row.scale_basis, scale_factor: row.scale_factor,
      }).eq('id', row.id);
      return err ? `Opslaan mislukt: ${err.message}` : null;
    },
  });

  useEffect(() => {
    let alive = true;
    async function load() {
      const query = supabase.from('packing_templates').select('*');
      const { data: tpl, error: err } = await (packageId === null
        ? query.is('package_id', null)
        : query.eq('package_id', packageId)
      ).limit(1).maybeSingle();
      if (!alive) return;
      if (err) { setError('Sjablonen niet beschikbaar. Voer migratie 0005_packing.sql en 0008_base_packing_template.sql uit.'); setLoading(false); return; }
      if (tpl) {
        setTemplate(tpl);
        const { data: items } = await supabase
          .from('packing_template_items').select('*').eq('template_id', tpl.id).order('sort_order');
        if (alive) setRows(items ?? []);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, [packageId]);

  async function createTemplate() {
    setBusy(true);
    const { data, error: err } = await supabase.from('packing_templates')
      .insert({ package_id: packageId, name: isBase ? packageName : `Basislijst ${packageName}` })
      .select().single();
    setBusy(false);
    if (err || !data) { setError(`Aanmaken mislukt: ${err?.message ?? 'onbekende fout'}`); return; }
    setTemplate(data);
  }

  /** Edit locally and put the row in the queue; the saver decides when. */
  function patch(id: string, values: Partial<PackingTemplateItem>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...values } : r)));
    saver.touch(id);
  }

  async function addRow() {
    if (!template) return;
    const sort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    const { data, error: err } = await supabase.from('packing_template_items').insert({
      template_id: template.id, name: '', category: 'barmateriaal', perishability: 'houdbaar',
      unit: 'st', scale_basis: 'fixed', scale_factor: 1, sort_order: sort,
    }).select().single();
    if (err || !data) { setError(`Toevoegen mislukt: ${err?.message ?? 'onbekende fout'}`); return; }
    setRows((prev) => [...prev, data]);
  }

  async function removeRow(row: PackingTemplateItem) {
    saver.forget(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));

    const { error: err } = await supabase.from('packing_template_items').delete().eq('id', row.id);
    if (err) {
      setError(`Verwijderen mislukt: ${err.message}`);
      setRows((prev) => [...prev, row].sort((a, b) => a.sort_order - b.sort_order));
      return;
    }

    undo.offer(`${row.name || 'Regel'} verwijderd`, async () => {
      const { data, error: backErr } = await supabase.from('packing_template_items').insert(row).select().single();
      if (backErr || !data) { setError(`Terugzetten mislukt: ${backErr?.message ?? 'onbekende fout'}`); return; }
      setRows((prev) => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    });
  }

  if (loading) return <SkeletonBlock className="h-24" />;
  if (error && !template) {
    return <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>;
  }

  if (!template) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">
          {isBase
            ? 'Er is nog geen basisuitrusting. Zonder basis krijgt elke klus alleen het pakketsjabloon.'
            : 'Dit pakket heeft nog geen sjabloon. Zonder sjabloon begint elke paklijst leeg.'}
        </p>
        <button
          type="button"
          onClick={createTemplate}
          disabled={busy}
          className="h-11 rounded-lg bg-gold px-5 text-[0.9375rem] font-medium text-surface transition-colors duration-200 hover:bg-gold-light disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          {isBase ? 'Basisuitrusting aanmaken' : 'Sjabloon aanmaken'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <p className="mr-auto max-w-prose text-sm text-muted">
          {isBase
            ? 'Deze regels gaan mee naar elke klus op locatie, welk pakket het ook is. Het pakketsjabloon en de cocktailingrediënten komen er bovenop. Staat een onderdeel in beide lijsten, dan telt het hoogste aantal.'
            : 'Deze regels vormen het startpunt van elke paklijst voor dit pakket. Cocktailingrediënten komen daar bovenop vanuit de cocktailkaart. De kolom Voorbeeld rekent de regels door voor de klus hiernaast.'}
        </p>
        {/* Width sits on the label: INPUT_CLS carries w-full, which beats a
            w-24 tacked onto the input. */}
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-xs text-muted">Gasten</span>
          <input
            type="number" min={0} inputMode="numeric" value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className={`${INPUT_CLS} text-right`}
          />
        </label>
        <label className="flex w-24 flex-col gap-1.5">
          <span className="text-xs text-muted">Cocktails</span>
          <input
            type="number" min={0} inputMode="numeric" value={cocktails}
            onChange={(e) => setCocktails(Number(e.target.value))}
            className={`${INPUT_CLS} text-right`}
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nog geen regels in dit sjabloon.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/5">
          <table className="w-full min-w-[54rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-muted">
                <th className="px-3 py-2.5 font-medium">Onderdeel</th>
                <th className="w-48 px-2 py-2.5 font-medium">Categorie</th>
                <th className="w-40 px-2 py-2.5 font-medium">Houdbaarheid</th>
                <th className="w-36 px-2 py-2.5 font-medium">Schaalt met</th>
                <th className="w-24 px-2 py-2.5 text-right font-medium">Factor</th>
                <th className="w-20 px-2 py-2.5 font-medium">Eenheid</th>
                <th className="w-28 px-3 py-2.5 text-right font-medium">Voorbeeld</th>
                <th className="w-12 px-2 py-2.5"><span className="sr-only">Verwijderen</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const preview = scaleTemplateItem(row, guests, cocktails);
                return (
                  <tr key={row.id} className="border-b border-white/5 last:border-b-0">
                    <td className="px-2 py-1">
                      <input aria-label="Naam" value={row.name} onChange={(e) => patch(row.id, { name: e.target.value })} className={CELL_INPUT_CLS} placeholder="Highball glazen" />
                    </td>
                    <td className="px-2 py-1">
                      <select aria-label="Categorie" value={row.category} onChange={(e) => patch(row.id, { category: e.target.value as PackingCategory })} className={CELL_INPUT_CLS}>
                        {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select aria-label="Houdbaarheid" value={row.perishability} onChange={(e) => patch(row.id, { perishability: e.target.value as Perishability })} className={CELL_INPUT_CLS}>
                        {PERISHABILITY_ORDER.map((p) => <option key={p} value={p}>{PERISHABILITY_LABELS[p]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <select aria-label="Schaalt met" value={row.scale_basis} onChange={(e) => patch(row.id, { scale_basis: e.target.value as ScaleBasis })} className={CELL_INPUT_CLS}>
                        {SCALE_ORDER.map((b) => <option key={b} value={b}>{SCALE_LABELS[b]}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label="Factor" type="number" step="0.001" inputMode="decimal" value={row.scale_factor} onChange={(e) => patch(row.id, { scale_factor: Number(e.target.value) })} className={`${CELL_INPUT_CLS} text-right`} />
                    </td>
                    <td className="px-2 py-1">
                      <input aria-label="Eenheid" value={row.unit} onChange={(e) => patch(row.id, { unit: e.target.value })} className={CELL_INPUT_CLS} placeholder="st" />
                    </td>
                    <td className="px-3 py-1 text-right text-[0.9375rem] text-white/85">
                      {preview.quantity} {row.unit}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        aria-label={`Verwijder ${row.name || 'regel'}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-danger/10 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger focus-visible:outline-offset-2"
                      >
                        <IconTrash size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {(error || saver.error) && <p role="alert" className="text-sm text-danger">{saver.error ?? error}</p>}

      <div>
        <button
          type="button"
          onClick={addRow}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 px-4 text-[0.9375rem] text-white/85 transition-colors duration-200 hover:border-white/30 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
        >
          <IconPlus size={16} aria-hidden="true" />
          Regel toevoegen
        </button>
      </div>

      <UndoToast pending={undo.pending} onUndo={() => { void undo.run(); }} onDismiss={undo.dismiss} />
    </div>
  );
}
