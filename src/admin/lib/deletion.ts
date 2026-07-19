// Deleting a package or a cocktail is not a row operation, it is a history
// operation. Both are pointed at from elsewhere:
//
//   quote_requests.package_id  -> service_packages(id)   no on-delete rule, so
//                                 Postgres refuses outright.
//   request_cocktails.cocktail_id -> cocktail_menu(id)   on delete cascade, so
//                                 Postgres says nothing and quietly wipes the
//                                 cocktail out of every job it was planned for.
//
// The second one is the dangerous half: no error, no warning, gone. So both are
// counted first and the delete only runs when nothing points at it. Anything
// that is in use gets archived instead — is_active = false, off the site, still
// in the books.

import { supabase } from '../../shared/lib/supabase';

export type Archivable = 'service_packages' | 'cocktail_menu';

export type DeleteOutcome =
  /** Row is gone. */
  | { kind: 'deleted' }
  /** Still referenced; `count` jobs would have been affected. */
  | { kind: 'in-use'; count: number }
  | { kind: 'failed'; message: string };

async function countReferences(table: string, column: string, id: string): Promise<number | string> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq(column, id);
  if (error) return `Controleren mislukt: ${error.message}`;
  return count ?? 0;
}

async function guardedDelete(
  table: Archivable,
  id: string,
  reference: { table: string; column: string },
): Promise<DeleteOutcome> {
  const references = await countReferences(reference.table, reference.column, id);
  if (typeof references === 'string') return { kind: 'failed', message: references };
  if (references > 0) return { kind: 'in-use', count: references };

  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return { kind: 'failed', message: `Verwijderen mislukt: ${error.message}` };
  return { kind: 'deleted' };
}

/** Packing templates hang off the package with on-delete-cascade; they go too. */
export function deletePackage(id: string): Promise<DeleteOutcome> {
  return guardedDelete('service_packages', id, { table: 'quote_requests', column: 'package_id' });
}

/** Ingredients hang off the cocktail with on-delete-cascade; they go too. */
export function deleteCocktail(id: string): Promise<DeleteOutcome> {
  return guardedDelete('cocktail_menu', id, { table: 'request_cocktails', column: 'cocktail_id' });
}

/** Returns null on success, or the message to put in front of the user. */
export async function setActive(table: Archivable, id: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from(table).update({ is_active: active }).eq('id', id);
  return error ? `Archiveren mislukt: ${error.message}` : null;
}

export function usageSentence(kind: Archivable, name: string, count: number): string {
  const jobs = count === 1 ? '1 aanvraag' : `${count} aanvragen`;
  return kind === 'service_packages'
    ? `“${name}” staat in ${jobs}. Verwijderen zou die offertes en facturen onvolledig maken. Op inactief zetten haalt het pakket van de site en uit de offerte-wizard, maar laat de historie heel.`
    : `“${name}” staat ingepland bij ${jobs}. Verwijderen zou hem daar zonder waarschuwing uit halen. Op inactief zetten haalt hem van de kaart, maar laat de geplande klussen heel.`;
}
