import type { QuoteStatus } from '../../shared/types/db';
import { normalizeStatus, STATUS_LABELS, type CanonicalStatus } from '../../shared/lib/workflow';

// Colour never carries the meaning alone — every status also has its word.
const STYLES: Record<CanonicalStatus, string> = {
  new: 'bg-gold/15 text-gold-light border-gold/30',
  reviewed: 'bg-white/10 text-white/80 border-white/20',
  quoted: 'bg-gold-light/10 text-gold-light border-gold-light/40',
  booked: 'bg-ok/15 text-ok border-ok/30',
  completed: 'bg-white/15 text-white border-white/25',
  invoiced: 'bg-ok/10 text-ok/90 border-ok/20',
  paid: 'bg-ok/20 text-ok border-ok/40',
  declined: 'bg-danger/10 text-danger border-danger/30',
  cancelled: 'bg-white/5 text-muted border-white/15',
};

export function Badge({ status }: { status: QuoteStatus }) {
  const s = normalizeStatus(status);
  return (
    <span className={`inline-block whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide ${STYLES[s]}`}>
      {STATUS_LABELS[s]}
    </span>
  );
}
