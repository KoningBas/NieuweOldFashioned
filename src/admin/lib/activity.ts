import { supabase } from '../../shared/lib/supabase';
import type { ActivityKind } from '../../shared/types/db';

/** Append a timeline entry. Returns false when the insert failed (for example
 *  when migration 0003 has not run yet); callers degrade gracefully. */
export async function logActivity(requestId: string, kind: ActivityKind, body: string): Promise<boolean> {
  const { error } = await supabase.from('quote_activity').insert({ request_id: requestId, kind, body });
  if (error) console.error('Failed to log activity', error);
  return !error;
}
