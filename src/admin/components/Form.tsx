// Form primitives shared by the beheer screens. Two input shapes exist in the
// admin: standalone fields on a settings form, and bare cells inside an
// editable table. Both live here so focus and hover behave the same everywhere.

import type { ReactNode } from 'react';

/** Standalone input: 44px tall, visible border, own background. */
export const INPUT_CLS =
  'h-11 w-full rounded-lg border border-white/15 bg-surface px-3 text-[0.9375rem] text-white transition-colors duration-150 placeholder:text-muted hover:border-white/25 focus:border-gold/50 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2 disabled:opacity-50';

/** Table-cell input: invisible until you reach for it, so a filled row reads
 *  as data rather than as a form. */
export const CELL_INPUT_CLS =
  'w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[0.9375rem] text-white transition-colors duration-150 hover:border-white/10 focus:border-gold/50 focus:bg-surface focus:outline-none disabled:pointer-events-none';

export function Field({
  label, hint, htmlFor, children,
}: { label: string; hint?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm text-muted">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A titled group of fields. The legend carries the section name so screen
 *  readers announce which block a field belongs to. */
export function Fieldset({
  legend, description, children,
}: { legend: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-white/5 bg-surface-elevated p-5 sm:p-6">
      <legend className="px-1 font-heading text-lg text-white">{legend}</legend>
      {description && <p className="mb-5 mt-1 text-sm text-muted">{description}</p>}
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${description ? '' : 'mt-4'}`}>{children}</div>
    </fieldset>
  );
}
