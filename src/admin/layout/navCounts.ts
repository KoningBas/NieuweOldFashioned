// Sidebar badge counts: things that want action, not totals.
// Cached briefly at module level so desktop sidebar and mobile nav share one
// fetch per navigation instead of firing four head-counts each.

import { supabase } from '../../shared/lib/supabase';
import { toDateOnly } from '../../shared/lib/format';

export interface NavCounts {
  newRequests: number;
  overdueInvoices: number;
}

let cache: { at: number; value: NavCounts } | null = null;
let inflight: Promise<NavCounts> | null = null;
const TTL_MS = 30_000;

export async function fetchNavCounts(): Promise<NavCounts> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  if (inflight) return inflight;

  inflight = (async () => {
    const today = toDateOnly(new Date());
    const [newRes, overdueRes] = await Promise.all([
      supabase.from('quote_requests').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      // Pre-migration the invoices table does not exist; the error path below
      // simply reports zero until it does.
      supabase.from('invoices').select('id', { count: 'exact', head: true }).lt('due_on', today).is('paid_on', null),
    ]);
    const value: NavCounts = {
      newRequests: newRes.count ?? 0,
      overdueInvoices: overdueRes.error ? 0 : (overdueRes.count ?? 0),
    };
    cache = { at: Date.now(), value };
    inflight = null;
    return value;
  })();

  return inflight;
}

/** Call after a mutation that changes what the badges count. */
export function invalidateNavCounts() {
  cache = null;
}
