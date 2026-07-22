// Deleting a request is not a row operation. Seven tables hang under it:
//
//   quote_activity          on delete cascade
//   quotes -> quote_lines   on delete cascade
//   invoices -> invoice_lines   RESTRICT — Postgres refuses while one exists
//   packing_lists -> packing_list_items   on delete cascade
//   request_cocktails       on delete cascade
//
// Cascade means the database wipes all of that without a word. So everything is
// read into memory first, and undo writes it back by its original ids — which
// works because ids are client-visible uuids, not sequences. Nothing else in
// the schema points at these rows, so restoring them in foreign-key order is
// enough to make the request whole again.
//
// The invoice is the one part that is not just data: an issued invoice is in
// your books. It can be deleted here, but only behind the second confirmation,
// and the dialog says the number out loud first.

import { supabase } from '../../shared/lib/supabase';
import type {
  Invoice, InvoiceLine, PackingList, PackingListItem, Quote, QuoteActivity,
  QuoteLine, QuoteRequest, RequestCocktail,
} from '../../shared/types/db';

/** How long undo stays on offer. Long, because this deletion took two
 *  confirmations to make — and the dialog promises this number out loud. */
export const UNDO_WINDOW_MS = 15_000;

export interface RequestSnapshot {
  request: QuoteRequest;
  quotes: Quote[];
  quoteLines: QuoteLine[];
  invoices: Invoice[];
  invoiceLines: InvoiceLine[];
  packingLists: PackingList[];
  packingItems: PackingListItem[];
  cocktails: RequestCocktail[];
  activity: QuoteActivity[];
}

/** Everything that would disappear with this request, read before touching it. */
export async function snapshotRequest(request: QuoteRequest): Promise<RequestSnapshot> {
  const [quoteRes, invoiceRes, listRes, cocktailRes, activityRes] = await Promise.all([
    supabase.from('quotes').select('*').eq('request_id', request.id),
    supabase.from('invoices').select('*').eq('request_id', request.id),
    supabase.from('packing_lists').select('*').eq('request_id', request.id),
    supabase.from('request_cocktails').select('*').eq('request_id', request.id),
    supabase.from('quote_activity').select('*').eq('request_id', request.id),
  ]);

  const quotes = (quoteRes.data ?? []) as Quote[];
  const invoices = (invoiceRes.data ?? []) as Invoice[];
  const packingLists = (listRes.data ?? []) as PackingList[];

  // Child rows of child rows. Skipped entirely when the parent is empty —
  // `.in('x', [])` is a pointless round trip.
  const [quoteLines, invoiceLines, packingItems] = await Promise.all([
    selectIn<QuoteLine>('quote_lines', 'quote_id', quotes.map((q) => q.id)),
    selectIn<InvoiceLine>('invoice_lines', 'invoice_id', invoices.map((i) => i.id)),
    selectIn<PackingListItem>('packing_list_items', 'list_id', packingLists.map((l) => l.id)),
  ]);

  return {
    request, quotes, quoteLines, invoices, invoiceLines,
    packingLists, packingItems, cocktails: (cocktailRes.data ?? []) as RequestCocktail[],
    activity: (activityRes.data ?? []) as QuoteActivity[],
  };
}

async function selectIn<T>(table: string, column: string, ids: string[]): Promise<T[]> {
  if (!ids.length) return [];
  const { data } = await supabase.from(table).select('*').in(column, ids);
  return (data ?? []) as T[];
}

/** What the confirmation has to say out loud, in reading order. The invoice
 *  comes last and marked: everything above it is admin, that one is bookkeeping. */
export interface SnapshotLine {
  text: string;
  grave: boolean;
}

export function snapshotLines(snapshot: RequestSnapshot): SnapshotLine[] {
  const lines: SnapshotLine[] = [];
  const { quotes, invoices, packingItems, cocktails, activity } = snapshot;
  const add = (text: string) => lines.push({ text, grave: false });

  if (quotes.length) add(count(quotes.length, 'offerteversie', 'offerteversies'));
  if (cocktails.length) add(`de cocktailkeuze (${count(cocktails.length, 'cocktail', 'cocktails')})`);
  if (packingItems.length) add(`de paklijst (${count(packingItems.length, 'regel', 'regels')})`);
  if (activity.length) add(count(activity.length, 'tijdlijnregel', 'tijdlijnregels'));
  if (invoices.length) {
    lines.push({
      text: `${count(invoices.length, 'factuur', 'facturen')} uit je boekhouding: ${invoices.map((i) => i.invoice_number).join(', ')}`,
      grave: true,
    });
  }
  return lines;
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Returns null on success, or the message to put in front of the user. */
export async function deleteRequest(snapshot: RequestSnapshot): Promise<string | null> {
  // Invoices are on delete restrict, so they have to go by hand and first —
  // their lines cascade along. Everything else follows the request itself.
  if (snapshot.invoices.length) {
    const { error } = await supabase.from('invoices').delete().eq('request_id', snapshot.request.id);
    if (error) return `Factuur verwijderen mislukt: ${error.message}`;
  }

  const { error } = await supabase.from('quote_requests').delete().eq('id', snapshot.request.id);
  return error ? `Verwijderen mislukt: ${error.message}` : null;
}

/**
 * Puts the snapshot back, parents before children. A failure halfway leaves a
 * partly restored request rather than nothing — which is the better half to
 * fail on, because what is back is visible and checkable in the admin.
 */
export async function restoreRequest(snapshot: RequestSnapshot): Promise<string | null> {
  const steps: [string, unknown[]][] = [
    ['quote_requests', [snapshot.request]],
    ['quotes', snapshot.quotes],
    ['quote_lines', snapshot.quoteLines],
    ['invoices', snapshot.invoices],
    ['invoice_lines', snapshot.invoiceLines],
    ['packing_lists', snapshot.packingLists],
    ['packing_list_items', snapshot.packingItems],
    ['request_cocktails', snapshot.cocktails],
    ['quote_activity', snapshot.activity],
  ];

  for (const [table, rows] of steps) {
    if (!rows.length) continue;
    const { error } = await supabase.from(table).insert(rows);
    if (error) return `Terugzetten mislukt bij ${table}: ${error.message}`;
  }
  return null;
}
