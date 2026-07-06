import type { QuoteStatus } from '../../shared/types/db';

const STYLES: Record<QuoteStatus, string> = {
  new: 'bg-gold/15 text-gold-light border-gold/30',
  reviewed: 'bg-white/10 text-white border-white/20',
  quoted: 'bg-gold-light/15 text-gold-light border-gold-light/30',
  confirmed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  declined: 'bg-red-500/10 text-red-300 border-red-500/30',
};

const LABELS: Record<QuoteStatus, string> = {
  new: 'Nieuw',
  reviewed: 'Bekeken',
  quoted: 'Offerte verstuurd',
  confirmed: 'Bevestigd',
  declined: 'Afgewezen',
};

export function Badge({ status }: { status: QuoteStatus }) {
  return <span className={`inline-block rounded-full border px-3 py-1.5 text-sm uppercase tracking-wide ${STYLES[status]}`}>{LABELS[status]}</span>;
}
